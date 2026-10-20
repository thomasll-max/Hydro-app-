// The page of a space (lot 10l1, planche « Les menus »): which cycle step is offered and when, and the day's watering
// in two lines. Pure, tested.
import type { Cycle, IsoDate } from "@/model/types"
import type { ProgramRow } from "./program"
import { daysBetween } from "./stage"
import { expectedHarvest, nextStep, type CycleStep } from "./steps"

/** A step is « proche » when its planned day is at most this many days ahead (or already past). */
export const STEP_SOON_DAYS = 7

/**
 * The step of the cycle offered in the state block, with the days until its planned day (null: no day planned). The
 * 12/12 follows `plannedFlipDate`, the harvest the expected one (12/12 + planned weeks). A step whose day is further
 * than a week away is not offered; a step without a planned day (the veg, a 12/12 never planned) stays at hand.
 */
export function stepDue(c: Pick<Cycle, "germinationDate" | "vegDate" | "transferDate" | "flipDate" | "harvestDate" | "archived" | "plannedFlipDate" | "flowerWeeks">, today: IsoDate): { step: CycleStep; days: number | null } | null {
  const step = nextStep(c, today)
  if (!step) return null
  const date = step === "harvest" ? expectedHarvest(c) : step === "flip" ? c.plannedFlipDate : undefined
  if (!date) return { step, days: null }
  const days = daysBetween(today, date)
  return days <= STEP_SOON_DAYS ? { step, days } : null
}

const WATER: ProgramRow["kind"][] = ["shot", "manual", "inst"]

/**
 * The day's watering in two lines: the doses done in the phase under way (« P1 · 5/5 doses faites ») and the next dose
 * (« 11:20 · P2 1/4 · 450 mL »); `over` once the last dose of the day is past (« Plus d'arrosage : séchage »).
 * `nextI` is `nextIndex` of the program (−1: the day is done).
 */
export function waterDay(rows: ProgramRow[], nextI: number): { done?: { phase: ProgramRow["phase"]; n: number; total: number }; next?: ProgramRow; over: boolean } {
  const cut = nextI < 0 ? rows.length : nextI
  const water = rows.map((r, i) => ({ r, i })).filter(({ r }) => WATER.includes(r.kind))
  const past = water.filter(({ i }) => i < cut)
  const last = past.at(-1)?.r
  const next = water.find(({ i }) => i >= cut)?.r
  const done = last && { phase: last.phase, n: past.filter(({ r }) => r.phase === last.phase).length, total: last.total ?? water.filter(({ r }) => r.phase === last.phase).length }
  return { ...(done ? { done } : {}), ...(next ? { next } : {}), over: !next && water.length > 0 }
}
