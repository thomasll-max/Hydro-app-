// Valeurs absurdes (lot 15b, retour de Thomas du 20/10 : pot pic plus léger que le matin, pH runoff 13,1, T° 400). Every
// typed value of the day's entry has the plausible range of the dictation (lot 11); a value outside is refused in the
// form. What was saved before stays in the data, but is doubtful: never averaged, judged, plotted nor used by
// « Maintenant », and marked « valeur douteuse » in the Journal. The computed values (dryback, VPD, DLI, runoff %) only
// exist inside what their formula can give from plausible measures. Pure, tested.
import { MIX_RANGE, VOICE_RANGE, type VoiceKey } from "./voice"
import type { Entry } from "@/model/types"

/** Measures with a range: the dictation's, and the old single soil-sensor reading (a moisture %, like the others). */
export type RangeKey = VoiceKey | "sensorPct"
export const ENTRY_RANGE: Record<RangeKey, { min: number; max: number }> = { ...VOICE_RANGE, sensorPct: VOICE_RANGE.sensorPeakPct }
export const RANGE_KEYS = Object.keys(ENTRY_RANGE) as RangeKey[]

export const DERIVED_KEYS = ["vpd", "dryback", "drybackSensor", "runoffPct", "dli"] as const
export type DerivedKey = (typeof DERIVED_KEYS)[number]
/** What can be doubtful in an entry: a measure or a computed value. (The leaf offset has no published range: unchecked.) */
export type DoubtKey = RangeKey | DerivedKey

const isRangeKey = (k: string): k is RangeKey => k in ENTRY_RANGE

/** A tank's measures: the ranges of a tank said aloud (lot 11), for the tank forms too. */
export const TANK_RANGE = MIX_RANGE
export type Range = { min: number; max: number }

/** `v` outside `r`: the range, else null (nothing typed is never outside). */
export const outside = (v: number | undefined | null, r: Range): Range | null => (v == null || (Number.isFinite(v) && v >= r.min && v <= r.max) ? null : r)

/** Outside its range (lot 15b): the range, else null. Not a number at all counts as outside. */
export function outOfRange(k: string, v: number | undefined | null): { min: number; max: number } | null {
  return isRangeKey(k) ? outside(v, ENTRY_RANGE[k]) : null
}

/** The peak lighter than the morning: the two weights were swapped (no dryback from them). */
export const swappedWeights = (e: Pick<Entry, "weightMorningKg" | "weightPeakKg">) => e.weightPeakKg != null && e.weightMorningKg != null && e.weightPeakKg < e.weightMorningKg

/** A computed value inside what its formula can give: a share of the pot or of the water given, from 0 to 100 %. */
const PCT_KEYS: DerivedKey[] = ["dryback", "drybackSensor", "runoffPct"]

/** The measures each computed value rests on. */
export const INPUTS: Record<DerivedKey, (keyof Entry)[]> = {
  vpd: ["tempDay", "rh"],
  dryback: ["weightMorningKg", "weightPeakKg"],
  drybackSensor: ["sensorMorningPct", "sensorPeakPct"],
  runoffPct: ["runoffMl", "volumePerPotMl"],
  dli: ["ppfd", "photoperiodH"],
}

/** Can this computed value be, from these measures? (Its measures plausible, a share between 0 and 100 %.) */
export function derivedOk(k: DerivedKey, v: number | undefined, e: Partial<Entry>): boolean {
  if (v == null) return true
  if (!Number.isFinite(v)) return false
  if (INPUTS[k].some((m) => outOfRange(m, e[m] as number | undefined))) return false
  if (k === "dryback" && swappedWeights(e)) return false
  if (PCT_KEYS.includes(k) && (v < 0 || v > 100)) return false
  return true
}

/** The doubtful values of an entry, measures first. */
export function doubtfulKeys(e: Partial<Entry>): DoubtKey[] {
  const out: DoubtKey[] = RANGE_KEYS.filter((k) => outOfRange(k, e[k] as number | undefined))
  if (swappedWeights(e)) for (const k of ["weightMorningKg", "weightPeakKg"] as const) if (!out.includes(k)) out.push(k)
  for (const k of DERIVED_KEYS) if (!derivedOk(k, e[k] as number | undefined, e)) out.push(k)
  return out
}

/**
 * The entry as the app computes with it: its doubtful values taken out and kept apart in `doubtful` (never stored).
 * Averages, week verdicts, reviews, charts and « Maintenant » never see them; the Journal shows them, marked.
 */
export function trusted(e: Entry): Entry {
  const keys = doubtfulKeys(e)
  if (!keys.length) return e
  const out: Entry = { ...e, doubtful: {} }
  for (const k of keys) {
    out.doubtful![k] = e[k] as number
    delete (out as Record<string, unknown>)[k]
  }
  return out
}

/** Back to what is stored: the doubtful values put back where nothing else was set (a save never erases them). */
export function stored(e: Entry): Entry {
  if (!e.doubtful) return e
  const { doubtful, ...rest } = e
  const out = { ...rest } as Record<string, unknown>
  for (const [k, v] of Object.entries(doubtful)) if (!(k in out)) out[k] = v
  return out as Entry
}

/** What the form says under a field (lot 15b): out of its range, or the two weights swapped. */
export type FieldIssue = { key: RangeKey; code: "range"; min: number; max: number } | { key: "weightMorningKg" | "weightPeakKg"; code: "swapped" }

/** The issues of the values typed in the form, for the given fields (those on screen). */
export function fieldIssues(v: Partial<Record<string, number | undefined>>, shown: readonly string[]): FieldIssue[] {
  const out: FieldIssue[] = []
  for (const k of shown) {
    const r = outOfRange(k, v[k])
    if (r) out.push({ key: k as RangeKey, code: "range", min: r.min, max: r.max })
  }
  const w = { weightMorningKg: v.weightMorningKg, weightPeakKg: v.weightPeakKg }
  if (shown.includes("weightPeakKg") && shown.includes("weightMorningKg") && !out.some((x) => x.key.startsWith("weight")) && swappedWeights(w))
    out.push({ key: "weightMorningKg", code: "swapped" }, { key: "weightPeakKg", code: "swapped" })
  return out
}

/** A computed value missing although its measures are typed: its formula cannot give it (« — » and a cue, lot 15b). */
export const impossible = (k: DerivedKey, e: Partial<Entry>) => e[k] == null && INPUTS[k].every((m) => e[m] != null)
