// Recurrence of personal reminders (spec §4ter). Pure, no server.
// Occurrences are computed on the LOCAL calendar (date + wall-clock time in the grow's time zone),
// then turned into instants: a reminder at 08:00 stays at 08:00 across a daylight-saving change.
import { fromZonedTime } from "date-fns-tz"
import type { IsoDate } from "@/model/types"
import type { Reminder } from "@/model/grow"
import { addDays, daysBetween, toUtc } from "@/calc/stage"

export type Freq = "DAILY" | "WEEKLY" | "MONTHLY"
export const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const
export type Weekday = (typeof WEEKDAYS)[number]

export type Rule = { freq: Freq; interval: number; count?: number; until?: IsoDate; byDay?: Weekday[] }

/** Parses the supported RRULE subset. Anything else throws (never silently ignored). */
export function parseRRule(s: string): Rule {
  const parts = Object.fromEntries(
    s
      .replace(/^RRULE:/i, "")
      .split(";")
      .filter(Boolean)
      .map((p) => {
        const [k, v] = p.split("=")
        return [k.toUpperCase(), (v ?? "").toUpperCase()]
      }),
  )
  const known = new Set(["FREQ", "INTERVAL", "COUNT", "UNTIL", "BYDAY"])
  for (const k of Object.keys(parts)) if (!known.has(k)) throw new Error(`RRULE: ${k} not supported`)
  const freq = parts.FREQ as Freq
  if (!["DAILY", "WEEKLY", "MONTHLY"].includes(freq)) throw new Error(`RRULE: FREQ=${parts.FREQ} not supported`)
  const interval = parts.INTERVAL ? Number(parts.INTERVAL) : 1
  if (!Number.isInteger(interval) || interval < 1) throw new Error("RRULE: bad INTERVAL")
  const rule: Rule = { freq, interval }
  if (parts.COUNT) {
    rule.count = Number(parts.COUNT)
    if (!Number.isInteger(rule.count) || rule.count < 1) throw new Error("RRULE: bad COUNT")
  }
  if (parts.UNTIL) {
    const m = parts.UNTIL.match(/^(\d{4})(\d{2})(\d{2})/)
    if (!m) throw new Error("RRULE: bad UNTIL")
    rule.until = `${m[1]}-${m[2]}-${m[3]}`
  }
  if (parts.BYDAY) {
    if (freq !== "WEEKLY") throw new Error("RRULE: BYDAY only with WEEKLY")
    const days = parts.BYDAY.split(",") as Weekday[]
    if (!days.every((d) => WEEKDAYS.includes(d))) throw new Error("RRULE: bad BYDAY")
    rule.byDay = WEEKDAYS.filter((d) => days.includes(d))
  }
  return rule
}

export function formatRRule(r: Rule): string {
  return [
    `FREQ=${r.freq}`,
    r.interval > 1 ? `INTERVAL=${r.interval}` : null,
    r.byDay?.length ? `BYDAY=${r.byDay.join(",")}` : null,
    r.count ? `COUNT=${r.count}` : null,
    r.until ? `UNTIL=${r.until.replace(/-/g, "")}` : null,
  ]
    .filter(Boolean)
    .join(";")
}

/** Monday = 0 … Sunday = 6 for a local date. */
export function weekdayIndex(d: IsoDate): number {
  return (new Date(toUtc(d)).getUTCDay() + 6) % 7
}

function addMonths(d: IsoDate, n: number): IsoDate | null {
  const [y, m, day] = d.split("-").map(Number)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  const dim = new Date(Date.UTC(ny, nm, 0)).getUTCDate()
  // RFC 5545: a 31st that does not exist in a month is skipped, not moved.
  if (day > dim) return null
  return `${ny}-${String(nm).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** Local dates of a series, in order, until `to` (inclusive) or the end of the rule. Hard cap for safety. */
export function seriesDates(startDate: IsoDate, rrule: string | undefined, to: IsoDate, cap = 2000): IsoDate[] {
  if (!rrule) return startDate <= to ? [startDate] : []
  const r = parseRRule(rrule)
  const end = r.until && r.until < to ? r.until : to
  const out: IsoDate[] = []
  const push = (d: IsoDate) => {
    if (d < startDate) return true
    if (d > end) return false
    if (r.count != null && out.length >= r.count) return false
    out.push(d)
    return out.length < cap
  }
  if (r.freq === "DAILY") {
    for (let d = startDate; ; d = addDays(d, r.interval)) if (!push(d)) break
  } else if (r.freq === "WEEKLY") {
    const days = r.byDay?.length ? r.byDay.map((x) => WEEKDAYS.indexOf(x)) : [weekdayIndex(startDate)]
    const monday = addDays(startDate, -weekdayIndex(startDate))
    outer: for (let w = monday; ; w = addDays(w, 7 * r.interval)) {
      for (const i of days) {
        const d = addDays(w, i)
        if (d < startDate) continue
        if (!push(d)) break outer
      }
      if (w > end) break
    }
  } else {
    for (let k = 0; ; k += r.interval) {
      const d = addMonths(startDate, k)
      if (d == null) {
        if (k > 1200) break
        continue
      }
      if (!push(d)) break
    }
  }
  return out
}

export type Occurrence = {
  reminder: Reminder
  /** Original local date of the occurrence (key for done / snoozed). */
  key: IsoDate
  /** Local date and time it is due (after a possible "Reporter"). */
  date: IsoDate
  time: string
  /** The instant, in UTC. */
  at: Date
  done: boolean
  snoozed: boolean
}

export function splitLocal(local: string): { date: IsoDate; time: string } {
  return { date: local.slice(0, 10), time: local.slice(11, 16) || "09:00" }
}

/** Instant of a local wall-clock time in a time zone (handles DST gaps and overlaps like date-fns-tz). */
export function instant(date: IsoDate, time: string, tz: string): Date {
  return fromZonedTime(`${date}T${time}:00`, tz)
}

/** Occurrences whose due date falls in [from, to], plus the original date for done/snooze state. */
export function occurrences(rem: Reminder, from: IsoDate, to: IsoDate, tz: string): Occurrence[] {
  const { date: d0, time } = splitLocal(rem.start)
  // Snoozed occurrences can land after their original date: look a little further back.
  const keys = seriesDates(d0, rem.rrule, to).filter((k) => k >= addDays(from, -31))
  const done = new Set(rem.done ?? [])
  const out: Occurrence[] = []
  for (const key of keys) {
    const moved = rem.snoozed?.[key]
    const { date, time: tm } = moved ? splitLocal(moved) : { date: key, time }
    if (date < from || date > to) continue
    out.push({ reminder: rem, key, date, time: tm, at: instant(date, tm, tz), done: done.has(key), snoozed: !!moved })
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime())
}

/** "Reporter": moves one occurrence to the next day, same time. */
export function snoozeOne(rem: Reminder, occ: Pick<Occurrence, "key" | "date" | "time">, days = 1): Reminder {
  return { ...rem, snoozed: { ...(rem.snoozed ?? {}), [occ.key]: `${addDays(occ.date, days)}T${occ.time}` } }
}

/** "Fait" (or undo). */
export function toggleDone(rem: Reminder, key: IsoDate, on = true): Reminder {
  const set = new Set(rem.done ?? [])
  if (on) set.add(key)
  else set.delete(key)
  return { ...rem, done: [...set].sort() }
}

export { daysBetween }
