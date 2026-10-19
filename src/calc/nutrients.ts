// Generic nutrient engine (spec §6, §11). Reads a catalog from src/data/nutrients and never knows a brand:
// program phase → ingredients in mixing order, each with its quantity and source. Pure, tested (lot4a.test.ts).
// Rules: water first; a line only uses its own products and the add-ons it allows (no Pro/Blended mixing);
// powders are dosed weighed (g) or as a dissolved concentrate (mL, published table p. 37); personal products
// come after the line, with the label dose only (empty until typed).
import type { CustomProduct } from "@/model/grow"
import type { Mix, Range, StageKey, Substrate } from "@/model/types"
import { ADDONS, balanceStepMl, getCatalog, type AddonId, type EcRow, type NutrientCatalog, type Per10L, type ProgramPhase, type ValueSource } from "@/data/nutrients"
import type { StageInfo } from "./stage"

// ---------- Where the plants are in the program ----------
export type Position = { stage: "presoak" | "clone" | "veg" | "flower" | "flush"; week?: number }

/** Cycle stage → program position (flowering weeks counted from the 12/12 day). */
export function positionOf(s: Pick<StageInfo, "key" | "flowerWeek" | "week">): Position | null {
  if (s.key === "notStarted" || s.key === "harvested") return null
  if (s.key === "seedling") return { stage: "clone" }
  if (s.key === "veg") return { stage: "veg", week: s.week }
  if (s.key === "flush") return { stage: "flush" }
  return { stage: "flower", week: s.flowerWeek ?? 1 }
}

/** Program phase of a line for a position. Flowering beyond the last row stays on the last row. */
export function phaseAt(cat: NutrientCatalog, pos: Position): ProgramPhase | null {
  const rows = cat.program.filter((p) => p.stage === pos.stage)
  if (pos.stage !== "flower") return rows[0] ?? null
  const w = Math.max(1, pos.week ?? 1)
  return rows.find((p) => p.weeks && w >= p.weeks[0] && w <= p.weeks[1]) ?? rows[rows.length - 1] ?? null
}

export const phaseById = (cat: NutrientCatalog, id?: string) => cat.program.find((p) => p.id === id) ?? null

/** Cycle stage used for targets and labels, from a phase. */
export function phaseStage(p: ProgramPhase): StageKey {
  if (p.stage === "presoak" || p.stage === "clone") return "seedling"
  if (p.stage === "veg") return "veg"
  if (p.stage === "flush") return "flush"
  const w = p.weeks?.[0] ?? 1
  return w >= 8 ? "finish" : w >= 5 ? "bulk" : "stretch"
}

/** Mix.kind (v3 field, kept for the journal and charts). */
export function phaseKind(p: ProgramPhase): "seedling" | "veg" | "flower" | "finish" | "flush" {
  const s = phaseStage(p)
  return s === "seedling" || s === "veg" || s === "finish" || s === "flush" ? s : "flower"
}

// ---------- pH ----------
export type PhTarget = Range & { src: ValueSource | "spec" | "estimate" }

/**
 * pH of solution and runoff for a phase, from the line's catalog (the single source of the recipe and of the day's
 * targets, lot 10c): clone 5.6; the phase's "high" range (Pro: with Fade; Blended: S9; flush); else by substrate.
 * Pro without Fade in S8–S9 (Core kept): "avec Fade 6,0–6,4" no longer applies, back to the substrate's range.
 */
export function phFor(cat: NutrientCatalog, phase: ProgramPhase, substrate: Substrate = "coco", addons?: readonly string[]): PhTarget {
  if (phase.ph === "clone") return { lo: cat.ph.clone[0], hi: cat.ph.clone[1], src: cat.ph.src }
  const fadeOff = !!addons && !addons.includes("fade") && phase.doses.some((d) => d.unlessAddon === "fade")
  if (phase.ph === "high" && !fadeOff) return { lo: cat.ph.high[0], hi: cat.ph.high[1], src: cat.ph.src }
  if (substrate === "soil") return { lo: 6.0, hi: 6.4, src: "spec" }
  if (substrate === "mix7030") return { lo: 5.9, hi: 6.3, src: "estimate" }
  return { lo: cat.ph.coco[0], hi: cat.ph.coco[1], src: cat.ph.src }
}

// ---------- EC table (powders) ----------
/**
 * Linear interpolation in an EC table; null outside its range. `exact` = the EC is a published row (p. 37); between two
 * rows the dose is an estimate (lot 10c), shown as such.
 */
