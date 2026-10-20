// Aujourd'hui « calme » (lot 10k1, planche validée par Thomas le 19/10): « Bonjour Thomas. », one framed block
// « Maintenant » with the only filled button of the screen, À faire (3 at most), then one line per space. Each number is
// shown once; the readings, the reservoir and the program live in the page of the space.
import { useEffect, useMemo, useState } from "react"
import { ChevronRight, HardDriveDownload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Emoji } from "@/components/hydro/emoji"
import { Reveal } from "@/components/hydro/primitives"
import { SpaceTile } from "@/components/hydro/space-pill"
import { CheckBox } from "@/components/hydro/form"
import { NumText } from "@/components/hydro/value"
import { tertiary } from "@/components/hydro/styles"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { navigate } from "@/app/nav"
import { stageEmoji, stageLine } from "@/app/labels"
import { addDays, daysBetween, stageOn, todayIso } from "@/calc/stage"
import { dryingCycle, spaceContext } from "@/calc/digest"
import { chooseNow, lineState, type LineState, type Now } from "@/calc/now"
import type { Advice } from "@/calc/advice"
import { forSpaces, upcoming, type CalItem } from "@/calendar/agenda"
import { itemTitle } from "@/calendar/labels"
import { groupBySite } from "@/model/grow-ops"
import type { Space } from "@/model/grow"
import type { Entry } from "@/model/types"
import type { EmojiName } from "@/assets/emoji"
import type { MessageKey } from "@/i18n/types"
import { cn } from "@/lib/utils"
import { itemEmoji, useCalendarData, useItemActions, useWhen } from "./calendar-parts"
import { useBackupDue } from "./backup-reminder"
import { ownerName, useDigestData } from "./today-spaces"
import { useStartChecklist } from "./tools/start"
import { startHidden, startProgress } from "@/calc/getting-started"

/** Minutes since midnight, refreshed every 30 s (the day's entry is due from the lights-on time). */
export function useNowMinutes() {
  const now = () => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  }
  const [m, setM] = useState(now)
  useEffect(() => {
    const id = setInterval(() => setM(now()), 30_000)
    return () => clearInterval(id)
  }, [])
  return m
}

/** The title and the correction of an advice, with its numbers formatted (shared with the page of a space). */
export function useAdviceText() {
  const { t, num, range } = useSettings()
  return (a: Advice) => ({
    title: t(`${a.key}.title` as MessageKey),
    body: t(a.bodyKey as MessageKey, {
      value: num(a.vars.value, a.metric.startsWith("ph") || a.metric.startsWith("ec") || a.metric === "dli" ? 1 : a.metric === "vpd" ? 2 : 0),
      aim: num(a.vars.aim, 1),
      range: t("advice.range", { range: range(a.vars.lo, a.vars.hi, a.metric.startsWith("ph") || a.metric.startsWith("ec") || a.metric === "vpd" ? 1 : 0) }),
    }),
  })
}

/** « aujourd'hui à 07:24 », « hier », « le 05/02 ». */
function useEntryWhen() {
  const { t, dm } = useSettings()
  return (e: Pick<Entry, "date" | "time">, today: string) => {
    const n = daysBetween(e.date, today)
    if (n === 0) return e.time ? t("calm.todayAt", { time: e.time }) : t("calm.today")
    if (n === 1) return e.time ? t("calm.yesterdayAt", { time: e.time }) : t("calm.yesterday")
    return t("calm.onDay", { date: dm(e.date) })
  }
}

/** Everything the screen needs about one space, computed once. */
type Row = { space: Space; emoji: EmojiName; sub: string; state: LineState; running: boolean; ctx: ReturnType<typeof spaceContext> }

function useRows(shown: Space[]): Row[] {
  const { t } = useSettings()
  const data = useDigestData()
  const today = todayIso()
  return useMemo(
    () =>
      shown.map((space) => {
        const ctx = spaceContext(space, data, today)
        const st = ctx.cycle ? stageOn(ctx.cycle, today) : null
        const running = !!st && st.key !== "harvested" && st.key !== "notStarted"
        const drying = running ? undefined : dryingCycle(space, data.cycles, today)
        const emoji: EmojiName = st && st.key !== "harvested" ? stageEmoji(st.key) : drying || st ? "scissors" : "pottedPlant"
        const day = drying?.harvestDate ? daysBetween(drying.harvestDate, today) + 1 : 0
        const sub = running
          ? stageLine(t, st!)
          : drying
            ? t(drying.plannedDryingDays ? "calm.drying" : "calm.dryingNoPlan", { cycle: drying.name, day, total: drying.plannedDryingDays ?? 0 })
            : st && ctx.cycle
              ? st.key === "notStarted"
                ? ctx.cycle.name
                : `${ctx.cycle.name} · ${t("stage.harvested")}`
              : t("calm.emptyStage")
        const state = lineState(
          { active: running || !!drying, drying: !!drying, last: ctx.last, waterMode: ctx.cycle?.waterMode, autonomy: ctx.autonomy, stage: st?.key },
          today,
        )
        return { space, emoji, sub, state, running, ctx }
      }),
    [shown, data, today, t],
  )
}

