import { useEffect } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Toaster } from "sonner"
import { SettingsProvider, useSettings } from "@/app/settings-context"
import { GrowProvider, useGrow } from "@/app/grow-context"
import { EditorsProvider, useEditors } from "@/app/editors"
import { TARGET } from "@/store"
import { todayIso } from "@/calc/stage"
import { TopBar } from "@/components/hydro/top-bar"
import { TabBar } from "@/components/hydro/tab-bar"
import { navigate, useRoute, type TabId } from "@/app/nav"
import { Fab } from "@/components/hydro/fab"
import { TodayScreen } from "@/screens/today"
import { JournalScreen } from "@/screens/journal"
import { ChartsScreen } from "@/screens/charts"
import { ToolsScreen } from "@/screens/tools"
import { CalendarScreen } from "@/screens/calendar"
import { Onboarding } from "@/screens/onboarding"
import { UpdateBanner } from "@/app/update"
import { OwnerOnly, ProblemScreen } from "@/app/status"
import { askPersist } from "@/lib/persist"

const SCREENS: Record<TabId, () => React.ReactElement> = {
  today: TodayScreen,
  journal: JournalScreen,
  calendar: CalendarScreen,
  charts: ChartsScreen,
  tools: ToolsScreen,
}

function Shell() {
  const { t } = useSettings()
  const { cycle, storeKind, spaces, selection, needsSetup, problem, retry, owner, volatile, grow } = useGrow()
  const ed = useEditors()
  // Tabs and tools are routes in the history (lot 10d): the back gesture walks back through them.
  const { tab } = useRoute()
  const Screen = SCREENS[tab]

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [tab])

  // Local version: ask the browser to keep the data once there is a grow to keep (Firefox asks the user then).
  const hasGrow = !!grow
  useEffect(() => {
    if (TARGET === "local" && hasGrow) askPersist()
  }, [hasGrow])

  if (problem) return <ProblemScreen kind={problem} onRetry={retry} />
  if (owner === false) return <OwnerOnly />
  if (needsSetup)
    return (
      <>
        <Onboarding />
        <AppToaster />
      </>
    )

  return (
    <div className="relative min-h-full">
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 h-[360px] bg-[radial-gradient(closest-side,var(--glow),transparent)] [inset-inline:-30%]" />
      <TopBar />
      <UpdateBanner />
      {TARGET === "artifact" && storeKind === "local" && (
        <div className="relative mx-auto max-w-[480px] px-4">
          <p className="rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-[0.75rem] font-medium text-warn">{t("app.localOnly")}</p>
        </div>
      )}
      {volatile && (
        <div className="relative mx-auto max-w-[480px] px-4">
          <p className="rounded-md border border-bad/30 bg-bad/10 px-3 py-2 text-[0.78125rem] font-medium text-bad" id="volatile-warning" role="alert">
            {t("safe.volatile")}
          </p>
        </div>
      )}
      <main className="relative mx-auto max-w-[480px] pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+170px)] short:pb-[calc(env(safe-area-inset-bottom,0px)+130px)] pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))]">
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
      <TabBar active={tab} onChange={(id) => navigate({ tab: id })} />
      <AppToaster />
    </div>
  )
}

function AppToaster() {
  const { resolvedTheme } = useSettings()
  return (
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