export function interpEc(t: EcRow[], ec: number): { base: number; core: number; exact: boolean } | null {
  if (!t.length || ec < t[0].ec || ec > t[t.length - 1].ec) return null
  for (let i = 0; i < t.length; i++) if (Math.abs(t[i].ec - ec) < 1e-9) return { base: t[i].base, core: t[i].core, exact: true }
  for (let i = 0; i < t.length - 1; i++) {
    if (ec <= t[i + 1].ec) {
      const f = (ec - t[i].ec) / (t[i + 1].ec - t[i].ec)
      return { base: t[i].base + f * (t[i + 1].base - t[i].base), core: t[i].core + f * (t[i + 1].core - t[i].core), exact: false }
    }
  }
  return null
}

/** Grams per 10 L at an EC, clamped to the table; `clamped` says the EC asked was outside it (lot 10c: never silent). */
export function gramsPer10L(cat: NutrientCatalog, ec: number): { base: number; core: number; exact: boolean; clamped?: number } {
  const t = cat.ecTable?.grams ?? []
  if (!t.length) return { base: 0, core: 0, exact: false }
  const lo = t[0].ec
  const hi = t[t.length - 1].ec
  const e = Math.min(hi, Math.max(lo, ec))
  const hit = interpEc(t, e) ?? { base: t[t.length - 1].base, core: t[t.length - 1].core, exact: true }
  return e === ec ? hit : { ...hit, clamped: e }
}

/** mL of concentrate per 10 L: the published table, else grams ÷ strength (marked as estimate). */
export function concMlPer10L(cat: NutrientCatalog, ec: number, gPerL: number): { base: number; core: number; estimate: boolean; clamped?: number } {
  const g = gramsPer10L(cat, ec)
  const e = g.clamped ?? ec
  const hit = interpEc(cat.ecTable?.concentrates[gPerL] ?? [], e)
  if (hit) return { base: hit.base, core: hit.core, estimate: !hit.exact, ...(g.clamped != null ? { clamped: g.clamped } : {}) }
  return { base: (g.base / gPerL) * 1000, core: (g.core / gPerL) * 1000, estimate: true, ...(g.clamped != null ? { clamped: g.clamped } : {}) }
}

// ---------- Recipe ----------
export type MixItem = {
  id: string
  name: string
  kind: "water" | "roWater" | "product" | "custom"
  /** Quantity for the tank; null = to measure (Balance) or to choose in a range / type from the label. */
  qty: number | null
  /** Published range for the tank, when the dose is a range. */
  range?: [number, number]
  unit: "L" | "g" | "mL"
  /** Concentrate strength used (g/L) and its powder equivalent (g). */
  concentrate?: number
  grams?: number
  estimate?: boolean
  src?: ValueSource
  /** Why the quantity is what it is (shown under the line). */
  note?: "balanceFirst" | "balanceSteps" | "coreAlone" | "replacesCore" | "fadeOff" | "labelMissing" | "labelRange" | "range" | "concentrate"
  /** Balance titration step for this tank (mL per step). */
  stepMl?: number
}

export type MixInput = {
  phaseId: string
  volumeL: number
  /** Fertiliser EC aimed for. Default: the phase EC. */
  ec?: number
  /** Powders: 0/undefined = weighed in g; else concentrate strength in g/L. */
  concentrate?: number
  /** Add-ons switched on. Default: the line's defaults. */
  addons?: AddonId[]
  /** Dose chosen inside a published range, per 10 L (Cleanse 5–13, CaMg 8–13…). */
  chosenPer10L?: Record<string, number | undefined>
  /** Balance known from the previous tank (mL per 10 L): poured first. */
  balanceMlPer10L?: number
  /** Personal products (only those going in the tank are used). */
  custom?: CustomProduct[]
  substrate?: Substrate
  /** Actual flowering week, when the phase spans several (personal products' weeks). */
  week?: number
}

export type MixResult = {
  line: string
  phase: ProgramPhase
  ec: number
  /** The target EC differs from the published one: doses scaled, as an estimate. */
  scaled: boolean
  /** EC asked outside the line's EC table: doses of this EC instead (lot 10c, shown). */
  ecClamped?: number
  /** Volume not usable (empty, zero, negative): every quantity is left empty (lot 10c). */
  invalidVolume?: boolean
  ph: PhTarget
  items: MixItem[]
}

