// Nutrient catalogs (spec §6, §11): a line is pure data, read by the generic engine in src/calc/nutrients.ts.
// Every dose carries its source. Values come from docs/athena-fiche.md (Athena Handbook FR V8, printed pages).
// A line never borrows a value from another line (tested).

/** Where a figure comes from. `page` is the printed page of the Athena Handbook FR V8 when known. */
export type ValueSource = { kind: "athena"; page?: number } | { kind: "label" } | { kind: "estimate" }

/** Dose per 10 L: a fixed value or a published range [lo, hi]. */
export type Per10L = number | [number, number]

export type AddonId = "fade" | "cleanse" | "balance" | "ipw" | "camg" | "pk"

export type CatalogProduct = {
  id: string
  name: string
  /** Powders can be dosed weighed (g) or as a dissolved concentrate (mL); liquids in mL. */
  form: "powder" | "liquid"
  /** Optional add-on switch (Réglages). Absent = part of the line, always used. */
  addon?: AddonId
  /** Dose scales with the target EC when it differs from the phase EC (estimate). */
  scalesWithEc?: boolean
}

/** One product in a program phase. Powders of a table-driven line take their dose from the EC table. */
export type PhaseDose = {
  product: string
  per10L?: Per10L
  /** Read from the line's EC table at the target EC (Pro Line: Grow or Bloom = base, Core = core). */
  fromEcTable?: "base" | "core"
  /** Used only when this add-on is off (Pro Core stays when Fade is switched off). */
  unlessAddon?: AddonId
  src: ValueSource
}

/** pH rule of a phase: clone 5.6, by substrate, or 6.0–6.4 (Fade, flush). */
export type PhRule = "clone" | "substrate" | "high"

export type ProgramPhase = {
  id: string
  stage: "presoak" | "clone" | "veg" | "flower" | "flush"
  /** Flowering weeks covered (stage "flower"). */
  weeks?: [number, number]
  /** Solution EC of the phase (fertiliser only). */
  ec: number
  doses: PhaseDose[]
  ph: PhRule
  /** Plain RO water (flush). */
  roWater?: boolean
  src: ValueSource
}

export type EcRow = { ec: number; base: number; core: number }

/** Manual watering method (one watering at lights-on): solution, runoff and dryback by week. */
export type ManualPhase = {
  stage: "veg" | "flower" | "flush"
  weeks?: [number, number]
  ecIn: [number, number]
  ph: [number, number]
  ecRunoff: [number, number]
  dryback: [number, number]
  src: ValueSource
}

export type NutrientCatalog = {
  id: string
  brand: string
  name: string
  /** Shown under results. */
  source: string
  products: CatalogProduct[]
  /** Mixing order (product ids). Water always first; personal products after the line. */
  order: string[]
  program: ProgramPhase[]
  /** Published dosing by EC (powders): grams per 10 L and mL of concentrate per 10 L by strength (g/L). */
  ecTable?: { grams: EcRow[]; concentrates: Record<number, EcRow[]>; recommended: number; src: ValueSource }
  /** Add-ons this line can use. */
  addons: AddonId[]
  /** Add-ons switched on when the line is picked. */
  defaultAddons: AddonId[]
  manual: ManualPhase[]
  /** pH ranges of the line, solution and runoff. */
  ph: { clone: [number, number]; coco: [number, number]; high: [number, number]; src: ValueSource }
}
