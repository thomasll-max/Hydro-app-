// Bilan d'un cycle (lot 12a): nothing new to type, everything read from what the app already has (the cycle and its
// harvest, the entries and the targets recorded with them, the tanks, the space and its lamps). Pure and tested
// (calc/lot12a.test.ts). A value without its data stays absent and shows « donnée manquante »: never an estimate.
import type { Cycle, Entry, IsoDate, Mix, PlantId, StageKey } from "@/model/types"
import { PLANT_IDS } from "@/model/types"
import type { Equipment, EquipmentAssignment, Space } from "@/model/grow"
import { cycleSpaceAt } from "@/model/grow-ops"
import { areaM2, gramsPerWatt, spaceLight } from "@/equipment/calc"
import { addDays, daysBetween, plannedHarvest, stageOn } from "./stage"
import { status } from "./advice"
import { mondayOf, weekLabel, type WeekLabel } from "./weeks"

/** The measures of the conduct, per stage. The weighing dryback and the sensor's are two lines, never mixed. */
export const REVIEW_METRICS = ["ecIn", "ecRunoff", "phIn", "phRunoff", "dryback", "drybackSensor", "runoffPct", "tempDay", "rh", "vpd", "ppfd", "dli"] as const
export type ReviewMetric = (typeof REVIEW_METRICS)[number]
/** Measures with a target recorded in the entries (`TargetsSnapshot`); the others have none (T°, HR, sensor dryback). */
const WITH_TARGET = new Set<ReviewMetric>(["ecIn", "ecRunoff", "phIn", "phRunoff", "dryback", "runoffPct", "vpd", "ppfd", "dli"])
export const REVIEW_STAGES: StageKey[] = ["seedling", "veg", "stretch", "bulk", "finish", "flush", "harvested"]

export type ConductLine = {
  metric: ReviewMetric
  /** Entries with a value. */
  n: number
  avg: number
  min: number
  max: number
  /** Entries with a value and the day's target recorded; of them, in the target. */
  withTarget: number
  inTarget: number
}
export type StageConduct = { stage: StageKey; entries: number; from: IsoDate; to: IsoDate; lines: ConductLine[] }

export type ProductUse = { line?: string; id: string; name?: string; unit: string; qty: number; tanks: number; unknown: number }
export type WeekIncidents = { monday: IsoDate; label: WeekLabel; obs: { tag: string; days: number; max: number }[]; actions: { tag: string; days: number }[] }

export type CycleReview = {
  result: {
    dryG?: number
    /** Where the dry weight comes from: typed in the harvest, or the sum of the plants when it was not typed. */
    drySrc?: "typed" | "plants"
    wetG?: number
    perPlant: { id: PlantId; g: number }[]
    plantsSum?: number
    /** Sum of the plants − the dry weight typed, shown as is (never corrected). */
    gap?: number
    plants?: number
    gPerPlant?: number
    watts?: number
    wattsSrc?: "harvest" | "equipment"
    gPerW?: number
    areaM2?: number
    gPerM2?: number
  }
  calendar: {
    germination?: IsoDate
    veg?: IsoDate
    flip?: IsoDate
    harvest?: IsoDate
    propagationDays?: number
    vegDays?: number
    flowerDays?: number
    flowerWeeksPlanned: number
    plannedHarvest?: IsoDate
    /** Typed in the harvest, else from the curing start (start of curing − harvest). */
    dryingDays?: number
    dryingSrc?: "typed" | "curing"
  }
  conduct: StageConduct[]
  tanks: { count: number; litres: number; products: ProductUse[] }
  incidents: WeekIncidents[]
  notes: { tasting?: string; drying?: string; review?: string }
  /** The space where the cycle flowered (its lamps and surface), and every space it went through. */
  spaceId?: string
  spaceIds: string[]
}

const r = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)

/** The stage of an entry: the one recorded with its targets, else the cycle's on that day. */
export function entryStage(cycle: Cycle, e: Entry): StageKey | null {
  if (e.targets?.stage) return e.targets.stage
  const s = stageOn(cycle, e.date).key
  return s === "notStarted" ? null : s
}

