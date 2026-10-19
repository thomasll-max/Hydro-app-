// Journal par semaines (lot 10k3, planche « Les menus »): one card per week, folded except the running one. The strip of
// the 7 days coloured by state, a one-line summary, and in an open week only the days that matter (an alert, an action,
// an observation, a note, a tank, an event); the other days fold into « + N jours sans souci ».
import { useState } from "react"
import { CalendarDays, ChevronDown, Eye, FlaskConical, Hand, NotebookPen, TriangleAlert } from "lucide-react"
import { SpaceDot } from "@/components/hydro/space-pill"
import { NumText } from "@/components/hydro/value"
import { useSettings } from "@/app/settings-context"
import { useEditors } from "@/app/editors"
import { navigate } from "@/app/nav"
import { addDays } from "@/calc/stage"
import type { DayRow, KeyMetric, Off, Week, WeekDay, WeekLabel } from "@/calc/weeks"
import type { MetricKey } from "@/calc/advice"
import type { Entry } from "@/model/types"
import type { Space } from "@/model/grow"
import { locales, lowerWord } from "@/i18n/core"
import type { Lang, MessageKey } from "@/i18n/types"
import { cn } from "@/lib/utils"
import { tertiary } from "@/components/hydro/styles"

const DECIMALS: Record<MetricKey | KeyMetric, number> = { dryback: 0, drybackSensor: 0, runoffPct: 0, ecIn: 1, ecRunoff: 1, phIn: 1, phRunoff: 1, vpd: 2, dli: 1, tempDay: 0, rh: 0 }
const UNIT: Partial<Record<MetricKey | KeyMetric, string>> = { dryback: " %", drybackSensor: " %", runoffPct: " %", tempDay: "°", rh: " %" }

const loc = (lang: Lang) => (lang === "en" ? "en-GB" : locales[lang])
const day = (iso: string) => new Date(`${iso}T12:00:00`)

/** « Végé S6 », « Floraison S3 », « Semaine du 02/02 ». */
export function useWeekTitle() {
  const { t, dm } = useSettings()
  return (label: WeekLabel | null, monday: string) =>
    !label ? t("jw.week", { date: dm(monday) }) : label.kind === "before" ? t("jw.before") : t(`jw.${label.kind}` as MessageKey, { n: label.week })
}

/** « 2–8 févr. » */
export function weekRange(lang: Lang, monday: string): string {
  const f = new Intl.DateTimeFormat(loc(lang), { day: "numeric", month: "short" })
  const a = day(monday)
  const b = day(addDays(monday, 6))
  return typeof f.formatRange === "function" ? f.formatRange(a, b) : `${f.format(a)} – ${f.format(b)}`
}

/** « ven. 6 » */
export const dayShort = (lang: Lang, iso: string) => day(iso).toLocaleDateString(loc(lang), { weekday: "short", day: "numeric" })

export function useValue() {
  const { num } = useSettings()
  return (k: MetricKey | KeyMetric, v: number) => `${num(v, DECIMALS[k])}${UNIT[k] ?? ""}`
}

/** « dryback 33 % · EC ro 4,3 » (a drying room: « T° 19° · HR 61 % »). */
export function useKeyValues() {
  const { t } = useSettings()
  const val = useValue()
  return (e: Entry | undefined, drying = false): string => {
    if (!e) return ""
    const keys: KeyMetric[] = drying ? ["tempDay", "rh"] : [e.dryback != null ? "dryback" : "drybackSensor", "ecRunoff"]
    return keys
      .filter((k) => e[k] != null)
      .map((k) => `${t(`jw.k.${k}` as MessageKey)} ${val(k, e[k] as number)}`)
      .join(" · ")
  }
}

/** The 7 days, Monday to Sunday: « plante » in the target, « à surveiller » out of it, dotted without entry. */
function Strip({ w, onDay }: { w: Week; onDay: (d: WeekDay) => void }) {
  const { t, settings, dm } = useSettings()
  return (
    <div className="mt-1.5 mb-0.5 grid grid-cols-7 gap-1.5" role="group" data-strip>
      {w.days.map((d) => {
        const letter = day(d.date).toLocaleDateString(loc(settings.lang), { weekday: "narrow" })
        return (
          <button
            key={d.date}
            type="button"
            disabled={d.state === "future"}
            onClick={() => onDay(d)}
            data-state={d.state}
            data-today={d.today || undefined}
            aria-label={t("jw.day", { date: `${dayShort(settings.lang, d.date)} ${dm(d.date)}`, state: t(`jw.state.${d.state}` as MessageKey) })}
            className={cn(
              "hit relative flex h-10 min-w-0 flex-col items-center justify-center gap-px rounded-[9px] disabled:cursor-default",
              d.today ? "border-[1.5px] border-water" : d.state === "ok" ? "bg-leaf/20" : d.state === "warn" ? "bg-warn/30" : d.state === "none" ? "border border-dashed border-line-strong" : "bg-line/60",
            )}
          >
            <span aria-hidden="true" className="text-[0.625rem] leading-none text-fg-3 uppercase">
              {letter}
            </span>
            <span aria-hidden="true" className={cn("font-num text-[0.8125rem] leading-tight font-semibold", d.today ? "text-water-ink" : d.state === "warn" ? "text-warn" : d.state === "ok" ? "text-fg" : "text-fg-2")}>
              {Number(d.date.slice(8))}
            </span>
            {d.dot && <span aria-hidden="true" className="absolute bottom-1 size-1 rounded-full bg-water" />}
          </button>
        )
      })}
    </div>
  )
}

