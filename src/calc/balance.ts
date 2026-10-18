// pH / Balance (spec §6, lot 5). Balance raises the pH: no fixed dose (Athena), steps of 1 mL per 4 L, measuring after
// each step. The amount is learned from the tanks already saved (at least 2), and the titration starts at 80 % of the
// prediction. Above the target, nothing is suggested: no dose is invented to bring the pH back down.
import type { IsoDate, Mix, Range } from "@/model/types"
import { balanceStepMl } from "@/data/nutrients"

/** Share of the predicted amount poured at once, before going on by steps. */
export const START_FRACTION = 0.8
/** Tanks needed before predicting. */
export const MIN_TANKS = 2

export type TankBalance = { date: IsoDate; volumeL: number; totalMl: number; phBefore?: number; phAfter?: number }

/** Balance a saved tank took: the known amount poured first + what was added while titrating. */
export function balanceTotalMl(m: Pick<Mix, "volumeL" | "balanceMlPer10L" | "balanceAddedMl">): number | undefined {
  if (m.balanceMlPer10L == null && m.balanceAddedMl == null) return undefined
  return Math.round(((m.balanceMlPer10L ?? 0) * (m.volumeL / 10) + (m.balanceAddedMl ?? 0)) * 10) / 10
}

/** Tanks of a line with a known Balance total, newest first. */
export function balanceHistory(mixes: Mix[], line?: string): TankBalance[] {
  return mixes
    .filter((m) => (!line || !m.line || m.line === line) && m.volumeL > 0 && m.kind !== "flush")
    .flatMap((m): TankBalance[] => {
      const totalMl = balanceTotalMl(m)
      return totalMl == null ? [] : [{ date: m.date, volumeL: m.volumeL, totalMl, phBefore: m.phBefore, phAfter: m.ph }]
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export type Prediction = {
  /** Predicted total for this tank (mL). */
  predictedMl: number
  /** Poured at once: 80 % of the prediction. */
  startMl: number
  /** "perPh": mL per 10 L per pH unit raised (needs pH before/after); "per10L": mL per 10 L. */
  basis: "perPh" | "per10L"
  rate: number
  tanks: number
}

const r1 = (x: number) => Math.round(x * 10) / 10

/**
 * Learned from at least 2 tanks. With the pH before of this tank and of the past tanks, the rate is per pH unit raised
 * (aiming at the middle of the target); otherwise per 10 L. Null when there is not enough history.
 */
export function predictBalance(history: TankBalance[], volumeL: number, now?: { phBefore?: number; target?: Range }, n = 4): Prediction | null {
  if (volumeL <= 0) return null
  const recent = history.slice(0, n)
  if (recent.length < MIN_TANKS) return null
  const k = volumeL / 10
  const withPh = recent.filter((h) => h.phBefore != null && h.phAfter != null && h.phAfter > h.phBefore)
  if (now?.phBefore != null && now.target && withPh.length >= MIN_TANKS) {
    const rate = withPh.reduce((s, h) => s + h.totalMl / (h.volumeL / 10) / (h.phAfter! - h.phBefore!), 0) / withPh.length
    const rise = (now.target.lo + now.target.hi) / 2 - now.phBefore
    if (rise <= 0) return { predictedMl: 0, startMl: 0, basis: "perPh", rate: r1(rate), tanks: withPh.length }
    const predictedMl = r1(rate * rise * k)
    return { predictedMl, startMl: r1(predictedMl * START_FRACTION), basis: "perPh", rate: r1(rate), tanks: withPh.length }
  }
  const rate = recent.reduce((s, h) => s + h.totalMl / (h.volumeL / 10), 0) / recent.length
  const predictedMl = r1(rate * k)
  return { predictedMl, startMl: r1(predictedMl * START_FRACTION), basis: "per10L", rate: r1(rate * 100) / 100, tanks: recent.length }
}

export type Titration = { volumeL: number; startMl: number; steps: number }

/** Total poured so far: the start (if any) + steps of 1 mL per 4 L. */
export function titrationTotal(t: Titration): { stepMl: number; totalMl: number } {
  const stepMl = balanceStepMl(t.volumeL)
  return { stepMl, totalMl: r1(t.startMl + t.steps * stepMl) }
}

/** Where a reading stands against the target: go on, done, or over (no dose suggested to come back down). */
export function phStatus(ph: number | undefined, target: Range): "unknown" | "low" | "ok" | "over" {
  if (ph == null) return "unknown"
  if (ph < target.lo) return "low"
  if (ph > target.hi) return "over"
  return "ok"
}
