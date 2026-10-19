// Charts data (spec §5, lot 6). Pure: entries / tanks / events → one series per curve and per space, with the target
// band stored on each entry (so a past target stays what it was), events as vertical markers, and downsampling so
// 20 spaces over 2 years stay fluid on a phone.
import type { Cycle, Entry, GrowEvent, IsoDate, Mix, TargetsSnapshot } from "@/model/types"
import { addDays, daysBetween } from "./stage"
import { balanceTotalMl } from "./balance"

export const CURVES = [
  "dryback",
  "drybackSensor",
  "ecIn",
  "ecRunoff",
  "phIn",
  "phRunoff",
  "balance",
  "volume",
  "runoffPct",
  "temp",
  "rh",
  "vpd",
  "ppfd",
  "dli",
  "height",
  "germination",
  "use",
  "reservoir",
] as const
export type CurveId = (typeof CURVES)[number]

/** Two greens with a meaning (lot 10f2): water green for watering, runoff, reservoir and the solution; leaf green for the plant. */
const WATER_CURVES: CurveId[] = ["dryback", "drybackSensor", "ecIn", "ecRunoff", "phIn", "phRunoff", "balance", "volume", "runoffPct", "use", "reservoir"]
const PLANT_CURVES: CurveId[] = ["height", "germination"]
export function curveTone(c: CurveId): "water" | "leaf" | "neutral" {
  return WATER_CURVES.includes(c) ? "water" : PLANT_CURVES.includes(c) ? "leaf" : "neutral"
}

export type CurveDef = {
  id: CurveId
  unit: string
  decimals: number
  /** Value of a room entry (null = not recorded that day). */
  value?: (e: Entry, ctx: { potCount?: number }) => number | null | undefined
  /** Target band stored with the entry. */
  target?: keyof Omit<TargetsSnapshot, "stage">
  /** Value from the tanks instead of the entries. */
  fromMixes?: (m: Mix) => number | null | undefined
}

const pos = (v?: number) => (v != null && Number.isFinite(v) ? v : null)

export const CURVE_DEFS: Record<CurveId, CurveDef> = {
  dryback: { id: "dryback", unit: "%", decimals: 0, value: (e) => pos(e.dryback), target: "dryback" },
  // Sensor scale: its own curve, never drawn against Athena's weighing targets.
  drybackSensor: { id: "drybackSensor", unit: "%", decimals: 0, value: (e) => pos(e.drybackSensor) },
  ecIn: { id: "ecIn", unit: "mS/cm", decimals: 1, value: (e) => pos(e.ecIn), target: "ecIn" },
  ecRunoff: { id: "ecRunoff", unit: "mS/cm", decimals: 1, value: (e) => pos(e.ecRunoff), target: "ecRunoff" },
  phIn: { id: "phIn", unit: "pH", decimals: 1, value: (e) => pos(e.phIn), target: "phIn" },
  phRunoff: { id: "phRunoff", unit: "pH", decimals: 1, value: (e) => pos(e.phRunoff), target: "phRunoff" },
  balance: { id: "balance", unit: "mL/10 L", decimals: 1, fromMixes: (m) => (m.volumeL > 0 ? pos(((balanceTotalMl(m) ?? NaN) / m.volumeL) * 10) : null) },
  volume: { id: "volume", unit: "mL/pot", decimals: 0, value: (e) => pos(e.volumePerPotMl) },
  runoffPct: { id: "runoffPct", unit: "%", decimals: 0, value: (e) => pos(e.runoffPct), target: "runoffPct" },
  temp: { id: "temp", unit: "°C", decimals: 1, value: (e) => pos(e.tempDay) },
  rh: { id: "rh", unit: "%", decimals: 0, value: (e) => pos(e.rh) },
  vpd: { id: "vpd", unit: "kPa", decimals: 2, value: (e) => pos(e.vpd), target: "vpd" },
  ppfd: { id: "ppfd", unit: "µmol/m²/s", decimals: 0, value: (e) => pos(e.ppfd), target: "ppfd" },
  dli: { id: "dli", unit: "mol/m²/j", decimals: 1, value: (e) => pos(e.dli), target: "dli" },
  height: { id: "height", unit: "cm", decimals: 0, value: (e) => pos(e.heightCm) },
  germination: { id: "germination", unit: "%", decimals: 0, value: (e) => (e.sownCount && e.germinatedCount != null ? Math.round((e.germinatedCount / e.sownCount) * 100) : null) },
  use: { id: "use", unit: "L/j", decimals: 1, value: (e, c) => (e.volumePerPotMl && c.potCount ? Math.round(((e.volumePerPotMl * c.potCount) / 1000) * 10) / 10 : null) },
  reservoir: { id: "reservoir", unit: "L", decimals: 0, value: (e) => pos(e.reservoirL) },
}

/** Default curves shown the first time. */
export const DEFAULT_CURVES: CurveId[] = ["dryback", "ecRunoff", "phRunoff"]

