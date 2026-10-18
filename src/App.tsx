import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Toaster } from "sonner"
import { SettingsProvider, useSettings } from "@/app/settings-context"
import { GrowProvider, useGrow } from "@/app/grow-context"
import { EditorsProvider, useEditors } from "@/app/editors"
import { TARGET } from "@/store"
import { todayIso } from "@/calc/stage"
import { TopBar } from "@/components/hydro/top-bar"
import { TabBar, TABS, type TabId } from "@/components/hydro/tab-bar"
import { Fab } from "@/components/hydro/fab"
import { TodayScreen } from "@/screens/today"
import { JournalScreen } from "@/screens/journal"
import { ChartsScreen } from "@/screens/charts"
import { ToolsScreen } from "@/screens/tools"
import { CalendarScreen } from "@/screens/calendar"

const SCREENS: Record<TabId, () => React.ReactElement> = {
  today: TodayScreen,
  journal: JournalScreen,
  calendar: CalendarScreen,
  charts: ChartsScreen,
  tools: ToolsScreen,
}

/** Tab from the artifact link (#journal, #tools…) — bare tokens only. Tool ids open the Tools tab. */
export const TOOL_HASHES = ["irrigation", "nutrition", "ph", "ipw", "light", "climate", "ask", "equipment", "data", "reperes", "settings"]
function initialTab(): TabId {
  const h = location.hash.replace("#", "")
  if (TOOL_HASHES.includes(h) || h === "guide") return "tools"
  return TABS.some((t) => t.id === h) ? (h as TabId) : "today"
}

function Shell() {
  const { t, resolvedTheme } = useSettings()
  const { cycle, storeKind, spaces, selection } = useGrow()
  const ed = useEditors()
  const [tab, setTab] = useState<TabId>(initialTab)
  const Screen = SCREENS[tab]

  useEffect(() => {
    const onHash = () => setTab(initialTab())
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  useEffect(() => {
    try {
      // A tool deep link (#equipment…) stays as is: the Tools screen mounts after the tab transition.
      const keep = tab === "tools" && TOOL_HASHES.includes(location.hash.replace("#", ""))
      if (!keep) history.replaceState(null, "", tab === "today" ? location.pathname + location.search : `#${tab}`)
    } catch {
      /* sandboxed history: ignore */
    }
    window.scrollTo({ top: 0 })
  }, [tab])

  return (
    <div className="relative min-h-full">
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 h-[360px] bg-[radial-gradient(closest-side,var(--glow),transparent)] [inset-inline:-30%]" />
      <TopBar />
      {TARGET === "artifact" && storeKind === "local" && (
        <div className="relative mx-auto max-w-[480px] px-4">
          <p className="rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-[12px] font-medium text-warn">{t("app.localOnly")}</p>
        </div>
      )}
      <main className="relative mx-auto max-w-[480px] pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+170px)] pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            <Screen />
          </motion.div>
        </AnimatePresence>
      </main>
      <Fab
        label={t("fab.label")}
        onClick={() => {
          if (!spaces.length) ed.openCycle()
          else if (selection.kind !== "space" && spaces.length > 1) ed.openQuick()
          else ed.openEntry({ date: todayIso(), spaceId: selection.kind === "space" ? selection.space.id : (cycle?.spaceId ?? spaces[0].id) })
        }}
      />
      <TabBar active={tab} onChange={setTab} />
      <Toaster
        theme={resolvedTheme}
        position="top-center"
        offset={{ top: "calc(env(safe-area-inset-top, 0px) + 60px)" }}
        toastOptions={{
          style: {
            background: "var(--surface)",
            color: "var(--fg)",
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--r-lg)",
            fontFamily: "var(--font-sans)",
          },
        }}
      />
    </div>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <GrowProvider>
        <EditorsProvider>
          <Shell />
        </EditorsProvider>
      </GrowProvider>
    </SettingsProvider>
  )
}
