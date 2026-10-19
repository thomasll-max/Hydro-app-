// « Autre marque / je dose moi-même » (lot 7a): the grower's own line, made of personal products typed from their labels.
// Pure: label dose → per 10 L → dose × volume, by phase and flowering week, in the order of the list. Nothing is ever
// proposed: no dose, no EC, no pH that the grower has not typed. Tested in calc/lot7.test.ts.
import type { CustomProduct, OwnTargets } from "@/model/grow"
import type { Range, StageKey } from "@/model/types"
import type { StageInfo } from "./stage"

/** A US gallon in litres (the conversion shown under the field). */
export const GALLON_L = 3.785
/** Volumes a label dose is written for: 1 L, 4 L, 10 L or 1 US gallon. */
export const LABEL_VOLUMES = [1, 4, 10, "gal"] as const
export type LabelVolume = (typeof LABEL_VOLUMES)[number]
export const litresOf = (v: LabelVolume): number => (v === "gal" ? GALLON_L : v)

const r2 = (x: number) => Math.round(x * 100) / 100
const r1 = (x: number) => Math.round(x * 10) / 10

/** Label dose (lo–hi for `perL` litres) → per 10 L. */
export function per10L(lo: number, hi: number, perL: number): Range {
  return { lo: r2((lo / perL) * 10), hi: r2((hi / perL) * 10) }
}

/** Dose for a tank: per 10 L × volume / 10, one decimal. */
export function doseFor(per10: Range, volumeL: number): [number, number] {
  const k = volumeL / 10
  return [r1(per10.lo * k), r1(per10.hi * k)]
}

/** Phase of the own line: veg, or a flowering week. Seedlings, flush and harvest have no recipe of their own. */
export type OwnPhase = { stage: "veg" } | { stage: "flower"; week?: number }
export function ownPhaseOf(s: Pick<StageInfo, "key" | "flowerWeek"> | null | undefined): OwnPhase | null {
  if (!s) return null
  if (s.key === "veg") return { stage: "veg" }
  if (s.flowerWeek && s.key !== "flush" && s.key !== "harvested") return { stage: "flower", week: s.flowerWeek }
  return null
}

/** Is a product used in this phase? `null`: its weeks are not typed yet (listed, to be completed). */
export function usedIn(p: CustomProduct, phase: OwnPhase): boolean | null {
  const u = p.use
  if (!u || (!u.veg && u.flowerFrom == null)) return null
  if (phase.stage === "veg") return !!u.veg
  if (u.flowerFrom == null) return false
  const to = u.flowerTo ?? u.flowerFrom
  return phase.week == null ? true : phase.week >= u.flowerFrom && phase.week <= to
}

/** Products of the own line: those poured in the tank, switched on. */
export const ownLineProducts = (all: CustomProduct[]) => all.filter((p) => p.application === "tank" && !p.inactive)

/** Is a mixing order given (a product was moved at least once)? */
export const hasMixOrder = (products: CustomProduct[]) => products.some((p) => p.mixOrder != null)

/** Products in the order of the list: the mixing order once given, else as they were added. */
export function inListOrder(products: CustomProduct[]): CustomProduct[] {
  const added = (a: CustomProduct, b: CustomProduct) => (a.createdAt === b.createdAt ? (a.id < b.id ? -1 : 1) : a.createdAt < b.createdAt ? -1 : 1)
  return [...products].sort((a, b) => {
    if (a.mixOrder != null && b.mixOrder != null && a.mixOrder !== b.mixOrder) return a.mixOrder - b.mixOrder
    if (a.mixOrder != null && b.mixOrder == null) return -1
    if (a.mixOrder == null && b.mixOrder != null) return 1
    return added(a, b)
  })
}

/** Moves a product one place up (-1) or down (+1): every product of the list gets its place (the order is then given). */
export function moveInOrder(products: CustomProduct[], id: string, dir: -1 | 1): CustomProduct[] {
  const list = inListOrder(products)
  const i = list.findIndex((p) => p.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= list.length) return list.map((p, n) => ({ ...p, mixOrder: n + 1 }))
  ;[list[i], list[j]] = [list[j], list[i]]
  return list.map((p, n) => ({ ...p, mixOrder: n + 1 }))
}

export type OwnItem = {
  id: string
  name: string
  brand?: string
  unit: CustomProduct["unit"]
  /** One quantity (the label gives one dose), else null. */
  qty: number | null
  /** Min–max for the tank when the label gives a range. */
  range?: [number, number]
  /** Place in the mixing order (null: order not given). */
  order: number | null
  /** The label dose is not typed yet; the weeks of use are not typed yet. */
  doseMissing?: boolean
  weeksMissing?: boolean
}

/**
 * Recipe of the tank for a phase: dose × volume, product by product, in the order of the list. A range stays a range
 * (min–max). A product without its weeks is listed to be completed, without a quantity; one outside its weeks is not.
 */
export function ownRecipe(products: CustomProduct[], phase: OwnPhase, volumeL: number): { items: OwnItem[]; ordered: boolean; invalidVolume: boolean } {
  const line = inListOrder(ownLineProducts(products))
  const ordered = hasMixOrder(line)
  const okVolume = Number.isFinite(volumeL) && volumeL > 0
  const items: OwnItem[] = []
  line.forEach((p) => {
    const used = usedIn(p, phase)
    if (used === false) return
    // Numbered among the products of this tank (1, 2, 3…), in the order of the list.
    const base = { id: p.id, name: p.name, ...(p.brand ? { brand: p.brand } : {}), unit: p.unit, order: ordered ? items.length + 1 : null }
    if (used === null) return items.push({ ...base, qty: null, weeksMissing: true, ...(p.dosePer10L ? {} : { doseMissing: true }) })
    if (!p.dosePer10L) return items.push({ ...base, qty: null, doseMissing: true })
    if (!okVolume) return items.push({ ...base, qty: null })
    const [lo, hi] = doseFor(p.dosePer10L, volumeL)
    items.push(lo === hi ? { ...base, qty: lo } : { ...base, qty: null, range: [lo, hi] })
  })
  return { items, ordered, invalidVolume: !okVolume }
}

/** Targets typed by the grower for a stage (EC and pH of the solution), else nothing. */
export function ownTargetsFor(own: OwnTargets | undefined, stage: StageKey): { ec?: Range; ph?: Range } {
  if (!own) return {}
  const t = stage === "veg" ? own.veg : stage === "stretch" || stage === "bulk" || stage === "finish" ? own.flower : undefined
  return { ...(t?.ec ? { ec: t.ec } : {}), ...(t?.ph ? { ph: t.ph } : {}) }
}

/** A product given by hand (lot 7b): its dose per litre of watering can, from the label. Never in the tank nor its EC. */
export type HandItem = { id: string; name: string; brand?: string; unit: CustomProduct["unit"]; perL: [number, number] | null; weeksMissing?: boolean }

/**
 * « À la main, si tu veux »: the products given by hand for this phase (all of them when the phase is not known), in the
 * order of the list. No frequency and no reminder of their own.
 */
export function handList(products: CustomProduct[], phase: OwnPhase | null): HandItem[] {
  return inListOrder(products.filter((p) => p.application === "hand" && !p.inactive)).flatMap((p) => {
    const used = phase ? usedIn(p, phase) : true
    if (used === false) return []
    const d = p.dosePer10L
    return [{ id: p.id, name: p.name, ...(p.brand ? { brand: p.brand } : {}), unit: p.unit, perL: d ? ([r2(d.lo / 10), r2(d.hi / 10)] as [number, number]) : null, ...(used === null ? { weeksMissing: true } : {}) }]
  })
}