const r1 = (x: number) => Math.round(x * 10) / 10
const lohi = (p: Per10L): [number, number] => (typeof p === "number" ? [p, p] : p)

/** Is a personal product used at this phase (at this flowering week when known, else anywhere in the phase)? */
export function customApplies(p: CustomProduct, phase: ProgramPhase, week?: number): boolean {
  if (p.application !== "tank" || p.inactive) return false
  const u = p.use
  if (!u) return true // weeks not typed yet: listed, without a dose
  if (phase.stage === "veg") return !!u.veg
  if (phase.stage === "flower" && u.flowerFrom != null) {
    const to = u.flowerTo ?? u.flowerFrom
    if (week != null) return week >= u.flowerFrom && week <= to
    const [a, b] = phase.weeks ?? [1, 1]
    return a <= to && b >= u.flowerFrom
  }
  return false
}

/** Ingredients of a tank, in mixing order. Throws on an unknown phase (never silently mixes lines). */
export function mixRecipe(lineId: string, input: MixInput): MixResult {
  const cat = getCatalog(lineId)
  const phase = phaseById(cat, input.phaseId)
  if (!phase) throw new Error(`phase ${input.phaseId} not in ${cat.id}`)
  const okVolume = Number.isFinite(input.volumeL) && input.volumeL > 0
  const k = okVolume ? input.volumeL / 10 : 0
  const on = new Set(input.addons ?? cat.defaultAddons)
  const ec = phase.stage === "flush" ? 0 : (input.ec ?? phase.ec)
  const scale = phase.ec > 0 && ec > 0 ? ec / phase.ec : 1
  const scaled = Math.abs(scale - 1) > 1e-9
  const conc = input.concentrate && input.concentrate > 0 ? input.concentrate : 0
  const product = (id: string) => cat.products.find((p) => p.id === id)!
  const allowed = (id: string) => {
    const p = product(id)
    return !p.addon || (on.has(p.addon) && ADDONS[p.addon].lines.includes(cat.id))
  }

  const water: MixItem = phase.roWater
    ? { id: "roWater", name: "", kind: "roWater", qty: input.volumeL, unit: "L" }
    : { id: "water", name: "", kind: "water", qty: input.volumeL, unit: "L" }
  const items: MixItem[] = [water]
  const byProduct = new Map<string, MixItem>()
  let ecClamped: number | undefined

  for (const dose of phase.doses) {
    if (dose.unlessAddon && on.has(dose.unlessAddon)) continue
    if (!allowed(dose.product)) continue
    const p = product(dose.product)
    if (dose.fromEcTable) {
      const gr = gramsPer10L(cat, ec)
      if (gr.clamped != null) ecClamped = gr.clamped
      const g = gr[dose.fromEcTable]
      const note: MixItem["note"] = dose.fromEcTable === "core" ? (dose.unlessAddon ? "fadeOff" : "coreAlone") : conc ? "concentrate" : undefined
      if (conc) {
        const c = concMlPer10L(cat, ec, conc)
        byProduct.set(p.id, { id: p.id, name: p.name, kind: "product", qty: Math.round(c[dose.fromEcTable] * k), unit: "mL", concentrate: conc, grams: r1(g * k), estimate: c.estimate, src: cat.ecTable!.src, note })
      } else byProduct.set(p.id, { id: p.id, name: p.name, kind: "product", qty: r1(g * k), unit: "g", estimate: !gr.exact || undefined, src: cat.ecTable!.src, note })
      continue
    }
    const [lo, hi] = lohi(dose.per10L ?? 0)
    const f = p.scalesWithEc ? scale : 1
    const est = p.scalesWithEc && scaled
    const note: MixItem["note"] = p.id === "fade" && phase.doses.some((d) => d.unlessAddon === "fade") ? "replacesCore" : undefined
    if (lo === hi) {
      byProduct.set(p.id, { id: p.id, name: p.name, kind: "product", qty: r1(lo * f * k), unit: "mL", estimate: est || undefined, src: dose.src, note })
    } else {
      const chosen = input.chosenPer10L?.[p.id]
      byProduct.set(p.id, {
        id: p.id,
        name: p.name,
        kind: "product",
        qty: chosen != null ? r1(chosen * f * k) : null,
        range: [r1(lo * f * k), r1(hi * f * k)],
        unit: "mL",
        estimate: est || undefined,
        src: dose.src,
        note: note ?? "range",
      })
    }
  }

  // Balance: no fixed dose. Known amount first, else by steps of 1 mL per 4 L until the pH target.
  if (allowed("balance") && phase.stage !== "flush") {
    const b = product("balance")
    const known = input.balanceMlPer10L
    byProduct.set(b.id, {
      id: b.id,
      name: b.name,
      kind: "product",
      qty: known != null ? r1(known * k) : null,
      unit: "mL",
      src: ADDONS.balance.src,
      note: known != null ? "balanceFirst" : "balanceSteps",
      stepMl: balanceStepMl(input.volumeL),
    })
  }

  // Balance keeps its place first: known amount poured first, else titrated there by steps once the tank is mixed.
  for (const id of cat.order) {
    const it = byProduct.get(id)
    if (it) items.push(it)
  }

  for (const p of input.custom ?? []) {
    if (!customApplies(p, phase, input.week) || phase.stage === "flush") continue
    const d = p.dosePer10L
    const typed = d && p.use
    if (typed && d.lo === d.hi) items.push({ id: p.id, name: p.name, kind: "custom", qty: r1(d.lo * k), unit: p.unit, src: { kind: "label" } })
    else if (typed) {
      const chosen = input.chosenPer10L?.[p.id]
      items.push({ id: p.id, name: p.name, kind: "custom", qty: chosen != null ? r1(chosen * k) : null, range: [r1(d.lo * k), r1(d.hi * k)], unit: p.unit, src: { kind: "label" }, note: "labelRange" })
    } else items.push({ id: p.id, name: p.name, kind: "custom", qty: null, unit: p.unit, src: { kind: "label" }, note: "labelMissing" })
  }

  // Only doses actually scaled count (a table-driven powder at another EC is still published data).
  const anyScaled = phase.stage !== "flush" && scaled && phase.doses.some((d) => !d.fromEcTable && cat.products.find((p) => p.id === d.product)?.scalesWithEc && items.some((i) => i.id === d.product))
  const ph = phFor(cat, phase, input.substrate, [...on])
  if (!okVolume) return { line: cat.id, phase, ec, scaled: anyScaled, ph, items: items.map((i) => ({ ...i, qty: null, range: undefined, grams: undefined })), invalidVolume: true }
  return { line: cat.id, phase, ec, scaled: anyScaled, ph, items, ...(ecClamped != null ? { ecClamped } : {}) }
}

