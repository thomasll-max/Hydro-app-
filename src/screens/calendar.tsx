// Calendrier (spec §4ter): month with stats, agenda, day sheet, filters, .ics export.
// Follows the space selector at the top; items without a space (whole grow) always show.
import { Loading } from "@/components/hydro/wordmark"
import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Copy, Download, Plus } from "lucide-react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Emoji } from "@/components/hydro/emoji"
import { LineIcon } from "@/components/hydro/line-icon"
import { Label, Reveal, ScreenHero, SourceNote } from "@/components/hydro/primitives"
import { Seg, Sheet, TagChip } from "@/components/hydro/form"
import { SpaceDot } from "@/components/hydro/space-pill"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { addDays, todayIso } from "@/calc/stage"
import { calendarItems, forSpaces, type CalItem } from "@/calendar/agenda"
import { deadlineState, deadlines } from "@/calendar/deadlines"
import { deadlineTitle } from "@/calendar/labels"
import { weekdayIndex } from "@/calendar/rrule"
import { buildIcs } from "@/calendar/ics"
import { zipStore } from "@/lib/zip"
import { saveFile } from "@/lib/download"
import { TARGET } from "@/store"
import { ItemRow, selectedSpaceIds, useCalendarData } from "./calendar-parts"
import type { Entry, GrowEvent, IsoDate, Mix } from "@/model/types"
import type { MessageKey } from "@/i18n/types"
import { cn } from "@/lib/utils"
import { iconButton, tertiary } from "@/components/hydro/styles"
import { goBack, useRoute } from "@/app/nav"
import { locales } from "@/i18n/core"

type View = "month" | "agenda"
type Filter = "all" | "reminders" | "deadlines" | "journal"