/** Averages, ranges and the share of days in the target, per stage, on the whole-space entries of the cycle. */
export function conductByStage(cycle: Cycle, entries: Entry[]): StageConduct[] {
  const room = entries.filter((e) => e.cycleId === cycle.id && !e.plantId)
  const out: StageConduct[] = []
  for (const stage of REVIEW_STAGES) {
    const list = room.filter((e) => entryStage(cycle, e) === stage).sort((a, b) => a.date.localeCompare(b.date))
    if (!list.length) continue
    const lines: ConductLine[] = []
    for (const metric of REVIEW_METRICS) {
      const vals = list.filter((e) => num(e[metric]))
      if (!vals.length) continue
      const xs = vals.map((e) => e[metric] as number)
      let withTarget = 0
      let inTarget = 0
      if (WITH_TARGET.has(metric))
        for (const e of vals) {
          const tg = e.targets?.[metric as keyof NonNullable<Entry["targets"]>]
          if (!tg || typeof tg !== "object") continue
          withTarget++
          if (status(e[metric] as number, tg, metric) === "ok") inTarget++
        }
      lines.push({ metric, n: xs.length, avg: r(xs.reduce((s, x) => s + x, 0) / xs.length), min: Math.min(...xs), max: Math.max(...xs), withTarget, inTarget })
    }
    out.push({ stage, entries: list.length, from: list[0].date, to: list[list.length - 1].date, lines })
  }
  return out
}

/** The tanks of the cycle: its own, or a tank of one of its spaces made while it ran there (no cycle on the tank). */
export function cycleMixes(cycle: Cycle, mixes: Mix[], spaceIds: string[]): Mix[] {
  const end = cycle.harvestDate ?? "9999-12-31"
  return mixes.filter((m) => m.cycleId === cycle.id || (!m.cycleId && (m.spaceIds ?? []).some((s) => spaceIds.includes(s)) && (!cycle.germinationDate || m.date >= cycle.germinationDate) && m.date <= end))
}

/**
 * Products of the tanks, summed per line, product and unit (a Pro Line product and a Blended one are never added
 * together). A dose left empty on a tank is counted apart (`unknown`), never guessed.
 */
export function productUse(mixes: Mix[]): ProductUse[] {
  const by = new Map<string, ProductUse>()
  for (const m of mixes)
    for (const it of m.items ?? []) {
      const key = `${m.line ?? ""}|${it.id}|${it.unit}`
      const cur = by.get(key) ?? { ...(m.line ? { line: m.line } : {}), id: it.id, ...(it.name ? { name: it.name } : {}), unit: it.unit, qty: 0, tanks: 0, unknown: 0 }
      if (num(it.qty)) {
        cur.qty = r(cur.qty + it.qty, 1)
        cur.tanks++
      } else cur.unknown++
      by.set(key, cur)
    }
  return [...by.values()].sort((a, b) => (a.line ?? "").localeCompare(b.line ?? "") || b.qty - a.qty)
}

/** Observations and actions of the Journal, per week of the cycle (existing tags only). */
export function incidentsByWeek(cycle: Cycle, entries: Entry[]): WeekIncidents[] {
  const weeks = new Map<IsoDate, { obs: Map<string, { days: Set<IsoDate>; max: number }>; actions: Map<string, Set<IsoDate>> }>()
  for (const e of entries) {
    if (e.cycleId !== cycle.id || (!e.observations?.length && !e.actions?.length)) continue
    const mon = mondayOf(e.date)
    const w = weeks.get(mon) ?? { obs: new Map(), actions: new Map() }
    for (const o of e.observations ?? []) {
      const cur = w.obs.get(o.tag) ?? { days: new Set<IsoDate>(), max: 0 }
      cur.days.add(e.date)
      cur.max = Math.max(cur.max, o.severity)
      w.obs.set(o.tag, cur)
    }
    for (const a of e.actions ?? []) w.actions.set(a, (w.actions.get(a) ?? new Set<IsoDate>()).add(e.date))
    weeks.set(mon, w)
  }
  return [...weeks]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([monday, w]) => ({
      monday,
      label: weekLabel(cycle, monday),
      obs: [...w.obs].map(([tag, x]) => ({ tag, days: x.days.size, max: x.max })).sort((a, b) => b.max - a.max || b.days - a.days),
      actions: [...w.actions].map(([tag, d]) => ({ tag, days: d.size })).sort((a, b) => b.days - a.days),
    }))
}

