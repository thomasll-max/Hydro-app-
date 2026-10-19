// Graphiques (lot 6): choose the curves, one chart per curve (target band + events) or all curves on one chart
// (each scaled to its own range), compare up to 4 spaces, over 7 days, 30 days or the cycle.
import { useMemo, useState } from "react"
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from "recharts"
import { Card } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Chip, Label, Reveal, ScreenHero } from "@/components/hydro/primitives"
import { Seg, TagChip } from "@/components/hydro/form"
import { SpaceDot, spaceColor } from "@/components/hydro/space-pill"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { todayIso } from "@/calc/stage"
import { buildSeries, chartRows, CURVE_DEFS, CURVES, DEFAULT_CURVES, eventsIn, indexEntries, MAX_SPACES, normalize, periodRange, type CurveId, type Period, type Series } from "@/calc/series"
import type { MessageKey } from "@/i18n/types"
import type { Space } from "@/model/grow"
import type { GrowEvent } from "@/model/types"

const STORE = "hydro.charts"
type Prefs = { curves: CurveId[]; view: "split" | "overlay"; period: Period }
function loadPrefs(): Prefs {
  try {
    const o = JSON.parse(localStorage.getItem(STORE) ?? "{}")
    const curves = Array.isArray(o.curves) ? o.curves.filter((c: string) => (CURVES as readonly string[]).includes(c)) : []
    return { curves: curves.length ? curves : DEFAULT_CURVES, view: o.view === "overlay" ? "overlay" : "split", period: ["7", "30", "cycle"].includes(o.period) ? o.period : "7" }
  } catch {
    return { curves: DEFAULT_CURVES, view: "split", period: "7" }
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
  const shown: Space[] = (picked ?? initialSpaces()).map((id) => spaces.find((s) => s.id === id)).filter((s): s is Space => !!s)
  const today = todayIso()
  const byspace = useMemo(() => indexEntries(all.entries), [all.entries])
  const shownCycles = shown.map((s) => cycleIn(s.id) ?? cycles.find((c) => c.spaceId === s.id)).filter((c): c is NonNullable<typeof c> => !!c)
  const range = periodRange(prefs.period, today, shownCycles)
  const events = eventsIn(all.events, shown.map((s) => s.id), range, shownCycles.map((c) => c.id))
  const series = useMemo(() => {
    const out: Record<string, Series[]> = {}
    for (const c of prefs.curves)
      out[c] = shown.map((s) => buildSeries(c, s.id, range, { byspace, mixes: all.mixes, potCount: (cycleIn(s.id) ?? undefined)?.potCount }))
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.curves, shown.map((s) => s.id).join(","), range.from, range.to, byspace, all.mixes])
  const curveName = (c: CurveId) => t(`charts.k.${c}` as MessageKey)
  const togglePick = (id: string) => {
    const cur = shown.map((s) => s.id)
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_SPACES ? cur : [...cur, id]
    if (next.length) setPicked(next)
  }
  const toggleCurve = (c: CurveId) => {
    const next = prefs.curves.includes(c) ? prefs.curves.filter((x) => x !== c) : [...prefs.curves, c]
    if (next.length) setPrefs({ curves: CURVES.filter((x) => next.includes(x)) })
  }
  const hasData = prefs.curves.some((c) => series[c]?.some((s) => s.points.length))

  return (
    <>
      <ScreenHero emoji="chart" title={t("charts.title")}>
        <p className="mt-1 text-[13px] leading-snug text-fg-2">{t("charts.subtitle")}</p>
      </ScreenHero>

      <Reveal i={0} className="mb-3">
        <ToggleGroup
          type="single"
          value={prefs.period}
          onValueChange={(v) => v && setPrefs({ period: v as Period })}
          aria-label={t("charts.period")}
          className="grid w-full grid-cols-3 rounded-full border border-line bg-surface-2 p-[3px]"
        >
          {(
            [
              ["7", "charts.p7"],
              ["30", "charts.p30"],
              ["cycle", "charts.pCycle"],
            ] as const
          ).map(([v, k]) => (
            <ToggleGroupItem
              key={v}
              value={v}
              className="h-9 rounded-full! text-[13px] font-semibold text-fg-3 hover:bg-transparent data-[state=on]:bg-surface data-[state=on]:text-fg data-[state=on]:shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
            >
              {t(k)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="mt-1.5 text-center text-[11.5px] text-fg-3">{t("charts.range", { from: dm(range.from), to: dm(range.to) })}</p>
      </Reveal>

      <Reveal i={1} className="mb-3">
        <Card className="gap-2.5">
          {spaces.length > 1 && (
            <div>
              <div className="mb-1 text-[12px] font-medium text-fg-2">{t("charts.spaces", { n: MAX_SPACES })}</div>
              <div className="flex flex-wrap gap-1.5" id="ch-spaces">
                {spaces.map((s) => {
                  const on = shown.some((x) => x.id === s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => togglePick(s.id)}
                      className={on ? "flex h-9 items-center gap-1.5 rounded-full border border-primary/45 bg-primary/12 px-3 text-[12.5px] font-semibold" : "flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 text-[12.5px] font-semibold text-fg-2"}
                    >
                      <SpaceDot color={s.color} /> {s.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div>
            <div className="mb-1 text-[12px] font-medium text-fg-2">{t("charts.curves")}</div>
            <div className="flex flex-wrap gap-1.5" id="ch-curves">
              {CURVES.map((c) => (
                <TagChip key={c} label={curveName(c)} on={prefs.curves.includes(c)} onClick={() => toggleCurve(c)} />
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
            <b className="text-[15px] leading-snug font-semibold">{t("charts.emptyTitle")}</b>
            <p className="mt-1.5 text-[13px] leading-[1.45] text-fg-2">{t("charts.emptyBody")}</p>
          </Card>
        </Reveal>
      )}

      {hasData && prefs.view === "split" &&
        prefs.curves.map((c, i) => (
          <Reveal key={c} i={2 + i} className="mb-3">
            <Card className="gap-2 px-3 pb-2" data-curve={c}>
              <div className="flex items-center justify-between gap-2 px-1">
                <Label>{curveName(c)}</Label>
                <span className="text-[11px] text-fg-3">{CURVE_DEFS[c].unit}</span>
              </div>
              {series[c].some((s) => s.points.length) ? (
                <CurveChart series={series[c]} spaces={shown} events={events} curve={c} />
              ) : (
                <p className="px-1 pb-2 text-[12.5px] text-fg-3">{t("charts.noData")}</p>
              )}
            </Card>
          </Reveal>
        ))}

      {hasData && prefs.view === "overlay" && (
        <Reveal i={2} className="mb-3">
          <Card className="gap-2 px-3 pb-2">
            <Label className="px-1">{t("charts.overlayTitle")}</Label>
            <OverlayChart series={prefs.curves.flatMap((c) => series[c])} spaces={shown} events={events} curveName={curveName} />
            <p className="px-1 text-[11px] text-fg-3">{t("charts.overlayNote")}</p>
          </Card>
        </Reveal>
      )}

      {hasData && events.length > 0 && (
        <Reveal i={3} className="mb-3">
          <Card className="gap-1">
            <Label>{t("charts.events")}</Label>
            <ul className="mt-1">
              {events.map((e) => (
                <li key={e.id} className="flex justify-between gap-2 border-t border-line py-1.5 text-[12.5px] first:border-t-0">
                  <span className="text-fg-3 tabular">{dm(e.date)}</span>
                  <span className="text-fg-2">{t(`event.${e.type}`)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>
      )}
      <p className="text-center text-[10.5px] text-fg-3">{t("charts.foot", { n: num(MAX_SPACES) })}</p>
    </>
  )
}

const axisTick = { fontSize: 10.5 }

function CurveChart({ series, spaces, events, curve }: { series: Series[]; spaces: Space[]; events: GrowEvent[]; curve: CurveId }) {
  const { t, num, dm } = useSettings()
  const rows = useMemo(() => chartRows(series), [series])
  const def = CURVE_DEFS[curve]
  const config = Object.fromEntries(spaces.map((s) => [`s:${s.id}`, { label: s.name, color: spaceColor(s.color) }]))
  return (
    <ChartContainer config={config} className="aspect-auto h-[170px] w-full">
      <ComposedChart data={rows} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="var(--line)" />
        <XAxis dataKey="date" tickFormatter={(d: string) => dm(d)} tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} domain={["auto", "auto"]} tickFormatter={(v: number) => num(v, def.decimals > 1 ? 1 : def.decimals)} />
        <Area dataKey="band" type="stepAfter" stroke="none" fill="var(--primary)" fillOpacity={0.12} isAnimationActive={false} connectNulls />
        {events.map((e) => (
          <ReferenceLine key={e.id} x={e.date} stroke="var(--fg-3)" strokeDasharray="2 4" strokeOpacity={0.7} />
        ))}
        {spaces.map((s) => (
          <Line key={s.id} dataKey={`s:${s.id}`} name={s.name} type="monotone" stroke={spaceColor(s.color)} strokeWidth={2} dot={rows.length < 20 ? { r: 2.5 } : false} connectNulls isAnimationActive={false} />
        ))}
        <ChartTooltip
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <div className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11.5px] shadow-card">
                <div className="mb-0.5 font-semibold">{dm(String(label))}</div>
                {payload
                  .filter((p) => String(p.dataKey).startsWith("s:"))
                  .map((p) => (
                    <div key={String(p.dataKey)} className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: p.color }} />
                      {p.name} : <b className="tabular">{num(Number(p.value), def.decimals)}</b> {def.unit}
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
  )
}

function OverlayChart({ series, spaces, events, curveName }: { series: Series[]; spaces: Space[]; events: GrowEvent[]; curveName: (c: CurveId) => string }) {
  const { num, dm } = useSettings()
  const norm = useMemo(() => normalize(series), [series])
  const curves = [...new Set(series.map((s) => s.curve))]
  const key = (s: Series) => `${s.curve}|${s.spaceId}`
  const rows = useMemo(() => {
    const m = new Map<string, Record<string, number | string>>()
    for (const n of norm)
      for (const p of n.series.points) {
        let r = m.get(p.date)
        if (!r) m.set(p.date, (r = { date: p.date }))
        r[key(n.series)] = p.v
      }
    return [...m.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [norm])
  const real = (s: Series, date: string) => s.points.find((p) => p.date === date)?.v
  const colorOf = (s: Series) => (spaces.length > 1 ? spaceColor(spaces.find((x) => x.id === s.spaceId)?.color) : `var(--space-${PALETTE[curves.indexOf(s.curve) % PALETTE.length]})`)
  const dashOf = (s: Series) => (spaces.length > 1 ? ["0", "6 4", "2 4", "10 4"][curves.indexOf(s.curve) % 4] : "0")
  return (
    <>
      <ChartContainer config={{}} className="aspect-auto h-[220px] w-full">
        <ComposedChart data={rows} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="var(--line)" />
          <XAxis dataKey="date" tickFormatter={(d: string) => dm(d)} tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis hide domain={[0, 100]} />
          {events.map((e) => (
            <ReferenceLine key={e.id} x={e.date} stroke="var(--fg-3)" strokeDasharray="2 4" strokeOpacity={0.7} />
          ))}
          {series.map((s) => (
            <Line key={key(s)} dataKey={key(s)} type="monotone" stroke={colorOf(s)} strokeDasharray={dashOf(s)} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          ))}
          <ChartTooltip
            content={({ active, label }) =>
              active ? (
                <div className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11.5px] shadow-card">
                  <div className="mb-0.5 font-semibold">{dm(String(label))}</div>
                  {series.map((s) => {
                    const v = real(s, String(label))
                    return v == null ? null : (
                      <div key={key(s)} className="flex items-center gap-1.5">
                        <span className="h-[3px] w-3 rounded-full" style={{ background: colorOf(s) }} />
                        {curveName(s.curve)}
                        {spaces.length > 1 ? ` · ${spaces.find((x) => x.id === s.spaceId)?.name}` : ""} : <b className="tabular">{num(v, CURVE_DEFS[s.curve].decimals)}</b> {CURVE_DEFS[s.curve].unit}
                      </div>
                    )
                  })}
                </div>
              ) : null
            }
          />
        </ComposedChart>
      </ChartContainer>
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
        {series
          .filter((s) => s.points.length)
          .map((s) => {
            const n = norm.find((x) => key(x.series) === key(s))!
            return (
              <span key={key(s)} className="flex items-center gap-1.5 text-[11px] text-fg-2">
                <span className="h-[3px] w-3.5 rounded-full" style={{ background: colorOf(s) }} />
                {curveName(s.curve)}
                {spaces.length > 1 ? ` · ${spaces.find((x) => x.id === s.spaceId)?.name}` : ""}
                <span className="text-fg-3">
                  ({num(n.min, CURVE_DEFS[s.curve].decimals)}–{num(n.max, CURVE_DEFS[s.curve].decimals)} {CURVE_DEFS[s.curve].unit})
                </span>
              </span>
            )
          })}
      </div>
      <Chip>{spaces.map((s) => s.name).join(" · ")}</Chip>
    </>
  )
}
