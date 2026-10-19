// Status pills + ONE correction to make, from the latest entry and the day's targets.
// Correction wording follows the fiche (Athena): bigger shots/more runoff lowers substrate EC,
// smaller shots raise it; manual: if the substrate has not dried back, don't water.
import type { Entry, WaterMode } from "@/model/types"
import type { DayTargets, Target } from "./targets"

export type Status = "ok" | "warn" | "bad"
export type MetricKey = "dryback" | "runoffPct" | "ecIn" | "ecRunoff" | "phIn" | "phRunoff" | "vpd" | "dli"

/** pH tolerance (lot 10c): 0.2 outside the range is "à surveiller", further is "à corriger" (6.8 in coco is bad). */
export const PH_MARGIN = 0.2

/**
 * In range → ok; within one band width (or 10 % of the value for single-point targets) → warn; else bad. pH metrics use
 * an absolute margin of 0.2 instead (a relative one let pH 6.8 pass as a warning in coco).
 */
export function status(v: number, t: Pick<Target, "lo" | "hi">, metric?: string): Status {
  if (v >= t.lo && v <= t.hi) return "ok"
  const margin = metric?.startsWith("ph") ? PH_MARGIN : Math.max(t.hi - t.lo, Math.abs(t.hi) * 0.1)
  return v >= t.lo - margin - 1e-9 && v <= t.hi + margin + 1e-9 ? "warn" : "bad"
}

export function pills(e: Entry, t: DayTargets): Partial<Record<MetricKey, Status>> {
  const out: Partial<Record<MetricKey, Status>> = {}
  for (const k of ["dryback", "runoffPct", "ecIn", "ecRunoff", "phIn", "phRunoff", "vpd", "dli"] as const) {
    const v = e[k]
    const tg = t[k]
    if (typeof v === "number" && tg) out[k] = status(v, tg, k)
  }
  return out
}

export type Advice = {
  metric: MetricKey
  status: Exclude<Status, "ok">
  dir: "high" | "low"
  /** dictionary group advice.<metric>.<dir>: has .title, and .body or .auto/.manual */
  key: string
  bodyKey: string
  vars: Record<string, number>
}

// Priority when several values are off: root-zone first, then solution, then climate and light.
const ORDER: MetricKey[] = ["phRunoff", "ecRunoff", "dryback", "runoffPct", "phIn", "ecIn", "vpd", "dli"]

export function oneCorrection(e: Entry, t: DayTargets, mode: WaterMode): Advice | null {
  const p = pills(e, t)
  const off = ORDER.filter((k) => p[k] && p[k] !== "ok")
  if (!off.length) return null
  const worst = off.find((k) => p[k] === "bad") ?? off[0]
  const tg = t[worst]!
  const v = e[worst] as number
  const dir = v > tg.hi ? "high" : "low"
  const modeSpecific = worst === "ecRunoff" || worst === "dryback" || worst === "runoffPct"
  return {
    metric: worst,
    status: p[worst] as "warn" | "bad",
    dir,
    key: `advice.${worst}.${dir}`,
    bodyKey: `advice.${worst}.${dir}.${modeSpecific ? mode : "body"}`,
    vars: { value: v, lo: tg.lo, hi: tg.hi, aim: dir === "high" ? tg.lo : tg.hi },
  }
}
