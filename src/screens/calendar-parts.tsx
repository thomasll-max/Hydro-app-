// Calendar pieces shared by the Calendar tab, Today's "À venir" and the day sheet:
// data hook, "Fait" / "Reporter" actions, one item row, the upcoming card.
import { useMemo } from "react"
import { Clock3 } from "lucide-react"
import { toast } from "sonner"
import { Label } from "@/components/hydro/primitives"
import { SpaceDot } from "@/components/hydro/space-pill"
import { CheckBox } from "@/components/hydro/form"
import { iconButton, tertiary } from "@/components/hydro/styles"
import { useSettings } from "@/app/settings-context"
import { useGrow, type Selection } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { addDays, daysBetween, todayIso } from "@/calc/stage"
import { autoState, forSpaces, growTimeZone, upcoming, type CalItem } from "@/calendar/agenda"
import type { CalendarData, DeadlineKind } from "@/calendar/deadlines"
import { autoStateId } from "@/calendar/deadlines"
import { itemTitle } from "@/calendar/labels"
import { snoozeOne, toggleDone } from "@/calendar/rrule"
import type { EmojiName } from "@/assets/emoji"
import type { Space } from "@/model/grow"
import { cn } from "@/lib/utils"
import { navigate } from "@/app/nav"

export function useCalendarData(): CalendarData & { tz: string } {
  const { grow, spaces, sites, cycles, all, equipment, assignments, reminders, customProducts, concentrateStocks, sprays } = useGrow()
  return useMemo(() => {
    const d: CalendarData = { grow, spaces, sites, cycles, entries: all.entries, mixes: all.mixes, events: all.events, equipment, assignments, reminders, customProducts, concentrateStocks, sprays }
    return { ...d, tz: growTimeZone(d) }
  }, [grow, spaces, sites, cycles, all.entries, all.mixes, all.events, equipment, assignments, reminders, customProducts, concentrateStocks, sprays])
}

/** Spaces covered by the top selector (null = all). */
export function selectedSpaceIds(selection: Selection, spaces: Space[]): Set<string> | null {
  if (selection.kind === "space") return new Set([selection.space.id])
  if (selection.kind === "site") return new Set(spaces.filter((s) => s.siteId === selection.site.id).map((s) => s.id))
  return null
}

export function useItemActions() {
  const { t } = useSettings()
  const { reminders, saveReminder } = useGrow()
  const fail = (e: unknown) => toast.error(t("common.saveError", { reason: (e as Error)?.message ?? "?" }))
  const stateOf = (key: string) => reminders.find((r) => r.id === autoStateId(key)) ?? autoState(key, new Date().toISOString())
  return {
    async done(i: CalItem, on = true) {
      try {
        if (i.type === "reminder") await saveReminder(toggleDone(i.occ.reminder, i.occ.key, on))
        else {
          const st = stateOf(i.deadline.key)
          await saveReminder({ ...st, done: on ? [i.deadline.date] : [] })
        }
        if (on) toast.success(t("cal.doneToast"))
      } catch (e) {
        fail(e)
      }
    },
    async snooze(i: CalItem) {
      try {
        if (i.type === "reminder") await saveReminder(snoozeOne(i.occ.reminder, i.occ))
        else {
          const st = stateOf(i.deadline.key)
          await saveReminder({ ...st, snoozed: { ...(st.snoozed ?? {}), [i.deadline.date]: `${addDays(i.date < todayIso() ? todayIso() : i.date, 1)}T09:00` } })
        }
        toast.success(t("cal.snoozeToast"))
      } catch (e) {
        fail(e)
      }
    },
  }
}

const DEADLINE_EMOJI: Record<DeadlineKind, EmojiName> = {
  flip: "moon",
  fade: "sun",
  flush: "droplet",
  harvest: "scissors",
  tank: "testTube",
  propagationEnd: "sprout",
  greatWhite: "pottedPlant",
  dryingEnd: "leaf",
  flowCheck: "sweat",
  concentrateLow: "bucket",
  ipw: "sweat",
}

export function itemEmoji(i: CalItem): EmojiName {
  return i.type === "reminder" ? "alarm" : DEADLINE_EMOJI[i.deadline.kind]
}

