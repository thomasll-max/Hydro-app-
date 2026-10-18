// Reservoir autonomy of a space (spec §4quater "Nutrition", §3 "Autonomie du réservoir").
// Litres left: the latest level typed in the journal, else the last tank minus what the pots received since.
// Daily use: the drop between two readings with no new tank in between, else volume per pot × pots.
import type { Entry, IsoDate, Mix } from "@/model/types"
import { daysBetween } from "./stage"
import { litresUsed } from "./reminders"
import type { Calc } from "@/equipment/calc"

export type Autonomy = {
  left: Calc
  perDay: Calc
  days: Calc
  /** "reading" = level typed in the journal; "estimate" = last tank minus watering since. */
  source: "reading" | "estimate" | null
  usableL?: number
  /** Age of the solution in days (drain-to-waste: more than 7 days is flagged). */
  mixAgeDays?: number
  tooOld: boolean
}

const ok = (value: number): Calc => ({ ok: true, value })
const miss = (...m: string[]): Calc => ({ ok: false, missing: m })

export function reservoirAutonomy(p: { entries: Entry[]; mixes: Mix[]; potCount?: number; usableL?: number; mode?: "dtw" | "recirc"; today: IsoDate }): Autonomy {
  const room = p.entries.filter((e) => !e.plantId).sort((a, b) => (a.date < b.date ? 1 : -1))
  const mix = [...p.mixes].sort((a, b) => (a.date < b.date ? 1 : -1))[0]
  const readings = room.filter((e) => e.reservoirL != null)
  const r0 = readings[0]

  let left: Calc = miss("leftL")
  let source: Autonomy["source"] = null
  if (r0 && (!mix || r0.date >= mix.date)) {
    left = ok(r0.reservoirL!)
    source = "reading"
  } else if (mix && p.potCount) {
    const used = room.filter((e) => e.date >= mix.date).reduce((s, e) => s + litresUsed(e, p.potCount!), 0)
    left = ok(Math.max(0, mix.volumeL - used))
    source = "estimate"
  }

  let perDay: Calc = miss("perDayL")
  const r1 = readings[1]
  const mixBetween = r0 && r1 && mix && mix.date > r1.date && mix.date <= r0.date
  if (r0 && r1 && !mixBetween && r1.reservoirL! > r0.reservoirL! && daysBetween(r1.date, r0.date) > 0) {
    perDay = ok((r1.reservoirL! - r0.reservoirL!) / daysBetween(r1.date, r0.date))
  } else if (p.potCount) {
    const recent = room.filter((e) => e.volumePerPotMl).slice(0, 7)
    if (recent.length) perDay = ok(recent.reduce((s, e) => s + litresUsed(e, p.potCount!), 0) / recent.length)
  }

  const days: Calc = left.ok && perDay.ok && perDay.value > 0 ? ok(left.value / perDay.value) : miss(...(left.ok ? [] : left.missing), ...(perDay.ok ? [] : perDay.missing))
  const mixAgeDays = mix ? daysBetween(mix.date, p.today) : undefined
  return { left, perDay, days, source, usableL: p.usableL, mixAgeDays, tooOld: p.mode === "dtw" && mixAgeDays != null && mixAgeDays > 7 }
}
