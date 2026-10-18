// Targets of the day by stage, watering mode and substrate. Each value carries its source.
// athena   = Athena Handbook FR V8 via claude/athena-pro-line-fiche.md
// spec     = values validated in the specification (§9)
// estimate = estimate, shown as such
// common   = common benchmark (not from the Handbook), labelled as such in the UI
import type { Cycle, Range, StageKey, Substrate, TargetsSnapshot, WaterMode } from "@/model/types"
import { getCatalog, type ManualPhase, type NutrientCatalog } from "@/data/nutrients"
import { phaseAt } from "./nutrients"

export type Src = "athena" | "spec" | "estimate" | "common"
export type Target = Range & { src: Src; page?: number }
export type DayTargets = { [K in keyof Omit<TargetsSnapshot, "stage">]?: Target } & { stage: StageKey; steer?: "vegetative" | "generative" | "mixed" }

const r = (lo: number, hi: number, src: Src, page?: number): Target => (page ? { lo, hi, src, page } : { lo, hi, src })

/** pH of solution and runoff (same ranges, Athena). */
export function phTarget(stage: StageKey, substrate: Substrate): Target {
  if (stage === "seedling") return r(5.6, 5.6, "athena")
  if (stage === "finish" || stage === "flush") return r(6.0, 6.4, "athena")
  if (substrate === "soil") return r(6.0, 6.4, "spec")
  if (substrate === "mix7030") return r(5.9, 6.3, "estimate")
  return r(5.8, 6.2, "athena")
}

/** Precision (auto, P0–P3) table — dryback and substrate EC (runoff as proxy) by stage. */
const AUTO: Partial<Record<StageKey, { dryback: Target; ecRunoff: Target; runoffPct: Target; steer: DayTargets["steer"] }>> = {
  veg: { dryback: r(25, 50, "athena"), ecRunoff: r(3, 5, "athena"), runoffPct: r(8, 16, "athena"), steer: "vegetative" },
  stretch: { dryback: r(40, 50, "athena"), ecRunoff: r(4, 10, "athena"), runoffPct: r(1, 7, "athena"), steer: "generative" },
  bulk: { dryback: r(30, 40, "athena"), ecRunoff: r(3.5, 6, "athena"), runoffPct: r(8, 16, "athena"), steer: "vegetative" },
  finish: { dryback: r(40, 50, "athena"), ecRunoff: r(3, 4, "athena"), runoffPct: r(8, 16, "athena"), steer: "mixed" },
}

/** Row of a line's manual method for a stage / flowering week (Pro p. 41, Blended p. 60). */
export function manualRow(cat: NutrientCatalog, stage: StageKey, flowerWeek?: number): ManualPhase | null {
  if (stage === "seedling" || stage === "harvested") return null
  if (stage === "veg") return cat.manual.find((m) => m.stage === "veg") ?? null
  if (stage === "flush") return cat.manual.find((m) => m.stage === "flush") ?? null
  const w = flowerWeek ?? (stage === "finish" ? 8 : stage === "bulk" ? 5 : 1)
  const rows = cat.manual.filter((m) => m.stage === "flower")
  return rows.find((m) => m.weeks && w >= m.weeks[0] && w <= m.weeks[1]) ?? rows[rows.length - 1] ?? null
}

/** Manual method (1 watering at lights-on, 10–25 % runoff): dryback, runoff EC and pH by week, from the line's catalog. */
function manual(stage: StageKey, flowerWeek: number | undefined, line: string | undefined, substrate: Substrate) {
  const run = r(10, 25, "athena")
  const row = manualRow(getCatalog(line), stage, flowerWeek)
  if (!row) return { runoffPct: run }
  const page = row.src.kind === "athena" ? row.src.page : undefined
  const out: Partial<DayTargets> = {
    dryback: r(row.dryback[0], row.dryback[1], "athena", page),
    ecRunoff: r(row.ecRunoff[0], row.ecRunoff[1], "athena", page),
    runoffPct: run,
  }
  // Coco in flower, manual method: solution and runoff pH 5.9–6.3 (spec §9); Fade / flush keep 6.0–6.4.
  if (substrate === "coco" && stage !== "veg" && stage !== "finish") out.phIn = out.phRunoff = r(row.ph[0], row.ph[1], "athena", page)
  return out
}

