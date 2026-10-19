// Week strip at the top of Aujourd'hui (lot 10h): the Calendar stays one tap away now that it has no tab.
import { useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { navigate } from "@/app/nav"
import { addDays, todayIso } from "@/calc/stage"
import { calendarItems, forSpaces } from "@/calendar/agenda"
import { weekdayIndex } from "@/calendar/rrule"
import type { IsoDate } from "@/model/types"
import { cn } from "@/lib/utils"
import { selectedSpaceIds, useCalendarData } from "./calendar-parts"
import { locales } from "@/i18n/core"

/**
 * Monday → Sunday: the day in Figtree, its number in mono, today underlined in « eau ». Under each day one small marker
 * per kind of thing due (reminder, deadline, tank), 3 at most. A day opens the Calendar on it; arrows or a swipe move
 * a week. Under 64 px high, 44 px targets, each day named with its date and how many things are due.
 */
export function WeekStrip() {
  const { t, settings } = useSettings()
  const data = useCalendarData()
  const { all, selection, spaces } = useGrow()
  const today = todayIso()
  const [offset, setOffset] = useState(0)
  const monday = addDays(today, 7 * offset - weekdayIndex(today))
  const days: IsoDate[] = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const ids = useMemo(() => selectedSpaceIds(selection, spaces), [selection, spaces])
  const items = useMemo(
    () => forSpaces(calendarItems(data, monday, addDays(monday, 6), today, data.tz), ids).filter((i) => !i.done),
    [data, monday, today, ids],
  )
  const locale = locales[settings.lang]
  const short = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" })
  const long = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
  const swipe = useRef<number | null>(null)
  const arrow = "hit-sq flex w-7 shrink-0 items-center justify-center text-fg-3 hover:text-fg"
  return (
    <div role="group" aria-label={t("week.label")} className="-mx-1 mb-3 flex items-stretch" id="week-strip">
      <button type="button" className={arrow} onClick={() => setOffset((o) => o - 1)} aria-label={t("week.prev")}>
        <ChevronLeft className="size-4" />
      </button>
      <div
        className="grid flex-1 touch-pan-y grid-cols-7"
        onPointerDown={(e) => (swipe.current = e.clientX)}
        onPointerUp={(e) => {
          const dx = swipe.current == null ? 0 : e.clientX - swipe.current
          swipe.current = null
          if (Math.abs(dx) > 40) setOffset((o) => o + (dx < 0 ? 1 : -1))
        }}
      >
        {days.map((d) => {
          const mine = items.filter((i) => i.date === d)
          const reminder = mine.some((i) => i.type === "reminder")
          const tankDue = mine.some((i) => i.type === "deadline" && i.deadline.kind === "tank")
          const deadline = mine.some((i) => i.type === "deadline" && i.deadline.kind !== "tank")
          const late = mine.some((i) => i.overdue)
          const mixes = all.mixes.filter((m) => m.date === d && (!ids || !m.spaceIds?.length || m.spaceIds.some((s) => ids.has(s)))).length
          const n = mine.length + mixes
          const at = new Date(`${d}T12:00:00Z`)
          return (
            <button
              key={d}
              type="button"
              onClick={() => navigate({ tab: "calendar", day: d }, { push: true })}
              aria-label={t("week.day", { date: long.format(at), n })}
              aria-current={d === today ? "date" : undefined}
              className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-[10px] py-1 hover:bg-surface-2"
            >
              <span className="text-[0.75rem] leading-none text-fg-3">{short.format(at)}</span>
              <span className={cn("font-num text-[0.9375rem] leading-none font-semibold", d < today && "text-fg-3", d === today && "underline decoration-water decoration-2 underline-offset-[5px]")}>
                {Number(d.slice(8))}
              </span>
              <span className="flex h-[5px] gap-[3px]" aria-hidden="true">
                {reminder && <span className="size-[5px] rounded-[2px] bg-info" />}
                {deadline && <span className={cn("size-[5px] rounded-[2px]", late ? "bg-bad" : "bg-warn")} />}
                {(tankDue || mixes > 0) && <span className="size-[5px] rounded-[2px] bg-water" />}
              </span>
            </button>
          )
        })}
      </div>
      <button type="button" className={arrow} onClick={() => setOffset((o) => o + 1)} aria-label={t("week.next")}>
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
