// Live grow data (flat collections, spec §12) + write actions. All calculations live in src/calc and src/equipment.
import * as React from "react"
import { getStores, StoreUnavailable, TARGET, type Stores } from "@/store"
import { useSettings } from "./settings-context"
import { SCHEMA, type Cycle, type Entry, type GrowEvent, type Mix, type Plant } from "@/model/types"
import { GROW_SCHEMA, type ConcentrateStock, type Spray, type CustomProduct, type Equipment, type Reminder, type EquipmentAssignment, type Grow, type Group, type NutritionSettings, type Site, type Space } from "@/model/grow"
import { cycleOfSpace, DEFAULT_NUTRITION, newGrow, spaceNutrition } from "@/model/grow-ops"
import { moveEquipment } from "@/equipment/calc"
import { derive } from "@/model/entry"
import { setGrowZone, stageOn, todayIso } from "@/calc/stage"
import { cycleNumber, dayTargets, snapshot, type DayTargets } from "@/calc/targets"
import { compressPhoto } from "@/lib/photo"
import { seedDocs, thomasGrow } from "@/data/thomas-grow"
import { digestDocs, staleDigestIds, type Digest } from "@/calc/digest"
import { byStr, readable, validDoc } from "@/model/validate"
import { runBatch, writeAll, type BatchOp } from "@/store/doc-store"
import { loadDraft } from "@/lib/onboarding"
import { autoEventOps } from "@/calc/steps"

const byDateDesc = <T extends { date: string; id: string }>(a: T, b: T) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1)
const byOrder = <T extends { order: number }>(a: T, b: T) => (a.order ?? 0) - (b.order ?? 0)

/** Why the data could not be shown: the artifact database is missing, or a read failed. Never an empty grow. */
export type LoadProblem = "store" | "read" | null

export type Selection = { kind: "all" } | { kind: "site"; site: Site } | { kind: "space"; space: Space }

type GrowCtx = {
  ready: boolean
  /** A read failed or the database is missing: an error screen with "Réessayer" replaces the app (nothing is seeded). */
  problem: LoadProblem
  retry: () => void
  /** Claude version: false when the viewer is not the owner (they can read nothing). */
  owner: boolean | null
  /** Local version: IndexedDB unavailable, nothing is kept after closing. */
  volatile: boolean
  /** Documents left aside because they are malformed (collection/id). They are kept in the store. */
  skipped: string[]
  /** Local version, nothing yet: the first-launch assistant is shown instead of the app. */
  needsSetup: boolean
  /** Assistant writes (its draft, or an imported backup): no repair seed while they run. */
  withSetup: <T,>(fn: (docs: Stores["docs"]) => Promise<T>) => Promise<T>
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
  /** Foliar sprays (IPW, lot 5). */
  sprays: Spray[]
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
  /** Puts an entry back exactly as it was (« Annuler » after a dictation, lot 11): no new stamp, no new targets. */
  restoreEntry: (e: Entry) => Promise<void>
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
  /** Several products in one write (the mixing order of « Autre marque », lot 7a). */
  saveCustomProducts: (list: CustomProduct[]) => Promise<void>
  saveConcentrateStock: (s: ConcentrateStock) => Promise<void>
  saveSpray: (s: Spray) => Promise<void>
  deleteSpray: (id: string) => Promise<void>
  deleteConcentrateStock: (id: string) => Promise<void>
  saveReminder: (r: Reminder) => Promise<void>
  deleteReminder: (id: string) => Promise<void>
  /** Claude version: the morning task reads digest/latest. */
  saveDigest: (d: Digest) => Promise<void>
  /** Claude version: today's digest and the next days' (digest/latest + digest/{date}), old ones removed. */
  /** Writes a week of digests, or only `only` (the docs that changed); `prune` removes the dated ones past a week. */
  saveDigestWeek: (week: Digest[], opts?: { only?: [string, Digest][]; prune?: boolean }) => Promise<void>
  uploadPhoto: (file: Blob) => Promise<string>
  photoUrl: (id: string) => Promise<string>
  /** Removes photos from the device / the artifact's assets (entry deleted, photo taken off). Errors are ignored. */
  deletePhotos: (ids: string[]) => Promise<void>
}

const Ctx = React.createContext<GrowCtx | null>(null)