const monthStart = (d: IsoDate) => `${d.slice(0, 7)}-01`
function shiftMonth(first: IsoDate, n: number): IsoDate {
  const [y, m] = first.split("-").map(Number)
  const t = y * 12 + m - 1 + n
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}-01`
}
function monthEnd(first: IsoDate): IsoDate {
  return addDays(shiftMonth(first, 1), -1)
}

type DayData = { items: CalItem[]; entries: Entry[]; events: GrowEvent[]; mixes: Mix[] }

/** Everything shown by the calendar for a date range, already filtered by spaces and type. */
function useRange(from: IsoDate, to: IsoDate, filter: Filter) {
  const data = useCalendarData()
  const { selection, spaces, all } = useGrow()
  const ids = useMemo(() => selectedSpaceIds(selection, spaces), [selection, spaces])
  return useMemo(() => {
    const today = todayIso()
    const inSpace = (s?: string) => !ids || (!!s && ids.has(s))
    let items = filter === "journal" ? [] : forSpaces(calendarItems(data, from, to, today, data.tz), ids)
    if (filter === "reminders") items = items.filter((i) => i.type === "reminder")
    if (filter === "deadlines") items = items.filter((i) => i.type === "deadline")
    const journal = filter === "all" || filter === "journal"
    const entries = journal ? all.entries.filter((e) => e.date >= from && e.date <= to && inSpace(e.spaceId)) : []
    const events = journal ? all.events.filter((e) => e.date >= from && e.date <= to && (!e.spaceId || inSpace(e.spaceId))) : []
    const mixes = journal ? all.mixes.filter((m) => m.date >= from && m.date <= to && (!m.spaceIds?.length || m.spaceIds.some(inSpace))) : []
    const byDay = new Map<IsoDate, DayData>()
    const get = (d: IsoDate) => {
      let x = byDay.get(d)
      if (!x) byDay.set(d, (x = { items: [], entries: [], events: [], mixes: [] }))
      return x
    }
    for (const i of items) get(i.date).items.push(i)
    for (const e of entries) get(e.date).entries.push(e)
    for (const e of events) get(e.date).events.push(e)
    for (const m of mixes) get(m.date).mixes.push(m)
    return { items, entries, events, mixes, byDay }
  }, [data, ids, all, from, to, filter])
}

export function CalendarScreen() {
  const { t } = useSettings()
  const { ready, selection, grow } = useGrow()
  const ed = useEditors()
  const [view, setView] = useState<View>("month")
  const [filter, setFilter] = useState<Filter>("all")
  // Opened on a day from the week strip of Aujourd'hui (#calendar/2026-10-21, lot 10h): its sheet opens at once.
  const routeDay = useRoute().day ?? null
  const [day, setDay] = useState<IsoDate | null>(routeDay)
  const [seen, setSeen] = useState(routeDay)
  if (routeDay !== seen) {
    setSeen(routeDay)
    if (routeDay) setDay(routeDay)
  }
  if (!ready) return <Loading label={t("app.loading")} />
  const eyebrow = selection.kind === "space" ? selection.space.name : selection.kind === "site" ? selection.site.name : (grow?.name ?? "")
  const filters: { v: Filter; k: MessageKey }[] = [
    { v: "all", k: "cal.fAll" },
    { v: "reminders", k: "cal.fReminders" },
    { v: "deadlines", k: "cal.fDeadlines" },
    { v: "journal", k: "cal.fJournal" },
  ]
  return (
    <>
      {/* No tab of its own since lot 10h: back to the screen it was opened from. */}
      <button onClick={goBack} className="-ml-1 mb-1 flex h-11 items-center gap-1 rounded-[10px] pr-3 text-[0.875rem] font-semibold text-fg-2 hover:text-fg" id="cal-back">
        <ChevronLeft className="size-5" /> {t("cal.back")}
      </button>
      <ScreenHero emoji="calendar" eyebrow={eyebrow} title={t("nav.calendar")} />
      <Reveal i={0} className="mb-2.5 flex flex-wrap items-center gap-2">
        <Seg<View> className="min-w-[9.5rem] flex-1" label={t("cal.view")} value={view} onChange={setView} options={[{ value: "month", label: t("cal.month") }, { value: "agenda", label: t("cal.agenda") }]} />
        <Button onClick={() => ed.openReminder({ spaceId: selection.kind === "space" ? selection.space.id : undefined })} className="h-11 shrink-0 px-4 text-[0.875rem]" aria-label={t("cal.add")}>
          <Plus className="size-4.5" strokeWidth={2.6} /> {t("cal.addShort")}
        </Button>
      </Reveal>
      <Reveal i={1} className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4" >
        <div role="group" aria-label={t("cal.filter")} className="flex gap-1.5">
          {filters.map((f) => (
            <TagChip key={f.v} label={t(f.k)} on={filter === f.v} onClick={() => setFilter(f.v)} />
          ))}
        </div>
      </Reveal>
      {view === "month" ? <MonthView key={routeDay ?? ""} filter={filter} onDay={setDay} start={routeDay ?? undefined} /> : <AgendaView filter={filter} onDay={setDay} />}
      <Reveal i={5} className="mt-3">
        <ExportCard />
      </Reveal>
      <SourceNote>{t("cal.sources")}</SourceNote>
      <DaySheet date={day} filter={filter} onClose={() => setDay(null)} />
    </>
  )
}

function MonthView({ filter, onDay, start }: { filter: Filter; onDay: (d: IsoDate) => void; start?: IsoDate }) {
  const { t, settings } = useSettings()
  const today = todayIso()
  const [first, setFirst] = useState(monthStart(start ?? today))
  const gridFrom = addDays(first, -weekdayIndex(first))
  const last = monthEnd(first)
  const gridTo = addDays(last, 6 - weekdayIndex(last))
  const r = useRange(gridFrom, gridTo, filter)
  const days: IsoDate[] = []
  for (let d = gridFrom; d <= gridTo; d = addDays(d, 1)) days.push(d)
  const locale = locales[settings.lang]
  const title = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${first}T12:00:00Z`))
  const wd = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" })
  const inMonth = (d: IsoDate) => d >= first && d <= last
  const stats = {
    entries: r.entries.filter((e) => inMonth(e.date)).length,
    mixes: r.mixes.filter((m) => inMonth(m.date)).length,
    events: r.events.filter((e) => inMonth(e.date)).length,
    due: r.items.filter((i) => inMonth(i.date)).length,
  }
  return (
    <>
      <Reveal i={2}>
        <Card className="gap-2">
          <div className="flex items-center justify-between gap-1">
            <button type="button" onClick={() => setFirst(shiftMonth(first, -1))} className={iconButton} aria-label={t("cal.prev")}>
              <ChevronLeft className="size-5" />
            </button>
            <div className="flex flex-col items-center">
              <b className="text-[1rem] font-semibold capitalize">{title}</b>
              {first !== monthStart(today) && (
                <button type="button" onClick={() => setFirst(monthStart(today))} className={cn(tertiary, "hit min-h-0 text-[0.75rem]")}>
                  {t("cal.backToday")}
                </button>
              )}
            </div>
            <button type="button" onClick={() => setFirst(shiftMonth(first, 1))} className={iconButton} aria-label={t("cal.next")}>
              <ChevronRight className="size-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[0.75rem] font-semibold tracking-[0.6px] text-fg-3 uppercase" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span key={i}>{wd.format(new Date(Date.UTC(2026, 9, 19 + i)))}</span>
            ))}
          </div>
          <div key={first} className="grid grid-cols-7 gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
            {days.map((d) => {
              const x = r.byDay.get(d)
              const open = x?.items.filter((i) => !i.done) ?? []
              const late = open.some((i) => i.overdue)
              const hasRem = open.some((i) => i.type === "reminder")
              const hasDl = open.some((i) => i.type === "deadline")
              const hasJ = !!(x && (x.entries.length || x.events.length || x.mixes.length))
              const isToday = d === today
              // The dots, said aloud (lot 10e): date, then what is due and noted that day.
              const nDl = open.filter((i) => i.type === "deadline").length
              const nRem = open.filter((i) => i.type === "reminder").length
              const said = [
                new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`)),
                nDl ? t("cal.dayDl", { n: nDl }) : "",
                nRem ? t("cal.dayRem", { n: nRem }) : "",
                late ? t("cal.overdue") : "",
                hasJ ? t("cal.dayJournal") : "",
              ]
                .filter(Boolean)
                .join(" · ")
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => onDay(d)}
                  aria-label={said}
                  aria-current={isToday ? "date" : undefined}
                  className={cn(
                    "relative flex min-h-11 min-w-0 flex-col items-center justify-center rounded-[10px] text-[0.875rem] font-semibold tabular transition-colors hover:bg-surface-2",
                    inMonth(d) ? "text-fg" : "text-fg-3",
                  )}
                >
                  {/* Today: underlined in « eau » (lot 10h). */}
                  <span className={cn(isToday && "font-bold underline decoration-water decoration-2 underline-offset-4")}>{Number(d.slice(8))}</span>
                  <span className="mt-0.5 flex h-[5px] gap-[3px]" aria-hidden="true">
                    {hasJ && <span className="size-[5px] rounded-[2px] bg-fg-3" />}
                    {hasDl && <span className={cn("size-[5px] rounded-[2px]", late ? "bg-bad" : "bg-warn")} />}
                    {hasRem && <span className={cn("size-[5px] rounded-[2px]", late ? "bg-bad" : "bg-info")} />}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-0.5 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[0.75rem] text-fg-3">
            <Legend cls="bg-fg-3" label={t("cal.fJournal")} />
            <Legend cls="bg-warn" label={t("cal.fDeadlines")} />
            <Legend cls="bg-info" label={t("cal.fReminders")} />
            <Legend cls="bg-bad" label={t("cal.overdue")} />
          </div>
        </Card>
      </Reveal>
      <Reveal i={3} className="mt-2.5 grid grid-cols-4 gap-2">
        <Stat k={t("cal.statEntries")} v={stats.entries} />
        <Stat k={t("cal.statMixes")} v={stats.mixes} />
        <Stat k={t("cal.statEvents")} v={stats.events} />
        <Stat k={t("cal.statDue")} v={stats.due} />
      </Reveal>
    </>
  )
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("size-[6px] rounded-[2px]", cls)} aria-hidden="true" />
      {label}
    </span>
  )
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="min-w-0 border-l border-line px-1 py-1 text-center first:border-l-0">
      <div className="text-[1.1875rem] leading-tight font-semibold tabular">{v}</div>
      {/* Whole word, cut with a hyphen if needed: never "Événem…" (lot 10e). */}
      <div className="text-[0.75rem] leading-tight [overflow-wrap:anywhere] text-fg-3 hyphens-auto">{k}</div>
    </div>
  )
}

function useDayLabel() {
  const { settings } = useSettings()
  return (d: IsoDate, style: "long" | "short" = "short") =>
    new Intl.DateTimeFormat(locales[settings.lang], style === "long" ? { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" } : { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`))
}

function AgendaView({ filter, onDay }: { filter: Filter; onDay: (d: IsoDate) => void }) {
  const { t } = useSettings()
  const today = todayIso()
  const journal = filter === "journal"
  const r = useRange(journal ? addDays(today, -30) : addDays(today, -7), journal ? today : addDays(today, 30), filter)
  const label = useDayLabel()
  const items = r.items.filter((i) => !i.done)
  const days = journal ? [...r.byDay.keys()].sort().reverse() : [...new Set(items.map((i) => i.date))].sort()
  if (!days.length)
    return (
      <Reveal i={2}>
        <Card className="items-center text-center">
          <Emoji name="alarm" size={64} />
          <b className="mt-1 text-[1rem]">{journal ? t("cal.journalEmpty") : t("cal.empty")}</b>
          {!journal && <p className="max-w-[34ch] text-[0.8125rem] leading-[1.5] text-fg-2">{t("cal.agendaEmpty")} {t("cal.emptyBody")}</p>}
        </Card>
      </Reveal>
    )
  return (
    <div className="flex flex-col gap-2.5">
      {days.map((d, n) => {
        const x = r.byDay.get(d)!
        const its = journal ? [] : items.filter((i) => i.date === d)
        return (
          <Reveal key={d} i={2 + Math.min(n, 6)}>
            <Card className="gap-1">
              <button type="button" onClick={() => onDay(d)} className="flex items-center justify-between text-left">
                <Label className={cn(d < today && "text-warn", d === today && "text-primary")}>{d === today ? `${t("cal.backToday")} · ${label(d)}` : label(d)}</Label>
                <ChevronRight className="size-4 text-fg-3" />
              </button>
              {journal ? (
                <JournalLines x={x} />
              ) : (
                <ul>
                  {its.map((i) => (
                    <ItemRow key={i.id} i={i} showWhen={d < today} />
                  ))}
                </ul>
              )}
            </Card>
          </Reveal>
        )
      })}
    </div>
  )
}

function JournalLines({ x }: { x: DayData }) {
  const { t, num } = useSettings()
  const { spaces } = useGrow()
  const ed = useEditors()
  const sp = (id?: string) => spaces.find((s) => s.id === id)
  const facts = (e: Entry) =>
    [
      e.tempDay != null && `${num(e.tempDay, 1)} °C`,
      e.rh != null && `${num(e.rh)} %HR`,
      e.dryback != null && `${t("today.dryback")} ${num(e.dryback)} %`,
      e.drybackSensor != null && `${t("today.drybackSensor")} ${num(e.drybackSensor)} %`,
      e.ecIn != null && `EC ${num(e.ecIn, 1)}`,
      e.reservoirL != null && `${num(e.reservoirL)} L`,
    ]
      .filter(Boolean)
      .slice(0, 3)
      .join(" · ")
  return (
    <ul className="flex flex-col">
      {x.entries.map((e) => (
        <li key={e.id} className="border-t border-line first:border-t-0">
          <button type="button" onClick={() => ed.openEntry({ date: e.date, spaceId: e.spaceId, plantId: e.plantId })} className="flex w-full items-center gap-2.5 py-2 text-left">
            <LineIcon name="notebook" size={22} />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-[0.84375rem] font-medium">
                <SpaceDot color={sp(e.spaceId)?.color} /> {sp(e.spaceId)?.name ?? "—"}
                {e.plantId ? ` · ${e.plantId}` : ""}
                {e.time ? <span className="font-normal text-fg-3"> · {e.time}</span> : null}
              </span>
              <span className="block truncate text-[0.75rem] text-fg-3">{facts(e) || "—"}</span>
            </span>
          </button>
        </li>
      ))}
      {x.mixes.map((m) => (
        <li key={m.id} className="flex items-center gap-2.5 border-t border-line py-2 first:border-t-0">
          <LineIcon name="testTube" size={22} />
          <span className="text-[0.84375rem] font-medium">
            {t("cal.mixLine", { litres: num(m.volumeL) })}
            {m.ec != null && <span className="font-normal text-fg-3"> · EC {num(m.ec, 1)}</span>}
            {m.ph != null && <span className="font-normal text-fg-3"> · pH {num(m.ph, 1)}</span>}
          </span>
        </li>
      ))}
      {x.events.map((e) => (
        <li key={e.id} className="flex items-center gap-2.5 border-t border-line py-2 first:border-t-0">
          <LineIcon name="book" size={22} />
          <span className="min-w-0 text-[0.84375rem] font-medium">
            {t(`event.${e.type}` as MessageKey)}
            {sp(e.spaceId) && <span className="font-normal text-fg-3"> · {sp(e.spaceId)!.name}</span>}
            {e.note && <span className="block truncate text-[0.75rem] font-normal text-fg-3">{e.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

function DaySheet({ date, filter, onClose }: { date: IsoDate | null; filter: Filter; onClose: () => void }) {
  const { t } = useSettings()
  const ed = useEditors()
  const { selection, spaces } = useGrow()
  const d = date ?? todayIso()
  const r = useRange(d, d, filter)
  const x = r.byDay.get(d) ?? { items: [], entries: [], events: [], mixes: [] }
  const label = useDayLabel()
  const spaceId = selection.kind === "space" ? selection.space.id : undefined
  const empty = !x.items.length && !x.entries.length && !x.events.length && !x.mixes.length
  return (
    <Sheet
      open={!!date}
      onOpenChange={(o) => !o && onClose()}
      title={label(d, "long")}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => ed.openReminder({ date: d, spaceId })} className="h-12 flex-1 text-[0.875rem] font-semibold">
            <Plus className="size-4.5" /> {t("cal.addShort")}
          </Button>
          {spaces.length > 0 && d <= todayIso() && (
            <Button onClick={() => ed.openEntry({ date: d, spaceId: spaceId ?? spaces[0].id })} className="h-12 flex-1 text-[0.875rem]">
              {t("cal.openEntry")}
            </Button>
          )}
        </div>
      }
    >
      {empty && <p className="py-6 text-center text-[0.84375rem] text-fg-3">{t("cal.nothingDay")}</p>}
      {x.items.length > 0 && (
        <section className="mb-3">
          <h3 className="eyebrow mb-1">{t("cal.dayDue")}</h3>
          <ul className="border-y border-line">
            {x.items.map((i) => (
              <ItemRow key={i.id} i={i} showWhen={false} />
            ))}
          </ul>
        </section>
      )}
      {(x.entries.length > 0 || x.mixes.length > 0 || x.events.length > 0) && (
        <section>
          <h3 className="eyebrow mb-1">{t("cal.fJournal")}</h3>
          <div className="border-y border-line">
            <JournalLines x={x} />
          </div>
        </section>
      )}
    </Sheet>
  )
}

function ExportCard() {
  const { t, settings } = useSettings()
  const data = useCalendarData()
  const [busy, setBusy] = useState(false)
  const build = () => {
    const today = todayIso()
    const until = addDays(today, 90)
    const dls = deadlines(data, today)
      .map((d) => ({ deadline: d, st: deadlineState(d, data.reminders) }))
      .filter(({ st }) => !st.done && st.date >= today && st.date <= until)
      .map(({ deadline, st }) => ({ deadline, date: st.date, title: deadlineTitle(settings.lang, deadline) }))
    return buildIcs({ reminders: data.reminders ?? [], deadlines: dls, tz: data.tz, now: new Date(), calName: t("cal.calName"), alarmText: (title) => t("cal.alarm", { title }) })
  }
  const download = async () => {
    setBusy(true)
    try {
      const ics = build()
      const res =
        TARGET === "local"
          ? await saveFile("hydro.ics", new Blob([ics], { type: "text/calendar" }))
          : await saveFile("hydro.zip", new Blob([zipStore([{ name: "hydro.ics", data: ics }]) as BlobPart], { type: "application/zip" }))
      if (res === "saved" || res === "started") toast.success(t("cal.exportDone"))
      else if (res === "declined") toast(t("cal.exportDeclined"))
      else toast.error(t("cal.exportUnavailable"))
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(build())
      toast.success(t("cal.copied"))
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error)?.message ?? "?" }))
    }
  }
  return (
    <Card className="gap-2">
      <Label emoji="calendar">{t("cal.export")}</Label>
      <p className="text-[0.78125rem] leading-[1.45] text-fg-2">
        {t("cal.exportHint")}
        {TARGET !== "local" && ` ${t("cal.exportZip")}`}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={download} disabled={busy} className="h-11 min-w-[8rem] flex-1 px-3 text-[0.875rem]">
          <Download className="size-4.5" /> {TARGET === "local" ? "hydro.ics" : "hydro.zip"}
        </Button>
        <Button variant="outline" size="icon" onClick={copy} aria-label={t("cal.copy")}>
          <Copy className="size-4.5" />
        </Button>
      </div>
    </Card>
  )
}