/** Product ids a recipe uses (lines never share base nutrients). */
export function productIds(r: MixResult): string[] {
  return r.items.filter((i) => i.kind === "product").map((i) => i.id)
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

/** Balance per 10 L to pour first next time: what this tank took (known amount + steps added). */
export function nextBalancePer10L(m: { volumeL: number; balanceMlPer10L?: number; balanceAddedMl?: number }): number | undefined {
  if (m.balanceAddedMl == null && m.balanceMlPer10L == null) return undefined
  if (!m.volumeL) return undefined
  const total = (m.balanceMlPer10L ?? 0) * (m.volumeL / 10) + (m.balanceAddedMl ?? 0)
  return Math.round((total / m.volumeL) * 10 * 100) / 100
}

/**
 * Dose chosen in a published range in a saved tank, per 10 L as typed (lot 10c). Tanks saved before kept only the
 * quantity, scaled with the EC aimed for: that scaling is taken out, so the dose does not drift tank after tank.
 */
export function chosenPer10L(cat: NutrientCatalog, mix: Pick<Mix, "items" | "volumeL" | "phase" | "ecTarget"> | undefined, productId: string): number | undefined {
  const it = mix?.items?.find((i) => i.id === productId && i.qty != null)
  if (!it || !mix?.volumeL) return undefined
  if (it.per10L != null) return it.per10L
  const p = cat.products.find((x) => x.id === productId)
  const was = phaseById(cat, mix.phase)
  const f = p?.scalesWithEc && was && was.ec > 0 && mix.ecTarget ? mix.ecTarget / was.ec : 1
  return Math.round(((it.qty as number) / mix.volumeL / f) * 10 * 10) / 10
}

/** Add-ons a line may switch on (CaMg / PK only for Blended). */
export function lineAddons(lineId: string): AddonId[] {
  return getCatalog(lineId).addons
}

/** Spaces that can share one tank: same nutrient line (Pro and Blended never in the same tank). */
export function canShareTank(lines: string[]): boolean {
  return new Set(lines).size <= 1
}
