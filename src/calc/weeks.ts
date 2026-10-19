// Journal par semaines (lot 10k3): calendar weeks Monday–Sunday (the strip « L M M J V S D » of the validated board), one
// card per week, and per space in « Tous ». Pure and tested (calc/lot10k.test.ts); computed once per change of the journal.
// Every « hors cible » comes from the targets recorded in the entry (`TargetsSnapshot`), never from today's targets.
import type { Cycle, Entry, GrowEvent, IsoDate, Mix } from "@/model/types"
import { addDays, daysBetween, stageOn } from "./stage"
import { pills, type MetricKey } from "./advice"
import type { DayTargets } from "./targets"

/** Monday of the week of a date. */
export function mondayOf(iso: IsoDate): IsoDate {
  const wd = (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7
  return addDays(iso, -wd)
}

/** The stage a week of a cycle is named after: « Végé S6 », « Floraison S3 », « Séchage S1 ». */
export type WeekLabel = { kind: "before" | "seedling" | "veg" | "flower" | "drying"; week: number }

/**
 * The week takes the stage of its Thursday (the day most of the week shares), within the cycle: a cycle that starts
 * later in the week takes its first day.
 */
export function weekLabel(cycle: Pick<Cycle, "germinationDate" | "vegDate" | "transferDate" | "flipDate" | "flowerWeeks" | "harvestDate">, monday: IsoDate): WeekLabel {
  let ref = addDays(monday, 3)
  if (cycle.germinationDate && cycle.germinationDate > ref && cycle.germinationDate <= addDays(monday, 6)) ref = cycle.germinationDate
  const s = stageOn(cycle, ref)
  if (s.key === "notStarted") return { kind: "before", week: 0 }
  if (s.key === "harvested") return { kind: "drying", week: Math.ceil((daysBetween(cycle.harvestDate!, ref) + 1) / 7) }
  if (s.flowerWeek) return { kind: "flower", week: s.flowerWeek }
  return { kind: s.key === "veg" ? "veg" : "seedling", week: s.week }
}

/** A value of an entry out of the target recorded with it. */
export type Off = { metric: MetricKey; status: "warn" | "bad"; value: number; lo: number; hi: number }

export function offValues(e: Entry): Off[] {
  if (!e.targets) return []
  const t = e.targets as unknown as DayTargets
  const p = pills(e, t)
  return (Object.keys(p) as MetricKey[])
    .filter((k) => p[k] === "warn" || p[k] === "bad")
    .map((k) => ({ metric: k, status: p[k] as "warn" | "bad", value: e[k] as number, lo: t[k]!.lo, hi: t[k]!.hi }))
}

export type DayState = "ok" | "warn" | "none" | "future"
export type WeekDay = {
  date: IsoDate
  state: DayState
  today: boolean
  /** A tank, an action or an event that day: the small « eau » dot under the number. */
  dot: boolean
  entries: Entry[]
  mixes: Mix[]
  events: GrowEvent[]
}

/** A day that matters in an open week: an alert, an action, an observation, a note, a tank or an event. */
export type DayRow = {
  date: IsoDate
  kind: "warn" | "action" | "obs" | "mix" | "event" | "note"
  /** The whole-space entry of the day (values, note), if any. */
  entry?: Entry
  offs: Off[]
  actions: string[]
  obs: string[]
  note?: string
  mixes: Mix[]
  events: GrowEvent[]
}

/** Key values summed up per week: dryback (or the sensor's), EC runoff; a drying room: T° and RH. */
export type KeyMetric = "dryback" | "drybackSensor" | "ecRunoff" | "tempDay" | "rh"

export type Week = {
  key: string
  monday: IsoDate
  spaceId?: string
  cycleId?: string
  label: WeekLabel | null
  days: WeekDay[]
  /** Days with an entry, the newest first. */
  rows: DayRow[]
  /** Days with an entry and nothing to say (« + N jours sans souci »). */
  quiet: WeekDay[]
  entries: Entry[]
  mixes: Mix[]
  events: GrowEvent[]
  offDays: number
  incidents: number
  ranges: Partial<Record<KeyMetric, [number, number]>>
  current: boolean
}

const room = (list: Entry[]) => list.filter((e) => !e.plantId)

function rowOf(d: WeekDay): DayRow | null {
  const r = room(d.entries)
  const entry = r[0]
  const offs = r.flatMap(offValues)
  const actions = [...new Set(r.flatMap((e) => e.actions ?? []))]
  const obs = [...new Set(r.flatMap((e) => (e.observations ?? []).map((o) => o.tag)))]
  const note = r.map((e) => e.note?.trim()).find(Boolean)
  if (!offs.length && !actions.length && !obs.length && !note && !d.mixes.length && !d.events.length) return null
  // Its icon: an alert first, then a tank (« Nouveau bidon · Rempotage »), an action, an observation, an event, a note.
  const kind: DayRow["kind"] = offs.length ? "warn" : d.mixes.length ? "mix" : actions.length ? "action" : obs.length ? "obs" : d.events.length ? "event" : "note"
  return { date: d.date, kind, ...(entry ? { entry } : {}), offs, actions, obs, ...(note ? { note } : {}), mixes: d.mixes, events: d.events }
}

function ranges(list: Entry[], drying: boolean): Week["ranges"] {
  const out: Week["ranges"] = {}
  const keys: KeyMetric[] = drying ? ["tempDay", "rh"] : [list.some((e) => e.dryback != null) ? "dryback" : "drybackSensor", "ecRunoff"]
  for (const k of keys) {
    const v = list.map((e) => e[k]).filter((x): x is number => typeof x === "number")
    if (v.length) out[k] = [Math.min(...v), Math.max(...v)]
  }
  return out
}

/**
 * The weeks of a journal, newest first. `perSpace` (« Tous »): one card per week and per space. `cycle`: the cycle the
 * Journal shows (its weeks are named after it, and its running week is shown even before its first entry).
 */
export function buildWeeks(p: { entries: Entry[]; mixes: Mix[]; events: GrowEvent[]; cycles: Cycle[]; today: IsoDate; perSpace: boolean; cycle?: Cycle; drying?: (spaceId?: string) => boolean }): Week[] {
  const groups = new Map<string, { monday: IsoDate; spaceId?: string; entries: Entry[]; mixes: Mix[]; events: GrowEvent[] }>()
  const group = (date: IsoDate, spaceId?: string) => {
    const monday = mondayOf(date)
    const key = p.perSpace ? `${spaceId ?? "-"}_${monday}` : monday
    let g = groups.get(key)
    if (!g) groups.set(key, (g = { monday, ...(p.perSpace && spaceId ? { spaceId } : {}), entries: [], mixes: [], events: [] }))
    return g
  }
  for (const e of p.entries) if (e.date <= p.today) group(e.date, e.spaceId).entries.push(e)
  for (const m of p.mixes) if (m.date <= p.today) for (const s of p.perSpace ? (m.spaceIds?.length ? m.spaceIds : [undefined]) : [undefined]) group(m.date, s).mixes.push(m)
  for (const ev of p.events) if (ev.date <= p.today) group(ev.date, ev.spaceId).events.push(ev)
  // The running week of the cycle, even before its first entry (« en cours »).
  if (p.cycle && !p.cycle.harvestDate && p.cycle.germinationDate && p.cycle.germinationDate <= p.today && !p.perSpace) group(p.today)
  const thisMonday = mondayOf(p.today)
  const weeks: Week[] = []
  for (const [key, g] of groups) {
    // The cycle the week belongs to: the one shown, else the one most of its entries name.
    const count = new Map<string, number>()
    for (const e of g.entries) if (e.cycleId) count.set(e.cycleId, (count.get(e.cycleId) ?? 0) + 1)
    const cycleId = p.cycle?.id ?? [...count].sort((a, b) => b[1] - a[1])[0]?.[0]
    const cycle = p.cycle ?? p.cycles.find((c) => c.id === cycleId)
    const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(g.monday, i)
      const entries = g.entries.filter((e) => e.date === date)
      const mixes = g.mixes.filter((m) => m.date === date)
      const events = g.events.filter((ev) => ev.date === date)
      const state: DayState = date > p.today ? "future" : !entries.length ? "none" : room(entries).some((e) => offValues(e).length) ? "warn" : "ok"
      const dot = mixes.length > 0 || events.length > 0 || entries.some((e) => (e.actions ?? []).length > 0)
      return { date, state, today: date === p.today, dot, entries, mixes, events }
    })
    const rows = days
      .map(rowOf)
      .filter((r): r is DayRow => !!r)
      .reverse()
    const quiet = days.filter((d) => d.entries.length && !rows.some((r) => r.date === d.date)).reverse()
    const roomEntries = room(g.entries)
    weeks.push({
      key,
      monday: g.monday,
      ...(g.spaceId ? { spaceId: g.spaceId } : {}),
      ...(cycleId ? { cycleId } : {}),
      label: cycle ? weekLabel(cycle, g.monday) : null,
      days,
      rows,
      quiet,
      entries: g.entries,
      mixes: g.mixes,
      events: g.events,
      offDays: days.filter((d) => d.state === "warn").length,
      incidents: roomEntries.reduce((n, e) => n + (e.observations?.length ?? 0), 0),
      ranges: ranges(roomEntries, p.drying?.(g.spaceId) ?? false),
      current: g.monday === thisMonday,
    })
  }
  return weeks.sort((a, b) => (a.monday === b.monday ? (a.spaceId ?? "").localeCompare(b.spaceId ?? "") : a.monday < b.monday ? 1 : -1))
}

