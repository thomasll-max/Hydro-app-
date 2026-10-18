// Entry helpers: ids, computed fields, prefill from the previous entry.
import { dli, dryback, round, runoffPct, vpd } from "@/calc/formulas"
import { SCHEMA, type Cycle, type DrybackMethod, type Entry, type IsoDate, type PlantId } from "./types"

/** entries/{YYYY-MM-DD}_{spaceId}[_{target}] (spec §12). */
export const entryId = (date: IsoDate, spaceId: string, plantId?: PlantId) => (plantId ? `${date}_${spaceId}_${plantId}` : `${date}_${spaceId}`)

/** Fill the computed fields (VPD, dryback by weighing or by sensor, runoff %, DLI) from the measured ones. */
export function derive(e: Entry, leafOffsetDefault = -2): Entry {
  const out = { ...e }
  const off = e.leafOffsetC ?? leafOffsetDefault
  out.vpd = e.tempDay != null && e.rh != null ? round(vpd(e.tempDay, e.rh, off), 2) : undefined
  out.dryback =
    e.weightPeakKg != null && e.weightMorningKg != null && e.weightPeakKg > 0
      ? round(dryback(e.weightPeakKg, e.weightMorningKg), 1)
      : undefined
  // Same formula as the weighing (Athena: (peak − trough) ÷ peak), kept apart: a sensor has its own scale.
  out.drybackSensor =
    e.sensorPeakPct != null && e.sensorMorningPct != null && e.sensorPeakPct > 0
      ? round(dryback(e.sensorPeakPct, e.sensorMorningPct), 1)
      : undefined
  // Runoff only from the runoff itself: a substrate moisture reading is not a runoff percentage.
  out.runoffPct = e.volumePerPotMl && e.runoffMl != null ? round(runoffPct(e.volumePerPotMl, e.runoffMl), 1) : undefined
  out.dli = e.ppfd != null && e.photoperiodH != null ? round(dli(e.ppfd, e.photoperiodH), 1) : undefined
  return out
}

/** Settings that usually stay the same from one day to the next: copied as values. */
export const CARRIED = ["volumePerPotMl", "shots", "ecIn", "phIn", "mixId", "lightPct", "lightHeightCm", "ppfd", "photoperiodH", "leafOffsetC", "sownCount"] as const
/** Daily measurements: yesterday's value is shown as a hint (placeholder), never saved unless typed. */
export const HINTED = ["tempDay", "tempNight", "rh", "weightMorningKg", "weightPeakKg", "runoffMl", "sensorPct", "sensorPeakPct", "sensorMorningPct", "ecRunoff", "phRunoff", "heightCm", "germinatedCount", "reservoirL"] as const

/** New entry for a space (and its running cycle, if any), prefilled from the previous one of the same scope. */
export function blankEntry(date: IsoDate, ctx: { spaceId: string; cycle?: Cycle | null }, prev: Entry | undefined, plantId?: PlantId): Entry {
  const now = new Date().toISOString()
  const { spaceId, cycle } = ctx
  const e: Entry = { schemaVersion: SCHEMA.entry, id: entryId(date, spaceId, plantId), date, spaceId, cycleId: cycle?.id, plantId, createdAt: now, updatedAt: now }
  if (!cycle) delete e.cycleId
  if (prev) for (const k of CARRIED) if (prev[k] != null) (e as Record<string, unknown>)[k] = prev[k]
  if (prev?.domeOn != null) e.domeOn = prev.domeOn
  if (cycle) {
    e.leafOffsetC ??= cycle.leafOffsetC
    e.shots ??= cycle.waterMode === "auto" ? cycle.p1Shots + (cycle.p2Shots ?? 0) : 1
  }
  return e
}

/** Most recent entry strictly before `date` for the same scope (room or one plant). */
export function previousEntry(entries: Entry[], date: IsoDate, plantId?: PlantId, spaceId?: string): Entry | undefined {
  return entries
    .filter((e) => e.date < date && e.plantId === plantId && (!spaceId || e.spaceId === spaceId))
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
}

export type EntryFilter = { plant: "all" | "room" | PlantId; tag: string; stage: string; space?: string }
/** History filter: by plant (or whole room), tag (observation or action) and stage (from the stored snapshot). */
export function filterEntries(list: Entry[], f: EntryFilter): Entry[] {
  return list.filter((e) => {
    if (f.space && f.space !== "all" && e.spaceId !== f.space) return false
    if (f.plant === "room" && e.plantId) return false
    if (f.plant !== "all" && f.plant !== "room" && e.plantId !== f.plant) return false
    if (f.tag !== "all" && !e.observations?.some((o) => o.tag === f.tag) && !e.actions?.includes(f.tag as never)) return false
    if (f.stage !== "all" && e.targets?.stage !== f.stage) return false
    return true
  })
}

/** Dryback method of a space (absent = weighing, as before the setting existed). */
export function drybackMethodOf(space?: { irrigation?: { drybackMethod?: DrybackMethod } } | null): DrybackMethod {
  return space?.irrigation?.drybackMethod ?? "weight"
}
