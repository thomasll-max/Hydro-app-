// IPW (spec §6, lot 5; docs/athena-fiche.md « ADD-ONS », Handbook p. 80 of the PDF). Foliar spray only, never in the tank,
// in RO water. Veg and flowering S1–S3 only. Protocols: prevention 24 mL/L twice a week, pressure 32 mL/L three times a
// week, restoration 32 mL/L over 9 days (2 days of spraying, 1 day off).
import type { Spray } from "@/model/grow"
import type { IsoDate } from "@/model/types"
import { IPW } from "@/data/nutrients"
import { addDays, type StageInfo } from "./stage"

export type IpwProtocol = keyof typeof IPW.protocols
export const IPW_PROTOCOLS: IpwProtocol[] = ["prevention", "pressure", "restoration"]

export const ipwMlPerL = (p: IpwProtocol) => IPW.protocols[p].mlPerL

/** mL of IPW for a sprayer of `litres` (2 L × 24 mL/L = 48 mL). */
export function ipwDoseMl(litres: number, p: IpwProtocol): number {
  return Math.round(litres * ipwMlPerL(p) * 10) / 10
}

export type IpwAllowed = { ok: true } | { ok: false; reason: "seedling" | "flowerLate" | "flush" | "harvested" | "notStarted" }

/** Veg, or flowering weeks 1–3. Blocked from flowering week 4 (S5 included), during the flush and before veg. */
export function ipwAllowed(s: Pick<StageInfo, "key" | "flowerWeek">): IpwAllowed {
  if (s.key === "veg") return { ok: true }
  if (s.key === "notStarted" || s.key === "harvested" || s.key === "flush" || s.key === "seedling") return { ok: false, reason: s.key }
  return (s.flowerWeek ?? 1) <= IPW.lastFlowerWeek ? { ok: true } : { ok: false, reason: "flowerLate" }
}

/** Last day IPW may be sprayed: end of flowering week 3 (12/12 day = day 1). */
export function ipwLastDay(flipDate?: IsoDate): IsoDate | undefined {
  return flipDate ? addDays(flipDate, IPW.lastFlowerWeek * 7 - 1) : undefined
}

/** Day offsets of a protocol within a 7-day week (restoration: one 9-day run). */
const PATTERN: Record<IpwProtocol, { offsets: number[]; repeatDays?: number }> = {
  prevention: { offsets: [0, 3], repeatDays: 7 },
  pressure: { offsets: [0, 2, 4], repeatDays: 7 },
  restoration: { offsets: [0, 1, 3, 4, 6, 7] }, // 2 on, 1 off, over 9 days
}

/** Spray days of a protocol from its first day, up to `until` (inclusive) or `weeks` weeks. */
export function ipwSchedule(p: IpwProtocol, start: IsoDate, until?: IsoDate, weeks = 4): IsoDate[] {
  const pat = PATTERN[p]
  const days: IsoDate[] = []
  const reps = pat.repeatDays ? weeks : 1
  for (let w = 0; w < reps; w++) for (const o of pat.offsets) days.push(addDays(start, o + w * (pat.repeatDays ?? 0)))
  return until ? days.filter((d) => d <= until) : days
}

/** Next spray of the running protocol of a space: the first scheduled day after the last spray, still allowed. */
export function nextIpw(sprays: Spray[], spaceId: string, until?: IsoDate): { date: IsoDate; protocol: IpwProtocol; start: IsoDate } | null {
  const mine = sprays.filter((s) => s.product === "ipw" && s.spaceIds.includes(spaceId) && s.protocol).sort((a, b) => b.date.localeCompare(a.date))
  const last = mine[0]
  if (!last?.protocol) return null
  const start = last.protocolStart ?? last.date
  const next = ipwSchedule(last.protocol, start, until, 52).find((d) => d > last.date)
  return next ? { date: next, protocol: last.protocol, start } : null
}

/** Checklist before spraying (fiche « ADD-ONS »). */
export const IPW_CHECKLIST = ["roWater", "saturated", "climate", "lightsOff", "order", "dry"] as const
export type IpwCheck = (typeof IPW_CHECKLIST)[number]
