// Live grow data for the active cycle + write actions. All calculations live in src/calc.
import * as React from "react"
import { getStores, type Stores } from "@/store"
import { useSettings } from "./settings-context"
import { SCHEMA, type Cycle, type Entry, type GrowEvent, type Mix, type Plant } from "@/model/types"
import { derive } from "@/model/entry"
import { stageOn, todayIso } from "@/calc/stage"
import { cycleNumber, dayTargets, snapshot, type DayTargets } from "@/calc/targets"
import { compressPhoto } from "@/lib/photo"

const byDateDesc = <T extends { date: string; id: string }>(a: T, b: T) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1)

type GrowCtx = {
  ready: boolean
  storeKind: Stores["docs"]["kind"] | null
  cycle: Cycle | null
  plants: Plant[]
  entries: Entry[] // newest first
  events: GrowEvent[]
  mixes: Mix[]
  targetsFor: (date: string) => DayTargets | null
  saveCycle: (c: Cycle) => Promise<void>
  savePlant: (p: Plant) => Promise<void>
  saveEntry: (e: Entry) => Promise<Entry>
  deleteEntry: (id: string) => Promise<void>
  saveEvent: (e: GrowEvent) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  saveMix: (m: Mix) => Promise<void>
  deleteMix: (id: string) => Promise<void>
  uploadPhoto: (file: Blob) => Promise<string>
  photoUrl: (id: string) => Promise<string>
}

const Ctx = React.createContext<GrowCtx | null>(null)

export function newId(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function GrowProvider({ children }: { children: React.ReactNode }) {
  const { settings, setActiveCycle } = useSettings()
  const [stores, setStores] = React.useState<Stores | null>(null)
  const [cycle, setCycle] = React.useState<Cycle | null>(null)
  const [loaded, setLoaded] = React.useState(false)
  const [plants, setPlants] = React.useState<Plant[]>([])
  const [entries, setEntries] = React.useState<Entry[]>([])
  const [events, setEvents] = React.useState<GrowEvent[]>([])
  const [mixes, setMixes] = React.useState<Mix[]>([])

  React.useEffect(() => {
    getStores().then(setStores)
  }, [])

  // If no active cycle is set yet, adopt the most recent one found in the store.
  React.useEffect(() => {
    if (!stores || settings.activeCycleId) return
    let cancelled = false
    stores.docs.list("cycles").then((all) => {
      if (cancelled) return
      const ids = Object.values(all).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      if (ids[0]?.id) setActiveCycle(String(ids[0].id))
      else setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [stores, settings.activeCycleId, setActiveCycle])

  const cid = settings.activeCycleId
  React.useEffect(() => {
    if (!stores || !cid) return
    const d = stores.docs
    const base = `cycles/${cid}`
    const uns = [
      d.watchDoc(base, (doc) => {
        setCycle(doc as Cycle | null)
        setLoaded(true)
      }),
      d.watchCollection(`${base}/plants`, (m) => setPlants(Object.values(m).map((x) => x as Plant).sort((a, b) => a.id.localeCompare(b.id)))),
      d.watchCollection(`${base}/entries`, (m) => setEntries(Object.values(m).map((x) => x as Entry).sort(byDateDesc))),
      d.watchCollection(`${base}/events`, (m) => setEvents(Object.values(m).map((x) => x as GrowEvent).sort(byDateDesc))),
      d.watchCollection(`${base}/mixes`, (m) => setMixes(Object.values(m).map((x) => x as Mix).sort(byDateDesc))),
    ]
    return () => uns.forEach((u) => u())
  }, [stores, cid])

  const targetsFor = React.useCallback(
    (date: string) => {
      if (!cycle) return null
      const s = stageOn(cycle, date)
      return dayTargets(s.key, { mode: cycle.waterMode, substrate: cycle.substrate, flowerWeek: s.flowerWeek, cycleNumber: cycleNumber(cycle) })
    },
    [cycle],
  )

  const value = React.useMemo<GrowCtx>(() => {
    const docs = stores?.docs
    const need = () => {
      if (!docs) throw new Error("store not ready")
      return docs
    }
    const base = (id?: string) => `cycles/${id ?? cycle?.id ?? cid}`
    return {
      ready: loaded && !!stores,
      storeKind: docs?.kind ?? null,
      cycle,
      plants,
      entries,
      events,
      mixes,
      targetsFor,
      saveCycle: async (c) => {
        const now = new Date().toISOString()
        const next = { ...c, schemaVersion: SCHEMA.cycle, updatedAt: now }
        const prev = cycle
        await need().set(base(c.id), next)
        // Dates become events (vertical markers on charts) the first time they are set.
        const evs: [keyof Cycle, GrowEvent["type"]][] = [
          ["flipDate", "flip"],
          ["transferDate", "transplant"],
          ["harvestDate", "harvest"],
        ]
        for (const [k, type] of evs) {
          const date = next[k] as string | undefined
          if (date && date !== (prev?.id === c.id ? (prev?.[k] as string | undefined) : undefined)) {
            const id = `auto-${type}`
            await need().set(`${base(c.id)}/events/${id}`, { schemaVersion: SCHEMA.event, id, date, type, createdAt: now })
          }
        }
        if (settings.activeCycleId !== c.id) setActiveCycle(c.id)
      },
      savePlant: async (p) => need().set(`${base()}/plants/${p.id}`, { ...p, schemaVersion: SCHEMA.plant, updatedAt: new Date().toISOString() }),
      saveEntry: async (e) => {
        const d = derive(e, cycle?.leafOffsetC)
        const full: Entry = { ...d, schemaVersion: SCHEMA.entry, targets: snapshot(targetsFor(e.date)), updatedAt: new Date().toISOString() }
        await need().set(`${base()}/entries/${e.id}`, full)
        return full
      },
      deleteEntry: async (id) => need().delete(`${base()}/entries/${id}`),
      saveEvent: async (e) => need().set(`${base()}/events/${e.id}`, { ...e, schemaVersion: SCHEMA.event }),
      deleteEvent: async (id) => need().delete(`${base()}/events/${id}`),
      saveMix: async (m) => need().set(`${base()}/mixes/${m.id}`, { ...m, schemaVersion: SCHEMA.mix }),
      deleteMix: async (id) => need().delete(`${base()}/mixes/${id}`),
      uploadPhoto: async (file) => {
        if (!stores) throw new Error("store not ready")
        return stores.photos.upload(await compressPhoto(file))
      },
      photoUrl: async (id) => (stores ? stores.photos.url(id) : ""),
    }
  }, [stores, loaded, cycle, plants, entries, events, mixes, targetsFor, cid, settings.activeCycleId, setActiveCycle])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGrow() {
  const c = React.useContext(Ctx)
  if (!c) throw new Error("useGrow must be used inside <GrowProvider>")
  return c
}

export { todayIso }
