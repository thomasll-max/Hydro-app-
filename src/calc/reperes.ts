// Repères: reference tables shown in Outils → Repères. Pro Line and, since lot 14a, Blended beside it (each table read
// from its own line's catalog: never a value of one line in the other's table).
import { ATHENA_CONC_ML, ATHENA_DOSING } from "@/data/reference"
import { ATHENA_BLENDED, type ManualPhase, type Per10L, type ProgramPhase } from "@/data/nutrients"
import { dayTargets } from "./targets"
import type { Range } from "@/model/types"

export type ProRow = { ec: number; baseG: number; coreG: number; baseMl?: number; coreMl?: number }

/** Pro Line by target EC: grams per 10 L (powder) and mL of concentrate per 10 L at the chosen strength (p. 31, p. 37). */
export function proReferenceRows(gPerL = 226): ProRow[] {
  const conc = ATHENA_CONC_ML[gPerL] ?? []
  return ATHENA_DOSING.map((r) => {
    const c = conc.find((x) => x.ec === r.ec)
    return { ec: r.ec, baseG: r.base, coreG: r.core, ...(c ? { baseMl: c.base, coreMl: c.core } : {}) }
  })
}

export type ManualRow = { label: { kind: "veg" } | { kind: "week"; w: number } | { kind: "weeks"; a: number; b: number }; dryback: Range; ecRunoff: Range }

/** Manual Pro Line method by week, read from the same targets the app uses (single source of truth). */
export function manualRows(): ManualRow[] {
  const at = (stage: "veg" | "stretch", w?: number) => dayTargets(stage, { mode: "manual", substrate: "coco", flowerWeek: w })!
  const row = (label: ManualRow["label"], t: ReturnType<typeof at>): ManualRow => ({ label, dryback: { lo: t.dryback!.lo, hi: t.dryback!.hi }, ecRunoff: { lo: t.ecRunoff!.lo, hi: t.ecRunoff!.hi } })
  return [
    row({ kind: "veg" }, at("veg")),
    row({ kind: "week", w: 1 }, at("stretch", 1)),
    row({ kind: "weeks", a: 2, b: 3 }, at("stretch", 2)),
    row({ kind: "weeks", a: 4, b: 6 }, at("stretch", 4)),
    row({ kind: "week", w: 7 }, at("stretch", 7)),
    row({ kind: "weeks", a: 8, b: 9 }, at("stretch", 8)),
  ]
}

export type BlendedRow = { phase: ProgramPhase; ab?: Per10L; fade?: Per10L; pk?: Per10L; camg?: Per10L; ec: number }

/** Blended program (p. 58), mL per 10 L: A and B (the same dose each, Grow in veg, Bloom after), PK, CaMg, Fade, EC. */
export function blendedReferenceRows(): BlendedRow[] {
  const dose = (p: ProgramPhase, ids: string[]) => p.doses.find((d) => ids.includes(d.product))?.per10L
  return ATHENA_BLENDED.program
    .filter((p) => !p.roWater)
    .map((p) => ({ phase: p, ab: dose(p, ["growA", "bloomA"]), fade: dose(p, ["fade"]), pk: dose(p, ["pk"]), camg: dose(p, ["camg"]), ec: p.ec }))
}

/** Cleanse in veg and flowering (p. 58), for the note under the Blended table. */
export function blendedCleanse(): Per10L | undefined {
  return ATHENA_BLENDED.program.find((p) => p.id === "veg")?.doses.find((d) => d.product === "cleanse")?.per10L
}

/** Blended manual method by week (p. 60), as the catalog holds it. */
export const blendedManualRows = (): ManualPhase[] => ATHENA_BLENDED.manual
