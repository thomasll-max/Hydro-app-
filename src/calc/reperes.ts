// Repères: reference tables shown in Outils → Repères. Pro Line only for now (Blended arrives with the friends' version).
import { ATHENA_CONC_ML, ATHENA_DOSING } from "@/data/reference"
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