export function newId(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

type Raw = Record<string, Record<string, unknown>>
const COLS = ["sites", "spaces", "cycles", "plants", "groups", "entries", "events", "mixes", "equipment", "equipmentAssignments", "customProducts", "reminders", "concentrateStocks", "sprays"] as const
type ColName = (typeof COLS)[number]

export function GrowProvider({ children }: { children: React.ReactNode }) {
  const { settings, setActiveCycle } = useSettings()
  const [stores, setStores] = React.useState<Stores | null>(null)
  const [growDoc, setGrow] = React.useState<Grow | null>(null)
  const [growBad, setGrowBad] = React.useState(false)
  // A malformed grow/main keeps its name only; the rest falls back on the defaults (the stored copy is untouched).
  const grow = React.useMemo(() => (growDoc && growBad ? newGrow(typeof growDoc.name === "string" ? growDoc.name : "Mon grow", "") : growDoc), [growDoc, growBad])
  const [growLoaded, setGrowLoaded] = React.useState(false)
  const [raw, setRaw] = React.useState<Partial<Record<ColName, Raw>>>({})
  const [problem, setProblem] = React.useState<LoadProblem>(null)
  const [attempt, setAttempt] = React.useState(0)
  const retry = React.useCallback(() => {
    setProblem(null)
    setAttempt((n) => n + 1)
  }, [])

  React.useEffect(() => {
    let live = true
    getStores().then(
      (s) => live && setStores(s),
      (e) => live && setProblem(e instanceof StoreUnavailable ? "store" : "read"),
    )
    return () => {
      live = false
    }
  }, [attempt])

  React.useEffect(() => {
    if (!stores) return
    const d = stores.docs
    // A failed read stops everything: an error is never taken for an empty database (lot 10a).
    const fail = () => setProblem("read")
    const uns = [
      d.watchDoc(
        "grow/main",
        (doc) => {
          setGrowZone(typeof doc?.timeZone === "string" ? doc.timeZone : undefined)
          setGrowBad(!!doc && !validDoc("grow", doc))
          setGrow(doc as Grow | null)
          setGrowLoaded(true)
        },
        fail,
      ),
      ...COLS.map((c) => d.watchCollection(c, (m) => setRaw((r) => ({ ...r, [c]: m as Raw })), fail)),
    ]
    return () => uns.forEach((u) => u())
  }, [stores, attempt])

  // First run: Thomas's copy is prefilled (Claude version); the local version opens the first-launch assistant
  // (lot 8b), which writes grow/main last. Spaces without a grow (an interrupted reset) only get a grow back.
  const hasSpaces = !!Object.keys(raw.spaces ?? {}).length
  // Also true while the assistant writes (spaces land before grow/main), so it stays on screen until the end.
  const needsSetup = TARGET === "local" && !!stores && growLoaded && !grow && raw.spaces !== undefined
  const seeding = React.useRef(false)
  const setupBusy = React.useRef(false)
  React.useEffect(() => {
    if (!stores || !growLoaded || grow || seeding.current || problem) return
    if (raw.spaces === undefined) return
    // Someone the artifact is shared with reads nothing (owner-only rules): never write for them.
    if (stores.owner === false) return
    if (TARGET === "local" && (!hasSpaces || setupBusy.current)) return
    // Interrupted assistant: its draft is still on the phone, it opens again and finishes the job (lot 10a).
    if (TARGET === "local" && loadDraft()) return
    seeding.current = true
    const now = new Date().toISOString()
    ;(async () => {
      try {
        // Seed only after reads that succeed AND find nothing (a failed read throws here).
        const [g, sp, cy] = await Promise.all([stores.docs.get("grow/main"), stores.docs.list("spaces"), stores.docs.list("cycles")])
        if (g) return
        if (TARGET === "artifact" && !Object.keys(sp).length && !Object.keys(cy).length) {
          const docs = seedDocs(thomasGrow(now, todayIso()))
          // grow/main last, on its own: its presence means "seeded".
          await writeAll(stores.docs, docs.filter(([p]) => p !== "grow/main"))
          for (const [p, doc] of docs.filter(([p]) => p === "grow/main")) await stores.docs.set(p, doc)
        } else await stores.docs.set("grow/main", newGrow("Mon grow", now))
      } catch {
        seeding.current = false
        setProblem("read")
      }
    })()
  }, [stores, growLoaded, grow, raw.spaces, hasSpaces, problem])

  // Malformed documents are left aside (kept in the store, counted), so one bad document never blocks the app.
  // Checked once per collection snapshot: the lists below still only recompute when their own collection changes.
  const checked = React.useRef(new Map<ColName, { src: Raw | undefined; res: { list: unknown[]; bad: string[] } }>())
  const readCol = (c: ColName) => {
    const hit = checked.current.get(c)
    if (hit && hit.src === raw[c]) return hit.res
    const res = readable<unknown>(c, raw[c])
    checked.current.set(c, { src: raw[c], res })
    return res
  }
  const list = <T,>(c: ColName) => [...readCol(c).list] as T[]
  const skipped = React.useMemo(() => [...(growBad ? ["grow/main"] : []), ...COLS.flatMap((c) => readCol(c).bad)], [raw, growBad]) // eslint-disable-line react-hooks/exhaustive-deps
  const sites = React.useMemo(() => list<Site>("sites").sort(byOrder), [raw.sites]) // eslint-disable-line react-hooks/exhaustive-deps
  const allSpaces = React.useMemo(() => list<Space>("spaces").sort(byOrder), [raw.spaces]) // eslint-disable-line react-hooks/exhaustive-deps
  const spaces = React.useMemo(() => allSpaces.filter((s) => !s.archived), [allSpaces])
  const cycles = React.useMemo(() => list<Cycle>("cycles").sort((a, b) => byStr(b.createdAt, a.createdAt)), [raw.cycles]) // eslint-disable-line react-hooks/exhaustive-deps
  const equipment = React.useMemo(() => list<Equipment>("equipment").sort((a, b) => byStr(a.name, b.name)), [raw.equipment]) // eslint-disable-line react-hooks/exhaustive-deps
  const assignments = React.useMemo(() => list<EquipmentAssignment>("equipmentAssignments"), [raw.equipmentAssignments]) // eslint-disable-line react-hooks/exhaustive-deps
  const groups = React.useMemo(() => list<Group>("groups"), [raw.groups]) // eslint-disable-line react-hooks/exhaustive-deps
  const reminders = React.useMemo(() => list<Reminder>("reminders"), [raw.reminders]) // eslint-disable-line react-hooks/exhaustive-deps
  const customProducts = React.useMemo(() => list<CustomProduct>("customProducts").sort((a, b) => byStr(a.name, b.name)), [raw.customProducts]) // eslint-disable-line react-hooks/exhaustive-deps

  const concentrateStocks = React.useMemo(() => list<ConcentrateStock>("concentrateStocks").sort((a, b) => byStr(b.madeOn, a.madeOn)), [raw.concentrateStocks]) // eslint-disable-line react-hooks/exhaustive-deps

  const sprays = React.useMemo(() => list<Spray>("sprays").sort((a, b) => byStr(b.date, a.date) || byStr(b.id, a.id)), [raw.sprays]) // eslint-disable-line react-hooks/exhaustive-deps

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
      // The running cycle; with none, the last one of the space (its journal stays readable).
      return cycleOfSpace(cycles, id, pref?.id) ?? (pref?.spaceId === id ? pref : cycles.find((c) => c.spaceId === id)) ?? null
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
  const plants = React.useMemo(() => list<Plant>("plants").filter((p) => p.cycleId === cid).sort((a, b) => byStr(a.label, b.label)), [raw.plants, cid]) // eslint-disable-line react-hooks/exhaustive-deps
  const entries = React.useMemo(() => list<Entry>("entries").filter((e) => e.cycleId === cid).sort(byDateDesc), [raw.entries, cid]) // eslint-disable-line react-hooks/exhaustive-deps
  const events = React.useMemo(() => list<GrowEvent>("events").filter((e) => e.cycleId === cid || (!e.cycleId && e.spaceId === cycle?.spaceId)).sort(byDateDesc), [raw.events, cid, cycle?.spaceId]) // eslint-disable-line react-hooks/exhaustive-deps
  const mixes = React.useMemo(() => list<Mix>("mixes").filter((m) => m.cycleId === cid || (!!cycle?.spaceId && m.spaceIds?.includes(cycle.spaceId))).sort(byDateDesc), [raw.mixes, cid, cycle?.spaceId]) // eslint-disable-line react-hooks/exhaustive-deps

  const targetsFor = React.useCallback(
    (date: string, c: Cycle | null = cycle) => {
      if (!c) return null
      const s = stageOn(c, date)
      // Manual method, solution EC and pH follow the line of the cycle's space (Pro p. 31/41, Blended p. 58/60), with its add-ons.
      const nut = spaceNutrition(grow, spaces.find((x) => x.id === c.spaceId))
      return dayTargets(s.key, { mode: c.waterMode, substrate: c.substrate, flowerWeek: s.flowerWeek, cycleNumber: cycleNumber(c, cycles), line: nut.line, addons: nut.addons, own: nut.own })
    },
    [cycle, cycles, grow, spaces],
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
    (spaceId: string) => cycleOfSpace(cycles, spaceId, settings.activeCycleId),
    [cycles, settings.activeCycleId],
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
      problem,
      retry,
      owner: stores?.owner ?? null,
      volatile: !!stores?.volatile,
      skipped,
      needsSetup,
      withSetup: async (fn) => {
        setupBusy.current = true
        try {
          return await fn(need())
        } finally {
          setupBusy.current = false
        }
      },
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
      sprays,
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
        // Dates are events (vertical markers on charts): created, moved (note and Great White kept) or removed with them.
        for (const [id, ev] of autoEventOps(prev, next, all.events, now)) await (ev ? need().set(`events/${id}`, ev) : need().delete(`events/${id}`))
        // Only a new cycle becomes the active one: editing another cycle leaves the app where it was (lot 10b).
        if (!prev && settings.activeCycleId !== c.id) setActiveCycle(c.id)
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
      restoreEntry: async (e) => need().set(`entries/${e.id}`, e),
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
      saveCustomProducts: async (list) => {
        const docs = need()
        const ops: BatchOp[] = list.map((p) => [`customProducts/${p.id}`, { ...p, schemaVersion: GROW_SCHEMA.customProduct }])
        await (docs.batch ? docs.batch(ops) : runBatch(docs, ops))
      },
      saveConcentrateStock: async (x) => need().set(`concentrateStocks/${x.id}`, { ...x, schemaVersion: GROW_SCHEMA.concentrateStock }),
      saveSpray: async (x) => need().set(`sprays/${x.id}`, { ...x, schemaVersion: GROW_SCHEMA.spray }),
      deleteSpray: async (id) => need().delete(`sprays/${id}`),
      deleteConcentrateStock: async (id) => need().delete(`concentrateStocks/${id}`),
      saveReminder: async (r) => need().set(`reminders/${r.id}`, { ...r, schemaVersion: GROW_SCHEMA.reminder, updatedAt: stamp() }),
      deleteReminder: async (id) => need().delete(`reminders/${id}`),
      saveDigest: async (d) => need().set("digest/latest", { ...d, updatedAt: stamp() }),
      saveDigestWeek: async (week, opts = {}) => {
        const docs = need()
        const at = stamp()
        const ops: BatchOp[] = (opts.only ?? digestDocs(week)).map(([p, d]) => [p, { ...d, updatedAt: at }])
        if (opts.prune ?? true) for (const id of staleDigestIds(Object.keys(await docs.list("digest")), week[0].date)) ops.push([`digest/${id}`, null])
        await (docs.batch ? docs.batch(ops) : runBatch(docs, ops))
      },
      uploadPhoto: async (file) => {
        if (!stores) throw new Error("store not ready")
        return stores.photos.upload(await compressPhoto(file))
      },
      photoUrl: async (id) => (stores ? stores.photos.url(id) : ""),
      deletePhotos: async (ids) => {
        if (!stores) return
        for (const id of ids) await stores.photos.remove(id).catch(() => {})
      },
    }
  }, [stores, growLoaded, problem, retry, skipped, needsSetup, raw.cycles, raw.spaces, grow, sites, spaces, allSpaces, cycles, equipment, assignments, groups, customProducts, concentrateStocks, sprays, reminders, selection, space, nutrition, cycle, plants, entries, events, mixes, targetsFor, all, cycleIn, settings.activeCycleId, setActiveCycle])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGrow() {
  const c = React.useContext(Ctx)
  if (!c) throw new Error("useGrow must be used inside <GrowProvider>")
  return c
}

export { todayIso }
