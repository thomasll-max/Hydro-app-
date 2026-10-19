// Graphiques (lot 6): choose the curves, one chart per curve (target band + events) or all curves of one space on one
// chart (each scaled to its own range), compare up to 4 spaces, over 7 days, 30 days, the cycle or everything.
import { useMemo, useState } from "react"
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from "recharts"
import { Card } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Label, Reveal, ScreenHero } from "@/components/hydro/primitives"
import { Seg, TagChip } from "@/components/hydro/form"
import { SpaceDot, spaceColor } from "@/components/hydro/space-pill"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { todayIso } from "@/calc/stage"
import {
  buildSeries,
  chartCycle,
  chartRows,
  CURVE_DEFS,
  CURVES,
  defaultCurves,
  eventsIn,
  GAP_DAYS,
  indexEntries,
  MAX_SPACES,
  normalize,
  periodRange,
  PERIODS,
  pieceKeys,
  seriesStats,
  type CurveId,
  type Period,
  type Series,
  curveTone,
  mixDatesIn,
  withDates,
} from "@/calc/series"
import { Drop, DROP_PATH } from "@/components/hydro/wordmark"
import { drybackMethodOf } from "@/model/entry"
import type { MessageKey } from "@/i18n/types"
import type { Space } from "@/model/grow"
import type { GrowEvent } from "@/model/types"
import { joined, segmentItem, toggle } from "@/components/hydro/styles"

const STORE = "hydro.charts"
/** `curves` null: never chosen, the defaults follow the spaces shown (sensor or weighing). */
type Prefs = { curves: CurveId[] | null; view: "split" | "overlay"; period: Period }
function loadPrefs(): Prefs {
  try {
    const o = JSON.parse(localStorage.getItem(STORE) ?? "{}")
    const curves = Array.isArray(o.curves) ? o.curves.filter((c: string) => (CURVES as readonly string[]).includes(c)) : []
    return { curves: curves.length ? curves : null, view: o.view === "overlay" ? "overlay" : "split", period: PERIODS.includes(o.period) ? o.period : "7" }
  } catch {
    return { curves: null, view: "split", period: "7" }
  }
}
function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(STORE, JSON.stringify(p))
  } catch {
    /* private mode: preferences stay for this visit */
  }
}

/** Curve colours in the overlay view when one space is shown (the 8 accessible space colours). */
const PALETTE = ["emerald", "sky", "violet", "amber", "rose", "teal", "orange", "slate"] as const

