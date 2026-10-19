import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Toaster } from "sonner"
import { SettingsProvider, useSettings } from "@/app/settings-context"
import { GrowProvider, useGrow } from "@/app/grow-context"
import { EditorsProvider, useEditors } from "@/app/editors"
import { TARGET } from "@/store"
import { TopBar } from "@/components/hydro/top-bar"
import { TabBar } from "@/components/hydro/tab-bar"
import { navigate, useRoute, type TabId } from "@/app/nav"
import { TodayScreen } from "@/screens/today"
import { JournalScreen } from "@/screens/journal"
import { ChartsScreen } from "@/screens/charts"
import { ToolsScreen } from "@/screens/tools"
import { CalendarScreen } from "@/screens/calendar"
import { AddSheet } from "@/screens/add-sheet"
import { Onboarding } from "@/screens/onboarding"
import { UpdateBanner } from "@/app/update"
import { OwnerOnly, ProblemScreen } from "@/app/status"
import { askPersist } from "@/lib/persist"
import { Splash } from "@/components/hydro/wordmark"
import { Notice } from "@/components/hydro/primitives"

const SCREENS: Record<TabId, () => React.ReactElement> = {
  today: TodayScreen,
  journal: JournalScreen,
  calendar: CalendarScreen,
  charts: ChartsScreen,
  tools: ToolsScreen,
}

function Shell() {
  const { t } = useSettings()
  const { storeKind, spaces, needsSetup, problem, retry, owner, volatile, grow, ready } = useGrow()
  const ed = useEditors()
  const [adding, setAdding] = useState(false)
  // Tabs and tools are routes in the history (lot 10d): the back gesture walks back through them.
  const { tab } = useRoute()
  const Screen = SCREENS[tab]
  // Motion (lot 10h): a short screen transition only, none with reduced motion.
  const still = useReducedMotion()

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
  // Installed local version: start screen until the data are read (lot 10g), never longer.
  if (TARGET === "local" && !ready && !needsSetup) return <Splash label={t("app.loading")} />
  if (needsSetup)
    return (
      <>
        <Onboarding />
        <AppToaster />
      </>
    )

  return (
    <div className="relative min-h-full">
      <TopBar />
      <UpdateBanner />
      {TARGET === "artifact" && storeKind === "local" && (
        <div className="relative mx-auto max-w-[480px] px-4">
          <Notice className="py-1 text-[0.75rem]">{t("app.localOnly")}</Notice>
        </div>
      )}
      {volatile && (
        <div className="relative mx-auto max-w-[480px] px-4">
          <Notice tone="bad" className="py-1" id="volatile-warning" role="alert">
            {t("safe.volatile")}
          </Notice>
        </div>
      )}
      <main id="main-panel" role="tabpanel" className="relative mx-auto max-w-[480px] pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] short:pb-[calc(env(safe-area-inset-bottom,0px)+64px)] pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={still ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={still ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: still ? 0 : 0.16 }}
          >
            <Screen />
          </motion.div>
        </AnimatePresence>
      </main>
      <TabBar
        active={tab}
        onChange={(id) => navigate({ tab: id })}
        onPlus={() => {
          // No space yet: the cycle first. Otherwise a small sheet: entry, quick entry, tank, event (lot 10k3).
          if (!spaces.length) ed.openCycle()
          else setAdding(true)
        }}
      />
      <AddSheet open={adding} onOpenChange={setAdding} />
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
