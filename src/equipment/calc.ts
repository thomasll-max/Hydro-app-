// Equipment calculations (spec §4quater). Pure, tested. A missing input never becomes a guess:
// the result says which field is missing, and the UI shows "donnée manquante".
import type { DimensionsCm, Equipment, EquipmentAssignment, Space } from "@/model/grow"
import type { IsoDate } from "@/model/types"

export type Calc = { ok: true; value: number; hypothesis?: boolean } | { ok: false; missing: string[] }

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)
function need(fields: Record<string, unknown>): string[] {
  return Object.entries(fields)
    .filter(([, v]) => !isNum(v) || (v as number) <= 0)
    .map(([k]) => k)
}
const ok = (value: number, hypothesis?: boolean): Calc => (hypothesis ? { ok: true, value, hypothesis } : { ok: true, value })

/** Default share of photons reaching the canopy (walls, distance). Shown and editable. */
export const DEFAULT_LOSS_FACTOR = 0.85
export const CFM_TO_M3H = 1.699

export function areaM2(d?: Partial<DimensionsCm>): Calc {
  const m = need({ l: d?.l, w: d?.w })
  return m.length ? { ok: false, missing: m } : ok((d!.l! / 100) * (d!.w! / 100))
}
export function volumeM3(d?: Partial<DimensionsCm>): Calc {
  const m = need({ l: d?.l, w: d?.w, h: d?.h })
  return m.length ? { ok: false, missing: m } : ok((d!.l! / 100) * (d!.w! / 100) * (d!.h! / 100))
}

/** PPF (µmol/s) = published PPF, else real watts × efficacy (µmol/J). */
export function ppf(lamp: Equipment["lamp"], dimmerPct = 100): Calc {
  if (isNum(lamp?.ppf) && lamp!.ppf! > 0) return ok(lamp!.ppf! * (dimmerPct / 100))
  const m = need({ watts: lamp?.watts, efficacy: lamp?.efficacy })
  if (m.length) return { ok: false, missing: m }
  return ok(lamp!.watts! * lamp!.efficacy! * (dimmerPct / 100), lamp!.efficacyIsHypothesis)
}

/** Mean PPFD over the footprint ≈ PPF × loss factor / area. An estimate, never a measurement. */
export function ppfd(totalPpf: Calc, dims?: Partial<DimensionsCm>, loss = DEFAULT_LOSS_FACTOR): Calc {
  const a = areaM2(dims)
  const missing = [...(totalPpf.ok ? [] : totalPpf.missing), ...(a.ok ? [] : a.missing)]
  if (missing.length || !totalPpf.ok || !a.ok) return { ok: false, missing }
  return ok((totalPpf.value * loss) / a.value, totalPpf.hypothesis)
}

export function wattsPerM2(watts: number | undefined, dims?: Partial<DimensionsCm>): Calc {
  const a = areaM2(dims)
  const m = [...need({ watts }), ...(a.ok ? [] : a.missing)]
  if (m.length || !a.ok) return { ok: false, missing: m }
  return ok(watts! / a.value)
}

/** Room left for the plant: space height − pot height − lamp thickness − minimum lamp-to-canopy distance. */
export function freeHeightCm(input: { spaceH?: number; potH?: number; lampH?: number; minDistanceCm?: number }): Calc {
  const m = need({ spaceH: input.spaceH, potH: input.potH, lampH: input.lampH, minDistanceCm: input.minDistanceCm })
  if (m.length) return { ok: false, missing: m }
  return ok(input.spaceH! - input.potH! - input.lampH! - input.minDistanceCm!)
}

/** Shot duration (s) = volume (mL) / flow (mL/min) × 60. Volume from % of pot when given. */
export function shotSeconds(input: { volumeMl?: number; potL?: number; pct?: number; flowMlPerMin?: number }): Calc {
  const vol = isNum(input.volumeMl) ? input.volumeMl : isNum(input.potL) && isNum(input.pct) ? input.potL * 10 * input.pct : undefined
  const m = need({ volumeMl: vol, flowMlPerMin: input.flowMlPerMin })
  if (m.length) return { ok: false, missing: m }
  return ok((vol! / input.flowMlPerMin!) * 60)
}

/** Reservoir autonomy (days) = litres left / litres used per day. */
export function autonomyDays(leftL?: number, perDayL?: number): Calc {
  const m = need({ leftL, perDayL })
  return m.length ? { ok: false, missing: m } : ok(leftL! / perDayL!)
}

export function cfmToM3h(cfm: number): number {
  return cfm * CFM_TO_M3H
}
export function extractorM3h(x: Equipment["extractor"]): number | undefined {
  if (isNum(x?.m3h)) return x!.m3h
  if (isNum(x?.cfm)) return cfmToM3h(x!.cfm!)
  return undefined
}

/** Seconds to renew the whole air volume of the space at the current speed. */
export function airRenewalSeconds(dims: Partial<DimensionsCm> | undefined, m3h?: number, speedPct = 100): Calc {
  const v = volumeM3(dims)
  const m = [...(v.ok ? [] : v.missing), ...need({ m3h })]
  if (m.length || !v.ok) return { ok: false, missing: m }
  return ok((v.value / (m3h! * (speedPct / 100))) * 3600)
}
export function airChangesPerHour(dims: Partial<DimensionsCm> | undefined, m3h?: number, speedPct = 100): Calc {
  const s = airRenewalSeconds(dims, m3h, speedPct)
  return s.ok ? ok(3600 / s.value) : s
}

