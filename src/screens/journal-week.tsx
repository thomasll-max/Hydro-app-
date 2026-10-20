// Page d'une semaine du Journal (lot 10k3, planche « Les menus »): the verdict in one or two sentences, one line per key
// value (target, the 7 days over the target band, the week's mean, the week before, days in the target), then one card
// per day; a card opens the entry of that day. Only from the targets recorded in the entries, never an invented opinion.
import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronLeft, Mic } from "lucide-react"
import { SpaceDot } from "@/components/hydro/space-pill"
import { NumText } from "@/components/hydro/value"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { navigate } from "@/app/nav"
import { addDays } from "@/calc/stage"
import { CULTURE_METRICS, DRYING_METRICS, metricLines, offValues, weekLabel, weekVerdict, type MetricLine, type WeekMetric } from "@/calc/weeks"
import type { Entry, IsoDate } from "@/model/types"
import type { MessageKey } from "@/i18n/types"
import type { MetricKey } from "@/calc/advice"
import { cn } from "@/lib/utils"
import { dayShort, useValue, useWeekTitle, weekRange } from "./journal-weeks"
import { DoubtfulLine, ImpossibleMark } from "@/components/hydro/doubtful"

const label = (t: (k: MessageKey) => string, m: WeekMetric | MetricKey) => t(`jw.m.${m}` as MessageKey)

