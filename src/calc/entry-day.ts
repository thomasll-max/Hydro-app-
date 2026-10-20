// The day's entry « calme » (lot 10l2, planche « Les menus »): the band of results computed while typing (10l2a) and the
// chips used most (10l2b). Pure, tested.
import { status, type Status } from "./advice"
import type { DayTargets } from "./targets"
import type { DrybackMethod, Entry } from "@/model/types"

export type BandKey = "dryback" | "drybackSensor" | "runoffPct" | "vpd" | "dli"

/** The results that mean something for the space: dryback (or the sensor's), runoff, VPD, DLI, by module. */
export function bandKeys(modules: { irrigation?: boolean; climate?: boolean; light?: boolean }, method: DrybackMethod): BandKey[] {
  const out: BandKey[] = []
  if (modules.irrigation && method === "weight") out.push("dryback")
  if (modules.irrigation && (method === "acinfinity" || method === "sensor")) out.push("drybackSensor")
  if (modules.irrigation) out.push("runoffPct")
  if (modules.climate) out.push("vpd")
  if (modules.light) out.push("dli")
  return out
}

/**
 * One cell of the band, computed live from what is typed: the value (undefined: « — », a value is missing), its status
 * against the day's targets (`dayTargets`; none for the sensor's dryback, on its own scale).
 */
export function bandCell(k: BandKey, live: Partial<Entry> | null, tg: Partial<DayTargets> | null): { value?: number; status?: Status } {
  const value = live?.[k] ?? undefined
  if (value == null) return {}
  const target = k === "drybackSensor" ? undefined : tg?.[k]
  return target ? { value, status: status(value, target) } : { value }
}

/**
 * The chips shown first (lot 10l2b): the `n` used most in the user's entries, in their usual order on a tie; without any
 * history, the usual order. The others go behind « +N ».
 */
export function topTags<T extends string>(order: readonly T[], used: T[][], n = 4): T[] {
  const count = new Map<T, number>()
  for (const list of used) for (const t of new Set(list)) count.set(t, (count.get(t) ?? 0) + 1)
  return [...order].sort((a, b) => (count.get(b) ?? 0) - (count.get(a) ?? 0) || order.indexOf(a) - order.indexOf(b)).slice(0, n)
}
