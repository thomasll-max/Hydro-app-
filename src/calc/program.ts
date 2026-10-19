// Daily irrigation program — logic carried over from the "Plan d'arrosage" page.
// Athena (fiche): P0 = 1–2 h after lights-on, shots of 2–6 % of the pot, 15–30 min apart in P1,
// 2–7 % runoff at the end of P1; manual method = one watering at lights-on, 10–25 % runoff, only once dried back.
// P2 counts/spacings and the last-shot time per stage are starting points from that page, to be tuned with the morning check.
import type { Cycle, StageKey } from "@/model/types"
import { potPctToMl, shotSeconds } from "./formulas"

export type SteerStage = "inst" | "veg" | "str" | "mas" | "fin"
export type ProgramRow = {
  time: string
  minutes: number
  phase: "P0" | "P1" | "P2" | "P3" | "MAN" | "INST" | "OFF"
  kind: "lightsOn" | "lightsOff" | "shot" | "last" | "manual" | "inst"
  n?: number
  total?: number
  ml?: number
  seconds?: number
  optional?: boolean
  noteKey?: string
}

export const hm = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}
export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + (m || 0)
}

/** Cycle stage → steering stage of the tool. */
export function steerStage(stage: StageKey | "notStarted", establishing?: boolean): SteerStage | null {
  if (stage === "seedling" || stage === "notStarted" || stage === "harvested" || stage === "flush") return null
  if (stage === "veg") return establishing ? "inst" : "veg"
  if (stage === "stretch") return "str"
  if (stage === "bulk") return "mas"
  return "fin"
}

export const PHOTOPERIOD: Record<SteerStage, number> = { inst: 18, veg: 18, str: 12, mas: 12, fin: 12 }

export type ProgramInput = Pick<Cycle, "waterMode" | "substrate" | "lightsOn" | "potVolumeL" | "shotPct" | "p1Shots" | "p1IntervalMin" | "p0DelayMin" | "flowMlPerMin">

/** Precision (P0–P3) only for coco on the automatic pump; everything else uses the manual method. */
export function isPrecision(c: Pick<Cycle, "waterMode" | "substrate">): boolean {
  return c.waterMode === "auto" && c.substrate === "coco"
}

export function buildProgram(c: ProgramInput, stage: SteerStage, photoperiodH = PHOTOPERIOD[stage]): ProgramRow[] {
  const on = toMin(c.lightsOn)
  const L = photoperiodH * 60
  const off = on + L
  // Pot volume unknown: times only, no volume (never a guessed pot).
  const shot = c.potVolumeL ? Math.round(potPctToMl(c.potVolumeL, c.shotPct)) : undefined
  const sec = (ml?: number) => (ml != null && c.flowMlPerMin && c.waterMode === "auto" ? Math.round(shotSeconds(ml, c.flowMlPerMin)) : undefined)
  const n = Math.max(1, Math.round(c.p1Shots))
  const gap = Math.max(5, c.p1IntervalMin)
  const rows: ProgramRow[] = [{ time: hm(on), minutes: on, phase: "P0", kind: "lightsOn" }]
  const push = (r: Omit<ProgramRow, "time">) => rows.push({ ...r, time: hm(r.minutes) })

  if (stage === "inst") {
    // Small doses near the stem while roots have not reached the pot edges (no runoff aimed).
    const small = c.potVolumeL ? Math.min(300, Math.max(100, Math.round((c.potVolumeL * 13.3) / 10) * 10)) : undefined
    ;[on + 120, on + L * 0.5].forEach((m, i) =>
      push({ minutes: Math.round(m), phase: "INST", kind: "inst", n: i + 1, total: 2, ml: small, seconds: sec(small), noteKey: "onlyIfLighter" }),
    )
  } else if (isPrecision(c)) {
    const p0end = on + c.p0DelayMin
    const p1end = p0end + (n - 1) * gap
    for (let i = 0; i < n; i++)
      push({ minutes: p0end + i * gap, phase: "P1", kind: "shot", n: i + 1, total: n, ml: shot, seconds: sec(shot), noteKey: i === n - 1 ? "sampleHere" : undefined })
    let p2: number[] = []
    let optional = false
    if (stage === "veg") {
      optional = true
      for (let m = p1end + 150; m <= off - 180 + 1; m += 150) p2.push(m)
    } else if (stage === "str") {
      const last = on + 450
      p2 = [p1end + (last - p1end) / 2, last]
      optional = true
    } else if (stage === "mas") {
      for (let m = p1end + 75; m <= on + 570 + 1; m += 75) p2.push(m)
    } else if (stage === "fin") {
      p2 = [on + 390]
      optional = true
    }
    p2 = p2.filter((m) => m > p1end)
    p2.forEach((m, i) =>
      push({ minutes: Math.round(m), phase: "P2", kind: "shot", n: i + 1, total: p2.length, ml: shot, seconds: sec(shot), optional, noteKey: optional ? `p2opt_${stage}` : undefined }),
    )
    const lastShot = p2.length ? p2[p2.length - 1] : p1end
    push({ minutes: Math.round(lastShot) + 1, phase: "P3", kind: "last" })
  } else {
    // Manual method: one morning watering at lights-on, split into passes so the substrate absorbs.
    const start = on + 30
    for (let j = 0; j < n; j++)
      push({ minutes: start + j * gap, phase: "MAN", kind: "manual", n: j + 1, total: n, ml: shot, seconds: sec(shot), noteKey: j === 0 ? "onlyIfDried" : j === n - 1 ? "sampleHere" : undefined })
    push({ minutes: start + (n - 1) * gap + 1, phase: "P3", kind: "last" })
  }
  push({ minutes: off, phase: "OFF", kind: "lightsOff" })
  return rows.sort((a, b) => a.minutes - b.minutes)
}

