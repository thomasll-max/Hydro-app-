// Verified reference values. Every figure carries its source.
// Source: claude/athena-pro-line-fiche.md (Athena Handbook FR métrique V8 + notice Alien RAIN)
// and the validated values of the specification (section 9).

export type Source = "athena" | "bonorum" | "maker" | "estimate" | "spec"

/** Dosing by target EC — g per 10 L: Grow or Bloom / Core. Source: Athena. */
export const ATHENA_DOSING: { ec: number; base: number; core: number }[] = [
  { ec: 0.5, base: 2.8, core: 1.7 },
  { ec: 1.0, base: 6.1, core: 3.6 },
  { ec: 1.5, base: 9.4, core: 5.7 },
  { ec: 2.0, base: 12.9, core: 7.7 },
  { ec: 2.5, base: 16.5, core: 9.9 },
  { ec: 3.0, base: 20.3, core: 12.2 },
  { ec: 3.5, base: 24.1, core: 14.5 },
  { ec: 4.0, base: 28.1, core: 16.9 },
]
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
export const ATHENA_CONC_ML: Record<number, { ec: number; base: number; core: number }[]> = {
  226: [
    { ec: 1.0, base: 27, core: 16 },
    { ec: 1.5, base: 42, core: 25 },
    { ec: 2.0, base: 57, core: 34 },
    { ec: 2.5, base: 73, core: 44 },
    { ec: 3.0, base: 90, core: 54 },
    { ec: 3.5, base: 107, core: 64 },
    { ec: 4.0, base: 124, core: 75 },
  ],
  113: [
    { ec: 1.0, base: 54, core: 32 },
    { ec: 1.5, base: 83, core: 50 },
    { ec: 2.0, base: 114, core: 69 },
    { ec: 2.5, base: 146, core: 88 },
    { ec: 3.0, base: 179, core: 108 },
    { ec: 3.5, base: 214, core: 128 },
    { ec: 4.0, base: 249, core: 149 },
  ],
  282: [
    { ec: 1.0, base: 21, core: 13 },
    { ec: 1.5, base: 33, core: 20 },
    { ec: 2.0, base: 46, core: 27 },
    { ec: 2.5, base: 59, core: 35 },
    { ec: 3.0, base: 72, core: 43 },
  ],
}
