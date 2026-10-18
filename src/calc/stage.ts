import type { Cycle, IsoDate, StageKey } from "@/model/types"

const DAY = 86_400_000
export function toUtc(d: IsoDate): number {
  const [y, m, dd] = d.split("-").map(Number)
  return Date.UTC(y, m - 1, dd)
}
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY)
}
export function addDays(d: IsoDate, n: number): IsoDate {
  return new Date(toUtc(d) + n * DAY).toISOString().slice(0, 10)
}
export function todayIso(now = new Date()): IsoDate {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export type StageInfo = {
  key: StageKey | "notStarted"
  /** Day number in the current phase: flowering counts from the 12/12 day (= day 1); before that, plant age from germination (= day 1). */
  day: number
  week: number
  /** Flowering day and week, when flowering. */
  flowerDay?: number
  flowerWeek?: number
}

/** Athena precision table: flowering weeks 1–4 stretch, 5–7 bulking, 8–9 finish; coco flush = last 3 days. */
export function stageOn(cycle: Pick<Cycle, "germinationDate" | "transferDate" | "flipDate" | "flowerWeeks" | "harvestDate">, date: IsoDate): StageInfo {
  if (cycle.harvestDate && date >= cycle.harvestDate) return { key: "harvested", day: 0, week: 0 }
  if (cycle.flipDate && date >= cycle.flipDate) {
    const day = daysBetween(cycle.flipDate, date) + 1
    const week = Math.ceil(day / 7)
    const total = cycle.flowerWeeks * 7
    const key: StageKey = day > total - 3 ? "flush" : week <= 4 ? "stretch" : week <= 7 ? "bulk" : "finish"
    return { key, day, week, flowerDay: day, flowerWeek: week }
  }
  if (cycle.germinationDate && date >= cycle.germinationDate) {
    const day = daysBetween(cycle.germinationDate, date) + 1
    const week = Math.ceil(day / 7)
    const inRain = cycle.transferDate && date >= cycle.transferDate
    return { key: inRain ? "veg" : "seedling", day, week }
  }
  return { key: "notStarted", day: 0, week: 0 }
}

/** Planned first day of Fade (start of flowering week 8, Athena). */
export function fadeStart(cycle: Pick<Cycle, "flipDate">): IsoDate | undefined {
  return cycle.flipDate ? addDays(cycle.flipDate, 7 * 7) : undefined
}
/** First of the 3 flush days before the planned harvest (Athena, coco). */
export function flushStart(cycle: Pick<Cycle, "flipDate" | "flowerWeeks">): IsoDate | undefined {
  return cycle.flipDate ? addDays(cycle.flipDate, cycle.flowerWeeks * 7 - 3) : undefined
}
export function plannedHarvest(cycle: Pick<Cycle, "flipDate" | "flowerWeeks">): IsoDate | undefined {
  return cycle.flipDate ? addDays(cycle.flipDate, cycle.flowerWeeks * 7) : undefined
}
