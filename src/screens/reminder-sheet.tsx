// Personal reminder (spec §4ter): title, space, date and time in the grow's zone, repeat, end, alarm, note.
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { badNums } from "@/calc/formulas"
import { AreaField, Grid, Group, NumField, Seg, Sheet, TextField } from "@/components/hydro/form"
import { useSettings } from "@/app/settings-context"
import { useGrow, newId } from "@/app/grow-context"
import { SaveBar, useSaver } from "./sheets"
import { addDays, todayIso } from "@/calc/stage"
import { growTimeZone } from "@/calendar/agenda"
import { formatRRule, parseRRule, seriesDates, WEEKDAYS, weekdayIndex, type Rule, type Weekday } from "@/calendar/rrule"
import type { Reminder } from "@/model/grow"
import { joined, segment } from "@/components/hydro/styles"
import { locales } from "@/i18n/core"

/** `repeat`, `note`, `until`: a reminder offered by a tool, already filled (lot 14b: Stack every week). */
export type ReminderInit = { reminder?: Reminder; date?: string; spaceId?: string; title?: string; repeat?: "weekly"; note?: string; until?: string }

type Repeat = "none" | "days" | "weekly" | "monthly"
type End = "never" | "count" | "until"
type Alarm = "none" | "0" | "15" | "60"

type Form = { title: string; spaceId: string; date: string; time: string; repeat: Repeat; every: string; byDay: Weekday[]; end: End; count: string; until: string; alarm: Alarm; note: string }

function toForm(r: Reminder | undefined, init: ReminderInit): Form {
  const date = r?.start.slice(0, 10) || init.date || todayIso()
  const f: Form = {
    title: r?.title ?? init.title ?? "",
    spaceId: r?.spaceId ?? init.spaceId ?? "",
    date,
    time: r?.start.slice(11, 16) || "09:00",
    repeat: init.repeat ?? "none",
    every: init.repeat === "weekly" ? "1" : "3",
    byDay: [WEEKDAYS[weekdayIndex(date)]],
    end: init.until ? "until" : "never",
    count: "5",
    until: init.until ?? addDays(date, 28),
    alarm: r?.alarmMin == null ? (r ? "none" : "0") : (String(r.alarmMin) as Alarm),
    note: r?.note ?? init.note ?? "",
  }
  if (r?.rrule) {
    try {
      const rule = parseRRule(r.rrule)
      f.repeat = rule.freq === "DAILY" ? "days" : rule.freq === "WEEKLY" ? "weekly" : "monthly"
      f.every = String(rule.interval)
      if (rule.byDay?.length) f.byDay = rule.byDay
      if (rule.count) {
        f.end = "count"
        f.count = String(rule.count)
      } else if (rule.until) {
        f.end = "until"
        f.until = rule.until
      }
    } catch {
      /* unsupported rule: shown as "once", saved over only if the user saves */
    }
  }
  return f
}

function toRule(f: Form): string | undefined {
  if (f.repeat === "none") return undefined
  const rule: Rule = {
    freq: f.repeat === "days" ? "DAILY" : f.repeat === "weekly" ? "WEEKLY" : "MONTHLY",
    interval: f.repeat === "days" ? Math.max(1, Math.round(Number(f.every.replace(",", ".")) || 1)) : 1,
  }
  if (f.repeat === "weekly" && f.byDay.length) rule.byDay = f.byDay
  if (f.end === "count") rule.count = Math.max(1, Math.round(Number(f.count) || 1))
  if (f.end === "until" && f.until) rule.until = f.until
  return formatRRule(rule)
}