export function ChartsScreen() {
  const { t, num, dm } = useSettings()
  const { spaces, selection, all, cycles, cycleIn } = useGrow()
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs)
  // Saved outside the updater: a setState updater stays pure (lot 10d).
  const setPrefs = (p: Partial<Prefs>) => {
    const n = { ...prefs, ...p }
    savePrefs(n)
    setPrefsState(n)
  }
  const initialSpaces = () => {
    if (selection.kind === "space") return [selection.space.id]
    const pool = selection.kind === "site" ? spaces.filter((s) => s.siteId === selection.site.id) : spaces
    return pool.slice(0, MAX_SPACES).map((s) => s.id)
  }
  const [picked, setPicked] = useState<string[] | null>(null)
  // The space selector at the top wins: choosing another space or room starts the comparison over (lot 10d).
  const selKey = selection.kind === "space" ? selection.space.id : selection.kind === "site" ? selection.site.id : "all"
  const [pickedFor, setPickedFor] = useState(selKey)
  if (pickedFor !== selKey) {
    setPickedFor(selKey)
    setPicked(null)
  }
  const shown: Space[] = (picked ?? initialSpaces()).map((id) => spaces.find((s) => s.id === id)).filter((s): s is Space => !!s)
  const shownKey = shown.map((s) => s.id).join(",")
  const curves = prefs.curves ?? defaultCurves(shown.map((s) => drybackMethodOf(s)))
  const today = todayIso()
  const byspace = useMemo(() => indexEntries(all.entries), [all.entries])
  // « Cycle » = the cycle running in each space shown, else its latest one (never an old harvested one), lot 10d.
  const shownCycles = shown.map((s) => chartCycle(s.id, cycles, cycleIn(s.id))).filter((c): c is NonNullable<typeof c> => !!c)
  const firstDate = shown.map((s) => byspace.get(s.id)?.[0]?.date).filter((d): d is string => !!d).sort()[0]
  const range = periodRange(prefs.period, today, shownCycles, firstDate)
  const events = eventsIn(all.events, shown.map((s) => s.id), range, shownCycles.map((c) => c.id))
  const tanks = mixDatesIn(all.mixes, shown.map((s) => s.id), range, shownCycles.map((c) => c.id))
  const series = useMemo(() => {
    const out: Record<string, Series[]> = {}
    for (const c of curves) out[c] = shown.map((s) => buildSeries(c, s.id, range, { byspace, mixes: all.mixes, potCount: (cycleIn(s.id) ?? undefined)?.potCount }))
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curves.join(","), shownKey, range.from, range.to, byspace, all.mixes])
  const curveName = (c: CurveId) => t(`charts.k.${c}` as MessageKey)
  const togglePick = (id: string) => {
    const cur = shown.map((s) => s.id)
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_SPACES ? cur : [...cur, id]
    if (next.length) setPicked(next)
  }
  const toggleCurve = (c: CurveId) => {
    const next = curves.includes(c) ? curves.filter((x) => x !== c) : [...curves, c]
    if (next.length) setPrefs({ curves: CURVES.filter((x) => next.includes(x)) })
  }
  const hasData = curves.some((c) => series[c]?.some((s) => s.points.length))
  const [overlayId, setOverlayId] = useState<string | null>(null)
  const overlaySpace = shown.find((s) => s.id === overlayId) ?? shown[0]

  return (
    <>
      <ScreenHero emoji="chart" title={t("charts.title")}>
        <p className="mt-1 text-[0.8125rem] leading-snug text-fg-2">{t("charts.subtitle")}</p>
      </ScreenHero>

      <Reveal i={0} className="mb-3">
        <ToggleGroup
          type="single"
          value={prefs.period}
          onValueChange={(v) => v && setPrefs({ period: v as Period })}
          aria-label={t("charts.period")}
          className={joined(4, "w-full gap-0")}
        >
          {(
            [
              ["7", "charts.p7"],
              ["30", "charts.p30"],
              ["cycle", "charts.pCycle"],
              ["all", "charts.pAll"],
            ] as const
          ).map(([v, k]) => (
            <ToggleGroupItem
              key={v}
              value={v}
              className={segmentItem}
            >
              {t(k)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="mt-1.5 text-center text-[0.75rem] text-fg-3">{t("charts.range", { from: dm(range.from), to: dm(range.to) })}</p>
      </Reveal>

      <Reveal i={1} className="mb-3">
        <Card className="gap-2.5">
          {spaces.length > 1 && (
            <div>
              <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("charts.spaces", { n: MAX_SPACES })}</div>
              <div className="flex flex-wrap gap-1.5" id="ch-spaces">
                {spaces.map((s) => {
                  const on = shown.some((x) => x.id === s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => togglePick(s.id)}
                      className={toggle(on, "px-3")}
                    >
                      <SpaceDot color={s.color} /> {s.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div>
            <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("charts.curves")}</div>
            <div className="flex flex-wrap gap-1.5" id="ch-curves">
              {CURVES.map((c) => (
                <TagChip key={c} label={curveName(c)} on={curves.includes(c)} onClick={() => toggleCurve(c)} />
              ))}
            </div>
          </div>
          <Seg<Prefs["view"]>
            label={t("charts.view")}
            value={prefs.view}
            onChange={(v) => setPrefs({ view: v })}
            options={[
              { value: "split", label: t("charts.split") },
              { value: "overlay", label: t("charts.overlay") },
            ]}
          />
        </Card>
      </Reveal>

      {!hasData && (
        <Reveal i={2} className="mb-3">
          <Card className="px-4 py-4">
            <b className="text-[0.9375rem] leading-snug font-semibold">{t("charts.emptyTitle")}</b>
            <p className="mt-1.5 text-[0.8125rem] leading-[1.45] text-fg-2">{t("charts.emptyBody")}</p>
          </Card>
        </Reveal>
      )}

      {hasData && prefs.view === "split" &&
        curves.map((c, i) => (
          <Reveal key={c} i={2 + i} className="mb-3">
            <Card className="gap-2 px-3 pb-2" data-curve={c}>
              <div className="flex items-center justify-between gap-2 px-1">
                <Label>{curveName(c)}</Label>
                <span className="text-[0.75rem] text-fg-3">{CURVE_DEFS[c].unit}</span>
              </div>
              {series[c].some((s) => s.points.length) ? (
                <CurveChart series={series[c]} spaces={shown} events={events} tanks={tanks} curve={c} name={curveName(c)} />
              ) : (
                <p className="px-1 pb-2 text-[0.78125rem] text-fg-3">{t("charts.noData")}</p>
              )}
            </Card>
          </Reveal>
        ))}

      {hasData && prefs.view === "overlay" && overlaySpace && (
        <Reveal i={2} className="mb-3">
          <Card className="gap-2 px-3 pb-2">
            <Label className="px-1">{t("charts.overlayTitle")}</Label>
            {shown.length > 1 && (
              <>
                <p className="px-1 text-[0.75rem] text-fg-3">{t("charts.overlayOne")}</p>
                <Seg<string>
                  label={t("charts.overlaySpace")}
                  value={overlaySpace.id}
                  onChange={setOverlayId}
                  options={shown.map((s) => ({ value: s.id, label: s.name }))}
                />
              </>
            )}
            <OverlayChart
              series={curves.flatMap((c) => series[c].filter((x) => x.spaceId === overlaySpace.id))}
              space={overlaySpace}
              events={events.filter((e) => !e.spaceId || e.spaceId === overlaySpace.id)}
              tanks={mixDatesIn(all.mixes, [overlaySpace.id], range, shownCycles.filter((c) => c.spaceId === overlaySpace.id).map((c) => c.id))}
              curveName={curveName}
            />
            <p className="px-1 text-[0.75rem] text-fg-3">{t("charts.overlayNote")}</p>
          </Card>
        </Reveal>
      )}

      {hasData && tanks.length > 0 && (
        <p className="mb-3 flex items-center gap-1.5 px-1 text-[0.75rem] text-fg-3" id="ch-tank-legend">
          <Drop height={12} leaf={false} />
          {t("charts.tankMark")}
        </p>
      )}

      {hasData && events.length > 0 && (
        <Reveal i={3} className="mb-3">
          <Card className="gap-1">
            <Label>{t("charts.events")}</Label>
            <ul className="mt-1">
              {events.map((e) => (
                <li key={e.id} className="flex justify-between gap-2 border-t border-line py-1.5 text-[0.78125rem] first:border-t-0">
                  <span className="text-fg-3 tabular">{dm(e.date)}</span>
                  <span className="text-fg-2">{t(`event.${e.type}`)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>
      )}
      <p className="text-center text-[0.75rem] text-fg-3">
        {t("charts.foot", { n: num(MAX_SPACES) })} {t("charts.gapNote", { n: GAP_DAYS })}
      </p>
    </>
  )
}

const axisTick = { fontSize: 12 }

/** Name and summary of a chart for screen readers (the drawing itself says nothing), lot 10d. */
function useSummary() {
  const { t, num, dm } = useSettings()
  return (s: Series, curve: string, space: string) => {
    const st = seriesStats(s.points)
    const def = CURVE_DEFS[s.curve]
    if (!st) return t("charts.summaryNone", { curve, space })
    const f = (v: number) => num(v, def.decimals)
    return t("charts.summary", { curve, space, n: st.n, from: dm(st.from), to: dm(st.to), last: f(st.last), unit: def.unit, min: f(st.min), max: f(st.max) })
  }
}

/** A small water-green drop at the foot of the chart on the day of a tank (bidon), lot 10g. */
function TankMark({ viewBox }: { viewBox?: { x?: number; y?: number; width?: number; height?: number } }) {
  if (!viewBox || viewBox.x == null || viewBox.y == null) return null
  const h = 11
  const x = viewBox.x - (h * 0.8) / 2
  const y = viewBox.y + (viewBox.height ?? 0) - h - 1
  return (
    <g transform={`translate(${x} ${y}) scale(${h / 125})`} className="tank-mark" aria-hidden="true">
      <path d={DROP_PATH} fill="var(--water)" />
    </g>
  )
}

function CurveChart({ series, spaces, events, tanks, curve, name }: { series: Series[]; spaces: Space[]; events: GrowEvent[]; tanks: string[]; curve: CurveId; name: string }) {
  const { t, num, dm } = useSettings()
  const summary = useSummary()
  const rows = useMemo(() => withDates(chartRows(series), tanks), [series, tanks])
  const def = CURVE_DEFS[curve]
  // Water curves in water green, plant curves in leaf green (band, and the line when one space is shown); several
  // spaces keep their own colours so the lines can be told apart.
  const kind = curveTone(curve)
  const tone = kind === "water" ? "var(--water)" : kind === "leaf" ? "var(--leaf)" : "var(--fg-3)"
  const lineColor = (s: Space) => (spaces.length === 1 && kind !== "neutral" ? tone : spaceColor(s.color))
  const config = Object.fromEntries(spaces.map((s) => [`s:${s.id}`, { label: s.name, color: lineColor(s) }]))
  const label = series.map((s) => summary(s, name, spaces.find((x) => x.id === s.spaceId)?.name ?? "")).join(" ")
  return (
    <div role="img" aria-label={label}>
    <ChartContainer config={config} className="aspect-auto h-[170px] w-full">
      <ComposedChart data={rows} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="var(--line)" />
        <XAxis dataKey="date" tickFormatter={(d: string) => dm(d)} tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} domain={["auto", "auto"]} tickFormatter={(v: number) => num(v, def.decimals > 1 ? 1 : def.decimals)} />
        <Area dataKey="band" type="stepAfter" stroke="none" fill={tone} fillOpacity={0.14} isAnimationActive={false} connectNulls />
        {events.map((e) => (
          <ReferenceLine key={e.id} x={e.date} stroke="var(--fg-3)" strokeDasharray="2 4" strokeOpacity={0.7} />
        ))}
        {tanks.map((d) => (
          <ReferenceLine key={`tank-${d}`} x={d} stroke="none" ifOverflow="visible" label={<TankMark />} />
        ))}
        {/* One line per piece: a gap of more than GAP_DAYS is left blank. */}
        {spaces.flatMap((s) =>
          pieceKeys(series.find((x) => x.spaceId === s.id)?.points ?? [], `s:${s.id}`).map((k) => (
            <Line key={k} dataKey={k} name={s.name} type="monotone" stroke={lineColor(s)} strokeWidth={2} dot={rows.length < 20 ? { r: 2.5 } : false} connectNulls isAnimationActive={false} />
          )),
        )}
        <ChartTooltip
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <div className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-[0.75rem] shadow-card">
                <div className="mb-0.5 font-semibold">{dm(String(label))}</div>
                {payload
                  .filter((p) => String(p.dataKey).startsWith("s:"))
                  .map((p) => (
                    <div key={String(p.dataKey)} className="flex items-center gap-1.5">
                      <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: p.color }} />
                      {p.name}
                      {t("common.colon")}
                      <b className="tabular">{num(Number(p.value), def.decimals)}</b> {def.unit}
                    </div>
                  ))}
                {payload.find((p) => p.dataKey === "band") && (
                  <div className="text-fg-3">
                    {t("charts.target")} {(payload.find((p) => p.dataKey === "band")!.value as unknown as number[]).map((x) => num(x, def.decimals)).join("–")}
                  </div>
                )}
              </div>
            ) : null
          }
        />
      </ComposedChart>
    </ChartContainer>
    </div>
  )
}

function OverlayChart({ series, space, events, tanks, curveName }: { series: Series[]; space: Space; events: GrowEvent[]; tanks: string[]; curveName: (c: CurveId) => string }) {
  const { t, num, dm } = useSettings()
  const summary = useSummary()
  const norm = useMemo(() => normalize(series), [series])
  const curves = series.map((s) => s.curve)
  const rows = useMemo(() => withDates(chartRows(norm.map((n) => n.series), (s) => s.curve), tanks), [norm, tanks])
  const real = (s: Series, date: string) => s.points.find((p) => p.date === date)?.v
  // One space: one distinct colour per curve, solid lines (dashes were unreadable).
  const colorOf = (s: Series) => `var(--space-${PALETTE[curves.indexOf(s.curve) % PALETTE.length]})`
  const label = series.map((s) => summary(s, curveName(s.curve), space.name)).join(" ")
  return (
    <>
      <div role="img" aria-label={label}>
        <ChartContainer config={{}} className="aspect-auto h-[240px] w-full">
          <ComposedChart data={rows} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="var(--line)" />
            <XAxis dataKey="date" tickFormatter={(d: string) => dm(d)} tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis hide domain={[0, 100]} />
            {events.map((e) => (
              <ReferenceLine key={e.id} x={e.date} stroke="var(--fg-3)" strokeDasharray="2 4" strokeOpacity={0.7} />
            ))}
            {tanks.map((d) => (
              <ReferenceLine key={`tank-${d}`} x={d} stroke="none" ifOverflow="visible" label={<TankMark />} />
            ))}
            {norm.flatMap((n) =>
              pieceKeys(n.series.points, n.series.curve).map((k) => (
                <Line key={k} dataKey={k} type="monotone" stroke={colorOf(n.series)} strokeWidth={2.5} dot={rows.length < 20 ? { r: 3 } : false} connectNulls isAnimationActive={false} />
              )),
            )}
            <ChartTooltip
              content={({ active, label }) =>
                active ? (
                  <div className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-[0.75rem] shadow-card">
                    <div className="mb-0.5 font-semibold">{dm(String(label))}</div>
                    {series.map((s) => {
                      const v = real(s, String(label))
                      return v == null ? null : (
                        <div key={s.curve} className="flex items-center gap-1.5">
                          <span className="h-[3px] w-3 rounded-full" style={{ background: colorOf(s) }} />
                          {curveName(s.curve)}
                          {t("common.colon")}
                          <b className="tabular">{num(v, CURVE_DEFS[s.curve].decimals)}</b> {CURVE_DEFS[s.curve].unit}
                        </div>
                      )
                    })}
                  </div>
                ) : null
              }
            />
          </ComposedChart>
        </ChartContainer>
      </div>
      <div className="flex flex-col gap-1 px-1">
        {series
          .filter((s) => s.points.length)
          .map((s) => {
            const n = norm.find((x) => x.series.curve === s.curve)!
            return (
              <span key={s.curve} className="flex items-center gap-2 text-[0.75rem] text-fg-2">
                <span className="h-1 w-5 shrink-0 rounded-full" style={{ background: colorOf(s) }} />
                <b className="font-semibold text-fg">{curveName(s.curve)}</b>
                <span className="text-fg-3">
                  {num(n.min, CURVE_DEFS[s.curve].decimals)}–{num(n.max, CURVE_DEFS[s.curve].decimals)} {CURVE_DEFS[s.curve].unit}
                </span>
              </span>
            )
          })}
      </div>
    </>
  )
}
