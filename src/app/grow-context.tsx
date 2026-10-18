// Live grow data (flat collections, spec §12) + write actions. All calculations live in src/calc and src/equipment.
import * as React from "react"
import { getStores, TARGET, type Stores } from "@/store"
import { useSettings } from "./settings-context"
import { SCHEMA, type Cycle, type Entry, type GrowEvent, type Mix, type Plant } from "@/model/types"
import { GROW_SCHEMA, type ConcentrateStock, type CustomProduct, type Equipment, type Reminder, type EquipmentAssignment, type Grow, type Group, type NutritionSettings, type Site, type Space } from "@/model/grow"
import { DEFAULT_NUTRITION, newGrow, spaceNutrition } from "@/model/grow-ops"
import { moveEquipment } from "@/equipment/calc"
import { derive } from "@/model/entry"
import { stageOn, todayIso } from "@/calc/stage"
import { cycleNumber, dayTargets, snapshot, type DayTargets } from "@/calc/targets"
import { compressPhoto } from "@/lib/photo"
import { seedDocs, thomasGrow } from "@/data/thomas-grow"
import type { Digest } from "@/calc/digest"

const byDateDesc = <T extends { date: string; id: string }>(a: T, b: T) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1)
const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order

export type Selection = { kind: "all" } | { kind: "site"; site: Site } | { kind: "space"; space: Space }

type GrowCtx = {
  ready: boolean
  storeKind: Stores["docs"]["kind"] | null
  // whole grow
  grow: Grow | null
  sites: Site[]
  spaces: Space[] // live (not archived), by order
  allSpaces: Space[]
  cycles: Cycle[]
  equipment: Equipment[]
  assignments: EquipmentAssignment[]
  groups: Group[]
  customProducts: CustomProduct[]
  /** Concentrate jerrycans (lot 4). */
  concentrateStocks: ConcentrateStock[]
  /** Personal reminders and the state of automatic deadlines (lot 3). */
  reminders: Reminder[]
  selection: Selection
  /** Space shown by the tools: the selected one, else the space of the active cycle, else the first. */
  space: Space | null
  nutrition: NutritionSettings
  // active cycle (of the selected space) and its data
  cycle: Cycle | null
  plants: Plant[]
  entries: Entry[] // newest first
  events: GrowEvent[]
  mixes: Mix[]
  targetsFor: (date: string, c?: Cycle | null) => DayTargets | null
  /** Unfiltered collections (every space and cycle), newest first. */
  all: { entries: Entry[]; events: GrowEvent[]; mixes: Mix[]; plants: Plant[] }
  /** Running cycle of a space (the active one if it is there), else null. */
  cycleIn: (spaceId: string) => Cycle | null
  // writes
  saveGrow: (g: Partial<Grow>) => Promise<void>
  saveSite: (s: Site) => Promise<void>
  saveSpace: (s: Space) => Promise<void>
  saveCycle: (c: Cycle) => Promise<void>
  savePlant: (p: Plant) => Promise<void>
  saveEntry: (e: Entry) => Promise<Entry>
  deleteEntry: (id: string) => Promise<void>
  saveEvent: (e: GrowEvent) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  saveMix: (m: Mix) => Promise<void>
  deleteMix: (id: string) => Promise<void>
  saveEquipment: (e: Equipment) => Promise<void>
  deleteEquipment: (id: string) => Promise<void>
  /** Move (or put in stock with null). Closes the open period, opens a new one. */
  assignEquipment: (equipmentId: string, spaceId: string | null, date?: string, quantity?: number) => Promise<void>
  /** Remove one placement (for items shared by several spaces). */
  unassign: (assignmentId: string, date?: string) => Promise<void>
  addAssignment: (a: EquipmentAssignment) => Promise<void>
  saveCustomProduct: (p: CustomProduct) => Promise<void>
  deleteCustomProduct: (id: string) => Promise<void>
  saveConcentrateStock: (s: ConcentrateStock) => Promise<void>
  deleteConcentrateStock: (id: string) => Promise<void>
  saveReminder: (r: Reminder) => Promise<void>
  deleteReminder: (id: string) => Promise<void>
  /** Claude version: the morning task reads digest/latest. */
  saveDigest: (d: Digest) => Promise<void>
  uploadPhoto: (file: Blob) => Promise<string>
  photoUrl: (id: string) => Promise<string>
}