/** Total programmed volume per pot (mL), with optional shots counted apart. */
export function programTotals(rows: ProgramRow[]) {
  let fixed = 0
  let optional = 0
  for (const r of rows) if (r.ml) r.optional ? (optional += r.ml) : (fixed += r.ml)
  return { fixed, optional }
}

/**
 * Index of the next row from a time of day (minutes), or −1 when the day is done. A light period that runs past
 * midnight (lights on at 18:00 for 12 h) is still yesterday's program in the small hours (lot 10c).
 */
export function nextIndex(rows: ProgramRow[], nowMin: number): number {
  const end = rows.length ? rows[rows.length - 1].minutes : 0
  const t = end > 1440 && nowMin + 1440 <= end ? nowMin + 1440 : nowMin
  return rows.findIndex((r) => r.minutes >= t)
}

// ---------- Sensor mode (AC Infinity soil sensor), from the Bonorum "Crop Steering Light" guide ----------
export type SensorPhase = "veg" | "gen" | "bulk" | "ripe"
export const SENSOR: Record<SensorPhase, { light: number; lastBeforeOffMin: number; trigger: "base" | "peak"; runoff: string; shots: string }> = {
  veg: { light: 18, lastBeforeOffMin: 180, trigger: "peak", runoff: "5–15", shots: "4–8" },
  gen: { light: 12, lastBeforeOffMin: 150, trigger: "base", runoff: "0–5", shots: "0–4" },
  bulk: { light: 12, lastBeforeOffMin: 90, trigger: "peak", runoff: "5–15", shots: "≥ 4" },
  ripe: { light: 12, lastBeforeOffMin: 180, trigger: "base", runoff: "0–5", shots: "2–4" },
}

export type SensorPlan = {
  trigger: number | null // % on the sensor
  dryback: number | null
  p1Ml: number
  p2Ml: number
  p1Seconds?: number
  p2Seconds?: number
  tooShort: boolean // guide: at least 3 s of pump per shot
  rows: ProgramRow[]
}

/** Generative phases trigger at the morning base; vegetative and bulking at the peak minus 2 points. Durations use the formula, not Bonorum's seconds table (off by ×10). */
export function sensorPlan(c: Pick<Cycle, "lightsOn" | "potVolumeL" | "flowMlPerMin">, phase: SensorPhase, base: number | null, peak: number | null, p2Pct: number): SensorPlan {
  const P = SENSOR[phase]
  const p2Ml = Math.round(potPctToMl(c.potVolumeL ?? 0, p2Pct))
  const p1Ml = p2Ml * 2
  const sec = (ml: number) => (c.flowMlPerMin ? shotSeconds(ml, c.flowMlPerMin) : undefined)
  const trigger = P.trigger === "base" ? base : peak != null ? peak - 2 : null
  const dryback = peak != null && base != null && peak > 0 ? ((peak - base) / peak) * 100 : null
  const on = toMin(c.lightsOn)
  const off = on + P.light * 60
  const p2s = sec(p2Ml)
  const rows: ProgramRow[] = [
    { time: hm(on), minutes: on, phase: "P0", kind: "lightsOn" },
    { time: hm(on + 60), minutes: on + 60, phase: "P1", kind: "shot", n: 1, total: 1, ml: p1Ml, seconds: sec(p1Ml) && Math.round(sec(p1Ml)!), noteKey: "sensorP1" },
    { time: hm(on + 105), minutes: on + 105, phase: "P2", kind: "shot", ml: p2Ml, seconds: p2s && Math.round(p2s), noteKey: "sensorP2" },
    { time: hm(off - P.lastBeforeOffMin), minutes: off - P.lastBeforeOffMin, phase: "P3", kind: "last" },
    { time: hm(off), minutes: off, phase: "OFF", kind: "lightsOff" },
  ]
  return { trigger, dryback, p1Ml, p2Ml, p1Seconds: sec(p1Ml), p2Seconds: p2s, tooShort: p2s != null && p2s < 3, rows }
}