/** The spaces a cycle went through: its first one, every full transfer, the one it is in now. */
export function cycleSpaces(cycle: Cycle): string[] {
  const ids = [cycleSpaceAt(cycle, "0000-01-01"), ...(cycle.transfers ?? []).filter((t) => !t.partial).map((t) => t.to), cycle.spaceId]
  return [...new Set(ids.filter((x): x is string => !!x))]
}

export function cycleReview(p: { cycle: Cycle; entries: Entry[]; mixes: Mix[]; spaces: Space[]; equipment: Equipment[]; assignments: EquipmentAssignment[] }): CycleReview {
  const { cycle } = p
  const h = cycle.harvest ?? {}
  // Where it flowered: the space on the 12/12 day (else at the harvest, else now) gives the lamps and the surface.
  const ref: IsoDate | undefined = cycle.flipDate ?? (cycle.harvestDate ? addDays(cycle.harvestDate, -1) : undefined)
  const spaceId = ref ? cycleSpaceAt(cycle, ref) : cycle.spaceId
  const space = p.spaces.find((s) => s.id === spaceId)

  // Result.
  const perPlant = PLANT_IDS.filter((id) => num(h.dryByPlant?.[id])).map((id) => ({ id, g: h.dryByPlant![id]! }))
  const plantsSum = perPlant.length ? r(perPlant.reduce((s, x) => s + x.g, 0), 1) : undefined
  const dryG = num(h.dryG) ? h.dryG : plantsSum
  const drySrc = num(h.dryG) ? "typed" : plantsSum != null ? "plants" : undefined
  const gap = num(h.dryG) && plantsSum != null ? r(plantsSum - h.dryG, 1) : undefined
  const plants = num(cycle.potCount) && cycle.potCount > 0 ? cycle.potCount : undefined
  let watts: number | undefined
  let wattsSrc: CycleReview["result"]["wattsSrc"]
  if (num(h.watts) && h.watts > 0) {
    watts = h.watts
    wattsSrc = "harvest"
  } else if (space && ref) {
    const lamps = spaceLight(space, ref, p.equipment, p.assignments)
    if (lamps?.watts) {
      watts = lamps.watts
      wattsSrc = "equipment"
    }
  }
  const gpw = gramsPerWatt(dryG, watts)
  const area = areaM2(space?.dimensionsCm)
  const result: CycleReview["result"] = {
    ...(dryG != null ? { dryG, drySrc } : {}),
    ...(num(h.wetG) ? { wetG: h.wetG } : {}),
    perPlant,
    ...(plantsSum != null ? { plantsSum } : {}),
    ...(gap != null ? { gap } : {}),
    ...(plants ? { plants } : {}),
    ...(dryG != null && plants ? { gPerPlant: r(dryG / plants, 1) } : {}),
    ...(watts ? { watts, wattsSrc } : {}),
    ...(gpw.ok ? { gPerW: r(gpw.value) } : {}),
    ...(area.ok ? { areaM2: r(area.value) } : {}),
    ...(area.ok && dryG != null ? { gPerM2: r(dryG / area.value, 0) } : {}),
  }

  // Calendar.
  const veg = cycle.vegDate ?? cycle.transferDate
  const span = (a?: IsoDate, b?: IsoDate) => (a && b && b >= a ? daysBetween(a, b) : undefined)
  const dryingDays = num(h.dryingDays) ? h.dryingDays : span(cycle.harvestDate, h.curingStart)
  const calendar: CycleReview["calendar"] = {
    ...(cycle.germinationDate ? { germination: cycle.germinationDate } : {}),
    ...(veg ? { veg } : {}),
    ...(cycle.flipDate ? { flip: cycle.flipDate } : {}),
    ...(cycle.harvestDate ? { harvest: cycle.harvestDate } : {}),
    ...(span(cycle.germinationDate, veg ?? cycle.flipDate) != null ? { propagationDays: span(cycle.germinationDate, veg ?? cycle.flipDate) } : {}),
    ...(veg && span(veg, cycle.flipDate) != null ? { vegDays: span(veg, cycle.flipDate) } : {}),
    ...(span(cycle.flipDate, cycle.harvestDate) != null ? { flowerDays: span(cycle.flipDate, cycle.harvestDate) } : {}),
    flowerWeeksPlanned: cycle.flowerWeeks,
    ...(plannedHarvest(cycle) ? { plannedHarvest: plannedHarvest(cycle) } : {}),
    ...(dryingDays != null ? { dryingDays, dryingSrc: num(h.dryingDays) ? ("typed" as const) : ("curing" as const) } : {}),
  }

  const spaceIds = cycleSpaces(cycle)
  const mixes = cycleMixes(cycle, p.mixes, spaceIds)
  return {
    result,
    calendar,
    conduct: conductByStage(cycle, p.entries),
    tanks: { count: mixes.length, litres: r(mixes.reduce((s, m) => s + (num(m.volumeL) ? m.volumeL : 0), 0), 1), products: productUse(mixes) },
    incidents: incidentsByWeek(cycle, p.entries),
    notes: { ...(h.tasting?.trim() ? { tasting: h.tasting.trim() } : {}), ...(h.dryingNotes?.trim() ? { drying: h.dryingNotes.trim() } : {}), ...(h.reviewNote?.trim() ? { review: h.reviewNote.trim() } : {}) },
    ...(spaceId ? { spaceId } : {}),
    spaceIds,
  }
}