const ICON = { warn: TriangleAlert, action: Hand, obs: Eye, mix: FlaskConical, event: CalendarDays, note: NotebookPen } as const

/** A day that matters: a 28 px type icon, what happened, the values; the day on the right. */
function DayLine({ r, drying }: { r: DayRow; drying: boolean }) {
  const { t, settings, num, range } = useSettings()
  const ed = useEditors()
  const val = useValue()
  const kv = useKeyValues()
  const offTitle = (o: Off) => `${t(`jw.m.${o.metric}` as MessageKey)} ${val(o.metric, o.value)}`
  // What happened, two labels at most, each once (« Nouveau bidon · Rempotage »).
  const labels = [
    ...(r.mixes.length || r.actions.includes("newMix") ? [t("jw.mix")] : []),
    ...r.actions.filter((a) => a !== "newMix").map((a) => t(`action.${a}` as MessageKey)),
    ...r.obs.map((o) => t(`obs.${o}` as MessageKey)),
    ...r.events.map((e) => t(`event.${e.type}` as MessageKey)),
  ]
  const title = r.kind === "warn" ? r.offs.slice(0, 2).map(offTitle).join(" · ") : [...new Set(labels)].slice(0, 2).join(" · ") || (r.note ?? "")
  const m = r.mixes[0]
  const detail =
    r.kind === "warn"
      ? [t("jw.offOf", { range: range(r.offs[0].lo, r.offs[0].hi, DECIMALS[r.offs[0].metric]) }), kv(r.entry, drying)].filter(Boolean).join(" · ")
      : r.kind === "obs" && r.note
        ? t("jw.quote", { text: r.note })
        : r.kind === "mix" && m
          ? [`${num(m.volumeL)} L`, m.ec != null ? `EC ${num(m.ec, 1)}` : null, m.ph != null ? `pH ${num(m.ph, 1)}` : null].filter(Boolean).join(" · ")
          : r.kind === "note"
            ? kv(r.entry, drying)
            : kv(r.entry, drying) || (r.events[0]?.note ?? "")
  const open = () => (r.entry ? ed.openEntry({ date: r.date, spaceId: r.entry.spaceId }) : m ? ed.openMix(m) : r.events[0] ? ed.openEvent(r.events[0]) : undefined)
  const Icon = ICON[r.kind]
  return (
    <button type="button" onClick={open} className="flex w-full items-start gap-3 border-t border-line pt-2.5 pb-1 text-left" data-row={r.kind}>
      <span
        aria-hidden="true"
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-[8px]",
          r.kind === "warn" ? "bg-warn/20 text-warn" : r.kind === "mix" ? "bg-water/15 text-water" : r.kind === "action" || r.kind === "obs" ? "bg-line text-leaf" : "bg-line text-fg-2",
        )}
      >
        <Icon className="size-4" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <b className={cn("block truncate text-[0.90625rem] font-semibold", r.kind === "warn" && "text-warn")}>
          <NumText>{title}</NumText>
        </b>
        {detail && (
          <span className="block truncate text-[0.8125rem] text-fg-3">
            <NumText>{detail}</NumText>
          </span>
        )}
      </span>
      <span className="shrink-0 pt-0.5 text-[0.75rem] whitespace-nowrap text-fg-3">{dayShort(settings.lang, r.date)}</span>
    </button>
  )
}

