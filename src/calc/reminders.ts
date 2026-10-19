// "À venir": tank to remake (from real consumption), 12/12, Fade, flush.
import type { Cycle, Entry, IsoDate, Mix } from "@/model/types"
import { daysBetween, fadeStart, flushStart, plannedHarvest } from "./stage"

/** Litres used on a day = volume per pot × number of pots (all pots get the same dose). */
export function litresUsed(e: Entry, potCount: number): number {
  return e.volumePerPotMl ? (e.volumePerPotMl * potCount) / 1000 : 0
}

export type TankForecast = { mix: Mix; remainingL: number; perDayL: number; daysLeft: number }

/** Remaining volume of the latest tank and days until empty, from the last 7 entries' real consumption. */
export function tankForecast(mixes: Mix[], entries: Entry[], potCount: number): TankForecast | null {
  const mix = [...mixes].sort((a, b) => (a.date < b.date ? 1 : -1))[0]
  if (!mix) return null
  const room = entries.filter((e) => !e.plantId)
  const since = room.filter((e) => e.date >= mix.date)
  const used = since.reduce((s, e) => s + litresUsed(e, potCount), 0)
  const recent = [...room].sort((a, b) => (a.date < b.date ? 1 : -1)).filter((e) => e.volumePerPotMl).slice(0, 7)
  const perDayL = recent.length ? recent.reduce((s, e) => s + litresUsed(e, potCount), 0) / recent.length : 0
  const remainingL = Math.max(0, mix.volumeL - used)
  return { mix, remainingL, perDayL, daysLeft: perDayL > 0 ? remainingL / perDayL : Infinity }
}

export type Reminder =
  | { kind: "tank"; inDays: number; litres: number }
  | { kind: "flip"; inDays: number }
  | { kind: "fade"; inDays: number; week: number }
  | { kind: "flush"; inDays: number }
  | { kind: "harvest"; inDays: number }

export function reminders(c: Cycle, mixes: Mix[], entries: Entry[], today: IsoDate): Reminder[] {
  const out: Reminder[] = []
  const tank = c.potCount ? tankForecast(mixes, entries, c.potCount) : null
  if (tank && Number.isFinite(tank.daysLeft)) {
    // Next tank: same volume as the last one, made ~5–7 days of solution at a time (RAIN manual).
    out.push({ kind: "tank", inDays: Math.max(0, Math.floor(tank.daysLeft)), litres: Math.round(tank.mix.volumeL) })
  }
  if (!c.flipDate && c.plannedFlipDate) out.push({ kind: "flip", inDays: daysBetween(today, c.plannedFlipDate) })
  const fade = fadeStart(c)
  if (fade && today < fade) out.push({ kind: "fade", inDays: daysBetween(today, fade), week: 8 })
  const flush = flushStart(c)
  if (flush && today < flush) out.push({ kind: "flush", inDays: daysBetween(today, flush) })
  const harvest = plannedHarvest(c)
  if (harvest && !c.harvestDate && today >= (flush ?? harvest) && today < harvest) out.push({ kind: "harvest", inDays: daysBetween(today, harvest) })
  return out.sort((a, b) => a.inDays - b.inDays)
}
