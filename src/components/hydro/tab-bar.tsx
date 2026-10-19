import { motion } from "motion/react"
import { BookOpen, CalendarDays, FlaskConical, House, LineChart } from "lucide-react"
import { useSettings } from "@/app/settings-context"
import { cn } from "@/lib/utils"
import type { MessageKey } from "@/i18n/types"

import type { TabId } from "@/app/nav"

export const TABS: { id: TabId; label: MessageKey; Icon: typeof House }[] = [
  { id: "today", label: "nav.today", Icon: House },
  { id: "journal", label: "nav.journal", Icon: BookOpen },
  { id: "calendar", label: "nav.calendar", Icon: CalendarDays },
  { id: "charts", label: "nav.charts", Icon: LineChart },
  { id: "tools", label: "nav.tools", Icon: FlaskConical },
]

/** Frosted-glass bottom bar; the active pill slides between tabs (Motion layoutId). */
export function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  const { t } = useSettings()
  return (
    <nav
      aria-label={t("nav.label")}
      className="fixed inset-x-0 bottom-0 z-30 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pr-[max(12px,env(safe-area-inset-right,0px))] pl-[max(12px,env(safe-area-inset-left,0px))] pointer-events-none"
    >
      <div
        role="tablist"
        className="glass pointer-events-auto mx-auto grid h-[68px] max-w-[456px] grid-cols-5 rounded-[24px] border border-line-strong p-1.5 shadow-card"
      >
        {TABS.map(({ id, label, Icon }) => {
          const on = id === active
          return (
            <button
              key={id}
              role="tab"
              aria-selected={on}
              onClick={() => onChange(id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 rounded-[18px] text-[10.5px] font-semibold transition-colors duration-200",
                on ? "text-primary" : "text-fg-3 hover:text-fg-2",
              )}
            >
              {on && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-x-1 inset-y-0.5 -z-10 rounded-2xl bg-primary/12"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="size-[21px]" strokeWidth={2} />
              <span className="max-w-full truncate px-0.5">{t(label)}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
