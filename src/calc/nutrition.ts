// Tank recipes, brand-agnostic: a nutrient line describes its products, its dosing table by EC and its
// per-stage rules. Only Athena Pro Line exists for now; other brands plug in as new NutrientLine entries.
// Athena values: Athena Handbook FR V8 (claude/athena-pro-line-fiche.md).
import { ATHENA_CONC_ML, ATHENA_DOSING } from "@/data/reference"

export type RecipeKind = "seedling" | "veg" | "flower" | "finish" | "flush"
export type Role = "base" | "core" | "fade" | "cleanse" | "balance"

export type Product = { id: string; name: string; role: Role; unit: "g" | "mL" }

export type NutrientLine = {
  id: string
  brand: string
  name: string
  source: string // shown under results
  products: Product[]
  /** g per 10 L of the base (Grow/Bloom) and core product, by fertiliser EC. */
  dosing: { ec: number; base: number; core: number }[]
  /** mL of concentrate per 10 L by EC, for each concentrate strength (g/L) the manufacturer publishes. */
  concentrates?: Record<number, { ec: number; base: number; core: number }[]>
  recommendedConcentrate?: number
  /** Which products a recipe uses, in mixing order. */
  recipes: Record<RecipeKind, { base?: string; core?: boolean; fade?: boolean; cleanse: boolean; balance: boolean }>
  cleanseMlPer10L: Record<RecipeKind, number>
  cleanseRange: [number, number]
  /** Finishing product dose (mL / 10 L) at a reference EC; scaled to another EC as an estimate. */
  fade?: { mlPer10L: number; atEc: number }
  /** Mixing order of roles. */
  order: Role[]
}

export const ATHENA_PRO: NutrientLine = {
  id: "athena-pro",
  brand: "Athena",
  name: "Athena Pro Line",
  source: "Athena Handbook FR (V8)",
  products: [
    { id: "proGrow", name: "Pro Grow", role: "base", unit: "g" },
    { id: "proBloom", name: "Pro Bloom", role: "base", unit: "g" },
    { id: "proCore", name: "Pro Core", role: "core", unit: "g" },
    { id: "fade", name: "Fade", role: "fade", unit: "mL" },
    { id: "cleanse", name: "Cleanse", role: "cleanse", unit: "mL" },
    { id: "balance", name: "Balance", role: "balance", unit: "mL" },
  ],
  dosing: ATHENA_DOSING,
  concentrates: ATHENA_CONC_ML,
  recommendedConcentrate: 226,
  recipes: {
    seedling: { base: "proBloom", core: true, cleanse: true, balance: true },
    veg: { base: "proGrow", core: true, cleanse: true, balance: true },
    flower: { base: "proBloom", core: true, cleanse: true, balance: true },
    finish: { base: "proBloom", fade: true, cleanse: true, balance: true }, // Fade replaces Pro Core in S8–S9
    flush: { cleanse: true, balance: false }, // RO water + Cleanse, EC < 0.1
  },
  cleanseMlPer10L: { seedling: 3, veg: 8, flower: 8, finish: 8, flush: 26 },
  cleanseRange: [5, 13],
  fade: { mlPer10L: 51, atEc: 3 },
  order: ["balance", "base", "core", "fade", "cleanse"],
}

export const NUTRIENT_LINES: Record<string, NutrientLine> = { [ATHENA_PRO.id]: ATHENA_PRO }
export const DEFAULT_LINE = ATHENA_PRO.id
export const getLine = (id?: string) => NUTRIENT_LINES[id ?? DEFAULT_LINE] ?? ATHENA_PRO

/** Linear interpolation in a {ec, base, core} table; null outside its range. */
function interp(t: { ec: number; base: number; core: number }[], ec: number): { base: number; core: number } | null {
  if (ec < t[0].ec || ec > t[t.length - 1].ec) return null
  for (let i = 0; i < t.length - 1; i++) {
    if (ec <= t[i + 1].ec) {
      const f = (ec - t[i].ec) / (t[i + 1].ec - t[i].ec)
      return { base: t[i].base + f * (t[i + 1].base - t[i].base), core: t[i].core + f * (t[i + 1].core - t[i].core) }
    }
  }
  return null
}

/** mL of concentrate per 10 L. Uses the published table; outside it, converts grams (marked as estimate). */
export function concMlPer10L(line: NutrientLine, ec: number, gPerL: number): { base: number; core: number; estimate: boolean } {
  const t = line.concentrates?.[gPerL]
  const hit = t ? interp(t, ec) : null
  if (hit) return { ...hit, estimate: false }
  const g = dosePer10L(line, ec)
  return { base: (g.base / gPerL) * 1000, core: (g.core / gPerL) * 1000, estimate: true }
}