/** Flowering in weeks and days (« 9 sem. 2 j »): days ÷ 7 and the rest. */
export const weeksDays = (days: number) => ({ w: Math.floor(days / 7), d: days % 7 })

/** Cycles that can be compared with this one: harvested, filtered by variety (case and spaces ignored) or by space. */
export function comparable(cycles: Cycle[], self: Cycle, f: { cultivar?: string; spaceId?: string } = {}): Cycle[] {
  const key = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim()
  return cycles
    .filter((c) => c.id !== self.id && !!c.harvestDate)
    .filter((c) => !f.cultivar || c.cultivars.some((x) => key(x) === key(f.cultivar!)))
    .filter((c) => !f.spaceId || cycleSpaces(c).includes(f.spaceId))
    .sort((a, b) => (b.harvestDate ?? "").localeCompare(a.harvestDate ?? ""))
}

// ---------------------------------------------------------------- rows: the comparison and the exports

export type ReviewUnit = "g" | "gW" | "gm2" | "W" | "m2" | "days" | "weeks" | "ms" | "pct" | "c" | "kpa" | "ppfd" | "dli" | "count" | "L" | "date" | "none"
/**
 * One line of a review, the same for every cycle (the comparison puts two cycles side by side on the same ids). `label`
 * is a message key; `stage` and `metric` say which line of the conduct it is.
 */
export type ReviewRow = { id: string; section: "result" | "calendar" | "conduct" | "tanks"; label: string; value?: number; date?: IsoDate; unit: ReviewUnit; digits: number; stage?: StageKey; metric?: ReviewMetric; line?: ConductLine }

export const METRIC_UNIT: Record<ReviewMetric, { unit: ReviewUnit; digits: number }> = {
  ecIn: { unit: "ms", digits: 1 },
  ecRunoff: { unit: "ms", digits: 1 },
  phIn: { unit: "none", digits: 2 },
  phRunoff: { unit: "none", digits: 2 },
  dryback: { unit: "pct", digits: 0 },
  drybackSensor: { unit: "pct", digits: 0 },
  runoffPct: { unit: "pct", digits: 0 },
  tempDay: { unit: "c", digits: 1 },
  rh: { unit: "pct", digits: 0 },
  vpd: { unit: "kpa", digits: 2 },
  ppfd: { unit: "ppfd", digits: 0 },
  dli: { unit: "dli", digits: 1 },
}

