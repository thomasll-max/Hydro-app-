// Charts data (spec §5, lot 6). Pure: entries / tanks / events → one series per curve and per space, with the target
// band stored on each entry (so a past target stays what it was), events as vertical markers, and downsampling so
// 20 spaces over 2 years stay fluid on a phone.
import type { Cycle, Entry, GrowEvent, IsoDate, Mix, TargetsSnapshot } from "@/model/types"
import { addDays, daysBetween } from "./stage"
import { balanceTotalMl } from "./balance"

export const CURVES = [
  "dryback",
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
export const MAX_SPACES = 4
/** Points per series kept for drawing; beyond, days are averaged by bucket. */
export const MAX_POINTS = 120

export type Point = { date: IsoDate; v: number; lo?: number; hi?: number }
export type Series = { spaceId: string; curve: CurveId; points: Point[] }
export type Period = "7" | "30" | "cycle"

/** Date window: 7 or 30 days back (today included), or from the start of the cycle(s). */
export function periodRange(period: Period, today: IsoDate, cycles: Pick<Cycle, "germinationDate" | "createdAt">[] = []): { from: IsoDate; to: IsoDate } {
  if (period !== "cycle") return { from: addDays(today, -(Number(period) - 1)), to: today }
  const starts = cycles.map((c) => c.germinationDate ?? c.createdAt?.slice(0, 10)).filter((d): d is string => !!d)
  return { from: starts.length ? starts.sort()[0] : addDays(today, -29), to: today }
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

/** Rows for a chart: one per date, one column per space ("s:{spaceId}") plus the target band of the first space. */
export function chartRows(series: Series[]): Record<string, number | string | [number, number] | undefined>[] {
  const byDate = new Map<string, Record<string, number | string | [number, number] | undefined>>()
  for (const s of series)
    for (const p of s.points) {
      let r = byDate.get(p.date)
      if (!r) byDate.set(p.date, (r = { date: p.date }))
      r[`s:${s.spaceId}`] = p.v
      if (p.lo != null && p.hi != null && r.band == null) r.band = [p.lo, p.hi]
    }
  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)))
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

/** Days in a window (for the axis). */
export const spanDays = (r: { from: IsoDate; to: IsoDate }) => daysBetween(r.from, r.to) + 1
