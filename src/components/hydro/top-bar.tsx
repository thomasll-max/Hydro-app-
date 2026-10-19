import { useState } from "react"
import { Monitor, Moon, Settings, Sun } from "lucide-react"
import { Popover } from "radix-ui"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useSettings } from "@/app/settings-context"
import type { ThemePref } from "@/lib/settings"
import type { Lang } from "@/i18n/types"
import { Wordmark } from "./wordmark"
import { SpacePill } from "./space-pill"
import { cn } from "@/lib/utils"
import { joined, segmentItem, tertiary } from "@/components/hydro/styles"
import { navigate } from "@/app/nav"
import { locales } from "@/i18n/core"

// Joined boxes (lot 10h), the active one inverted.
const compact = "inline-grid grid-flow-col auto-cols-fr [grid-template-columns:none] gap-0"
const pillItem = cn(segmentItem, "min-w-11 text-[0.75rem]")
const LANG_NAMES: [Lang, string][] = [
  ["fr", "Français"],
  ["en", "English"],
  ["de", "Deutsch"],
]

export function LangSwitch({ wide }: { wide?: boolean } = {}) {
  const { settings, setLang, t } = useSettings()
  return (
    <ToggleGroup
      type="single"
      value={settings.lang}
      onValueChange={(v) => v && setLang(v as Lang)}
      aria-label={t("controls.language")}
      className={wide ? joined(3, "w-full gap-0") : joined(undefined, compact)}
    >
      {/* Each language in its own words (lot 10i: FR / EN / DE). */}
      {LANG_NAMES.map(([v, name]) => (
        <ToggleGroupItem key={v} value={v} className={pillItem} aria-label={name}>
          {wide ? name : v.toUpperCase()}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function ThemeSwitch({ wide }: { wide?: boolean } = {}) {
  const { settings, setTheme, t } = useSettings()
  const items: { v: ThemePref; icon: React.ReactNode; label: string }[] = [
    { v: "light", icon: <Sun className="size-3.5" />, label: t("controls.light") },
    { v: "system", icon: <Monitor className="size-3.5" />, label: t("controls.system") },
    { v: "dark", icon: <Moon className="size-3.5" />, label: t("controls.dark") },
  ]
  return (
    <ToggleGroup
      type="single"
      value={settings.theme}
      onValueChange={(v) => v && setTheme(v as ThemePref)}
      aria-label={t("controls.theme")}
      className={wide ? joined(3, "w-full gap-0") : joined(undefined, compact)}
    >
      {items.map((i) => (
        <ToggleGroupItem key={i.v} value={i.v} className={cn(pillItem, wide && "gap-1 px-1.5")} aria-label={i.label} title={i.label}>
          {i.icon}
          {wide && <span className="text-[0.75rem]">{i.label}</span>}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function TopBar() {
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 bg-background short:static">
      <div className="mx-auto flex max-w-[480px] items-center justify-between gap-2 py-2.5 pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))]">
        <Wordmark size={26} />
        <div className="flex items-center gap-1">
          <TodayButton />
          <DisplayMenu />
        </div>
      </div>
      <SpacePill />
    </header>
  )
}

/** The date of the day (« lun. 19 oct. »): a button that opens the Calendar on today (lot 10h). */
function TodayButton() {
  const { t, settings } = useSettings()
  const now = new Date()
  const date = new Intl.DateTimeFormat(locales[settings.lang], { weekday: "short", day: "numeric", month: "short" }).format(now)
  const long = new Intl.DateTimeFormat(locales[settings.lang], { weekday: "long", day: "numeric", month: "long" }).format(now)
  return (
    <button
      type="button"
      onClick={() => navigate({ tab: "calendar" }, { push: true })}
      aria-label={t("week.openCalendar", { date: long })}
      id="today-date"
      className="flex h-11 items-center rounded-[10px] px-2 font-num text-[0.8125rem] whitespace-nowrap text-fg-3 hover:text-fg max-[340px]:hidden"
    >
      {date}
    </button>
  )
}

/** Small gear pill in the top bar: language and theme in a popover (they used to take the whole right side). */
export function DisplayMenu() {
  const { settings, t } = useSettings()
  const [open, setOpen] = useState(false)
  const ThemeIcon = settings.theme === "light" ? Sun : settings.theme === "dark" ? Moon : Monitor
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`${settings.lang.toUpperCase()} · ${t("controls.display")}`}
          id="display-menu"
          className="flex h-11 items-center gap-1.5 rounded-[10px] border border-line-strong pr-2.5 pl-2 text-[0.75rem] font-semibold text-fg-2 transition-colors hover:text-fg data-[state=open]:border-fg data-[state=open]:text-fg"
        >
          <Settings className="size-4" />
          <span className="uppercase">{settings.lang}</span>
          <ThemeIcon className="size-3.5" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 flex w-[264px] flex-col gap-3 rounded-[14px] border border-line-strong bg-surface p-3.5 shadow-card outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.75rem] font-semibold text-fg-3">{t("controls.language")}</span>
            <LangSwitch wide />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.75rem] font-semibold text-fg-3">{t("controls.theme")}</span>
            <ThemeSwitch wide />
          </div>
          {/* Shortcut to Réglages (Thomas's request, lot 10h): the menu closes, back returns here. */}
          <div className="-mb-1.5 border-t border-line pt-1">
            <button
              type="button"
              id="all-settings"
              className={tertiary}
              onClick={() => {
                setOpen(false)
                navigate({ tab: "tools", tool: "settings" }, { push: true })
              }}
            >
              {t("week.allSettings")}
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