const Ctx = React.createContext<GrowCtx | null>(null)

export function newId(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

type Raw = Record<string, Record<string, unknown>>
const COLS = ["sites", "spaces", "cycles", "plants", "groups", "entries", "events", "mixes", "equipment", "equipmentAssignments", "customProducts", "reminders", "concentrateStocks"] as const
type ColName = (typeof COLS)[number]

export function GrowProvider({ children }: { children: React.ReactNode }) {
  const { settings, setActiveCycle } = useSettings()
  const [stores, setStores] = React.useState<Stores | null>(null)
  const [grow, setGrow] = React.useState<Grow | null>(null)
  const [growLoaded, setGrowLoaded] = React.useState(false)
  const [raw, setRaw] = React.useState<Partial<Record<ColName, Raw>>>({})

  React.useEffect(() => {
    getStores().then(setStores)
  }, [])

  React.useEffect(() => {
    if (!stores) return
    const d = stores.docs
    const uns = [
      d.watchDoc("grow/main", (doc) => {
        setGrow(doc as Grow | null)
        setGrowLoaded(true)
      }),
      ...COLS.map((c) => d.watchCollection(c, (m) => setRaw((r) => ({ ...r, [c]: m as Raw })))),
    ]
    return () => uns.forEach((u) => u())
  }, [stores])

  // First run: Thomas's copy is prefilled (Claude version); the local version starts with an empty grow.
  const seeding = React.useRef(false)
  React.useEffect(() => {
    if (!stores || !growLoaded || grow || seeding.current) return
    if (raw.spaces === undefined) return
    seeding.current = true
    const now = new Date().toISOString()
    ;(async () => {
      try {
        if (TARGET === "artifact" && !Object.keys(raw.spaces ?? {}).length) {
          for (const [p, doc] of seedDocs(thomasGrow(now, todayIso()))) await stores.docs.set(p, doc)
        } else await stores.docs.set("grow/main", newGrow("Mon grow", now))
      } catch {
        seeding.current = false
      }
    })()
  }, [stores, growLoaded, grow, raw.spaces])

  const list = <T,>(c: ColName) => Object.values(raw[c] ?? {}) as T[]
  const sites = React.useMemo(() => list<Site>("sites").sort(byOrder), [raw.sites]) // eslint-disable-line react-hooks/exhaustive-deps
  const allSpaces = React.useMemo(() => list<Space>("spaces").sort(byOrder), [raw.spaces]) // eslint-disable-line react-hooks/exhaustive-deps
  const spaces = React.useMemo(() => allSpaces.filter((s) => !s.archived), [allSpaces])
  const cycles = React.useMemo(() => list<Cycle>("cycles").sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), [raw.cycles]) // eslint-disable-line react-hooks/exhaustive-deps
  const equipment = React.useMemo(() => list<Equipment>("equipment").sort((a, b) => a.name.localeCompare(b.name)), [raw.equipment]) // eslint-disable-line react-hooks/exhaustive-deps
  const assignments = React.useMemo(() => list<EquipmentAssignment>("equipmentAssignments"), [raw.equipmentAssignments]) // eslint-disable-line react-hooks/exhaustive-deps
  const groups = React.useMemo(() => list<Group>("groups"), [raw.groups]) // eslint-disable-line react-hooks/exhaustive-deps
  const reminders = React.useMemo(() => list<Reminder>("reminders"), [raw.reminders]) // eslint-disable-line react-hooks/exhaustive-deps
  const customProducts = React.useMemo(() => list<CustomProduct>("customProducts").sort((a, b) => a.name.localeCompare(b.name)), [raw.customProducts]) // eslint-disable-line react-hooks/exhaustive-deps

  const concentrateStocks = React.useMemo(() => list<ConcentrateStock>("concentrateStocks").sort((a, b) => b.madeOn.localeCompare(a.madeOn)), [raw.concentrateStocks]) // eslint-disable-line react-hooks/exhaustive-deps

  const sel = settings.space ?? "all"
  const selection: Selection = React.useMemo(() => {
    if (sel.startsWith("site:")) {
      const site = sites.find((s) => s.id === sel.slice(5))
      if (site) return { kind: "site", site }
    }
    const space = spaces.find((s) => s.id === sel)
    return space ? { kind: "space", space } : { kind: "all" }
  }, [sel, sites, spaces])

  const live = React.useMemo(() => cycles.filter((c) => !c.archived && !c.harvestDate), [cycles])
  const cycle = React.useMemo(() => {
    const pref = cycles.find((c) => c.id === settings.activeCycleId)
    if (selection.kind === "space") {
      const id = selection.space.id
      if (pref && pref.spaceId === id) return pref
      return live.find((c) => c.spaceId === id) ?? cycles.find((c) => c.spaceId === id) ?? null
    }
    if (selection.kind === "site") {
      const ids = new Set(spaces.filter((s) => s.siteId === selection.site.id).map((s) => s.id))
      if (pref && ids.has(pref.spaceId ?? "")) return pref
      return live.find((c) => ids.has(c.spaceId ?? "")) ?? null
    }
    return pref ?? live[0] ?? cycles[0] ?? null
  }, [cycles, live, settings.activeCycleId, selection, spaces])

  const space = React.useMemo(
    () => (selection.kind === "space" ? selection.space : (spaces.find((s) => s.id === cycle?.spaceId) ?? spaces[0] ?? null)),
    [selection, spaces, cycle],
  )
  const nutrition = React.useMemo(() => spaceNutrition(grow, space ?? undefined), [grow, space])

  const cid = cycle?.id
  const plants = React.useMemo(() => list<Plant>("plants").filter((p) => p.cycleId === cid).sort((a, b) => a.label.localeCompare(b.label)), [raw.plants, cid]) // eslint-disable-line react-hooks/exhaustive-deps
  const entries = React.useMemo(() => list<Entry>("entries").filter((e) => e.cycleId === cid).sort(byDateDesc), [raw.entries, cid]) // eslint-disable-line react-hooks/exhaustive-deps
  const events = React.useMemo(() => list<GrowEvent>("events").filter((e) => e.cycleId === cid || (!e.cycleId && e.spaceId === cycle?.spaceId)).sort(byDateDesc), [raw.events, cid, cycle?.spaceId]) // eslint-disable-line react-hooks/exhaustive-deps
  const mixes = React.useMemo(() => list<Mix>("mixes").filter((m) => m.cycleId === cid || (!!cycle?.spaceId && m.spaceIds?.includes(cycle.spaceId))).sort(byDateDesc), [raw.mixes, cid, cycle?.spaceId]) // eslint-disable-line react-hooks/exhaustive-deps

  const targetsFor = React.useCallback(
    (date: string, c: Cycle | null = cycle) => {
      if (!c) return null
      const s = stageOn(c, date)
      // Manual method and solution EC follow the line of the cycle's space (Pro p. 41, Blended p. 60).
      const line = spaceNutrition(grow, spaces.find((x) => x.id === c.spaceId)).line
      return dayTargets(s.key, { mode: c.waterMode, substrate: c.substrate, flowerWeek: s.flowerWeek, cycleNumber: cycleNumber(c), line })
    },
    [cycle, grow, spaces],
  )
  const all = React.useMemo(
    () => ({
      entries: list<Entry>("entries").sort(byDateDesc),
      events: list<GrowEvent>("events").sort(byDateDesc),
      mixes: list<Mix>("mixes").sort(byDateDesc),
      plants: list<Plant>("plants"),
    }),
    [raw.entries, raw.events, raw.mixes, raw.plants], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const cycleIn = React.useCallback(
    (spaceId: string) => {
      const pref = cycles.find((c) => c.id === settings.activeCycleId)
      if (pref && pref.spaceId === spaceId && !pref.harvestDate && !pref.archived) return pref
      return live.find((c) => c.spaceId === spaceId) ?? null
    },
    [cycles, live, settings.activeCycleId],
  )

  const value = React.useMemo<GrowCtx>(() => {
    const docs = stores?.docs
    const need = () => {
      if (!docs) throw new Error("store not ready")
      return docs
    }
    const stamp = () => new Date().toISOString()
    return {
      ready: growLoaded && !!stores && raw.cycles !== undefined && raw.spaces !== undefined,
      storeKind: docs?.kind ?? null,
      grow,
      sites,
      spaces,
      allSpaces,
      cycles,
      equipment,
      assignments,
      groups,
      customProducts,
      concentrateStocks,
      reminders,
      selection,
      space,
      nutrition,
      cycle,
      plants,
      entries,
      events,
      mixes,
      targetsFor,
      all,
      cycleIn,
      saveGrow: async (g) => {
        const base = grow ?? newGrow("Mon grow", stamp())
        await need().set("grow/main", { ...base, ...g, nutrition: { ...DEFAULT_NUTRITION, ...base.nutrition, ...(g.nutrition ?? {}) }, schemaVersion: GROW_SCHEMA.grow, updatedAt: stamp() })
      },
      saveSite: async (s) => need().set(`sites/${s.id}`, { ...s, schemaVersion: GROW_SCHEMA.site }),
      saveSpace: async (s) => need().set(`spaces/${s.id}`, { ...s, schemaVersion: GROW_SCHEMA.space, updatedAt: stamp() }),
      saveCycle: async (c) => {
        const now = stamp()
        const next: Cycle = { ...c, spaceId: c.spaceId ?? space?.id, schemaVersion: SCHEMA.cycle, updatedAt: now }
        const prev = cycles.find((x) => x.id === c.id)
        await need().set(`cycles/${c.id}`, next)
        // Dates become events (vertical markers on charts) the first time they are set.
        const evs: [keyof Cycle, GrowEvent["type"]][] = [
          ["flipDate", "flip"],
          ["transferDate", "transplant"],
          ["harvestDate", "harvest"],
        ]
        for (const [k, type] of evs) {
          const date = next[k] as string | undefined
          if (date && date !== (prev?.[k] as string | undefined)) {
            const id = `${c.id}_auto-${type}`
            await need().set(`events/${id}`, { schemaVersion: SCHEMA.event, id, date, type, cycleId: c.id, spaceId: next.spaceId, createdAt: now })
          }
        }
        if (settings.activeCycleId !== c.id) setActiveCycle(c.id)
      },
      savePlant: async (p) => need().set(`plants/${p.id}`, { ...p, schemaVersion: SCHEMA.plant, updatedAt: stamp() }),
      saveEntry: async (e) => {
        // Targets come from the cycle the entry belongs to (a space without a cycle has none).
        const spaceId = e.spaceId || cycle?.spaceId || space?.id || ""
        const ec = (e.cycleId ? cycles.find((c) => c.id === e.cycleId) : cycleIn(spaceId)) ?? null
        const d = derive(e, ec?.leafOffsetC)
        const full: Entry = {
          ...d,
          spaceId,
          cycleId: ec?.id,
          schemaVersion: SCHEMA.entry,
          targets: snapshot(targetsFor(e.date, ec)),
          updatedAt: stamp(),
        }
        await need().set(`entries/${full.id}`, full)
        return full
      },
      deleteEntry: async (id) => need().delete(`entries/${id}`),
      saveEvent: async (e) => need().set(`events/${e.id}`, { ...e, cycleId: e.cycleId ?? cycle?.id, spaceId: e.spaceId ?? (selection.kind === "space" ? selection.space.id : cycle?.spaceId), schemaVersion: SCHEMA.event }),
      deleteEvent: async (id) => need().delete(`events/${id}`),
      saveMix: async (m) =>
        need().set(`mixes/${m.id}`, { ...m, cycleId: m.cycleId ?? cycle?.id, spaceIds: m.spaceIds ?? (cycle?.spaceId ? [cycle.spaceId] : space ? [space.id] : []), schemaVersion: SCHEMA.mix }),
      deleteMix: async (id) => need().delete(`mixes/${id}`),
      saveEquipment: async (e) => need().set(`equipment/${e.id}`, { ...e, schemaVersion: GROW_SCHEMA.equipment, updatedAt: stamp() }),
      deleteEquipment: async (id) => {
        // History is kept: open periods are closed today, the item itself is removed.
        const today = todayIso()
        for (const a of assignments.filter((x) => x.equipmentId === id && !x.to)) await need().set(`equipmentAssignments/${a.id}`, { ...a, to: today })
        await need().delete(`equipment/${id}`)
      },
      assignEquipment: async (equipmentId, spaceId, date = todayIso(), quantity) => {
        const { close, open } = moveEquipment(equipmentId, spaceId, date, assignments, () => newId("as"))
        // Closing on the day it was opened leaves an empty period: drop it instead.
        if (close) {
          if (close.from === date) await need().delete(`equipmentAssignments/${close.id}`)
          else await need().set(`equipmentAssignments/${close.id}`, close)
        }
        await need().set(`equipmentAssignments/${open.id}`, quantity ? { ...open, quantity } : open)
        const evId = newId("ev")
        await need().set(`events/${evId}`, {
          schemaVersion: SCHEMA.event,
          id: evId,
          date,
          type: "equipment",
          equipmentId,
          ...(spaceId ? { spaceId } : {}),
          createdAt: stamp(),
        })
      },
      unassign: async (id, date = todayIso()) => {
        const a = assignments.find((x) => x.id === id)
        if (!a) return
        if (a.from >= date) await need().delete(`equipmentAssignments/${id}`)
        else await need().set(`equipmentAssignments/${id}`, { ...a, to: date })
      },
      addAssignment: async (a) => need().set(`equipmentAssignments/${a.id}`, { ...a, schemaVersion: GROW_SCHEMA.assignment }),
      saveCustomProduct: async (p) => need().set(`customProducts/${p.id}`, { ...p, schemaVersion: GROW_SCHEMA.customProduct }),
      deleteCustomProduct: async (id) => need().delete(`customProducts/${id}`),
      saveConcentrateStock: async (x) => need().set(`concentrateStocks/${x.id}`, { ...x, schemaVersion: GROW_SCHEMA.concentrateStock }),
      deleteConcentrateStock: async (id) => need().delete(`concentrateStocks/${id}`),
      saveReminder: async (r) => need().set(`reminders/${r.id}`, { ...r, schemaVersion: GROW_SCHEMA.reminder, updatedAt: stamp() }),
      deleteReminder: async (id) => need().delete(`reminders/${id}`),
      saveDigest: async (d) => need().set("digest/latest", { ...d, updatedAt: stamp() }),
      uploadPhoto: async (file) => {
        if (!stores) throw new Error("store not ready")
        return stores.photos.upload(await compressPhoto(file))
      },
      photoUrl: async (id) => (stores ? stores.photos.url(id) : ""),
    }
  }, [stores, growLoaded, raw.cycles, raw.spaces, grow, sites, spaces, allSpaces, cycles, equipment, assignments, groups, customProducts, concentrateStocks, reminders, selection, space, nutrition, cycle, plants, entries, events, mixes, targetsFor, all, cycleIn, settings.activeCycleId, setActiveCycle])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGrow() {
  const c = React.useContext(Ctx)
  if (!c) throw new Error("useGrow must be used inside <GrowProvider>")
  return c
}

export { todayIso }
