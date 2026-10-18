// Lumière (spec §6, lot 5): DLI and its inverse, PPFD from the lamps of the space, W/m², free height, a proportional
// top view of the space with a 3 × 3 grid. Estimates are labelled; a missing field stays "donnée manquante".
import type { DimensionsCm, Equipment, EquipmentAssignment, Space } from "@/model/grow"
import type { IsoDate, Range } from "@/model/types"
import { equipmentAt, freeHeightCm, spaceLight, type Calc } from "@/equipment/calc"
import { dli, ppfdForDli } from "./formulas"

const r1 = (x: number) => Math.round(x * 10) / 10

/** DLI (mol/m²/day) from a PPFD and a photoperiod. */
export const dliOf = (ppfd: number, hours: number) => r1(dli(ppfd, hours))
/** PPFD needed for a DLI target over a photoperiod. */
export const ppfdFor = (dliTarget: number, hours: number) => Math.round(ppfdForDli(dliTarget, hours))

/**
 * Dimmer setting for a target PPFD, from the estimated PPFD at 100 %. Capped at 100; an estimate like the PPFD itself.
 * Lamps rarely dim linearly: the user corrects it with a measurement.
 */
export function dimmerFor(targetPpfd: number, ppfdAtFull: number): number | null {
  if (!(ppfdAtFull > 0)) return null
  return Math.min(100, Math.round((targetPpfd / ppfdAtFull) * 100))
}

/** Light of a space with every lamp at the dimmer typed in the tool (or its stored setting). */
export function spaceLightAt(space: Pick<Space, "id" | "dimensionsCm">, date: IsoDate, equipment: Equipment[], assignments: EquipmentAssignment[], dimmers: Record<string, number | undefined> = {}) {
  const eq = equipment.map((e) => (e.type === "lamp" && dimmers[e.id] != null ? { ...e, lamp: { ...e.lamp, dimmerPct: dimmers[e.id] } } : e))
  const full = equipment.map((e) => (e.type === "lamp" ? { ...e, lamp: { ...e.lamp, dimmerPct: 100 } } : e))
  return { now: spaceLight(space, date, eq, assignments), full: spaceLight(space, date, full, assignments) }
}

/** Room above the canopy: space height − pot height − lamp thickness − lamp's minimum distance (all from equipment). */
export function spaceFreeHeight(space: Pick<Space, "id" | "dimensionsCm">, date: IsoDate, equipment: Equipment[], assignments: EquipmentAssignment[]): Calc {
  const here = equipmentAt(space.id, date, assignments).map((a) => equipment.find((e) => e.id === a.equipmentId))
  const lamp = here.find((e) => e?.type === "lamp")
  const pots = here.find((e) => e?.type === "container")
  return freeHeightCm({ spaceH: space.dimensionsCm?.h, potH: pots?.container?.heightCm, lampH: lamp?.lamp?.dimensionsCm?.h, minDistanceCm: lamp?.lamp?.minHeightCm })
}

// ---------- Proportional top view ----------
export type Rect = { x: number; y: number; w: number; h: number }
export type Schema = {
  /** viewBox size: proportional to the space (longest side = `size`). */
  width: number
  height: number
  /** 1 cm in viewBox units. */
  scale: number
  space: Rect
  cells: Rect[]
  lamps: { id: string; name: string; rect: Rect | null }[]
}

/**
 * Top view at scale: the space (length along x, width along y), a 3 × 3 grid, each lamp's body centred and spread
 * along the length (positions are schematic; sizes are to scale). A lamp without dimensions is listed, not drawn.
 */
export function spaceSchema(dims: Partial<DimensionsCm> | undefined, lamps: { id: string; name: string; l?: number; w?: number; count?: number }[], size = 300): Schema | null {
  const L = dims?.l
  const W = dims?.w
  if (!L || !W || L <= 0 || W <= 0) return null
  const scale = size / Math.max(L, W)
  const width = L * scale
  const height = W * scale
  const cells: Rect[] = []
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) cells.push({ x: (col * width) / 3, y: (row * height) / 3, w: width / 3, h: height / 3 })
  const drawn = lamps.flatMap((l) => Array.from({ length: Math.max(1, l.count ?? 1) }, (_, i) => ({ ...l, key: `${l.id}#${i}` })))
  const n = drawn.length
  return {
    width,
    height,
    scale,
    space: { x: 0, y: 0, w: width, h: height },
    cells,
    lamps: drawn.map((l, i) => {
      if (!l.l || !l.w) return { id: l.key, name: l.name, rect: null }
      const w = Math.min(width, l.l * scale)
      const h = Math.min(height, l.w * scale)
      const cx = (width * (i + 0.5)) / n
      return { id: l.key, name: l.name, rect: { x: Math.max(0, Math.min(width - w, cx - w / 2)), y: (height - h) / 2, w, h } }
    }),
  }
}

// ---------- 3 × 3 PPFD map ----------
export type MapStats = { mean: number; min: number; max: number; uniformity: number; measured: number }

/** Mean, min, max and uniformity (min ÷ mean) of the measured cells. Null with fewer than 1 cell. */
export function mapStats(cells: (number | null | undefined)[]): MapStats | null {
  const v = cells.filter((x): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0)
  if (!v.length) return null
  const mean = v.reduce((s, x) => s + x, 0) / v.length
  const min = Math.min(...v)
  const max = Math.max(...v)
  return { mean: Math.round(mean), min, max, uniformity: mean > 0 ? Math.round((min / mean) * 100) / 100 : 0, measured: v.length }
}

/** Where a cell stands against the PPFD target. */
export function cellLevel(v: number | null | undefined, target?: Range): "none" | "low" | "ok" | "high" {
  if (v == null) return "none"
  if (!target) return "ok"
  return v < target.lo ? "low" : v > target.hi ? "high" : "ok"
}