/** The 7 days on the target band: straight segments, a dotted link over a day without a value, off-target dots « à surveiller ». */
function MiniWeek({ line, monday }: { line: MetricLine; monday: IsoDate }) {
  const W = 96
  const H = 30
  const vals = line.points.map((p) => p.value)
  const lo = Math.min(...vals, line.target?.lo ?? Infinity)
  const hi = Math.max(...vals, line.target?.hi ?? -Infinity)
  const pad = (hi - lo || 1) * 0.15
  const y = (v: number) => H - 3 - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - 6)
  const x = (d: IsoDate) => 4 + (Math.round((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${monday}T12:00:00Z`)) / 864e5) / 6) * (W - 8)
  const pts = line.points.map((p) => ({ ...p, x: x(p.date), y: y(p.value) }))
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="shrink-0 overflow-visible">
      {line.target && <rect x={0} width={W} y={y(line.target.hi)} height={Math.max(1, y(line.target.lo) - y(line.target.hi))} className="fill-leaf/20" />}
      {pts.slice(1).map((p, i) => {
        const a = pts[i]
        const gap = Math.round((Date.parse(`${p.date}T12:00:00Z`) - Date.parse(`${a.date}T12:00:00Z`)) / 864e5) > 1
        return <line key={p.date} x1={a.x} y1={a.y} x2={p.x} y2={p.y} strokeWidth={1.6} strokeDasharray={gap ? "2 3" : undefined} className="stroke-fg-2" />
      })}
      {pts.map((p) => (
        <circle key={p.date} cx={p.x} cy={p.y} r={p.status && p.status !== "ok" ? 3 : 2} className={p.status && p.status !== "ok" ? "fill-warn" : "fill-fg-2"} />
      ))}
    </svg>
  )
}

export function WeekPage({ spaceId, monday, day }: { spaceId: string; monday: IsoDate; day?: IsoDate }) {
  const { t, settings, num, range, dm } = useSettings()
  const { all, spaces, cycles } = useGrow()
  const ed = useEditors()
  const val = useValue()
  const weekTitle = useWeekTitle()
  const space = spaces.find((s) => s.id === spaceId)
  const sunday = addDays(monday, 6)
  const prevMonday = addDays(monday, -7)
  const drying = !!space?.modules.drying && !space.modules.irrigation
  const data = useMemo(() => {
    const near = all.entries.filter((e) => e.date >= prevMonday && e.date <= sunday)
    const count = new Map<string, number>()
    for (const e of near) if (e.spaceId === spaceId && e.date >= monday && e.cycleId) count.set(e.cycleId, (count.get(e.cycleId) ?? 0) + 1)
    const cycleId = [...count].sort((a, b) => b[1] - a[1])[0]?.[0]
    const cycle = cycles.find((c) => c.id === cycleId)
    // This week: the space's entries (of its cycle). The week before: the same cycle's, wherever it was (a transfer
    // keeps the comparison, as on the validated board: « comparée à S5 »); without a cycle, the same space's.
    const week = near.filter((e) => e.date >= monday && e.spaceId === spaceId && (!cycle || e.cycleId === cycle.id))
    const prev = near.filter((e) => e.date < monday && (cycle ? e.cycleId === cycle.id : e.spaceId === spaceId))
    const lines = metricLines(week, prev, drying ? DRYING_METRICS : CULTURE_METRICS)
    return { cycle, week, prev, lines, verdict: weekVerdict(lines, prev.some((e) => !e.plantId)) }
  }, [all.entries, cycles, spaceId, monday, prevMonday, sunday, drying])
  const { cycle, week, prev, lines, verdict } = data
  const title = weekTitle(cycle ? weekLabel(cycle, monday) : null, monday)
  const prevTitle = weekTitle(cycle ? weekLabel(cycle, prevMonday) : null, prevMonday)
  const roomDays = [...new Set(week.filter((e) => !e.plantId).map((e) => e.date))].sort().reverse()
  const [allDays, setAllDays] = useState(false)
  // Opened from a day of the strip: that day's card is shown and brought into view.
  useEffect(() => {
    if (!day) return
    if (roomDays.indexOf(day) >= 3) setAllDays(true)
    const id = setTimeout(() => document.querySelector(`[data-day="${day}"]`)?.scrollIntoView({ block: "center" }), 50)
    return () => clearTimeout(id)
  }, [day]) // eslint-disable-line react-hooks/exhaustive-deps
  const shownDays = allDays ? roomDays : roomDays.slice(0, 3)
  const hidden = roomDays.slice(3)

  // The verdict, only from the recorded targets.
  const withTarget = lines.filter((l) => l.target && l.measured)
  const dates = (d: IsoDate[]) => d.map((x) => dm(x)).join(", ")
  const sentences: string[] = []
  if (!withTarget.length) sentences.push(t("wp.noTarget"))
  else {
    sentences.push(verdict.allIn ? t("wp.allIn") : t("wp.allInBut", { list: verdict.offs.map((o) => t("wp.offItem", { metric: label(t, o.metric), dates: dates(o.dates) })).join(", ") }))
    const fmtPrev = (m: WeekMetric, v: number) => val(m, v)
    for (const b of verdict.back.slice(0, 2)) sentences.push(t("wp.back1", { metric: label(t, b.metric), prev: fmtPrev(b.metric, b.prevAvg) }))
    for (const a of verdict.away.slice(0, 1)) sentences.push(t("wp.away1", { metric: label(t, a.metric), prev: fmtPrev(a.metric, a.prevAvg) }))
    if (verdict.first) sentences.push(t("wp.firstWeek"))
  }

  return (
    <div className="flex flex-col gap-6" id="week-page">
      <div className="-mt-1 flex items-center gap-2">
        <button type="button" onClick={() => navigate({ tab: "journal" })} className="-ml-1 flex h-11 items-center gap-1 rounded-[10px] pr-3 text-[0.9375rem] font-semibold text-fg" id="week-back">
          <ChevronLeft className="size-5" /> {t("wp.back")}
        </button>
        <span className="ml-auto flex min-w-0 items-center gap-1.5 truncate text-[0.8125rem] text-fg-3">
          {space && <SpaceDot color={space.color} />}
          {[space?.name, cycle?.name].filter(Boolean).join(" · ")}
        </span>
      </div>
      <div>
        <h1 className="display text-[1.75rem] leading-tight">{title}</h1>
        <p className="mt-1 text-[0.8125rem] text-fg-3" id="week-sub">
          <NumText quiet>{[weekRange(settings.lang, monday), t("wp.entries", { n: roomDays.length }), prev.some((e) => !e.plantId) ? t("wp.compared", { week: prevTitle }) : t("wp.first")].join(" · ")}</NumText>
        </p>
      </div>

      {roomDays.length === 0 ? (
        <p className="text-[0.875rem] text-fg-3">{t("wp.none")}</p>
      ) : (
        <>
          <p className="text-[0.9375rem] leading-[1.5] text-fg-2" id="week-verdict" data-good={withTarget.length ? verdict.good : undefined}>
            {withTarget.length > 0 && <b className={cn("font-semibold", verdict.good ? "text-leaf-ink" : "text-warn")}>{verdict.good ? t("wp.good") : t("wp.watch")} </b>}
            <NumText>{sentences.join(" ")}</NumText>
          </p>

          <section className="flex flex-col" id="week-metrics">
            {lines.map((l) => {
              const ok = !l.target || l.inTarget === l.measured || l.trend === "in" || l.trend === "closer"
              const arrow = l.prevAvg == null ? "" : l.avg > l.prevAvg + 1e-9 ? "↑ " : l.avg < l.prevAvg - 1e-9 ? "↓ " : "= "
              const right = [l.prevAvg != null ? `${arrow}${num(l.prevAvg, l.metric.startsWith("ph") || l.metric.startsWith("ec") ? 1 : l.metric === "vpd" ? 2 : 0)}` : null, l.measured ? t("wp.days", { n: l.inTarget, m: l.measured }) : null].filter(Boolean).join(" · ")
              return (
                <div key={l.metric} className="flex min-h-[52px] items-center gap-2.5 border-t border-line py-1.5 last:border-b" data-metric={l.metric}>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-[0.90625rem] font-semibold">{label(t, l.metric)}</b>
                    <small className="block truncate text-[0.75rem] text-fg-3">
                      <NumText quiet>{l.target ? t("wp.target", { range: `${range(l.target.lo, l.target.hi, l.metric.startsWith("ph") || l.metric.startsWith("ec") || l.metric === "vpd" ? 1 : 0)}${l.metric === "dryback" || l.metric === "runoffPct" ? " %" : ""}` }) : t("wp.noTargetShort")}</NumText>
                    </small>
                  </div>
                  <MiniWeek line={l} monday={monday} />
                  <div className="w-[5.25rem] shrink-0 text-right">
                    <b className="block font-num text-[1rem] font-semibold tracking-[-0.02em]">{val(l.metric, l.avg)}</b>
                    {right && <small className={cn("block font-num text-[0.75rem] whitespace-nowrap", l.target ? (ok ? "text-leaf-ink" : "text-warn") : "text-fg-3")}>{right}</small>}
                  </div>
                </div>
              )
            })}
          </section>

          <section className="flex flex-col gap-2.5" id="week-days">
            <h2 className="display text-[1.1875rem] leading-tight">{t("wp.byDay")}</h2>
            {shownDays.map((d) => (
              <DayCard key={d} date={d} entries={week.filter((e) => e.date === d)} drying={drying} onOpen={(e) => ed.openEntry({ date: d, spaceId, ...(e.plantId ? { plantId: e.plantId } : {}) })} />
            ))}
            {!allDays && hidden.length > 0 && (
              <button type="button" onClick={() => setAllDays(true)} className="flex min-h-11 items-center justify-center gap-1 text-[0.8125rem] text-fg-2" id="week-more">
                {t("wp.more", { list: hidden.map((x) => dayShort(settings.lang, x)).join(", ") })} <ChevronDown className="size-4" />
              </button>
            )}
          </section>
        </>
      )}
    </div>
  )
}

/** One day: its name, what happened (or the climate), four values in a grid (off target in « à surveiller »). */
function DayCard({ date, entries, drying, onOpen }: { date: IsoDate; entries: Entry[]; drying: boolean; onOpen: (e: Entry) => void }) {
  const { t, settings } = useSettings()
  const val = useValue()
  const e = entries.filter((x) => !x.plantId).sort((a, b) => ((a.time ?? "") < (b.time ?? "") ? 1 : -1))[0]
  if (!e) return null
  const offs = offValues(e)
  const status = (m: WeekMetric) => offs.find((o) => o.metric === m)?.status
  const head = offs.length
    ? { text: t("wp.offShort", { metric: label(t, offs[0].metric) }), warn: true }
    : e.actions?.length
      ? { text: e.actions.map((a) => t(`action.${a}` as MessageKey)).join(" · "), warn: false }
      : e.observations?.length
        ? { text: e.observations.map((o) => t(`obs.${o.tag}` as MessageKey)).join(" · "), warn: false }
        : { text: [e.tempDay != null ? val("tempDay", e.tempDay) : null, e.rh != null ? val("rh", e.rh) : null].filter(Boolean).join(" · "), warn: false }
  const grid: WeekMetric[] = drying ? ["tempDay", "rh", "vpd"] : [e.dryback != null || e.drybackSensor == null ? "dryback" : "drybackSensor", "runoffPct", "ecRunoff", "phRunoff"]
  return (
    <button type="button" onClick={() => onOpen(e)} className="rounded-[12px] border border-line p-3 text-left" data-day={date}>
      <span className="mb-2 flex items-baseline justify-between gap-2">
        <b className="text-[0.90625rem] font-semibold">{dayShort(settings.lang, date)}</b>
        <span className={cn("min-w-0 truncate text-[0.78125rem]", head.warn ? "font-semibold text-warn" : "text-fg-2")}>
          <NumText>{head.text}</NumText>
        </span>
      </span>
      <span className={cn("grid gap-1.5", drying ? "grid-cols-3" : "grid-cols-4")}>
        {grid.map((m) => (
          <span key={m} className="min-w-0">
            <span className="block truncate text-[0.75rem] text-fg-3">{t(`jw.k.${m === "runoffPct" ? "runoff" : m === "phRunoff" ? "phRo" : m === "vpd" ? "vpd" : m}` as MessageKey)}</span>
            <span className={cn("mt-0.5 block font-num text-[1rem] font-semibold tracking-[-0.01em]", status(m) && "text-warn", e[m] == null && "text-fg-3")}>
              {e[m] != null ? val(m, e[m] as number) : "—"}
              {/* Doubtful (lot 15b): never shown out of what it can be, « — » and a cue. */}
              {e[m] == null && e.doubtful?.[m] != null && <ImpossibleMark />}
            </span>
          </span>
        ))}
      </span>
      <DoubtfulLine e={e} className="mt-2" />
      {/* A dictated day keeps the words (lot 11), apart from the note. */}
      {e.dictation && (
        <span className="mt-2 flex items-start gap-1.5 text-[0.75rem] leading-snug text-fg-3" data-dictation>
          <Mic aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          <span className="line-clamp-2">{t("voice.dictated", { text: e.dictation })}</span>
        </span>
      )}
    </button>
  )
}
