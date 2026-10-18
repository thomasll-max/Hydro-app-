// Climat et air (spec §6, lot 5): leaf VPD and its inverse (humidity for a VPD target), air renewal from the space's
// extractor. VPD targets are common benchmarks (labelled as such); the extractor flow comes from the equipment.
import type { Equipment, EquipmentAssignment, Space } from "@/model/grow"
import type { IsoDate, Range } from "@/model/types"
import { airChangesPerHour, airRenewalSeconds, equipmentAt, extractorM3h, type Calc } from "@/equipment/calc"
import { svp, vpd } from "./formulas"

const r2 = (x: number) => Math.round(x * 100) / 100

/** Leaf VPD (kPa) and leaf temperature. */
export function leafVpd(airC: number, rh: number, leafOffsetC = -2): { vpd: number; leafC: number } {
  return { vpd: r2(vpd(airC, rh, leafOffsetC)), leafC: Math.round((airC + leafOffsetC) * 10) / 10 }
}

/** Relative humidity (%) giving a leaf VPD at a given air temperature: (svp(leaf) − VPD) ÷ svp(air). Null if impossible. */
export function rhForVpd(targetVpd: number, airC: number, leafOffsetC = -2): number | null {
  const rh = ((svp(airC + leafOffsetC) - targetVpd) / svp(airC)) * 100
  return rh > 0 && rh <= 100 ? Math.round(rh) : null
}

/** Humidity range for a VPD range (higher VPD → lower humidity). */
export function rhRangeForVpd(target: Range, airC: number, leafOffsetC = -2): Range | null {
  const hi = rhForVpd(target.lo, airC, leafOffsetC)
  const lo = rhForVpd(target.hi, airC, leafOffsetC)
  return hi != null && lo != null ? { lo, hi } : null
}

export function vpdStatus(v: number, target?: Range): "ok" | "low" | "high" | "none" {
  if (!target) return "none"
  return v < target.lo ? "low" : v > target.hi ? "high" : "ok"
}

/** Common benchmark for air renewal: one full renewal every 1 to 3 minutes (not from the Handbook). */
export const AIR_REF_SECONDS: [number, number] = [60, 180]

/** Extractor of a space and its renewal at a speed (from the equipment; missing flow → "donnée manquante"). */
export function spaceAir(space: Pick<Space, "id" | "dimensionsCm">, date: IsoDate, equipment: Equipment[], assignments: EquipmentAssignment[], speedPct?: number) {
  const ext = equipmentAt(space.id, date, assignments)
    .map((a) => equipment.find((e) => e.id === a.equipmentId))
    .find((e): e is Equipment => e?.type === "extractor")
  if (!ext) return null
  const m3h = extractorM3h(ext.extractor)
  const speed = speedPct ?? ext.extractor?.speedPct ?? 100
  const seconds: Calc = airRenewalSeconds(space.dimensionsCm, m3h, speed)
  const perHour: Calc = airChangesPerHour(space.dimensionsCm, m3h, speed)
  const status = seconds.ok ? (seconds.value <= AIR_REF_SECONDS[1] ? (seconds.value >= AIR_REF_SECONDS[0] ? "ok" : "fast") : "slow") : null
  return { ext, m3h, speed, seconds, perHour, status, carbonFilter: !!ext.extractor?.carbonFilter }
}
