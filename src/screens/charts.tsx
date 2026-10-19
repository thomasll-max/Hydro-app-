// Graphiques (lot 6; « calme » since lot 10k4, planche « Les menus »): ready views in text tabs (Arrosage, Solution,
// Climat, Lumière, Plante; « Perso » from « Choisir mes courbes »), the period on one line with « Comparer… », then one
// chart per curve: its name, target and unit, the last value big, straight segments, the target band of the day.
import { useMemo, useState } from "react"
import { CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from "recharts"
import { Card } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Label, Reveal, ScreenHero } from "@/components/hydro/primitives"
import { Seg, Sheet, TagChip } from "@/components/hydro/form"
import { NumText, Value } from "@/components/hydro/value"
import { SpaceDot } from "@/components/hydro/space-pill"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { todayIso } from "@/calc/stage"
import {
  buildSeries,
  chartCycle,
  chartRows,
  CURVE_DEFS,
  CURVES,
  curvesWithData,
  indexEntries,
  isOff,
  lastTarget,
  MAX_SPACES,
  mixDatesIn,
  normalize,
  periodRange,
  PERIODS,
  pieceKeys,
  seriesStats,
  VIEW_IDS,
  VIEWS,
  withDates,
  type CurveId,
  type Period,
  type Series,
  type ViewId,
} from "@/calc/series"
import type { MessageKey } from "@/i18n/types"
import type { Space } from "@/model/grow"
import type { IsoDate } from "@/model/types"
import { tertiary, toggle } from "@/components/hydro/styles"
import { cn } from "@/lib/utils"
import { LineChart } from "./line-chart"

const STORE = "hydro.charts"
/** `custom`: the curves of « Perso » (null: never chosen). `overlay`: « Perso » drawn on one chart. */
type Prefs = { view: ViewId; custom: CurveId[] | null; overlay: boolean; period: Period }
function loadPrefs(): Prefs {
  try {
    const o = JSON.parse(localStorage.getItem(STORE) ?? "{}")
    // Before lot 10k4: `curves` was the list of the pills; it becomes « Perso ».
    const list = Array.isArray(o.custom) ? o.custom : Array.isArray(o.curves) ? o.curves : []
    const custom = list.filter((c: string) => (CURVES as readonly string[]).includes(c))
    const view: ViewId = o.view === "custom" || (VIEW_IDS as string[]).includes(o.view) ? o.view : Array.isArray(o.curves) && custom.length ? "custom" : "watering"
    return { view, custom: custom.length ? custom : null, overlay: o.overlay === true || o.view === "overlay", period: PERIODS.includes(o.period) ? o.period : "30" }
  } catch {
    return { view: "watering", custom: null, overlay: false, period: "30" }
  }
}
function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(STORE, JSON.stringify(p))
  } catch {
    /* private mode: preferences stay for this visit */
  }
}

/** Curve colours in the overlay view (one space, one colour per curve: the 8 accessible space colours). */
const PALETTE = ["emerald", "sky", "violet", "amber", "rose", "teal", "orange", "slate"] as const
/** The unit next to the big value when it is a sign (« 38 % », « 24,5° »); the others stay in the header. */
const signUnit = (unit: string) => (unit === "%" || unit.startsWith("°") ? unit : undefined)