/** Grams of dry flower per watt. */
export function gramsPerWatt(dryG?: number, watts?: number): Calc {
  const m = need({ dryG, watts })
  return m.length ? { ok: false, missing: m } : ok(dryG! / watts!)
}

// ---------- Assignment history ----------
/** Items in a space at a given date (from ≤ date < to). Past configurations are never rewritten. */
export function equipmentAt(spaceId: string | null, date: IsoDate, assignments: EquipmentAssignment[]): EquipmentAssignment[] {
  return assignments.filter((a) => a.spaceId === spaceId && a.from <= date && (!a.to || date < a.to))
}

export function currentAssignment(equipmentId: string, assignments: EquipmentAssignment[]): EquipmentAssignment | undefined {
  return assignments.filter((a) => a.equipmentId === equipmentId && !a.to).sort((a, b) => b.from.localeCompare(a.from))[0]
}

/** Moving an item: close its open period on `date`, open a new one. Returns the docs to write. */
export function moveEquipment(
  equipmentId: string,
  toSpaceId: string | null,
  date: IsoDate,
  assignments: EquipmentAssignment[],
  newId: () => string,
): { close?: EquipmentAssignment; open: EquipmentAssignment } {
  const cur = currentAssignment(equipmentId, assignments)
  const close = cur ? { ...cur, to: date } : undefined
  const open: EquipmentAssignment = { schemaVersion: 1, id: newId(), equipmentId, spaceId: toSpaceId, from: date }
  return close ? { close, open } : { open }
}

/** Lamps of a space at a date, with their PPF summed. */
export function spaceLight(space: Pick<Space, "id" | "dimensionsCm">, date: IsoDate, equipment: Equipment[], assignments: EquipmentAssignment[], loss = DEFAULT_LOSS_FACTOR) {
  const here = equipmentAt(space.id, date, assignments)
  const lamps = here.map((a) => ({ a, e: equipment.find((x) => x.id === a.equipmentId) })).filter((x) => x.e?.type === "lamp")
  if (!lamps.length) return null
  const parts = lamps.map(({ a, e }) => {
    const p = ppf(e!.lamp, e!.lamp?.dimmerPct ?? 100)
    const q = a.quantity ?? e!.quantity ?? 1
    return p.ok ? { ...p, value: p.value * q } : p
  })
  const missing = parts.flatMap((p) => (p.ok ? [] : p.missing))
  const total: Calc = missing.length ? { ok: false, missing } : ok(parts.reduce((s, p) => s + (p.ok ? p.value : 0), 0), parts.some((p) => p.ok && p.hypothesis))
  const watts = lamps.every(({ e }) => isNum(e!.lamp?.watts)) ? lamps.reduce((s, { a, e }) => s + e!.lamp!.watts! * (a.quantity ?? e!.quantity ?? 1), 0) : undefined
  return { ppf: total, ppfd: ppfd(total, space.dimensionsCm, loss), wPerM2: wattsPerM2(watts, space.dimensionsCm), watts, names: lamps.map(({ e }) => e!.name) }
}

/** Pots and pump of a space at a date (irrigation tool, lot 4b). Missing values stay missing: "donnée manquante". */
export function spaceIrrigation(spaceId: string, date: IsoDate, equipment: Equipment[], assignments: EquipmentAssignment[]) {
  const here = equipmentAt(spaceId, date, assignments)
    .map((a) => ({ a, e: equipment.find((x) => x.id === a.equipmentId) }))
    .filter((x): x is { a: EquipmentAssignment; e: Equipment } => !!x.e)
  const pots = here.find((x) => x.e.type === "container")
  const pump = here.find((x) => x.e.type === "pump")
  const vol = pots?.e.container?.volumeL
  const flowV = pump?.e.pump?.flowMlPerMin
  const potL: Calc = isNum(vol) && vol > 0 ? ok(vol) : { ok: false, missing: ["potVolumeL"] }
  const flow: Calc = isNum(flowV) && flowV > 0 ? ok(flowV) : { ok: false, missing: ["flowMlPerMin"] }
  const count = pots ? (pots.a.quantity ?? pots.e.container?.count ?? pots.e.quantity) : undefined
  return {
    potL,
    potCount: isNum(count) && count > 0 ? count : undefined,
    flow,
    flowMeasuredAt: pump?.e.pump?.flowMeasuredAt,
    substrate: pots?.e.container?.substrate,
    containerName: pots?.e.name,
    containerId: pots?.e.id,
    containerAssignment: pots?.a,
    pumpName: pump?.e.name,
  }
}

/** Pots typed in the irrigation tool: updates the space's container, or creates one (then assigned to the space). */
export function withPots(existing: Equipment | undefined, p: { volumeL: number; count?: number; substrate?: string; id: string; now: string; name: string }): Equipment {
  if (existing)
    return {
      ...existing,
      // "Pots 15 L" follows the new volume; a name without a volume in it is kept.
      name: existing.name.replace(/\d+(?:[.,]\d+)?(\s?L\b)/, `${String(p.volumeL).replace(".", ",")}$1`),
      container: { ...existing.container, volumeL: p.volumeL, ...(p.count ? { count: p.count } : {}) },
      ...(p.count ? { quantity: p.count } : {}),
      updatedAt: p.now,
    }
  return {
    schemaVersion: 1,
    id: p.id,
    type: "container",
    name: p.name,
    source: "user",
    container: { volumeL: p.volumeL, ...(p.count ? { count: p.count } : {}), ...(p.substrate ? { substrate: p.substrate } : {}) },
    ...(p.count ? { quantity: p.count } : {}),
    createdAt: p.now,
    updatedAt: p.now,
  }
}