/** "aujourd'hui", "demain", "dans 3 j", "en retard". */
export function useWhen() {
  const { t, dm } = useSettings()
  return (i: CalItem, today = todayIso()) => {
    const n = daysBetween(today, i.date)
    const day = i.overdue ? `${dm(i.date)} · ${t("cal.overdue")}` : n === 0 ? t("today.todayShort") : n === 1 ? t("cal.tomorrow") : n > 1 && n < 14 ? t("today.inDays", { n }) : dm(i.date)
    const time = i.time && i.type === "reminder" && i.late ? `${i.time} · ${t("cal.timePassed")}` : i.time
    return time ? `${day} · ${time}` : day
  }
}

/** One thing to do (lot 10h): a square check box, the title, its space and source, when it is due in mono on the right. */
export function ItemRow({ i, showWhen = true, onOpen }: { i: CalItem; showWhen?: boolean; onOpen?: () => void }) {
  const { t, settings } = useSettings()
  const { spaces } = useGrow()
  const ed = useEditors()
  const act = useItemActions()
  const when = useWhen()
  const space = spaces.find((s) => s.id === i.spaceId)
  const open = onOpen ?? (i.type === "reminder" ? () => ed.openReminder({ reminder: i.occ.reminder }) : undefined)
  const late = i.overdue || (i.type === "reminder" && i.late)
  const sub = [space?.name, i.type === "deadline" ? t(`cal.src.${i.deadline.source}`) : null, i.snoozed ? t("cal.snoozed") : null].filter(Boolean).join(" · ")
  const right = showWhen ? when(i) : i.time
  return (
    <li className="flex min-h-12 items-center gap-3 border-t border-line py-1.5 first:border-t-0">
      {/* « Fait » is a square check box (lot 10h): ticking it again undoes it. */}
      <CheckBox instant checked={!!i.done} label={t("cal.done")} onChange={(on) => act.done(i, on)} />
      <button type="button" onClick={open} disabled={!open} className={cn("flex min-w-0 flex-1 flex-col py-1 text-left disabled:cursor-default", i.done && "opacity-60")}>
        <span className={cn("block truncate text-[0.9375rem]", i.done && "text-fg-3 line-through decoration-fg-3")}>{itemTitle(settings.lang, i)}</span>
        {sub && (
          <span className="flex items-center gap-1.5 truncate text-[0.75rem] text-fg-3">
            {space && <SpaceDot color={space.color} />}
            {sub}
          </span>
        )}
      </button>
      {right && <span className={cn("max-w-[38%] shrink-0 text-right font-mono text-[0.75rem] leading-tight", late && !i.done ? "text-warn" : "text-fg-3")}>{right}</span>}
      {!i.done && (
        <button type="button" onClick={() => act.snooze(i)} aria-label={t("cal.snooze")} title={t("cal.snooze")} className={cn(iconButton, "-mr-2")}>
          <Clock3 className="size-4" />
        </button>
      )}
    </li>
  )
}

/** Today's « À faire »: overdue + next 7 days, for the shown spaces. A section with its drawing, no frame (lot 10j). */
export function UpcomingCard({ spaceIds, max = 4 }: { spaceIds: Set<string> | null; max?: number }) {
  const { t } = useSettings()
  const data = useCalendarData()
  const ed = useEditors()
  // Keyed by the ids, not the Set: callers build a new Set at each render, the deadlines are not recomputed for it (lot 10d).
  const idsKey = spaceIds ? [...spaceIds].sort().join(",") : "*"
  const items = useMemo(
    () => forSpaces(upcoming(data, todayIso(), 7, 7, data.tz), idsKey === "*" ? null : new Set(idsKey.split(","))),
    [data, idsKey],
  )
  return (
    <section className="flex flex-col" id="upcoming">
      <div className="flex items-center justify-between gap-2">
        <Label emoji="bell" mark>
          {t("today.upcoming")}
        </Label>
        <button
          type="button"
          onClick={() => ed.openReminder({ spaceId: spaceIds?.size === 1 ? [...spaceIds][0] : undefined })}
          className={cn("-my-2", tertiary)}
        >
          + {t("cal.addShort")}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-[0.8125rem] text-fg-3">{t("today.noReminders")}</p>
      ) : (
        <ul className="mt-1.5 border-b border-line">
          {items.slice(0, max).map((i) => (
            <ItemRow key={i.id} i={i} />
          ))}
        </ul>
      )}
      {/* The Calendar has no tab since lot 10h: it opens from here, over Aujourd'hui. */}
      <button type="button" onClick={() => navigate({ tab: "calendar" }, { push: true })} className={cn("mt-2 self-start", tertiary)} id="all-calendar">
        {t("week.allCalendar")}
      </button>
    </section>
  )
}
