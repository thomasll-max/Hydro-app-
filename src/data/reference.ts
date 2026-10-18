// Verified reference values. Every figure carries its source.
import { PRO_CONCENTRATES, PRO_GRAMS } from "./nutrients/athena-pro"
// Source: docs/athena-fiche.md (Athena Handbook FR métrique V8 + notice Alien RAIN)
// and the validated values of the specification (section 9).

export type Source = "athena" | "bonorum" | "maker" | "estimate" | "spec"

/** Dosing by target EC — g per 10 L: Grow or Bloom / Core. Source: Athena p. 37 (catalog data/nutrients/athena-pro.ts). */
export const ATHENA_DOSING = PRO_GRAMS
export const ATHENA_DOSING_SOURCE: Source = "athena"

export type PhRow = { key: "phClone" | "phCoco" | "phFade" | "phSoil" | "phMix"; lo: number; hi: number; source: Source }
/** Target pH, solution and runoff. */
export const PH_TARGETS: PhRow[] = [
  { key: "phClone", lo: 5.6, hi: 5.6, source: "athena" },
  { key: "phCoco", lo: 5.8, hi: 6.2, source: "athena" },
  { key: "phFade", lo: 6.0, hi: 6.4, source: "athena" },
  { key: "phSoil", lo: 6.0, hi: 6.4, source: "spec" },
  { key: "phMix", lo: 5.9, hi: 6.3, source: "estimate" },
]

export type SteerRow = {
  stage: "stVeg" | "stStretch" | "stBulk" | "stFinish"
  weeks: [number, number]
  flower: boolean
  ec: [number, number]
  dryback: string // kept as written in the Handbook ("50 % → 25 %")
  steer: "vegetative" | "generative" | "finishSteer"
}
/** Precision irrigation (P0–P3), substrate EC and dryback by stage. Source: Athena. */
export const STEERING: SteerRow[] = [
  { stage: "stVeg", weeks: [2, 4], flower: false, ec: [3, 5], dryback: "50 → 25", steer: "vegetative" },
  { stage: "stStretch", weeks: [1, 4], flower: true, ec: [4, 10], dryback: "40–50", steer: "generative" },
  { stage: "stBulk", weeks: [5, 7], flower: true, ec: [3.5, 6], dryback: "30–40", steer: "vegetative" },
  { stage: "stFinish", weeks: [8, 9], flower: true, ec: [3, 4], dryback: "40–50", steer: "finishSteer" },
]

/** mL of concentrate per 10 L, by target EC (Grow-or-Bloom / Core). Source: Athena Handbook FR V8, p. 37. */
export const ATHENA_CONC_ML = PRO_CONCENTRATES
