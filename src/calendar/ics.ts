// .ics export (RFC 5545): personal reminders with RRULE, VALARM and stable UIDs, automatic deadlines as
// all-day events. Times are written in the grow's time zone with a generated VTIMEZONE, so a recurring
// reminder keeps its wall-clock time across daylight-saving changes in any calendar app.
import { fromZonedTime, getTimezoneOffset } from "date-fns-tz"
import type { Reminder } from "@/model/grow"
import type { IsoDate } from "@/model/types"
import { splitLocal } from "./rrule"
import type { Deadline } from "./deadlines"

const UID_DOMAIN = "hydro.app"
export const reminderUid = (r: Pick<Reminder, "id">) => `${r.id}@${UID_DOMAIN}`
export const deadlineUid = (d: Pick<Deadline, "key">) => `auto-${d.key}@${UID_DOMAIN}`

/** TEXT escaping (RFC 5545 §3.3.11). A lone CR is a line break too (lot 10a): never a raw one in the file. */
export function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n")
}

/** The zone goes into TZID parameters unquoted: only an IANA-looking name is kept, anything else becomes UTC. */
export function safeTz(tz: string): string {
  return /^[A-Za-z][A-Za-z0-9_+\-]*(\/[A-Za-z0-9_+\-]+)*$/.test(tz) ? tz : "UTC"
}

/** UNTIL must be a UTC DATE-TIME when DTSTART has a time (RFC 5545 §3.3.10): end of that local day, in UTC. */
export function untilUtc(rrule: string, tz: string): string {
  return rrule.replace(/UNTIL=(\d{4})(\d{2})(\d{2})(?![\dT])/i, (_m, y, mo, d) => `UNTIL=${utcStamp(fromZonedTime(`${y}-${mo}-${d}T23:59:59`, tz))}`)
}

/** Folds a content line at 75 octets (UTF-8), never inside a character. */
export function fold(line: string): string {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 75) return line
  const parts: string[] = []
  let cur = ""
  let size = 0
  for (const ch of line) {
    const n = enc.encode(ch).length
    const limit = parts.length ? 74 : 75 // continuation lines start with a space
    if (size + n > limit) {
      parts.push(cur)
      cur = ""
      size = 0
    }
    cur += ch
    size += n
  }
  parts.push(cur)
  return parts.join("\r\n ")
}

const compact = (date: IsoDate) => date.replace(/-/g, "")
const localStamp = (date: IsoDate, time: string) => `${compact(date)}T${time.replace(":", "")}00`
const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")

function offsetStr(ms: number): string {
  const m = Math.round(ms / 60000)
  const sign = m < 0 ? "-" : "+"
  const a = Math.abs(m)
  return `${sign}${String(Math.floor(a / 60)).padStart(2, "0")}${String(a % 60).padStart(2, "0")}`
}

/**
 * VTIMEZONE for an IANA zone, built from its real offsets (scanned hour by hour over one year).
 * Each transition becomes a yearly rule: month + n-th (or last) weekday, as zones define them.
 */
export function vtimezone(tz: string, year: number): string[] {
  const off = (t: number) => getTimezoneOffset(tz, new Date(t))
  const start = Date.UTC(year, 0, 1)
  const end = Date.UTC(year + 1, 0, 1)
  const changes: { at: number; from: number; to: number }[] = []
  let prev = off(start)
  for (let t = start + 3_600_000; t < end; t += 3_600_000) {
    const o = off(t)
    if (o !== prev) changes.push({ at: t, from: prev, to: o })
    prev = o
  }
  const lines = ["BEGIN:VTIMEZONE", `TZID:${tz}`]
  if (!changes.length) {
    const o = offsetStr(off(start))
    lines.push("BEGIN:STANDARD", "DTSTART:19700101T000000", `TZOFFSETFROM:${o}`, `TZOFFSETTO:${o}`, "END:STANDARD")
  }
  const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]
  for (const c of changes) {
    const local = new Date(c.at + c.from) // wall clock just before the change, read as UTC fields
    const y = local.getUTCFullYear()
    const m = local.getUTCMonth() + 1
    const d = local.getUTCDate()
    const dim = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const nth = d + 7 > dim ? -1 : Math.ceil(d / 7)
    const kind = c.to > c.from ? "DAYLIGHT" : "STANDARD"
    const stamp = `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}T${String(local.getUTCHours()).padStart(2, "0")}${String(local.getUTCMinutes()).padStart(2, "0")}00`
    lines.push(
      `BEGIN:${kind}`,
      `DTSTART:${stamp}`,
      `RRULE:FREQ=YEARLY;BYMONTH=${m};BYDAY=${nth}${DAYS[local.getUTCDay()]}`,
      `TZOFFSETFROM:${offsetStr(c.from)}`,
      `TZOFFSETTO:${offsetStr(c.to)}`,
      `END:${kind}`,
    )
  }
  lines.push("END:VTIMEZONE")
  return lines
}

