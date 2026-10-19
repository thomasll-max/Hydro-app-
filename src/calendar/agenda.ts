// One list for the calendar, the agenda, Today's "À venir" and the Bonjour card:
// personal reminders (with their recurrence) + automatic deadlines, each with its state.
import type { Reminder } from "@/model/grow"
import type { IsoDate } from "@/model/types"
import { addDays } from "@/calc/stage"
import { occurrences, type Occurrence } from "./rrule"
import { deadlineState, deadlines, type CalendarData, type Deadline } from "./deadlines"

export type CalItem =
  | { type: "reminder"; id: string; date: IsoDate; time: string; at: Date; spaceId?: string; done: boolean; snoozed: boolean; overdue: boolean; occ: Occurrence; late?: boolean }
  | { type: "deadline"; id: string; date: IsoDate; time?: undefined; spaceId?: string; done: boolean; snoozed: boolean; overdue: boolean; deadline: Deadline }

/** Device time zone (fallback when the grow has none). */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

export function growTimeZone(data: Pick<CalendarData, "grow">): string {
  return data.grow?.timeZone || deviceTimeZone()
}

/** Items due in [from, to]. Undone items before `today` are flagged overdue. */
export function calendarItems(data: CalendarData, from: IsoDate, to: IsoDate, today: IsoDate, tz = growTimeZone(data)): CalItem[] {
  const out: CalItem[] = []
  const custom = (data.reminders ?? []).filter((r) => r.kind !== "auto")
  for (const r of custom) {
    let occs: Occurrence[] = []
    try {
      occs = occurrences(r, from, to, tz)
    } catch {
      continue // unsupported rule: never crash the calendar
    }
    for (const o of occs)
      out.push({ type: "reminder", id: `${r.id}:${o.key}`, date: o.date, time: o.time, at: o.at, spaceId: r.spaceId, done: o.done, snoozed: o.snoozed, overdue: !o.done && o.date < today, occ: o })
  }
  for (const d of deadlines(data, today)) {
    const st = deadlineState(d, data.reminders)
    if (st.date < from || st.date > to) continue
    out.push({ type: "deadline", id: d.key, date: st.date, spaceId: d.spaceId, done: st.done, snoozed: st.snoozed, overdue: !st.done && st.date < today, deadline: d })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "") || a.id.localeCompare(b.id))
}

/**
 * What is still to do: overdue (up to `lookBack` days) and the next `days` days, not done. A recurring reminder shows
 * only its next occurrence (today's, flagged `late` once its time has passed), not one line per day (lot 10d).
 */
export function upcoming(data: CalendarData, today: IsoDate, days = 7, lookBack = 7, tz?: string, now = new Date()): CalItem[] {
  const items = calendarItems(data, addDays(today, -lookBack), addDays(today, days), today, tz).filter((i) => !i.done)
  const keep = new Map<string, CalItem>()
  for (const i of items) {
    if (i.type !== "reminder" || !i.occ.reminder.rrule) continue
    const id = i.occ.reminder.id
    const cur = keep.get(id)
    // The first one from today on wins; failing that, the latest overdue one.
    if (!cur || (cur.date < today && (i.date >= today || i.date > cur.date))) keep.set(id, i)
  }
  return items.flatMap((i): CalItem[] => {
    if (i.type !== "reminder") return [i]
    if (i.occ.reminder.rrule && keep.get(i.occ.reminder.id) !== i) return []
    return [i.date === today && i.at.getTime() < now.getTime() ? { ...i, late: true } : i]
  })
}

/** Keeps items of the selected spaces; items without a space (whole grow) always stay. */
export function forSpaces<T extends { spaceId?: string }>(items: T[], spaceIds: Set<string> | null): T[] {
  return spaceIds ? items.filter((i) => !i.spaceId || spaceIds.has(i.spaceId)) : items
}

/** Empty state doc for an automatic deadline. */
export function autoState(key: string, now: string): Reminder {
  return { schemaVersion: 2, id: `auto_${key}`, kind: "auto", autoKey: key, title: "", start: "", createdAt: now }
}