/** « Tous » (or one room): the calm Aujourd'hui. */
export function CalmToday() {
  const { t } = useSettings()
  const { grow, spaces, selection } = useGrow()
  const cal = useCalendarData()
  const nowMin = useNowMinutes()
  const shown = useMemo(() => (selection.kind === "site" ? spaces.filter((s) => s.siteId === selection.site.id) : spaces), [selection, spaces])
  const rows = useRows(shown)
  const today = todayIso()
  // Overdue and the next 60 days: À faire shows the next 7, « Ensuite » can be a later deadline (12/12, récolte).
  const ids = selection.kind === "site" ? new Set(shown.map((s) => s.id)) : null
  const idsKey = ids ? [...ids].sort().join(",") : "*"
  const items = useMemo(() => forSpaces(upcoming(cal, today, 60, 7, cal.tz), idsKey === "*" ? null : new Set(idsKey.split(","))), [cal, today, idsKey])
  const { now, next } = useMemo(
    () =>
      chooseNow(
        rows.map((r) => ({
          spaceId: r.space.id,
          active: r.running,
          logs: r.space.modules.irrigation || r.space.modules.climate,
          lightsOn: r.ctx.cycle?.lightsOn,
          waterMode: r.ctx.cycle?.waterMode,
          // Alerts come from a running cycle only (a drying room has no Athena target).
          last: r.running ? r.ctx.last : undefined,
        })),
        items,
        today,
        nowMin,
      ),
    [rows, items, today, nowMin],
  )
  const name = ownerName(grow)
  // What « Maintenant » shows is not repeated in À faire.
  const todo = items.filter((i) => i.date <= addDays(today, 7) && i.id !== next?.id && !(now.kind === "deadline" && now.item.id === i.id))
  return (
    <div className="flex flex-col gap-9 pt-1">
      <Reveal i={0}>
        <h1 id="hello" className="display mb-4 text-[1.875rem] leading-tight">
          {name ? t("row.hello", { name }) : t("row.helloNoName")}
        </h1>
        <NowBlock now={now} next={next} rows={rows} />
      </Reveal>
      <Reveal i={1}>
        <Todo items={todo} showSpace={shown.length > 1} spaceId={shown.length === 1 ? shown[0].id : undefined} />
      </Reveal>
      <Reveal i={2}>
        <Spaces rows={rows} />
      </Reveal>
    </div>
  )
}

/** « Maintenant »: the only framed block and the only filled button of the screen. */
function NowBlock({ now, next, rows }: { now: Now; next?: CalItem; rows: Row[] }) {
  const { t, dm, settings, setSpace } = useSettings()
  const ed = useEditors()
  const act = useItemActions()
  const when = useWhen()
  const entryWhen = useEntryWhen()
  const advice = useAdviceText()
  const today = todayIso()
  const spaceName = (id?: string) => rows.find((r) => r.space.id === id)?.space.name
  let emoji: EmojiName = "pottedPlant"
  let title = t("calm.okTitle")
  let context = t("calm.okBody")
  let cta: { label: string; run: () => void } | null = null
  if (now.kind === "alert") {
    const a = advice(now.advice)
    emoji = "warning"
    title = a.title
    context = [spaceName(now.spaceId), a.body].filter(Boolean).join(" · ")
    cta = { label: t("calm.alertCta", { space: spaceName(now.spaceId) ?? "" }), run: () => setSpace(now.spaceId) }
  } else if (now.kind === "entry") {
    emoji = "notebook"
    title = t("calm.entryTitle")
    context = [spaceName(now.spaceId), now.last ? t("calm.lastAt", { when: entryWhen(now.last, today) }) : t("calm.noEntry")].filter(Boolean).join(" · ")
    cta = { label: t("calm.entryCta"), run: () => ed.openEntry({ date: today, spaceId: now.spaceId }) }
  } else if (now.kind === "deadline") {
    emoji = itemEmoji(now.item)
    title = itemTitle(settings.lang, now.item)
    context = [spaceName(now.spaceId), now.item.date < today ? t("calm.deadlineLate", { date: dm(now.item.date) }) : t("calm.deadlineDue")].filter(Boolean).join(" · ")
    const item = now.item
    cta = { label: t("calm.deadlineCta"), run: () => act.done(item) }
  }
  return (
    <section id="now" data-kind={now.kind} data-status={now.kind === "alert" ? now.advice.status : undefined} className="flex flex-col gap-3.5 rounded-[18px] border border-line bg-surface p-5">
      <span className="font-num text-[0.75rem] font-semibold tracking-[0.12em] text-water uppercase">{t("calm.now")}</span>
      <div className="flex items-start gap-3.5">
        {/* Very narrow screens (zoom 200 %): the drawing steps aside, the words keep the room. */}
        <Emoji name={emoji} size={44} className="max-[260px]:hidden" />
        <div className="min-w-0 flex-1">
          <h2 className="display text-[1.375rem] leading-[1.2] text-balance [overflow-wrap:anywhere]">{title}</h2>
          <p className="mt-1 text-[0.875rem] leading-[1.45] text-fg-2">
            <NumText>{context}</NumText>
          </p>
        </div>
      </div>
      {cta && (
        <Button onClick={cta.run} className="h-12 w-full">
          {cta.label}
        </Button>
      )}
      {next && (
        <p className="text-[0.84375rem] text-fg-2" id="now-next">
          {t("calm.next")} <b className="font-semibold text-fg">{itemTitle(settings.lang, next)}</b> · <NumText>{when(next, today)}</NumText>
        </p>
      )}
    </section>
  )
}