/** Default curves for the spaces shown: a space whose dryback is read on a sensor gets « Dryback capteur » (lot 10d). */
export function defaultCurves(methods: string[]): CurveId[] {
  const sensor = methods.filter((m) => m === "acinfinity" || m === "sensor").length
  if (!sensor) return DEFAULT_CURVES
  const dryback: CurveId[] = sensor === methods.length ? ["drybackSensor"] : ["dryback", "drybackSensor"]
  return [...dryback, "ecRunoff", "phRunoff"]
}
export const MAX_SPACES = 4
/** Points per series kept for drawing; beyond, days are averaged by bucket. */
export const MAX_POINTS = 120

export type Point = { date: IsoDate; v: number; lo?: number; hi?: number }
export type Series = { spaceId: string; curve: CurveId; points: Point[] }
export type Period = "7" | "30" | "cycle" | "all"
export const PERIODS: Period[] = ["7", "30", "cycle", "all"]
/** A line is broken across a gap longer than this (days without a value): no line drawn over weeks of nothing. */
export const GAP_DAYS = 7

const cycleStart = (c: Pick<Cycle, "germinationDate" | "createdAt">) => c.germinationDate ?? c.createdAt?.slice(0, 10)

/**
 * The cycle a space's chart follows: the one running there, else the space's most recent one (an old harvested cycle
 * is never taken when a newer one exists), lot 10d.
 */
export function chartCycle<C extends Pick<Cycle, "spaceId" | "germinationDate" | "createdAt">>(spaceId: string, cycles: C[], running?: C | null): C | undefined {
  if (running) return running
  return cycles.filter((c) => c.spaceId === spaceId).sort((a, b) => String(cycleStart(b) ?? "").localeCompare(String(cycleStart(a) ?? "")))[0]
}

/**
 * Date window: 7 or 30 days back (today included), the cycle(s) shown, or everything since the first value.
 * « Cycle » follows the running cycles when there are some, else the last cycles up to their harvest.
 */
export function periodRange(
  period: Period,
  today: IsoDate,
  cycles: Pick<Cycle, "germinationDate" | "createdAt" | "harvestDate">[] = [],
  firstDate?: IsoDate,
): { from: IsoDate; to: IsoDate } {
  if (period === "7" || period === "30") return { from: addDays(today, -(Number(period) - 1)), to: today }
  const fallback = { from: addDays(today, -29), to: today }
  if (period === "all") return firstDate && firstDate < today ? { from: firstDate, to: today } : fallback
  const running = cycles.filter((c) => !c.harvestDate)
  const use = running.length ? running : cycles
  const starts = use.map(cycleStart).filter((d): d is string => !!d && d <= today).sort()
  if (!starts.length) return fallback
  const to = running.length ? today : use.map((c) => c.harvestDate ?? today).sort().at(-1)!
  return { from: starts[0], to: to < starts[0] ? today : to }
}

/** Index entries once: room entries (no plant) by space, sorted by date. */
export function indexEntries(entries: Entry[]): Map<string, Entry[]> {
  const m = new Map<string, Entry[]>()
  for (const e of entries) {
    if (e.plantId) continue
    let l = m.get(e.spaceId)
    if (!l) m.set(e.spaceId, (l = []))
    l.push(e)
  }
  for (const l of m.values()) l.sort((a, b) => a.date.localeCompare(b.date))
  return m
}

/** First index with date ≥ from (binary search on a sorted list). */
function lowerBound(list: { date: IsoDate }[], from: IsoDate): number {
  let lo = 0
  let hi = list.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (list[mid].date < from) lo = mid + 1
    else hi = mid
  }
  return lo
}