export function ReminderSheet({ open, onOpenChange, init }: { open: boolean; onOpenChange: (o: boolean) => void; init: ReminderInit }) {
  const { t, settings, dm } = useSettings()
  const { grow, spaces, saveReminder, deleteReminder } = useGrow()
  const editing = init.reminder
  const [f, setF] = useState<Form>(() => toForm(undefined, init))
  const { busy, run } = useSaver(() => onOpenChange(false))
  const tz = growTimeZone({ grow })

  useEffect(() => {
    if (open) setF(toForm(init.reminder, init))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => setF((x) => ({ ...x, [k]: v }))
  const rrule = toRule(f)
  const next = useMemo(() => {
    try {
      return seriesDates(f.date, rrule, addDays(f.date, 400)).slice(0, 4)
    } catch {
      return []
    }
  }, [f.date, rrule])

  // Monday-first narrow day names in the app language.
  const dayNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locales[settings.lang], { weekday: "short", timeZone: "UTC" })
    return WEEKDAYS.map((_, i) => fmt.format(new Date(Date.UTC(2026, 9, 19 + i))).replace(".", ""))
  }, [settings.lang])

  const save = () => {
    if (!f.title.trim()) {
      toast.error(t("remForm.needTitle"))
      return
    }
    if (badNums({ every: f.every, count: f.count }).length) {
      toast.error(t("safe.fixFields"))
      return
    }
    return run(async () => {
      const now = new Date().toISOString()
      const start = `${f.date}T${f.time || "09:00"}`
      const base: Reminder = editing ?? { schemaVersion: 2, id: newId("rm"), kind: "custom", title: "", start, createdAt: now }
      // A changed schedule starts afresh: old done / postponed occurrences no longer match.
      const sameSchedule = editing && editing.start === start && editing.rrule === rrule
      const next: Reminder = {
        ...base,
        kind: "custom",
        title: f.title.trim(),
        spaceId: f.spaceId || undefined,
        start,
        rrule,
        alarmMin: f.alarm === "none" ? undefined : Number(f.alarm),
        note: f.note.trim() || undefined,
        done: sameSchedule ? editing.done : undefined,
        snoozed: sameSchedule ? editing.snoozed : undefined,
      }
      await saveReminder(next)
    })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? t("remForm.editTitle") : t("remForm.newTitle")}
      footer={
        <SaveBar
          busy={busy}
          onSave={() => void save()}
          onDelete={
            editing
              ? async () => {
                  await deleteReminder(editing.id)
                  toast.success(t("remForm.deleted"))
                  onOpenChange(false)
                }
              : undefined
          }
        />
      }
    >
      <div className="flex flex-col gap-2.5">
        <TextField id="rm-title" label={t("remForm.name")} placeholder={t("remForm.namePh")} value={f.title} onChange={set("title")} />
        {spaces.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[0.75rem] font-medium text-fg-2">{t("remForm.space")}</span>
            <Seg<string> label={t("remForm.space")} value={f.spaceId || "_"} onChange={(v) => set("spaceId")(v === "_" ? "" : v)} options={[{ value: "_", label: t("remForm.spaceNone") }, ...spaces.map((s) => ({ value: s.id, label: s.name }))]} />
          </div>
        )}
        <Grid>
          <TextField id="rm-date" type="date" label={t("remForm.date")} value={f.date} onChange={(v) => set("date")(v || todayIso())} />
          <TextField id="rm-time" type="time" label={t("remForm.time")} hint={t("remForm.tzHint", { city: tz.split("/").pop()!.replace(/_/g, " ") })} value={f.time} onChange={(v) => set("time")(v || "09:00")} />
        </Grid>
      </div>

      <Group title={t("remForm.repeat")}>
        <Seg<Repeat>
          label={t("remForm.repeat")}
          value={f.repeat}
          onChange={set("repeat")}
          options={[
            { value: "none", label: t("remForm.rNone") },
            { value: "days", label: t("remForm.rDays") },
            { value: "weekly", label: t("remForm.rWeekly") },
            { value: "monthly", label: t("remForm.rMonthly") },
          ]}
        />
        {f.repeat === "days" && <NumField id="rm-every" integer className="mt-2.5" label={t("remForm.every")} value={f.every} onChange={set("every")} />}
        {f.repeat === "weekly" && (
          <div className="mt-2.5" role="group" aria-label={t("remForm.weekdays")}>
            <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("remForm.weekdays")}</div>
            <div className={joined(7)}>
              {WEEKDAYS.map((d, i) => {
                const on = f.byDay.includes(d)
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set("byDay")(on ? f.byDay.filter((x) => x !== d) : WEEKDAYS.filter((x) => x === d || f.byDay.includes(x)))}
                    className={segment(on, "px-0 text-[0.75rem] capitalize")}
                  >
                    {dayNames[i]}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {f.repeat !== "none" && (
          <div className="mt-2.5 flex flex-col gap-2.5">
            <span className="-mb-1.5 text-[0.75rem] font-medium text-fg-2">{t("remForm.end")}</span>
            <Seg<End> label={t("remForm.end")} value={f.end} onChange={set("end")} options={[{ value: "never", label: t("remForm.eNever") }, { value: "count", label: t("remForm.eCount") }, { value: "until", label: t("remForm.eUntil") }]} />
            {f.end === "count" && <NumField id="rm-count" integer label={t("remForm.count")} value={f.count} onChange={set("count")} />}
            {f.end === "until" && <TextField id="rm-until" type="date" label={t("remForm.until")} value={f.until} onChange={set("until")} />}
          </div>
        )}
        {next.length > 0 && <p className="mt-2 text-[0.75rem] text-fg-3">{t("remForm.next", { dates: next.map((d) => dm(d)).join(", ") })}</p>}
      </Group>

      <Group title={t("remForm.alarm")}>
        <Seg<Alarm>
          label={t("remForm.alarm")}
          value={f.alarm}
          onChange={set("alarm")}
          options={[
            { value: "none", label: t("remForm.aNone") },
            { value: "0", label: t("remForm.a0") },
            { value: "15", label: t("remForm.a15") },
            { value: "60", label: t("remForm.a60") },
          ]}
        />
      </Group>
      {/* One "Note" label, not a title and a label (lot 10e). */}
      <div className="mt-4">
        <AreaField id="rm-note" label={t("remForm.note")} value={f.note} onChange={set("note")} />
      </div>
    </Sheet>
  )
}