/** The review as rows, in the page's order. A missing value stays a row without value (« donnée manquante »). */
export function reviewRows(rv: CycleReview): ReviewRow[] {
  const R = rv.result
  const C = rv.calendar
  const out: ReviewRow[] = [
    { id: "dry", section: "result", label: "rv.dry", value: R.dryG, unit: "g", digits: 0 },
    { id: "wet", section: "result", label: "rv.wet", value: R.wetG, unit: "g", digits: 0 },
    { id: "gPerW", section: "result", label: "rv.gPerW", value: R.gPerW, unit: "gW", digits: 2 },
    { id: "gPerPlant", section: "result", label: "rv.gPerPlant", value: R.gPerPlant, unit: "g", digits: 1 },
    { id: "gPerM2", section: "result", label: "rv.gPerM2", value: R.gPerM2, unit: "gm2", digits: 0 },
    { id: "watts", section: "result", label: "rv.watts", value: R.watts, unit: "W", digits: 0 },
    { id: "plants", section: "result", label: "rv.plants", value: R.plants, unit: "count", digits: 0 },
    { id: "area", section: "result", label: "rv.area", value: R.areaM2, unit: "m2", digits: 2 },
    ...R.perPlant.map((p): ReviewRow => ({ id: `plant.${p.id}`, section: "result", label: `plant:${p.id}`, value: p.g, unit: "g", digits: 1 })),
    { id: "germination", section: "calendar", label: "rv.germination", date: C.germination, unit: "date", digits: 0 },
    { id: "veg", section: "calendar", label: "rv.veg", date: C.veg, unit: "date", digits: 0 },
    { id: "flip", section: "calendar", label: "rv.flip", date: C.flip, unit: "date", digits: 0 },
    { id: "harvest", section: "calendar", label: "rv.harvest", date: C.harvest, unit: "date", digits: 0 },
    { id: "propagationDays", section: "calendar", label: "rv.propagationDays", value: C.propagationDays, unit: "days", digits: 0 },
    { id: "vegDays", section: "calendar", label: "rv.vegDays", value: C.vegDays, unit: "days", digits: 0 },
    { id: "flowerDays", section: "calendar", label: "rv.flowerDays", value: C.flowerDays, unit: "days", digits: 0 },
    { id: "flowerWeeksPlanned", section: "calendar", label: "rv.flowerPlanned", value: C.flowerWeeksPlanned, unit: "weeks", digits: 0 },
    { id: "dryingDays", section: "calendar", label: "rv.dryingDays", value: C.dryingDays, unit: "days", digits: 0 },
  ]
  for (const s of rv.conduct)
    for (const l of s.lines) out.push({ id: `conduct.${s.stage}.${l.metric}`, section: "conduct", label: `jw.m.${l.metric}`, value: l.avg, ...METRIC_UNIT[l.metric], stage: s.stage, metric: l.metric, line: l })
  out.push({ id: "tanks", section: "tanks", label: "rv.tankCount", value: rv.tanks.count, unit: "count", digits: 0 }, { id: "litres", section: "tanks", label: "rv.litres", value: rv.tanks.litres, unit: "L", digits: 0 })
  return out
}

/** Two reviews on the same lines: every line of either, in the first one's order, then the second's own; B − A when both have a number. */
export function compareRows(a: CycleReview, b: CycleReview): { id: string; a?: ReviewRow; b?: ReviewRow; diff?: number }[] {
  const ra = reviewRows(a)
  const rb = reviewRows(b)
  const ids = [...ra.map((x) => x.id), ...rb.map((x) => x.id).filter((id) => !ra.some((x) => x.id === id))]
  // Conduct lines of the second cycle only: placed after the first's lines of the same stage, not at the very end.
  const order = (id: string) => {
    const i = ra.findIndex((x) => x.id === id)
    if (i >= 0) return i
    const row = rb.find((x) => x.id === id)!
    const same = ra.map((x, k) => ({ x, k })).filter(({ x }) => x.section === row.section && (!row.stage || x.stage === row.stage))
    return (same.length ? same[same.length - 1].k : ra.length) + 0.5
  }
  return ids
    .sort((x, y) => order(x) - order(y))
    .map((id) => {
      const x = ra.find((r) => r.id === id)
      const y = rb.find((r) => r.id === id)
      // Rounded to the digits shown: a gap too small to show reads ±0, never « +0 ».
      const diff = x?.value != null && y?.value != null ? Math.round((y.value - x.value) * 10 ** x.digits) / 10 ** x.digits : undefined
      return { id, ...(x ? { a: x } : {}), ...(y ? { b: y } : {}), ...(diff != null ? { diff } : {}) }
    })
}