// ---- Page d'une semaine (lot 10k3c) ------------------------------------------------------------------------------

/** Key values of a week page: dryback (weighing, or the sensor's without an Athena target), runoff, EC and pH runoff,
 *  VPD; a drying room: T°, HR, VPD. */
export type WeekMetric = "dryback" | "drybackSensor" | "runoffPct" | "ecRunoff" | "phRunoff" | "vpd" | "tempDay" | "rh"
export const CULTURE_METRICS: WeekMetric[] = ["dryback", "drybackSensor", "runoffPct", "ecRunoff", "phRunoff", "vpd"]
export const DRYING_METRICS: WeekMetric[] = ["tempDay", "rh", "vpd"]

export type MetricPoint = { date: IsoDate; value: number; status?: "ok" | "warn" | "bad" }
export type MetricLine = {
  metric: WeekMetric
  /** The target recorded with the week's latest entry (none for the sensor's dryback, T° or HR). */
  target?: { lo: number; hi: number }
  points: MetricPoint[]
  avg: number
  prevAvg?: number
  /** Days in the target out of the days measured against a target. */
  inTarget: number
  measured: number
  /** Against the week before: back in or inside the target, closer to it, farther from it, the same distance. */
  trend?: "in" | "closer" | "farther" | "same"
}

const targetOf = (e: Entry, m: WeekMetric) => (m === "drybackSensor" || m === "tempDay" || m === "rh" ? undefined : (e.targets as Record<string, { lo: number; hi: number } | undefined> | undefined)?.[m])
const distance = (v: number, t: { lo: number; hi: number }) => (v < t.lo ? t.lo - v : v > t.hi ? v - t.hi : 0)
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length