/** Litres of concentrate a whole bag makes: bag weight ÷ strength (Athena: 0.9 kg → ≈ 4.0 L at 226 g/L). */
export function bagLitres(bagKg: number, gPerL: number): number {
  return Math.round(((bagKg * 1000) / gPerL) * 10) / 10
}

/** Base and core g / 10 L for a target EC, linear between the table rows, clamped to the table. */
export function dosePer10L(line: NutrientLine, ec: number): { base: number; core: number } {
  const t = line.dosing
  const e = Math.min(t[t.length - 1].ec, Math.max(t[0].ec, ec))
  for (let i = 0; i < t.length - 1; i++) {
    if (e <= t[i + 1].ec) {
      const f = (e - t[i].ec) / (t[i + 1].ec - t[i].ec)
      return { base: t[i].base + f * (t[i + 1].base - t[i].base), core: t[i].core + f * (t[i + 1].core - t[i].core) }
    }
  }
  return { base: t[t.length - 1].base, core: t[t.length - 1].core }
}

export type Ingredient = {
  id: string
  name?: string
  role: Role | "water" | "roWater"
  qty: number | null
  unit: "L" | "g" | "mL"
  estimate?: boolean
  grams?: number // powder equivalent when dosed as concentrate
  concentrate?: number // g/L of the concentrate used
}

export type RecipeInput = {
  kind: RecipeKind
  volumeL: number
  ec: number // fertiliser EC target (tap water not included)
  cleanseMlPer10L?: number
  balanceMlPer10L?: number // known from the previous tank; null = add at the end, by steps
  concentrate?: number // 0/undefined = powder in g; else concentrate strength g/L
}

const r1 = (x: number) => Math.round(x * 10) / 10

/** Ingredients in mixing order (water first, then the line's order). */
export function recipe(line: NutrientLine, r: RecipeInput): Ingredient[] {
  const k = r.volumeL / 10
  const rule = line.recipes[r.kind]
  const d = dosePer10L(line, r.ec)
  const c = r.concentrate && r.concentrate > 0 ? concMlPer10L(line, r.ec, r.concentrate) : null
  const prod = (role: Role, id?: string) => line.products.find((p) => (id ? p.id === id : p.role === role))
  const out: Ingredient[] = [{ id: r.kind === "flush" ? "roWater" : "water", role: r.kind === "flush" ? "roWater" : "water", qty: r.volumeL, unit: "L" }]
  for (const role of line.order) {
    if (role === "balance" && rule.balance) {
      const p = prod("balance")!
      out.push({ id: p.id, name: p.name, role, qty: r.balanceMlPer10L != null ? r1(r.balanceMlPer10L * k) : null, unit: p.unit })
    }
    if (role === "base" && rule.base) {
      const p = prod("base", rule.base)!
      out.push(
        c
          ? { id: p.id, name: p.name, role, qty: Math.round(c.base * k), unit: "mL", grams: r1(d.base * k), concentrate: r.concentrate, estimate: c.estimate }
          : { id: p.id, name: p.name, role, qty: r1(d.base * k), unit: p.unit },
      )
    }
    if (role === "core" && rule.core) {
      const p = prod("core")!
      out.push(
        c
          ? { id: p.id, name: p.name, role, qty: Math.round(c.core * k), unit: "mL", grams: r1(d.core * k), concentrate: r.concentrate, estimate: c.estimate }
          : { id: p.id, name: p.name, role, qty: r1(d.core * k), unit: p.unit },
      )
    }
    if (role === "fade" && rule.fade && line.fade) {
      const p = prod("fade")!
      const t = line.dosing
      const ecc = Math.min(t[t.length - 1].ec, Math.max(t[0].ec, r.ec))
      out.push({ id: p.id, name: p.name, role, qty: r1(((line.fade.mlPer10L * ecc) / line.fade.atEc) * k), unit: p.unit, estimate: ecc !== line.fade.atEc })
    }
    if (role === "cleanse" && rule.cleanse) {
      const p = prod("cleanse")!
      out.push({ id: p.id, name: p.name, role, qty: r1((r.cleanseMlPer10L ?? line.cleanseMlPer10L[r.kind]) * k), unit: p.unit })
    }
  }
  return out
}

/** EC the meter should read: fertiliser EC + tap water EC. */
export function expectedEc(ec: number, tapEc: number): number {
  return Math.round((ec + tapEc) * 100) / 100
}

/** Suggested tank size: ≈ 6 days of real consumption (5–7 days of solution at a time), capped by the reservoir. */
export function suggestedVolume(perDayL: number, reservoirL = 120): number | null {
  if (!perDayL || perDayL <= 0) return null
  return Math.min(reservoirL, Math.ceil((perDayL * 6) / 5) * 5)
}

export function recipeForStage(stage: string): RecipeKind {
  if (stage === "seedling") return "seedling"
  if (stage === "veg") return "veg"
  if (stage === "finish") return "finish"
  if (stage === "flush") return "flush"
  return "flower"
}

