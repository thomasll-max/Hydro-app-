import { BookOpen, FlaskConical, House, LineChart, Plus } from "lucide-react"
import { useSettings } from "@/app/settings-context"
import { cn } from "@/lib/utils"
import type { MessageKey } from "@/i18n/types"

import type { TabId } from "@/app/nav"

/** The four tabs (lot 10h): the Calendar opens from Aujourd'hui and from Outils, no longer from its own tab. */
export const TABS: { id: TabId; label: MessageKey; Icon: typeof House }[] = [
  { id: "today", label: "nav.today", Icon: House },
  { id: "journal", label: "nav.journal", Icon: BookOpen },
  { id: "charts", label: "nav.charts", Icon: LineChart },
  { id: "tools", label: "nav.tools", Icon: FlaskConical },
]

/**
 * Bottom bar anchored to the screen (lot 10h): full width, page ground, a thin line on top, the phone's safe area.
 * Aujourd'hui, Journal, « + », Graphiques, Outils: the « + » sits in the middle, filled « eau » (no floating button over
 * the content); since lot 10k3 it opens a small sheet (entry, quick entry, tank, event). Tapping the tab already open goes back to the top of the screen.
 */
export function TabBar({ active, onChange, onPlus }: { active: TabId; onChange: (t: TabId) => void; onPlus: () => void }) {
  const { t } = useSettings()
  const tab = ({ id, label, Icon }: (typeof TABS)[number]) => {
    const on = id === active
    return (
      <button
        key={id}
        role="tab"
        aria-selected={on}
        aria-current={on ? "page" : undefined}
        aria-controls="main-panel"
        onClick={() => {
          // The tab already open: back to the top (and from a tool, back to the list, lot 10d).
          if (on) window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
          onChange(id)
        }}
        className={cn(
          "flex min-w-0 flex-col items-center justify-center gap-1 text-[0.75rem] transition-colors duration-150",
          on ? "font-semibold text-fg" : "text-fg-3 hover:text-fg-2",
        )}
      >
        <Icon className={cn("size-[22px]", on && "text-water-ink")} strokeWidth={1.5} />
        <span className="max-w-full truncate tracking-[-0.02em] short:sr-only">{t(label)}</span>
      </button>
    )
  }
  return (
    <nav
      aria-label={t("nav.label")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-background pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)]"
    >
      <div className="relative mx-auto grid h-[64px] max-w-[480px] grid-cols-5 short:h-[48px]">
        <div role="tablist" aria-label={t("nav.label")} className="contents">
          {TABS.slice(0, 2).map(tab)}
          <span aria-hidden="true" />
          {TABS.slice(2).map(tab)}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-1/2 flex w-1/5 -translate-x-1/2 items-center justify-center">
          <button
            type="button"
            onClick={onPlus}
            id="tab-plus"
            aria-haspopup="dialog"
            aria-label={t("fab.label")}
            title={t("fab.label")}
            className="pointer-events-auto flex h-11 w-[52px] items-center justify-center rounded-[12px] bg-primary text-primary-foreground shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)] transition-transform active:translate-y-px active:shadow-[inset_0_2px_0_rgba(0,0,0,0.25)] short:h-9"
          >
            <Plus className="size-[26px]" strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </nav>
  )
}