export type IcsInput = {
  reminders: Reminder[]
  deadlines: { deadline: Deadline; title: string; date: IsoDate }[]
  tz: string
  now: Date
  calName: string
  /** Label of the alarm text for reminders. */
  alarmText: (title: string) => string
}

function alarm(minutes: number, text: string): string[] {
  return ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(text)}`, `TRIGGER:-PT${minutes}M`, "END:VALARM"]
}

export function buildIcs(input: IcsInput): string {
  const p = { ...input, tz: safeTz(input.tz) }
  const stamp = utcStamp(p.now)
  const lines: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Hydro//Calendrier//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${escapeText(p.calName)}`, `X-WR-TIMEZONE:${p.tz}`]
  lines.push(...vtimezone(p.tz, p.now.getUTCFullYear()))

  // Sorted by id: the same data gives the same file (stable diffs, stable UIDs).
  for (const r of [...p.reminders].filter((x) => x.kind !== "auto" && x.start).sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
    const { date, time } = splitLocal(r.start)
    const uid = reminderUid(r)
    const base = (start: string) => [
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${p.tz}:${start}`,
      "DURATION:PT15M",
      `SUMMARY:${escapeText(r.title ?? "")}`,
      ...(r.note ? [`DESCRIPTION:${escapeText(r.note)}`] : []),
    ]
    // A one-off reminder that was postponed is exported at its new date.
    const once = !r.rrule && r.snoozed?.[date] ? splitLocal(r.snoozed[date]) : null
    lines.push("BEGIN:VEVENT", ...base(once ? localStamp(once.date, once.time) : localStamp(date, time)))
    if (r.rrule) lines.push(`RRULE:${untilUtc(r.rrule, p.tz)}`)
    // Occurrences marked done are left out of the calendar.
    const done = new Set(r.rrule ? (r.done ?? []) : [])
    if (done.size) lines.push(`EXDATE;TZID=${p.tz}:${[...done].sort().map((d) => localStamp(d, time)).join(",")}`)
    if (r.alarmMin != null) lines.push(...alarm(r.alarmMin, p.alarmText(r.title)))
    lines.push("END:VEVENT")
    // A postponed occurrence: same UID, RECURRENCE-ID of the original, new start.
    for (const [key, moved] of Object.entries(r.snoozed ?? {}).sort()) {
      if (!r.rrule || done.has(key)) continue
      const m = splitLocal(moved)
      lines.push("BEGIN:VEVENT", ...base(localStamp(m.date, m.time)), `RECURRENCE-ID;TZID=${p.tz}:${localStamp(key, time)}`)
      if (r.alarmMin != null) lines.push(...alarm(r.alarmMin, p.alarmText(r.title)))
      lines.push("END:VEVENT")
    }
  }

  for (const d of [...p.deadlines].sort((a, b) => a.deadline.key.localeCompare(b.deadline.key))) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${deadlineUid(d.deadline)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(d.date)}`,
      "DURATION:P1D",
      `SUMMARY:${escapeText(d.title)}`,
      "TRANSP:TRANSPARENT",
      // 09:00 on the day (all-day events start at midnight).
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(d.title)}`,
      "TRIGGER:PT9H",
      "END:VALARM",
      "END:VEVENT",
    )
  }
  lines.push("END:VCALENDAR")
  return lines.map(fold).join("\r\n") + "\r\n"
}