export function ChartsScreen() {
  const { t } = useSettings()
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
  const today = todayIso()
  const byspace = useMemo(() => indexEntries(all.entries), [all.entries])
  const potOf = (id: string) => (cycleIn(id) ?? undefined)?.potCount
  // The curves measured at least once in the spaces shown: a view without any is hidden.
  const measured = useMemo(
    () => new Set(curvesWithData(CURVES, shownKey ? shownKey.split(",") : [], { byspace, mixes: all.mixes, potCount: potOf })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shownKey, byspace, all.mixes],
  )
  const viewCurves = (v: ViewId): CurveId[] => (v === "custom" ? (prefs.custom ?? []) : VIEWS[v]).filter((c) => measured.has(c))
  const tabs = ([...VIEW_IDS, ...(prefs.custom ? ["custom" as const] : [])] as ViewId[]).filter((v) => viewCurves(v).length)
  const view = tabs.includes(prefs.view) ? prefs.view : tabs[0]
  const curves = view ? viewCurves(view) : []
  const overlay = view === "custom" && prefs.overlay
  // « Cycle » = the cycle running in each space shown, else its latest one (never an old harvested one), lot 10d.
  const shownCycles = shown.map((s) => chartCycle(s.id, cycles, cycleIn(s.id))).filter((c): c is NonNullable<typeof c> => !!c)
  const firstDate = shown.map((s) => byspace.get(s.id)?.[0]?.date).filter((d): d is string => !!d).sort()[0]
  const range = periodRange(prefs.period, today, shownCycles, firstDate)
  const tanks = mixDatesIn(all.mixes, shown.map((s) => s.id), range, shownCycles.map((c) => c.id))
  const series = useMemo(() => {
    const out: Record<string, Series[]> = {}
    for (const c of curves) out[c] = shown.map((s) => buildSeries(c, s.id, range, { byspace, mixes: all.mixes, potCount: potOf(s.id) }))
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curves.join(","), shownKey, range.from, range.to, byspace, all.mixes])
  const curveName = (c: CurveId) => t(`charts.k.${c}` as MessageKey)
  const togglePick = (id: string) => {
    const cur = shown.map((s) => s.id)
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_SPACES ? cur : [...cur, id]
    if (next.length) setPicked(next)
  }
  // « Choisir mes courbes »: the list starts from the view shown (its order kept, a new curve last); a change makes it « Perso ».
  const chosen = view === "custom" ? (prefs.custom ?? []) : curves
  const toggleCurve = (c: CurveId) => {
    const next = chosen.includes(c) ? chosen.filter((x) => x !== c) : [...chosen, c]
    setPrefs(next.length ? { custom: next, view: "custom" } : { custom: null, view: "watering" })
  }
  const [comparing, setComparing] = useState(false)
  const [choosing, setChoosing] = useState(false)
  // The day touched on a chart: every chart shows its values in the header.
  const [day, setDay] = useState<IsoDate | null>(null)
  const [overlayId, setOverlayId] = useState<string | null>(null)
  const overlaySpace = shown.find((s) => s.id === overlayId) ?? shown[0]

  return (
    <>
      <ScreenHero title={t("charts.title")} />

      {view && (
        <div role="group" aria-label={t("charts.viewsLabel")} className="no-scrollbar -mt-1 mb-3 flex items-center gap-1 overflow-x-auto border-b border-line" id="ch-views">
          {tabs.map((v) => {
            const on = v === view
            return (
              <button key={v} type="button" aria-pressed={on} onClick={() => setPrefs({ view: v })} className={cn("relative h-11 shrink-0 px-2 text-[0.875rem] whitespace-nowrap", on ? "font-semibold text-fg" : "text-fg-3")} data-view={v}>
                {t(`charts.views.${v}` as MessageKey)}
                {on && <span aria-hidden="true" className="absolute inset-x-1 -bottom-px h-0.5 rounded-[1px] bg-water" />}
              </button>
            )
          })}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-1" id="ch-period">
        <div role="group" aria-label={t("charts.period")} className="flex flex-wrap items-center gap-1">
          {PERIODS.map((p) => {
            const on = p === prefs.period
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                onClick={() => setPrefs({ period: p })}
                className={cn("hit h-8 rounded-[8px] border px-2.5 text-[0.8125rem] whitespace-nowrap", on ? "border-line bg-surface font-semibold text-fg" : "border-transparent text-fg-3")}
              >
                {t(p === "7" ? "charts.p7" : p === "30" ? "charts.p30" : p === "cycle" ? "charts.pCycle" : "charts.pAll")}
              </button>
            )
          })}
        </div>
        {spaces.length > 1 && (
          <button type="button" id="ch-compare" onClick={() => setComparing(true)} className="hit ml-auto h-8 shrink-0 text-[0.8125rem] font-semibold whitespace-nowrap text-fg-2">
            {t("charts.compare")}
          </button>
        )}
      </div>

      {!view && (
        <Reveal i={0} className="mb-3">
          <Card>
            <b className="text-[0.9375rem] leading-snug font-semibold">{t("charts.emptyTitle")}</b>
            <p className="mt-1.5 text-[0.8125rem] leading-[1.45] text-fg-2">{t("charts.emptyBody")}</p>
          </Card>
        </Reveal>
      )}

      {view && !overlay &&
        curves.map((c, i) => (
          <Reveal key={c} i={i} className="mb-7">
            <CurveBlock curve={c} name={curveName(c)} series={series[c] ?? []} spaces={shown} tanks={tanks} range={range} day={day} onDay={setDay} />
          </Reveal>
        ))}

      {overlay && overlaySpace && (
        <Reveal i={0} className="mb-7">
          <section className="flex flex-col gap-2" id="ch-overlay">
            <Label>{t("charts.overlayTitle")}</Label>
            {shown.length > 1 && <Seg<string> label={t("charts.overlaySpace")} value={overlaySpace.id} onChange={setOverlayId} options={shown.map((s) => ({ value: s.id, label: s.name }))} />}
            <OverlayChart
              series={curves.flatMap((c) => (series[c] ?? []).filter((x) => x.spaceId === overlaySpace.id))}
              space={overlaySpace}
              tanks={mixDatesIn(all.mixes, [overlaySpace.id], range, shownCycles.filter((c) => c.spaceId === overlaySpace.id).map((c) => c.id))}
              curveName={curveName}
            />
          </section>
        </Reveal>
      )}

      {view && (
        <>
          {/* One line (it wraps between items only): « ● hors cible · ▬ cible du jour · ┊ nouveau bidon · - - jour sans mesure ». */}
          <p className="mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.75rem] text-fg-3" id="ch-legend">
            {(
              [
                [<span className="inline-block size-[7px] rounded-full bg-warn" />, t("charts.legendOff")],
                [<span className="inline-block h-2 w-3.5 rounded-[2px] bg-water/30" />, t("charts.legendBand")],
                [<span>┊</span>, t("charts.legendTank")],
                [<span>- -</span>, t("charts.legendGap")],
              ] as const
            ).map(([mark, text], i) => (
              <span key={text} className="inline-flex items-center gap-1 whitespace-nowrap">
                <span aria-hidden="true" className="inline-flex">
                  {mark}
                </span>
                {text}
                {i < 3 && <span aria-hidden="true">·</span>}
              </span>
            ))}
          </p>
          <div className="flex justify-center">
            <button type="button" id="ch-choose" onClick={() => setChoosing(true)} className={tertiary}>
              {t("charts.choose")}
            </button>
          </div>
        </>
      )}

      <Sheet open={comparing} onOpenChange={setComparing} title={t("charts.compareTitle")} description={t("charts.compareNote", { n: MAX_SPACES })} dirty={false}>
        <div className="flex flex-wrap gap-1.5 pb-4" id="ch-spaces">
          {spaces.map((s) => {
            const on = shown.some((x) => x.id === s.id)
            return (
              <button key={s.id} type="button" aria-pressed={on} onClick={() => togglePick(s.id)} className={toggle(on, "px-3")}>
                <SpaceDot color={s.color} /> {s.name}
              </button>
            )
          })}
        </div>
      </Sheet>

      <Sheet open={choosing} onOpenChange={setChoosing} title={t("charts.choose")} description={t("charts.chooseNote")} dirty={false}>
        <div className="flex flex-col gap-4 pb-4">
          <div className="flex flex-wrap gap-1.5" id="ch-curves">
            {CURVES.map((c) => (
              <TagChip key={c} label={curveName(c)} on={chosen.includes(c)} onClick={() => toggleCurve(c)} />
            ))}
          </div>
          <Seg<"split" | "overlay">
            label={t("charts.view")}
            value={view === "custom" && prefs.overlay ? "overlay" : "split"}
            onChange={(v) => setPrefs(v === "overlay" ? { overlay: true, view: "custom", custom: prefs.custom ?? (curves.length ? curves : null) } : { overlay: false })}
            options={[
              { value: "split", label: t("charts.split") },
              { value: "overlay", label: t("charts.overlay") },
            ]}
          />
        </div>
      </Sheet>
    </>
  )
}

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

/** One curve: name, target and unit on the left, the last value (or the day touched) big on the right, the chart. */
function CurveBlock({
  curve,
  name,
  series,
  spaces,
  tanks,
  range,
  day,
  onDay,
}: {
  curve: CurveId
  name: string
  series: Series[]
  spaces: Space[]
  tanks: IsoDate[]
  range: { from: IsoDate; to: IsoDate }
  day: IsoDate | null
  onDay: (d: IsoDate | null) => void
}) {
  const { t, num, dm, range: fmtRange } = useSettings()
  const summary = useSummary()
  const def = CURVE_DEFS[curve]
  const target = lastTarget(series[0]?.points ?? [])
  const has = series.some((s) => s.points.length)
  const at = day && day >= range.from && day <= range.to ? day : null
  // The value of a series on the day touched, else its last one.
  const valueOf = (s: Series) => (at ? s.points.find((p) => p.date === at) : s.points.at(-1))
  const big = (s: Series, size: "md" | "sm") => {
    const p = valueOf(s)
    if (!p) return <Value size={size} tone="muted">—</Value>
    return (
      <Value size={size} unit={signUnit(def.unit)} tone={isOff(p) ? "warn" : undefined} className={size === "md" ? "text-[1.25rem]" : undefined}>
        {num(p.v, def.decimals)}
      </Value>
    )
  }
  const label = series.map((s) => summary(s, name, spaces.find((x) => x.id === s.spaceId)?.name ?? "")).join(" ")
  return (
    <section data-curve={curve}>
      <header className="mb-1.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <b className="block text-[0.9375rem] leading-snug font-semibold">{name}</b>
          <span className="block text-[0.8125rem] text-fg-3">
            <NumText quiet>{target ? t("charts.targetUnit", { range: fmtRange(target.lo, target.hi, def.decimals), unit: def.unit }) : def.unit}</NumText>
          </span>
        </div>
        {spaces.length === 1 && has && (
          <span className="flex shrink-0 items-baseline gap-1.5" data-last>
            {at && <span className="font-num text-[0.75rem] font-medium text-fg-3">{dm(at)}</span>}
            {big(series[0], "md")}
          </span>
        )}
      </header>
      {spaces.length > 1 && has && (
        <div className="mb-1.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[0.8125rem] text-fg-2" data-last>
          {at && <span className="font-num text-[0.75rem] font-medium text-fg-3">{dm(at)}</span>}
          {series.filter((s) => s.points.length).map((s) => (
            <span key={s.spaceId} className="inline-flex items-center gap-1.5">
              <SpaceDot color={spaces.find((x) => x.id === s.spaceId)?.color} />
              {spaces.find((x) => x.id === s.spaceId)?.name} {big(s, "sm")}
            </span>
          ))}
        </div>
      )}
      {has ? (
        <LineChart series={series} spaces={spaces} tanks={tanks} range={range} decimals={def.decimals} label={label} picked={at} onPick={onDay} />
      ) : (
        <p className="text-[0.8125rem] text-fg-3">{t("charts.noData")}</p>
      )}
    </section>
  )
}

const axisTick = { fontSize: 12 }

/** « Perso » on one chart: each curve scaled to its own range (real values in the tooltip), straight segments. */
function OverlayChart({ series, space, tanks, curveName }: { series: Series[]; space: Space; tanks: string[]; curveName: (c: CurveId) => string }) {
  const { t, num, dm } = useSettings()
  const summary = useSummary()
  const norm = useMemo(() => normalize(series), [series])
  const curves = series.map((s) => s.curve)
  const rows = useMemo(() => withDates(chartRows(norm.map((n) => n.series), (s) => s.curve), tanks), [norm, tanks])
  const real = (s: Series, date: string) => s.points.find((p) => p.date === date)?.v
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
            {tanks.map((d) => (
              <ReferenceLine key={`tank-${d}`} x={d} stroke="var(--fg-3)" strokeDasharray="2 3" />
            ))}
            {norm.flatMap((n) =>
              pieceKeys(n.series.points, n.series.curve).map((k) => (
                <Line key={k} dataKey={k} type="linear" stroke={colorOf(n.series)} strokeWidth={2.5} dot={rows.length < 20 ? { r: 3 } : false} connectNulls isAnimationActive={false} />
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
      <div className="flex flex-col gap-1">
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
      <p className="text-[0.75rem] text-fg-3">{t("charts.overlayNote")}</p>
    </>
  )
}
