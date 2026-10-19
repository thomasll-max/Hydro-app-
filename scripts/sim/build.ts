// Construit la sauvegarde « un an » et des instantanés « tel que c'était » à des dates clés.
import fs from "node:fs"
import path from "node:path"
import { data, START, TODAY, OUT } from "./generate"
import { seriesDates } from "../../src/calendar/rrule"
import { addDays } from "../../src/calc/stage"
import { cycleSpaceAt } from "../../src/model/grow-ops"
import { BACKUP_FORMAT, BACKUP_VERSION, type Backup } from "../../src/lib/backup"
import type { Cycle, IsoDate } from "../../src/model/types"
import type { Reminder } from "../../src/model/grow"
import { clean } from "../../src/store/doc-store"

const LAST = addDays(TODAY, -1)
// Rappels : occurrences passées cochées, sauf environ 1 sur 8 (oublis).
let k = 7
for (const rm of data.reminders) {
  const day = rm.start.slice(0, 10)
  rm.done = seriesDates(day, rm.rrule, LAST).filter((d) => d <= LAST && (k = (k * 31 + 11) % 97) % 8 !== 0)
}

/** État de la base tel qu'il était le matin du jour D (rien de ce qui arrive le jour D ou après). */
export function asOf(D: IsoDate) {
  const before = (d?: string) => !!d && d < D
  const cycles = data.cycles
    .filter((c) => before(c.germinationDate))
    .map((c0) => {
      const c: Cycle = structuredClone(c0)
      c.transfers = (c.transfers ?? []).filter((t) => before(t.date))
      if (!before(c.transferDate)) delete c.transferDate
      if (!before(c.flipDate)) delete c.flipDate
      if (!before(c.harvestDate)) {
        delete c.harvestDate
        delete c.harvest
      } else if (c.harvest && !before(c.harvest.curingStart)) {
        delete c.harvest.curingStart
        delete c.harvest.jarRh
        delete c.harvest.tasting
      }
      c.spaceId = cycleSpaceAt({ ...c0, transfers: c0.transfers }, addDays(D, -1))
      return c
    })
  const ids = new Set(cycles.map((c) => c.id))
  const pump = data.pumpMeasures.filter((d) => d < D).at(-1) ?? START
  const equipment = data.equipment.map((e) => (e.id === "rain" ? { ...e, pump: { ...e.pump, flowMeasuredAt: pump } } : e))
  const spaces = data.spaces.map((s) => (s.id === "floraison" && D > data.SENSOR_FROM ? { ...s, irrigation: { drybackMethod: "acinfinity" as const } } : s))
  const reminders: Reminder[] = data.reminders.map((r) => ({ ...r, done: (r.done ?? []).filter((d) => d < D) }))
  const stocks = data.stocks.filter((s) => s.madeOn < D).map((s) => (s.finishedOn && s.finishedOn >= D ? { ...s, finishedOn: undefined } : s))
  return {
    grow: data.grow,
    spaces,
    equipment,
    assignments: data.assignments,
    customProducts: data.customProducts,
    cycles,
    plants: data.plants.filter((p) => ids.has(p.cycleId)),
    entries: data.entries.filter((e) => e.date < D),
    mixes: data.mixes.filter((m) => m.date < D),
    events: data.events.filter((e) => e.date < D),
    reminders,
    concentrateStocks: stocks,
    sprays: [],
  }
}

export function toBackup(x: ReturnType<typeof asOf>, D: IsoDate): Backup {
  const by = <T extends { id: string }>(a: T[]) => Object.fromEntries(a.map((d) => [d.id, clean(d) as Record<string, unknown>]))
  const active = x.cycles.find((c) => c.spaceId === "floraison" && !c.harvestDate) ?? x.cycles.at(-1)
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: `${D}T06:00:00.000Z`,
    source: "simulation",
    collections: {
      grow: { main: clean(x.grow) as Record<string, unknown> },
      spaces: by(x.spaces),
      cycles: by(x.cycles),
      plants: by(x.plants),
      entries: by(x.entries),
      events: by(x.events),
      mixes: by(x.mixes),
      reminders: by(x.reminders),
      concentrateStocks: by(x.concentrateStocks),
      customProducts: by(x.customProducts),
      equipment: by(x.equipment),
      equipmentAssignments: by(x.assignments),
      settings: { main: { schemaVersion: 1, theme: "system", lang: "fr", space: "all", concentrate: 226, ...(active ? { activeCycleId: active.id } : {}), updatedAt: `${D}T06:00:00.000Z` } },
    },
  }
}

/** Moments clés pour les captures. */
export const CHECKPOINTS: { date: IsoDate; label: string }[] = [
  { date: "2025-10-23", label: "Jour 4 : germination du cycle 1 dans la Colonne" },
  { date: "2025-11-26", label: "Cycle 1 : 3e jour de végé en Floraison" },
  { date: "2025-12-19", label: "Cycle 1 : semaine 3 de floraison (stretch), cycle 2 pas encore lancé" },
  { date: "2026-01-21", label: "Cycle 1 : semaine 8 (Fade), cycle 2 en Colonne" },
  { date: "2026-02-01", label: "Cycle 1 : rinçage, 2 jours avant la récolte" },
  { date: "2026-02-08", label: "Récolte 1 au séchoir, cycle 2 en végé en Floraison" },
  { date: "2026-07-25", label: "Retour de vacances (5 jours sans saisie)" },
  { date: "2026-09-10", label: "Cycle 5 : passage au capteur AC Infinity, cycle 4 au séchoir" },
  { date: TODAY, label: "Aujourd'hui : un an de données" },
]

if (process.argv[1]?.endsWith("build.ts")) {
  fs.mkdirSync(path.join(OUT, "checkpoints"), { recursive: true })
  const full = toBackup(asOf(TODAY), TODAY)
  fs.writeFileSync(path.join(OUT, "hydro-simulation-1an.json"), JSON.stringify(full, null, 1))
  for (const cp of CHECKPOINTS) fs.writeFileSync(path.join(OUT, "checkpoints", `${cp.date}.json`), JSON.stringify(toBackup(asOf(cp.date), cp.date)))
  fs.writeFileSync(path.join(OUT, "checkpoints", "index.json"), JSON.stringify(CHECKPOINTS, null, 1))
  const n = (c: keyof Backup["collections"]) => Object.keys(full.collections[c] ?? {}).length
  console.log(JSON.stringify({ entries: n("entries"), mixes: n("mixes"), events: n("events"), cycles: n("cycles"), stocks: n("concentrateStocks"), reminders: n("reminders"), injected: data.injected.length, plans: data.plans.map((p) => `${p.n}: ${p.germ} → ${p.transfer} → ${p.flip} → ${p.harvest}`) }, null, 1))
}
