// Athena Blended (liquids, mL per 10 L). Source: docs/athena-fiche.md — Athena Handbook FR V8:
// p. 58 (program), p. 60 (manual watering). B before A. Lower EC than the Pro Line: never interchangeable.
// Offered in both versions since lot 14a (it was hidden in Thomas's version until then).
import type { NutrientCatalog, PhaseDose, ProgramPhase, ValueSource } from "./types"

const P58: ValueSource = { kind: "athena", page: 58 }
const P60: ValueSource = { kind: "athena", page: 60 }
const HB: ValueSource = { kind: "athena" }

const d = (product: string, per10L: PhaseDose["per10L"]): PhaseDose => ({ product, per10L, src: P58 })
const CAMG = d("camg", [8, 13])
const CLEANSE = d("cleanse", [5, 13])

/** Flowering week n of p. 58: Bloom A/B, PK, CaMg (S1–S7), Fade (S8–S9), Cleanse, EC. */
function week(n: number, bloom: number | null, pk: number | null, ec: number, opts: { camg?: boolean; fade?: number } = {}): ProgramPhase {
  return {
    id: `fl${n}`,
    stage: "flower",
    weeks: [n, n],
    ec,
    doses: [
      ...(bloom ? [d("bloomB", bloom), d("bloomA", bloom)] : []),
      ...(pk ? [d("pk", pk)] : []),
      ...(opts.camg === false ? [] : [CAMG]),
      ...(opts.fade ? [d("fade", opts.fade)] : []),
      CLEANSE,
    ],
    ph: n === 9 ? "high" : "substrate",
    src: P58,
  }
}

export const ATHENA_BLENDED: NutrientCatalog = {
  id: "athena-blended",
  brand: "Athena",
  name: "Athena Blended",
  source: "Athena Handbook FR (V8)",
  products: [
    { id: "growA", name: "Grow A", form: "liquid", scalesWithEc: true },
    { id: "growB", name: "Grow B", form: "liquid", scalesWithEc: true },
    { id: "bloomA", name: "Bloom A", form: "liquid", scalesWithEc: true },
    { id: "bloomB", name: "Bloom B", form: "liquid", scalesWithEc: true },
    { id: "pk", name: "PK", form: "liquid", addon: "pk", scalesWithEc: true },
    { id: "camg", name: "CaMg", form: "liquid", addon: "camg", scalesWithEc: true },
    { id: "fade", name: "Fade", form: "liquid", addon: "fade" },
    { id: "cleanse", name: "Cleanse", form: "liquid", addon: "cleanse" },
    { id: "balance", name: "Balance", form: "liquid", addon: "balance" },
  ],
  // p. 58: Balance → Grow B → Grow A → Bloom B → Bloom A → PK → CaMg → Fade → Cleanse (B before A).
  order: ["balance", "growB", "growA", "bloomB", "bloomA", "pk", "camg", "fade", "cleanse"],
  program: [
    { id: "presoak", stage: "presoak", ec: 1.0, doses: [d("bloomB", 13), d("bloomA", 13), d("cleanse", 3)], ph: "clone", src: P58 },
    { id: "clone", stage: "clone", ec: 2.0, doses: [d("bloomB", 26), d("bloomA", 26), d("cleanse", 3)], ph: "clone", src: P58 },
    { id: "veg", stage: "veg", ec: 2.1, doses: [d("growB", 29), d("growA", 29), CAMG, CLEANSE], ph: "substrate", src: P58 },
    week(1, 32, null, 2.3),
    week(2, 32, null, 2.3),
    week(3, 32, 11, 2.5),
    week(4, 32, 16, 2.6),
    week(5, 26, 24, 2.4),
    week(6, 24, 26, 2.3),
    week(7, 13, 32, 1.7),
    week(8, null, 32, 1.5, { camg: false, fade: 32 }),
    week(9, null, 32, 1.5, { camg: false, fade: 32 }),
    { id: "flush", stage: "flush", ec: 0, roWater: true, doses: [{ product: "cleanse", per10L: 26, src: HB }], ph: "high", src: HB },
  ],
  addons: ["fade", "cleanse", "balance", "ipw", "camg", "pk"],
  defaultAddons: ["fade", "cleanse", "balance", "camg", "pk"],
  manual: [
    { stage: "veg", ecIn: [2.1, 2.1], ph: [5.8, 6.2], ecRunoff: [3.5, 4.5], dryback: [30, 40], src: P60 },
    { stage: "flower", weeks: [1, 1], ecIn: [2.3, 2.3], ph: [5.9, 6.3], ecRunoff: [5.0, 6.0], dryback: [30, 40], src: P60 },
    { stage: "flower", weeks: [2, 2], ecIn: [2.3, 2.3], ph: [5.9, 6.3], ecRunoff: [5.0, 6.0], dryback: [50, 60], src: P60 },
    { stage: "flower", weeks: [3, 3], ecIn: [2.5, 2.5], ph: [5.9, 6.3], ecRunoff: [5.0, 6.0], dryback: [50, 60], src: P60 },
    { stage: "flower", weeks: [4, 4], ecIn: [2.6, 2.6], ph: [5.9, 6.3], ecRunoff: [4.0, 5.0], dryback: [30, 40], src: P60 },
    { stage: "flower", weeks: [5, 5], ecIn: [2.4, 2.4], ph: [5.9, 6.3], ecRunoff: [4.0, 5.0], dryback: [30, 40], src: P60 },
    { stage: "flower", weeks: [6, 6], ecIn: [2.3, 2.3], ph: [5.9, 6.3], ecRunoff: [4.0, 5.0], dryback: [30, 40], src: P60 },
    { stage: "flower", weeks: [7, 7], ecIn: [1.7, 1.7], ph: [5.9, 6.3], ecRunoff: [3.0, 4.0], dryback: [30, 40], src: P60 },
    { stage: "flower", weeks: [8, 9], ecIn: [1.5, 1.5], ph: [5.9, 6.3], ecRunoff: [2.5, 3.0], dryback: [50, 60], src: P60 },
    { stage: "flush", ecIn: [0, 1.5], ph: [5.9, 6.3], ecRunoff: [0, 1.5], dryback: [50, 60], src: P60 },
  ],
  ph: { clone: [5.6, 5.6], coco: [5.8, 6.2], high: [6.0, 6.4], src: P58 },
}
