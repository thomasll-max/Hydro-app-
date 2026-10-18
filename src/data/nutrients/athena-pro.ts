// Athena Pro Line (powders). Source: docs/athena-fiche.md — Athena Handbook FR V8:
// p. 31 (program), p. 37 (dosing by EC, powder and concentrates 113/226/282 g/L), p. 41 (manual watering).
// No CaMg and no PK with the Pro Line.
import type { EcRow, NutrientCatalog, ValueSource } from "./types"

const P31: ValueSource = { kind: "athena", page: 31 }
const P37: ValueSource = { kind: "athena", page: 37 }
const P41: ValueSource = { kind: "athena", page: 41 }
const HB: ValueSource = { kind: "athena" }

/** g per 10 L by target EC: Grow or Bloom (base) / Core. p. 37. */
export const PRO_GRAMS: EcRow[] = [
  { ec: 0.5, base: 2.8, core: 1.7 },
  { ec: 1.0, base: 6.1, core: 3.6 },
  { ec: 1.5, base: 9.4, core: 5.7 },
  { ec: 2.0, base: 12.9, core: 7.7 },
  { ec: 2.5, base: 16.5, core: 9.9 },
  { ec: 3.0, base: 20.3, core: 12.2 },
  { ec: 3.5, base: 24.1, core: 14.5 },
  { ec: 4.0, base: 28.1, core: 16.9 },
]

/** mL of concentrate per 10 L by target EC, for each strength (g/L). p. 37. */
export const PRO_CONCENTRATES: Record<number, EcRow[]> = {
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

export const ATHENA_PRO: NutrientCatalog = {
  id: "athena-pro",
  brand: "Athena",
  name: "Athena Pro Line",
  source: "Athena Handbook FR (V8)",
  products: [
    { id: "proGrow", name: "Pro Grow", form: "powder" },
    { id: "proBloom", name: "Pro Bloom", form: "powder" },
    { id: "proCore", name: "Pro Core", form: "powder" },
    { id: "fade", name: "Fade", form: "liquid", addon: "fade", scalesWithEc: true },
    { id: "cleanse", name: "Cleanse", form: "liquid", addon: "cleanse" },
    { id: "balance", name: "Balance", form: "liquid", addon: "balance" },
  ],
  // Balance first when its amount is known from the previous tank; Core always on its own.
  order: ["balance", "proGrow", "proBloom", "proCore", "fade", "cleanse"],
  program: [
    {
      id: "clone",
      stage: "clone",
      ec: 2.0,
      doses: [
        { product: "proBloom", fromEcTable: "base", src: P31 },
        { product: "proCore", fromEcTable: "core", src: P31 },
        { product: "cleanse", per10L: 3, src: P31 },
      ],
      ph: "clone",
      src: P31,
    },
    {
      id: "veg",
      stage: "veg",
      ec: 3.0,
      doses: [
        { product: "proGrow", fromEcTable: "base", src: P31 },
        { product: "proCore", fromEcTable: "core", src: P31 },
        { product: "cleanse", per10L: [5, 13], src: P31 },
      ],
      ph: "substrate",
      src: P31,
    },
    {
      id: "flower",
      stage: "flower",
      weeks: [1, 7],
      ec: 3.0,
      doses: [
        { product: "proBloom", fromEcTable: "base", src: P31 },
        { product: "proCore", fromEcTable: "core", src: P31 },
        { product: "cleanse", per10L: [5, 13], src: P31 },
      ],
      ph: "substrate",
      src: P31,
    },
    {
      // Fade replaces Pro Core in S8–S9 (from S7 if the cultivar resists). pH 6.0–6.4 with Fade.
      id: "finish",
      stage: "flower",
      weeks: [8, 9],
      ec: 3.0,
      doses: [
        { product: "proBloom", fromEcTable: "base", src: P31 },
        { product: "proCore", fromEcTable: "core", unlessAddon: "fade", src: P31 },
        { product: "fade", per10L: 51, src: P31 },
        { product: "cleanse", per10L: [5, 13], src: P31 },
      ],
      ph: "high",
      src: P31,
    },
    {
      id: "flush",
      stage: "flush",
      ec: 0,
      roWater: true,
      doses: [{ product: "cleanse", per10L: 26, src: HB }],
      ph: "high",
      src: HB,
    },
  ],
  ecTable: { grams: PRO_GRAMS, concentrates: PRO_CONCENTRATES, recommended: 226, src: P37 },
  addons: ["fade", "cleanse", "balance", "ipw"],
  defaultAddons: ["fade", "cleanse", "balance"],
  manual: [
    { stage: "veg", ecIn: [3.0, 3.0], ph: [5.8, 6.2], ecRunoff: [4, 5], dryback: [30, 40], src: P41 },
    { stage: "flower", weeks: [1, 1], ecIn: [3.0, 3.0], ph: [5.9, 6.3], ecRunoff: [6, 7], dryback: [30, 40], src: P41 },
    { stage: "flower", weeks: [2, 3], ecIn: [3.0, 3.0], ph: [5.9, 6.3], ecRunoff: [6, 7], dryback: [50, 60], src: P41 },
    { stage: "flower", weeks: [4, 6], ecIn: [3.0, 3.0], ph: [5.9, 6.3], ecRunoff: [5, 6], dryback: [30, 40], src: P41 },
    { stage: "flower", weeks: [7, 7], ecIn: [3.0, 3.0], ph: [5.9, 6.3], ecRunoff: [4, 5], dryback: [30, 40], src: P41 },
    { stage: "flower", weeks: [8, 9], ecIn: [3.0, 3.0], ph: [5.9, 6.3], ecRunoff: [3, 3.5], dryback: [50, 60], src: P41 },
    { stage: "flush", ecIn: [0, 1], ph: [5.9, 6.3], ecRunoff: [0, 1], dryback: [50, 60], src: P41 },
  ],
  ph: { clone: [5.6, 5.6], coco: [5.8, 6.2], high: [6.0, 6.4], src: P31 },
}