/** One week of the Journal. */
export function WeekCard({ w, open, onToggle, space, spaceId, drying }: { w: Week; open: boolean; onToggle: () => void; space?: Space; spaceId?: string; drying: boolean }) {
  const { t, settings, range } = useSettings()
  const title = useWeekTitle()(w.label, w.monday)
  const kv = useKeyValues()
  const [quietOpen, setQuietOpen] = useState(false)
  const hasEntries = w.entries.some((e) => !e.plantId)
  const counts = [
    w.offDays ? t("jw.offDays", { n: w.offDays }) : null,
    w.incidents ? t("jw.incidents", { n: w.incidents }) : null,
    w.mixes.length ? t("jw.mixes", { n: w.mixes.length }) : null,
  ]
  // Folded: a few words. Open: the ranges of the key values, then what happened.
  const short = [hasEntries ? (w.offDays ? null : t("jw.allOk")) : t("jw.noEntry"), ...counts, ...w.events.slice(0, 1).map((e) => lowerWord(settings.lang, t(`event.${e.type}` as MessageKey)))].filter(Boolean).slice(0, 3).join(" · ")
  const ranges = (Object.keys(w.ranges) as KeyMetric[]).map((k) => {
    const [lo, hi] = w.ranges[k]!
    const unit = UNIT[k] ?? ""
    return `${t(`jw.k.${k}` as MessageKey)} ${lo === hi ? range(lo, lo, DECIMALS[k]) : range(lo, hi, DECIMALS[k])}${unit}`
  })
  const long = [...ranges, ...counts.filter(Boolean)].join(" · ") || short
  // The week page (lot 10k3c): from « Voir la semaine → », the summary of an open week, or a day of the strip (its card).
  const page = (day?: string) => {
    const sid = w.spaceId ?? spaceId
    if (sid) navigate({ tab: "journal", week: `${sid}/${w.monday}`, ...(day ? { day } : {}) }, { push: true })
  }
  const ed = useEditors()
  const onDay = (d: WeekDay) => {
    if (d.entries.some((x) => !x.plantId)) return page(d.date)
    const e = d.entries[0]
    const sid = e?.spaceId ?? w.spaceId ?? spaceId
    ed.openEntry({ date: d.date, ...(sid ? { spaceId: sid } : {}), ...(e?.plantId ? { plantId: e.plantId } : {}) })
  }
  return (
    <section className={cn("flex flex-col gap-1.5 rounded-[14px] border border-line p-3.5", open && "bg-surface")} data-week={w.key} data-open={open || undefined}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-label={t("jw.toggle", { week: title })} className="-my-1 flex min-h-11 w-full items-center gap-2.5 text-left">
        <span className="min-w-0 flex-1">
          {space && w.spaceId && (
            <span className="mr-2 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-fg-2">
              <SpaceDot color={space.color} /> {space.name}
            </span>
          )}
          <b className="display mr-2 text-[1.0625rem]">{title}</b>
          <span className="text-[0.8125rem] whitespace-nowrap text-fg-3">
            <NumText quiet>{weekRange(settings.lang, w.monday)}</NumText>
            {w.current && ` · ${t("jw.running")}`}
          </span>
        </span>
        <ChevronDown aria-hidden="true" className={cn("size-5 shrink-0 text-fg-3 transition-transform", open && "rotate-180")} />
      </button>
      <Strip w={w} onDay={onDay} />
      {open ? (
        <button type="button" onClick={() => page()} className="text-left text-[0.8125rem] leading-[1.5] text-fg-3" data-summary>
          <NumText>{long}</NumText>
        </button>
      ) : (
        <p className="text-[0.8125rem] leading-[1.5] text-fg-3" data-summary>
          <NumText>{short}</NumText>
        </p>
      )}
      {open && (
        <div className="flex flex-col" data-rows>
          {w.rows.map((r) => (
            <DayLine key={r.date} r={r} drying={drying} />
          ))}
          {w.quiet.length > 0 && !quietOpen && (
            <button type="button" onClick={() => setQuietOpen(true)} className="flex min-h-11 items-center border-t border-line text-left text-[0.8125rem] text-fg-2" data-quiet>
              <span>
                <NumText>{t("jw.quiet", { n: w.quiet.length })}</NumText>
              </span>
            </button>
          )}
          {quietOpen &&
            w.quiet.map((d) => {
              const e = d.entries.find((x) => !x.plantId) ?? d.entries[0]
              return (
                <button key={d.date} type="button" onClick={() => onDay(d)} className="flex min-h-11 items-center gap-3 border-t border-line text-left" data-quiet-day>
                  <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-fg-2">
                    <NumText>{kv(e, drying) || "—"}</NumText>
                  </span>
                  <span className="shrink-0 text-[0.75rem] whitespace-nowrap text-fg-3">{dayShort(settings.lang, d.date)}</span>
                </button>
              )
            })}
          {quietOpen && (
            <button type="button" onClick={() => setQuietOpen(false)} className="min-h-11 border-t border-line text-left text-[0.8125rem] text-fg-3">
              {t("jw.quietHide")}
            </button>
          )}
          {(w.spaceId ?? spaceId) && hasEntries && (
            <button type="button" onClick={() => page()} className={cn(tertiary, "self-start")} data-see-week>
              {t("wp.seeWeek")}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