/** À faire: three things at most, then « + N autres · Tout le calendrier → ». No frame, no line between rows. */
/** À faire: 3 lines at most then « Tout le calendrier → ». `here`: the page of a space (lot 10l1, « À faire ici », no backup line). */
export function Todo({ items, showSpace, spaceId, here }: { items: CalItem[]; showSpace: boolean; spaceId?: string; here?: boolean }) {
  const { t, settings } = useSettings()
  const { spaces } = useGrow()
  const ed = useEditors()
  const act = useItemActions()
  const when = useWhen()
  const backup = useBackupDue()
  const start = useStartChecklist()
  // The backup is the guide's step while the banner shows it; else a normal line here once due (local version).
  const guideNext = startHidden() ? undefined : startProgress(start).next
  const backupRow = !here && backup.due && guideNext?.id !== "backup"
  const max = backupRow ? 2 : 3
  const list = items.slice(0, max)
  const more = items.length - list.length
  return (
    <section id={here ? "space-todo" : "upcoming"} aria-labelledby={here ? "space-todo-title" : "upcoming-title"} className="flex flex-col">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <h2 id={here ? "space-todo-title" : "upcoming-title"} className="display text-[1.1875rem] leading-tight">
          {t(here ? "sp.todo" : "today.upcoming")}
        </h2>
        <button type="button" onClick={() => ed.openReminder({ spaceId })} className="-my-3 min-h-11 shrink-0 text-[0.8125rem] font-semibold text-fg-2 hover:text-fg">
          + {t("cal.addShort")}
        </button>
      </div>
      {list.length === 0 && !backupRow ? (
        <p className="text-[0.875rem] text-fg-3">{t("today.noReminders")}</p>
      ) : (
        <ul>
          {backupRow && (
            <li id="backup-reminder" className="flex min-h-[50px] items-center gap-3.5">
              <HardDriveDownload aria-hidden="true" className="size-[22px] shrink-0 text-warn" strokeWidth={1.75} />
              <a href="#tools/data" className="min-w-0 flex-1 truncate py-1 text-[0.9375rem]">
                {t("calm.backup")}
              </a>
              <span className="shrink-0 text-[0.78125rem] text-warn">
                <NumText>{backup.days == null ? t("calm.backupNever") : t("calm.backupDays", { n: backup.days })}</NumText>
              </span>
            </li>
          )}
          {list.map((i) => {
            const space = showSpace ? spaces.find((s) => s.id === i.spaceId) : undefined
            // On the page of a space its name is the page's title: never repeated in a line.
            const own = here ? spaces.find((s) => s.id === spaceId) : undefined
            const late = i.overdue || (i.type === "reminder" && i.late)
            const open = i.type === "reminder" ? () => ed.openReminder({ reminder: i.occ.reminder }) : undefined
            // « Refaire le bidon (≈ 105 L) · Floraison »: the space is said once, in the line under it.
            const title = itemTitle(settings.lang, i)
            const named = space ?? own
            const shortTitle = named && title.endsWith(` · ${named.name}`) ? title.slice(0, -` · ${named.name}`.length) : title
            return (
              <li key={i.id} className="flex min-h-[50px] items-center gap-3.5" data-item={i.id}>
                <CheckBox instant checked={false} label={t("cal.done")} onChange={(on) => act.done(i, on)} />
                <button type="button" onClick={open} disabled={!open} className="flex min-w-0 flex-1 flex-col py-1 text-left disabled:cursor-default">
                  <span className="block truncate text-[0.9375rem]">{shortTitle}</span>
                  {space && <span className="block truncate text-[0.75rem] text-fg-3">{space.name}</span>}
                </button>
                <span className={cn("max-w-[40%] shrink-0 text-right font-num text-[0.78125rem] leading-tight", late ? "text-warn" : "text-fg-3")}>{when(i)}</span>
              </li>
            )
          })}
        </ul>
      )}
      <p className="pt-1.5 text-[0.84375rem] text-fg-2">
        {more > 0 && <span>{`${t("calm.more", { n: more })} · `}</span>}
        <button type="button" onClick={() => navigate({ tab: "calendar" }, { push: true })} className={cn(tertiary, "text-[0.84375rem]")} id="all-calendar">
          {t("week.allCalendar")}
        </button>
      </p>
    </section>
  )
}