/** Common benchmarks (no CO2 added). Replaced by Handbook values in batch 4 if provided. */
const LIGHT: Partial<Record<StageKey, { ppfd: Target; dli: Target; vpd: Target }>> = {
  seedling: { ppfd: r(200, 400, "common"), dli: r(12, 25, "common"), vpd: r(0.4, 0.8, "common") },
  veg: { ppfd: r(400, 600, "common"), dli: r(25, 40, "common"), vpd: r(0.8, 1.2, "common") },
  stretch: { ppfd: r(600, 900, "common"), dli: r(30, 40, "common"), vpd: r(1.0, 1.5, "common") },
  bulk: { ppfd: r(600, 900, "common"), dli: r(30, 40, "common"), vpd: r(1.0, 1.5, "common") },
  finish: { ppfd: r(600, 900, "common"), dli: r(30, 40, "common"), vpd: r(1.2, 1.6, "common") },
  flush: { ppfd: r(600, 900, "common"), dli: r(30, 40, "common"), vpd: r(1.2, 1.6, "common") },
}

export function dayTargets(
  stage: StageKey | "notStarted",
  opts: { mode: WaterMode; substrate: Substrate; flowerWeek?: number; cycleNumber?: number; line?: string },
): DayTargets | null {
  if (stage === "notStarted" || stage === "harvested") return null
  const ph = phTarget(stage, opts.substrate)
  const t: DayTargets = { stage, phIn: ph, phRunoff: ph, ...LIGHT[stage] }
  // Solution EC: Athena clone/seedling row 2.0; cycle 1 runs 2.0–2.4 (spec); flush = plain water + Cleanse, EC < 0.1.
  const cat = getCatalog(opts.line)
  if (stage === "seedling") t.ecIn = r(2.0, 2.0, "athena")
  else if (stage === "flush") t.ecIn = r(0, 0.1, "athena")
  else if (!cat.ecTable) {
    // Liquid lines (Blended): the program's own EC by week (p. 58), never the Pro Line's 3.0.
    const ph = phaseAt(cat, stage === "veg" ? { stage: "veg" } : { stage: "flower", week: opts.flowerWeek ?? (stage === "finish" ? 8 : stage === "bulk" ? 5 : 1) })
    if (ph) t.ecIn = r(ph.ec, ph.ec, "athena", ph.src.kind === "athena" ? ph.src.page : undefined)
  } else t.ecIn = (opts.cycleNumber ?? 1) <= 1 ? r(2.0, 2.4, "spec") : r(3.0, 3.0, "athena")
  if (stage === "seedling" || stage === "flush") return t
  if (opts.mode === "auto") {
    const a = AUTO[stage]
    if (a) Object.assign(t, { dryback: a.dryback, ecRunoff: a.ecRunoff, runoffPct: a.runoffPct, steer: a.steer })
  } else Object.assign(t, manual(stage, opts.flowerWeek, opts.line, opts.substrate))
  return t
}

export function snapshot(t: DayTargets | null): TargetsSnapshot | undefined {
  if (!t) return undefined
  const out: TargetsSnapshot = { stage: t.stage }
  for (const k of ["dryback", "runoffPct", "ecIn", "ecRunoff", "phIn", "phRunoff", "ppfd", "dli", "vpd"] as const) {
    const v = t[k]
    if (v) out[k] = { lo: v.lo, hi: v.hi }
  }
  return out
}

export function cycleNumber(c: Pick<Cycle, "name">): number {
  const m = c.name.match(/\d+/)
  return m ? Number(m[0]) : 1
}