/** One value a day (the whole-space entry of that day; the latest if several), for each key value present this week. */
export function metricLines(week: Entry[], prev: Entry[], metrics: WeekMetric[]): MetricLine[] {
  const daily = (list: Entry[]) => {
    const byDay = new Map<IsoDate, Entry>()
    for (const e of room(list).sort((a, b) => (a.date === b.date ? ((a.time ?? "") < (b.time ?? "") ? -1 : 1) : a.date < b.date ? -1 : 1))) byDay.set(e.date, e)
    return [...byDay.values()]
  }
  const days = daily(week)
  const before = daily(prev)
  const out: MetricLine[] = []
  for (const m of metrics) {
    const points: MetricPoint[] = days
      .filter((e) => typeof e[m] === "number")
      .map((e) => {
        const t = targetOf(e, m)
        const v = e[m] as number
        const s = t && m !== "tempDay" && m !== "rh" && m !== "drybackSensor" ? (pills(e, e.targets as unknown as DayTargets)[m as MetricKey] ?? (distance(v, t) ? "warn" : "ok")) : undefined
        return { date: e.date, value: v, ...(s ? { status: s } : {}) }
      })
    if (!points.length) continue
    const last = [...days].reverse().find((e) => typeof e[m] === "number" && targetOf(e, m))
    const target = last ? targetOf(last, m) : undefined
    const prevValues = before.map((e) => e[m]).filter((x): x is number => typeof x === "number")
    const avg = mean(points.map((p) => p.value))
    const prevAvg = prevValues.length ? mean(prevValues) : undefined
    const measured = points.filter((p) => p.status).length
    const inTarget = points.filter((p) => p.status === "ok").length
    let trend: MetricLine["trend"]
    if (target) {
      const d = distance(avg, target)
      if (d === 0) trend = "in"
      else if (prevAvg != null) {
        const dp = distance(prevAvg, target)
        trend = d < dp - 1e-9 ? "closer" : d > dp + 1e-9 ? "farther" : "same"
      }
    }
    out.push({ metric: m, ...(target ? { target } : {}), points, avg, ...(prevAvg != null ? { prevAvg } : {}), inTarget, measured, ...(trend ? { trend } : {}) })
  }
  return out
}

/**
 * The verdict of a week, from the targets recorded in the entries only: « Bonne direction » when every key value with a
 * target is in it all week or comes closer to it than the week before; else « À surveiller ». Then what is out of the
 * target (with its dates), and what came back into it.
 */
export type WeekVerdict = {
  good: boolean
  allIn: boolean
  offs: { metric: WeekMetric; dates: IsoDate[] }[]
  back: { metric: WeekMetric; prevAvg: number }[]
  away: { metric: WeekMetric; prevAvg: number }[]
  first: boolean
}

export function weekVerdict(lines: MetricLine[], hasPrev: boolean): WeekVerdict {
  const withTarget = lines.filter((l) => l.target && l.measured)
  const offs = withTarget.filter((l) => l.inTarget < l.measured).map((l) => ({ metric: l.metric, dates: l.points.filter((p) => p.status && p.status !== "ok").map((p) => p.date) }))
  const allIn = offs.length === 0
  const good = withTarget.every((l) => l.inTarget === l.measured || l.trend === "closer" || l.trend === "in")
  const back = withTarget.filter((l) => l.trend === "in" && l.prevAvg != null && distance(l.prevAvg, l.target!) > 0).map((l) => ({ metric: l.metric, prevAvg: l.prevAvg! }))
  const away = withTarget.filter((l) => l.trend === "farther").map((l) => ({ metric: l.metric, prevAvg: l.prevAvg! }))
  return { good, allIn, offs, back, away, first: !hasPrev }
}
