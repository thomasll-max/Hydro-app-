// Athena add-ons (docs/athena-fiche.md, « ADD-ONS »). Doses that depend on the line (Fade: Pro 51, Blended 32)
// live in each line's program; this file holds what is common: where the product goes, which lines may use it,
// the Cleanse flush, the Balance titration step and the IPW protocols.
import type { AddonId, ValueSource } from "./types"

export type AddonDef = {
  id: AddonId
  name: string
  /** Tank, or foliar spray (never in the tank). */
  application: "tank" | "foliar"
  /** Lines allowed to use it. */
  lines: string[]
  src: ValueSource
}

const HB: ValueSource = { kind: "athena" }

export const ADDONS: Record<AddonId, AddonDef> = {
  fade: { id: "fade", name: "Fade", application: "tank", lines: ["athena-pro", "athena-blended"], src: { kind: "athena", page: 31 } },
  cleanse: { id: "cleanse", name: "Cleanse", application: "tank", lines: ["athena-pro", "athena-blended"], src: HB },
  balance: { id: "balance", name: "Balance", application: "tank", lines: ["athena-pro", "athena-blended"], src: HB },
  ipw: { id: "ipw", name: "IPW", application: "foliar", lines: ["athena-pro", "athena-blended"], src: { kind: "athena", page: 80 } },
  // Blended only: never with the Pro Line.
  camg: { id: "camg", name: "CaMg", application: "tank", lines: ["athena-blended"], src: { kind: "athena", page: 58 } },
  pk: { id: "pk", name: "PK", application: "tank", lines: ["athena-blended"], src: { kind: "athena", page: 58 } },
}

/** Cleanse flush: RO water + 26 mL / 10 L, EC < 0.1, pH 6.0–6.4, over the last 3 days in coco. */
export const CLEANSE_FLUSH = { mlPer10L: 26, ecMax: 0.1, ph: [6.0, 6.4] as [number, number], days: 3, src: HB }

/** Balance raises the pH: no fixed dose, steps of 1 mL per 4 L, measuring after each step. */
export const BALANCE_STEP = { ml: 1, perL: 4, src: HB }

/** Balance step for a tank (mL): 100 L → 25 mL. */
export function balanceStepMl(volumeL: number): number {
  return Math.round((volumeL / BALANCE_STEP.perL) * BALANCE_STEP.ml * 10) / 10
}

/** IPW (foliar, RO water): veg S1–S4 and flowering S1–S3 only (lot 5 tool). */
export const IPW = {
  protocols: {
    prevention: { mlPerL: 24, perWeek: 2 },
    pressure: { mlPerL: 32, perWeek: 3 },
    restoration: { mlPerL: 32, days: 9, pattern: "2 on / 1 off" },
  },
  lastFlowerWeek: 3,
  src: { kind: "athena", page: 80 } as ValueSource,
}
