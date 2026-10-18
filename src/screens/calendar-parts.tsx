// Calendar pieces shared by the Calendar tab, Today's "À venir" and the day sheet:
// data hook, "Fait" / "Reporter" actions, one item row, the upcoming card.
import { useMemo } from "react"
import { Check, Clock3, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Emoji } from "@/components/hydro/emoji"
import { Label } from "@/components/hydro/primitives"
import { SpaceDot } from "@/components/hydro/space-pill"
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

export function useCalendarData(): CalendarData & { tz: string } {
  const { grow, spaces, sites, cycles, all, equipment, assignments, reminders, customProducts, concentrateStocks, sprays } = useGrow()
  return useMemo(() => {
    const d: CalendarData = { grow, spaces, sites, cycles, entries: all.entries, mixes: all.mixes, equipment, assignments, reminders, customProducts, concentrateStocks, sprays }
    return { ...d, tz: growTimeZone(d) }
  }, [grow, spaces, sites, cycles, all.entries, all.mixes, equipment, assignments, reminders, customProducts, concentrateStocks, sprays])
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
    return i.time ? `${day} · ${i.time}` : day
  }
}

export function ItemRow({ i, showWhen = true, onOpen }: { i: CalItem; showWhen?: boolean; onOpen?: () => void }) {
  const { t, settings } = useSettings()
  const { spaces } = useGrow()
  const ed = useEditors()
  const act = useItemActions()
  const when = useWhen()
  const space = spaces.find((s) => s.id === i.spaceId)
  const open = onOpen ?? (i.type === "reminder" ? () => ed.openReminder({ reminder: i.occ.reminder }) : undefined)
  const sub = [showWhen ? when(i) : i.time, space?.name, i.type === "deadline" ? t(`cal.src.${i.deadline.source}`) : null, i.snoozed ? t("cal.snoozed") : null].filter(Boolean).join(" · ")
  return (
    <li className={cn("flex items-center gap-2.5 border-t border-line py-2 first:border-t-0", i.done && "opacity-55")}>
      <button type="button" onClick={open} disabled={!open} className="flex min-w-0 flex-1 items-center gap-2.5 py-1 text-left disabled:cursor-default">
        <Emoji name={itemEmoji(i)} size={28} />
        <span className="min-w-0">
          <span className={cn("block truncate text-[13.5px] font-medium", i.done && "line-through decoration-fg-3")}>{itemTitle(settings.lang, i)}</span>
          <span className={cn("flex items-center gap-1.5 truncate text-[11.5px]", i.overdue ? "font-semibold text-warn" : "text-fg-3")}>
            {space && <SpaceDot color={space.color} />}
            {sub}
          </span>
        </span>
      </button>
      {i.done ? (
        <IconBtn label={t("cal.undo")} onClick={() => act.done(i, false)}>
          <RotateCcw className="size-4" />
        </IconBtn>
      ) : (
        <>
          <IconBtn label={t("cal.snooze")} onClick={() => act.snooze(i)}>
            <Clock3 className="size-4" />
          </IconBtn>
          <IconBtn label={t("cal.done")} primary onClick={() => act.done(i)}>
            <Check className="size-4.5" strokeWidth={2.6} />
          </IconBtn>
        </>
      )}
    </li>
  )
}

function IconBtn({ label, onClick, primary, children }: { label: string; onClick: () => void; primary?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full border transition-transform active:scale-95",
        primary ? "border-primary/35 bg-primary/12 text-primary" : "border-line bg-surface-2 text-fg-2",
      )}
    >
      {children}
    </button>
  )
}

/** Today's "À venir": overdue + next 7 days, for the shown spaces. */
export function UpcomingCard({ spaceIds, max = 4 }: { spaceIds: Set<string> | null; max?: number }) {
  const { t } = useSettings()
  const data = useCalendarData()
  const ed = useEditors()
  const items = useMemo(() => forSpaces(upcoming(data, todayIso(), 7, 7, data.tz), spaceIds), [data, spaceIds])
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <Label emoji="bell">{t("today.upcoming")}</Label>
        <button
          type="button"
          onClick={() => ed.openReminder({ spaceId: spaceIds?.size === 1 ? [...spaceIds][0] : undefined })}
          className="-my-2 h-10 rounded-full px-2 text-[12.5px] font-semibold text-primary"
        >
          + {t("cal.addShort")}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-[13px] text-fg-3">{t("today.noReminders")}</p>
      ) : (
        <ul className="mt-1">
          {items.slice(0, max).map((i) => (
            <ItemRow key={i.id} i={i} />
          ))}
        </ul>
      )}
    </Card>
  )
}
