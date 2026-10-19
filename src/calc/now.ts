// Aujourd'hui « calme » (lot 10k1): the one thing to do now, and the one state of each space. Pure, tested in
// calc/lot10k.test.ts. Nothing is invented: only what the app already computes (the correction of the last entry, the
// entry not done yet, the deadlines of the calendar).
import type { Entry, IsoDate, StageKey, WaterMode } from "@/model/types"
import type { CalItem } from "@/calendar/agenda"
import type { DayTargets } from "./targets"
import type { Autonomy } from "./reservoir"
import { oneCorrection, type Advice } from "./advice"
import { addDays, daysBetween } from "./stage"

/** What « Maintenant » needs to know of a space. */
export type NowSpace = {
  spaceId: string
  /** A cycle runs here (not before its start, not harvested). */
  active: boolean
  /** The space has measurements to log (watering or climate module). */
  logs: boolean
  /** Lights-on time of the cycle (« 06:00 »): the day's entry is due from then on. */
  lightsOn?: string
  waterMode?: WaterMode
  /** Last entry of the whole space (not a plant's). */
  last?: Entry
}

export type Now =
  | { kind: "alert"; spaceId: string; advice: Advice; date: IsoDate }
  | { kind: "entry"; spaceId: string; last?: Pick<Entry, "date" | "time"> }
  | { kind: "deadline"; spaceId?: string; item: CalItem }
  | { kind: "ok" }

const minutes = (hhmm?: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? "")
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0
}

/**
 * « Maintenant », in this order: an alert of the day (a value out of target in a recent entry — today or yesterday —
 * with the correction the app computes; « alerte » before « à surveiller »); the day's entry not done yet, once the
 * lights are on; a deadline due today (or overdue); else « Tout est à jour ». `next` is the following deadline (else the
 * following reminder).
 */
export function chooseNow(spaces: NowSpace[], items: CalItem[], today: IsoDate, nowMinutes: number): { now: Now; next?: CalItem } {
  const alerts = spaces.flatMap((s) => {
    const e = s.last
    if (!e || !e.targets || e.date < addDays(today, -1)) return []
    const a = oneCorrection(e, e.targets as unknown as DayTargets, s.waterMode ?? "manual")
    return a ? [{ kind: "alert" as const, spaceId: s.spaceId, advice: a, date: e.date }] : []
  })
  const due = items.filter((i) => i.type === "deadline" && !i.done && i.date <= today).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  let now: Now
  const alert = alerts.find((a) => a.advice.status === "bad") ?? alerts[0]
  const entry = spaces.find((s) => s.active && s.logs && s.last?.date !== today && nowMinutes >= minutes(s.lightsOn))
  if (alert) now = alert
  else if (entry) now = { kind: "entry", spaceId: entry.spaceId, ...(entry.last ? { last: { date: entry.last.date, time: entry.last.time } } : {}) }
  else if (due.length) now = { kind: "deadline", spaceId: due[0].spaceId, item: due[0] }
  else now = { kind: "ok" }
  // « Ensuite »: the next deadline of the calendar (12/12, bidon, Fade…), else the next reminder.
  const shown = now.kind === "deadline" ? now.item.id : null
  const later = items.filter((i) => !i.done && i.id !== shown && i.date >= today).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time ?? "") < (b.time ?? "") ? -1 : 1))
  const next = later.find((i) => i.type === "deadline") ?? later[0]
  return { now, ...(next ? { next } : {}) }
}

/** What a space's line needs (lot 10k1). */
export type LineSpace = {
  /** A cycle runs here (started, not harvested), or a harvest is drying here. */
  active: boolean
  drying: boolean
  last?: Entry
  waterMode?: WaterMode
  autonomy?: Autonomy | null
  stage?: StageKey | "notStarted"
}

/** The one state of a space on Aujourd'hui: a coloured dot and a few words. */
export type LineState =
  | { kind: "empty"; tone: "none" }
  | { kind: "notStarted"; tone: "none" }
  | { kind: "noEntry"; tone: "none" }
  | { kind: "off"; tone: "warn" | "bad"; metric: Advice["metric"] }
  | { kind: "late"; tone: "warn"; days: number }
  | { kind: "tank"; tone: "warn"; days: number; old: boolean }
  | { kind: "climate"; tone: "ok"; temp?: number; rh?: number }
  | { kind: "ok"; tone: "ok" }

/**
 * In this order: a cycle that has not started yet; no cycle (« pas de cycle »); no entry yet; a value out of target in the last entry (if recent); no
 * entry for more than a day; the tank under the existing alert threshold (≤ 1 day, or a solution over 7 days in
 * drain-to-waste); a drying space shows its climate; else « dans la cible ».
 */
export function lineState(s: LineSpace, today: IsoDate): LineState {
  if (s.stage === "notStarted") return { kind: "notStarted", tone: "none" }
  if (!s.active) return { kind: "empty", tone: "none" }
  const e = s.last
  if (!e) return { kind: "noEntry", tone: "none" }
  const recent = daysBetween(e.date, today) <= 1
  if (recent && e.targets && !s.drying) {
    const a = oneCorrection(e, e.targets as unknown as DayTargets, s.waterMode ?? "manual")
    if (a) return { kind: "off", tone: a.status, metric: a.metric }
  }
  if (!recent) return { kind: "late", tone: "warn", days: daysBetween(e.date, today) }
  const a = s.autonomy
  if (a && !s.drying) {
    const d = a.days.ok ? Math.floor(a.days.value) : null
    if (a.tooOld) return { kind: "tank", tone: "warn", days: a.mixAgeDays ?? 0, old: true }
    if (d != null && d <= 1) return { kind: "tank", tone: "warn", days: d, old: false }
  }
  if (s.drying) return { kind: "climate", tone: "ok", ...(e.tempDay != null ? { temp: e.tempDay } : {}), ...(e.rh != null ? { rh: e.rh } : {}) }
  return { kind: "ok", tone: "ok" }
}