/** Espaces: one line per space (64 px): its tinted square, its name and stage, one state, a chevron. */
function Spaces({ rows }: { rows: Row[] }) {
  const { t, setSpace } = useSettings()
  const { sites } = useGrow()
  const ed = useEditors()
  const groups = groupBySite(
    rows.map((r) => r.space),
    sites,
  )
  return (
    <section id="spaces" aria-labelledby="spaces-title" className="flex flex-col">
      <h2 id="spaces-title" className="display mb-1 text-[1.1875rem] leading-tight">
        {t("today.spaces")}
      </h2>
      {groups.map((g) => (
        <div key={g.site?.id ?? "none"}>
          {g.site && sites.length > 0 && <div className="eyebrow mt-3 mb-1">{g.site.name}</div>}
          {g.spaces.map((s) => {
            const r = rows.find((x) => x.space.id === s.id)!
            return (
              <button key={s.id} type="button" onClick={() => setSpace(s.id)} data-space-line={s.id} data-state={r.state.kind} className="flex min-h-16 w-full items-center gap-3.5 text-left">
                <SpaceTile color={s.color} emoji={r.emoji} size={40} />
                {/* The state goes under the name when the line is too narrow (zoom 200 %). */}
                <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-2 gap-y-0.5 py-1">
                  <span className="min-w-[7rem] flex-1">
                    <span className="block truncate text-[0.96875rem] font-semibold">{s.name}</span>
                    <span className="block truncate text-[0.8125rem] text-fg-3">
                      <NumText quiet>{r.sub}</NumText>
                    </span>
                  </span>
                  <StateText s={r.state} />
                </span>
                <ChevronRight aria-hidden="true" className="-ml-1 size-[18px] shrink-0 text-fg-3" />
              </button>
            )
          })}
        </div>
      ))}
      {!rows.length && (
        <Card framed className="items-center gap-1 text-center">
          <p className="text-[0.8125rem] text-fg-2">{t("space.empty")}</p>
          <button onClick={() => ed.openCycle({ cycleId: "new" })} className={tertiary}>
            {t("today.emptyCta")}
          </button>
        </Card>
      )}
    </section>
  )
}

/** The one state of a space: a coloured dot and a few words. */
function StateText({ s }: { s: LineState }) {
  const { t, num } = useSettings()
  const text =
    s.kind === "empty"
      ? t("calm.empty")
      : s.kind === "notStarted"
        ? t("calm.notStarted")
        : s.kind === "noEntry"
          ? t("calm.noEntryLine")
          : s.kind === "off"
            ? t(s.tone === "bad" ? "calm.bad" : "calm.warn")
            : s.kind === "late"
              ? t("calm.late", { n: s.days })
              : s.kind === "tank"
                ? t(s.old ? "calm.tankOld" : "calm.tank", { n: num(s.days) })
                : s.kind === "climate"
                  ? [s.temp != null ? `${num(s.temp)}°` : null, s.rh != null ? `${num(s.rh)} %` : null].filter(Boolean).join(" · ") || t("calm.ok")
                  : t("calm.ok")
  const dot = s.tone === "ok" ? "bg-leaf" : s.tone === "warn" ? "bg-warn" : s.tone === "bad" ? "bg-bad" : null
  return (
    <span className={cn("flex max-w-full min-w-0 items-center gap-1.5 text-right text-[0.8125rem] whitespace-nowrap", s.tone === "none" ? "text-fg-3" : "text-fg-2")}>
      {dot && <span aria-hidden="true" className={cn("size-[7px] shrink-0 rounded-full", dot)} />}
      <span className="truncate">
        <NumText>{text}</NumText>
      </span>
    </span>
  )
}
