// Cycle steps in one gesture on the day (lot 10b, decision of Thomas): "Passer en végé", "Passer en 12/12", "Récolter".
// Each step only sets its real date; the planned harvest is shown, never written as the real one.
import type { Equipment, EquipmentAssignment } from "@/model/grow"
import { SCHEMA, type Cycle, type GrowEvent, type IsoDate, type Substrate } from "@/model/types"
import { equipmentAt, spaceIrrigation } from "@/equipment/calc"
import { plannedHarvest } from "./stage"

export const STEPS = ["veg", "flip", "harvest"] as const
export type CycleStep = (typeof STEPS)[number]
/** Real date written by each step. */
export const STEP_FIELD: Record<CycleStep, "vegDate" | "flipDate" | "harvestDate"> = { veg: "vegDate", flip: "flipDate", harvest: "harvestDate" }

/** The step that comes next for a running cycle, or null (not started yet, already harvested). */
export function nextStep(c: Pick<Cycle, "germinationDate" | "vegDate" | "transferDate" | "flipDate" | "harvestDate" | "archived">, today: IsoDate): CycleStep | null {
  if (c.archived || c.harvestDate) return null
  if (c.flipDate) return "harvest"
  if (!c.germinationDate || today < c.germinationDate) return null
  const vegFrom = c.vegDate ?? c.transferDate
  return vegFrom && today >= vegFrom ? "flip" : "veg"
}

/** The cycle with the step done on `date`: only that real date is written. */
export function applyStep<C extends Cycle>(c: C, step: CycleStep, date: IsoDate): C {
  return { ...c, [STEP_FIELD[step]]: date }
}

/** "Annuler" right after a step: its date goes back to what it was (usually nothing). */
export function undoStep<C extends Cycle>(c: C, step: CycleStep, previous?: IsoDate): C {
  const out = { ...c }
  if (previous) out[STEP_FIELD[step]] = previous
  else delete out[STEP_FIELD[step]]
  return out
}

/** "Récolte prévue ≈ …": 12/12 + planned flowering weeks. Shown, never stored as the harvest. */
export function expectedHarvest(c: Pick<Cycle, "flipDate" | "flowerWeeks" | "harvestDate">): IsoDate | undefined {
  return c.harvestDate ? undefined : plannedHarvest(c)
}

/** Auto events of the cycle dates (vertical markers on the charts): one per date, id `${cycle}_auto-${type}`. */
export const AUTO_EVENTS: [keyof Cycle, GrowEvent["type"]][] = [
  ["vegDate", "veg"],
  ["flipDate", "flip"],
  ["transferDate", "transplant"],
  ["harvestDate", "harvest"],
]

/**
 * Events to write when a cycle is saved (lot 10b): a new date creates its event, a moved date moves it (note and
 * products such as Great White are kept), a cleared date removes it. Returns [id, event | null].
 */
export function autoEventOps(prev: Cycle | undefined, next: Cycle, existing: GrowEvent[], now: string): [string, GrowEvent | null][] {
  const ops: [string, GrowEvent | null][] = []
  for (const [k, type] of AUTO_EVENTS) {
    const id = `${next.id}_auto-${type}`
    const was = prev?.[k] as string | undefined
    const date = next[k] as string | undefined
    const ev = existing.find((e) => e.id === id)
    if (!date) {
      if (was || ev) ops.push([id, null])
      continue
    }
    if (date === was && ev) continue
    ops.push([id, ev ? { ...ev, date, spaceId: ev.spaceId ?? next.spaceId } : { schemaVersion: SCHEMA.event, id, date, type, cycleId: next.id, spaceId: next.spaceId, createdAt: now }])
  }
  return ops
}

/** Pots, flow, lamps, watering mode and substrate of a new cycle, from the space's equipment (nothing guessed). */
export function equipmentPrefill(spaceId: string | undefined, date: IsoDate, equipment: Equipment[], assignments: EquipmentAssignment[]) {
  if (!spaceId) return { lights: "" }
  const irr = spaceIrrigation(spaceId, date, equipment, assignments)
  const lamps = equipmentAt(spaceId, date, assignments)
    .map((a) => equipment.find((e) => e.id === a.equipmentId))
    .filter((e): e is Equipment => !!e && e.type === "lamp")
  const sub = irr.substrate?.toLowerCase()
  const substrate: Substrate | undefined = sub?.includes("coco") ? "coco" : sub?.includes("70") ? "mix7030" : sub?.includes("terre") || sub?.includes("soil") ? "soil" : undefined
  return {
    potVolumeL: irr.potL.ok ? irr.potL.value : undefined,
    potCount: irr.potCount,
    flowMlPerMin: irr.flow.ok ? irr.flow.value : undefined,
    lights: lamps.map((l) => l.name).join(" · "),
    /** A pump in the space means automatic watering; none means by hand. */
    waterMode: irr.pumpName ? ("auto" as const) : ("manual" as const),
    substrate,
  }
}