export function buildSeries(
  curve: CurveId,
  spaceId: string,
  range: { from: IsoDate; to: IsoDate },
  data: { byspace: Map<string, Entry[]>; mixes: Mix[]; potCount?: number },
): Series {
  const def = CURVE_DEFS[curve]
  const points: Point[] = []
  if (def.fromMixes) {
    for (const m of data.mixes) {
      if (!m.spaceIds?.includes(spaceId) || m.date < range.from || m.date > range.to) continue
      const v = def.fromMixes(m)
      if (v != null) points.push({ date: m.date, v: round(v, def.decimals) })
    }
    points.sort((a, b) => a.date.localeCompare(b.date))
  } else {
    const list = data.byspace.get(spaceId) ?? []
    for (let i = lowerBound(list, range.from); i < list.length && list[i].date <= range.to; i++) {
      const e = list[i]
      const v = def.value!(e, { potCount: data.potCount })
      if (v == null) continue
      const tg = def.target ? e.targets?.[def.target] : undefined
      points.push(tg ? { date: e.date, v, lo: tg.lo, hi: tg.hi } : { date: e.date, v })
    }
  }
  return { spaceId, curve, points: downsample(points, MAX_POINTS) }
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d

/** Keeps at most `max` points: consecutive days are averaged by bucket (value and target band), dates kept at the bucket start. */
export function downsample(points: Point[], max = MAX_POINTS): Point[] {
  if (points.length <= max) return points
  const size = Math.ceil(points.length / max)
  const out: Point[] = []
  for (let i = 0; i < points.length; i += size) {
    const b = points.slice(i, i + size)
    const avg = (f: (p: Point) => number | undefined) => {
      const v = b.map(f).filter((x): x is number => x != null)
      return v.length ? v.reduce((s, x) => s + x, 0) / v.length : undefined
    }
    const p: Point = { date: b[0].date, v: Math.round(avg((x) => x.v)! * 100) / 100 }
    const lo = avg((x) => x.lo)
    const hi = avg((x) => x.hi)
    if (lo != null && hi != null) Object.assign(p, { lo: Math.round(lo * 100) / 100, hi: Math.round(hi * 100) / 100 })
    out.push(p)
  }
  return out
}

/** Points cut where two values are more than `gap` days apart: each piece is drawn as its own line. */
export function splitGaps(points: Point[], gap = GAP_DAYS): Point[][] {
  const out: Point[][] = []
  for (const p of points) {
    const cur = out.at(-1)
    if (cur && daysBetween(cur.at(-1)!.date, p.date) <= gap) cur.push(p)
    else out.push([p])
  }
  return out
}

/** Column of each piece of a series: `{prefix}` for the first, `{prefix}#1`, `{prefix}#2`… after each gap. */
export function pieceKeys(points: Point[], prefix: string, gap = GAP_DAYS): string[] {
  return splitGaps(points, gap).map((_, i) => (i ? `${prefix}#${i}` : prefix))
}

/**
 * Rows for a chart: one per date, one column per space and piece ("s:{spaceId}", "s:{spaceId}#1" after a gap of more
 * than GAP_DAYS) plus the target band of the first space. `key` names the columns of a series.
 */
export function chartRows(series: Series[], key: (s: Series) => string = (s) => `s:${s.spaceId}`): Record<string, number | string | [number, number] | undefined>[] {
  const byDate = new Map<string, Record<string, number | string | [number, number] | undefined>>()
  for (const s of series)
    splitGaps(s.points).forEach((piece, i) => {
      for (const p of piece) {
        let r = byDate.get(p.date)
        if (!r) byDate.set(p.date, (r = { date: p.date }))
        r[i ? `${key(s)}#${i}` : key(s)] = p.v
        if (p.lo != null && p.hi != null && r.band == null) r.band = [p.lo, p.hi]
      }
    })
  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

/** What a screen reader hears for one series: count, dates, last value, min and max (lot 10d). */
export function seriesStats(points: Point[]): { n: number; from: IsoDate; to: IsoDate; last: number; min: number; max: number } | null {
  if (!points.length) return null
  const vs = points.map((p) => p.v)
  return { n: points.length, from: points[0].date, to: points.at(-1)!.date, last: vs.at(-1)!, min: Math.min(...vs), max: Math.max(...vs) }
}

/** Overlay view: several curves on one chart, each scaled to 0–100 of its own range (real values in the tooltip). */
export function normalize(series: Series[]): { series: Series; min: number; max: number }[] {
  return series.map((s) => {
    const vals = s.points.flatMap((p) => [p.v, p.lo, p.hi].filter((x): x is number => x != null))
    const min = vals.length ? Math.min(...vals) : 0
    const max = vals.length ? Math.max(...vals) : 1
    const span = max - min || 1
    return { series: { ...s, points: s.points.map((p) => ({ date: p.date, v: Math.round(((p.v - min) / span) * 1000) / 10 })) }, min, max }
  })
}

/** Events in the window for the shown spaces (vertical markers). */
export function eventsIn(events: GrowEvent[], spaceIds: string[], range: { from: IsoDate; to: IsoDate }, cycleIds: string[] = []): GrowEvent[] {
  return events.filter((e) => e.date >= range.from && e.date <= range.to && ((e.spaceId && spaceIds.includes(e.spaceId)) || (e.cycleId && cycleIds.includes(e.cycleId)))).sort((a, b) => a.date.localeCompare(b.date))
}

/** Dates of the tanks (bidons) made for these spaces or cycles in the window: water marks on the charts (lot 10g). */
export function mixDatesIn(mixes: Mix[], spaceIds: string[], range: { from: IsoDate; to: IsoDate }, cycleIds: string[] = []): IsoDate[] {
  const dates = mixes
    .filter((m) => m.date >= range.from && m.date <= range.to && ((m.spaceIds ?? []).some((id) => spaceIds.includes(id)) || (!!m.cycleId && cycleIds.includes(m.cycleId))))
    .map((m) => m.date)
  return [...new Set(dates)].sort()
}

/** Adds an empty row for each date the axis must show (a tank on a day without measurements). */
export function withDates<R extends { date?: unknown }>(rows: R[], dates: IsoDate[]): R[] {
  const have = new Set(rows.map((r) => String(r.date)))
  const extra = dates.filter((d) => !have.has(d)).map((d) => ({ date: d }) as unknown as R)
  return extra.length ? [...rows, ...extra].sort((a, b) => String(a.date).localeCompare(String(b.date))) : rows
}

/** Days in a window (for the axis). */
export const spanDays = (r: { from: IsoDate; to: IsoDate }) => daysBetween(r.from, r.to) + 1
