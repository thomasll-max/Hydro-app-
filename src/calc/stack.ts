// Stack (lot 14b, official Stack page, docs/athena-fiche.md « Compléments hors Handbook »): when it may be given, its
// doses converted from mL per US gallon, and the week's tank or spray it already went in.
import { perGalToPerL, STACK } from "@/data/nutrients"
import type { Spray } from "@/model/grow"
import type { Cycle, IsoDate, Mix } from "@/model/types"
import { addDays, daysBetween, stageOn } from "./stage"

const r2 = (x: number) => Math.round(x * 100) / 100

/** In the tank: 1–2 mL/gal → mL per litre (0.26–0.53) and per 10 L, exact (rounded only where shown). */
export const stackDrenchPerL = (): [number, number] => [perGalToPerL(STACK.drench.mlPerGal[0]), perGalToPerL(STACK.drench.mlPerGal[1])]
export const stackDrenchPer10L = (): [number, number] => stackDrenchPerL().map((x) => x * 10) as [number, number]
/** Sprayed: 7 mL/gal → 1.85 mL per litre. */
export const stackFoliarPerL = () => perGalToPerL(STACK.foliar.mlPerGal)
/** What the screens show: per litre, 2 decimals (« converti »). */
export const shownPerL = (x: number) => r2(x)

/** mL of Stack for a sprayer of `litres` (1 decimal). */
export const stackSprayMl = (litres: number) => Math.round(litres * stackFoliarPerL() * 10) / 10

export type StackWindow = { ok: true; until?: IsoDate } | { ok: false; reason: "early" | "noFlip" | "late" | "notStarted" }

/**
 * From the last week of veg (the 7 days before the 12/12, done or planned) to the end of flowering week 3. Without a
 * 12/12 date in veg, the window cannot be known: Stack is not offered, and it is said why.
 */
export function stackWindow(cycle: Pick<Cycle, "germinationDate" | "vegDate" | "transferDate" | "flipDate" | "plannedFlipDate" | "flowerWeeks" | "harvestDate"> | null | undefined, date: IsoDate): StackWindow {
  if (!cycle) return { ok: false, reason: "notStarted" }
  const s = stageOn(cycle, date)
  if (s.key === "notStarted") return { ok: false, reason: "notStarted" }
  if (s.key === "seedling") return { ok: false, reason: "early" }
  if (s.key === "harvested" || s.key === "flush") return { ok: false, reason: "late" }
  const flip = cycle.flipDate ?? cycle.plannedFlipDate
  const until = flip ? addDays(flip, STACK.lastFlowerWeek * 7 - 1) : undefined
  if (s.key === "veg") {
    if (!flip) return { ok: false, reason: "noFlip" }
    return daysBetween(date, flip) <= 7 ? { ok: true, until } : { ok: false, reason: "early" }
  }
  return (s.flowerWeek ?? 1) <= STACK.lastFlowerWeek ? { ok: true, until } : { ok: false, reason: "late" }
}

/** Once a week: the date of a tank of these spaces with Stack in the last 6 days, if any. */
export function stackTankThisWeek(mixes: Mix[], spaceIds: string[], date: IsoDate): IsoDate | undefined {
  return mixes
    .filter((m) => m.date <= date && daysBetween(m.date, date) < 7 && m.spaceIds?.some((id) => spaceIds.includes(id)) && m.items?.some((i) => i.id === "stack" && i.qty != null))
    .map((m) => m.date)
    .sort()
    .at(-1)
}

/** Once a week: the date of a spray of this space with Stack (alone or with IPW) in the last 6 days, if any. */
export function stackSprayThisWeek(sprays: Spray[], spaceId: string, date: IsoDate): IsoDate | undefined {
  return sprays
    .filter((s) => s.date <= date && daysBetween(s.date, date) < 7 && s.spaceIds.includes(spaceId) && (s.product === "stack" || s.stackMlPerL != null))
    .map((s) => s.date)
    .sort()
    .at(-1)
}
