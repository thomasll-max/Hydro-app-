import { Monitor, Moon, Settings, Sun } from "lucide-react"
import { Popover } from "radix-ui"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useSettings } from "@/app/settings-context"
import type { ThemePref } from "@/lib/settings"
import type { Lang } from "@/i18n/types"
import { Wordmark } from "./wordmark"
import { SpacePill } from "./space-pill"
import { cn } from "@/lib/utils"

const pill = "rounded-full border border-line bg-surface-2 p-[3px] gap-0"
const pillItem =
  "h-8 hit min-w-11 rounded-full! px-2.5 text-[0.75rem] font-semibold text-fg-3 hover:bg-transparent hover:text-fg data-[state=on]:bg-surface data-[state=on]:text-fg data-[state=on]:shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-all duration-200"

export function LangSwitch({ wide }: { wide?: boolean } = {}) {
  const { settings, setLang, t } = useSettings()
  return (
    <ToggleGroup
      type="single"
      value={settings.lang}
      onValueChange={(v) => v && setLang(v as Lang)}
      aria-label={t("controls.language")}
      className={cn(pill, wide && "flex w-full")}
    >
      <ToggleGroupItem value="fr" className={cn(pillItem, wide && "h-11 flex-1")} aria-label="Français">
        {wide ? "Français" : "FR"}
      </ToggleGroupItem>
      <ToggleGroupItem value="en" className={cn(pillItem, wide && "h-11 flex-1")} aria-label="English">
        {wide ? "English" : "EN"}
      </ToggleGroupItem>
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
      className={cn(pill, wide && "flex w-full")}
    >
      {items.map((i) => (
        <ToggleGroupItem key={i.v} value={i.v} className={cn(pillItem, wide && "h-11 flex-1 gap-1 px-1.5")} aria-label={i.label} title={i.label}>
          {i.icon}
          {wide && <span className="text-[0.75rem]">{i.label}</span>}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function TopBar() {
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 bg-background/80 backdrop-blur-md short:static">
      <div className="mx-auto flex max-w-[480px] items-center justify-between gap-2 py-2.5 pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))]">
        <Wordmark size={26} />
        <DisplayMenu />
      </div>
      <SpacePill />
    </header>
  )
}

/** Small gear pill in the top bar: language and theme in a popover (they used to take the whole right side). */
export function DisplayMenu() {
  const { settings, t } = useSettings()
  const ThemeIcon = settings.theme === "light" ? Sun : settings.theme === "dark" ? Moon : Monitor
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`${settings.lang.toUpperCase()} · ${t("controls.display")}`}
          id="display-menu"
          className="flex h-11 items-center gap-1.5 rounded-full border border-line bg-surface-2 pr-2.5 pl-2 text-[0.75rem] font-semibold text-fg-2 transition-colors hover:text-fg data-[state=open]:border-primary/40 data-[state=open]:text-fg"
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
          className="z-50 flex w-[264px] flex-col gap-3 rounded-[18px] border border-line-strong bg-surface p-3.5 shadow-card outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.75rem] font-semibold text-fg-3">{t("controls.language")}</span>
            <LangSwitch wide />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.75rem] font-semibold text-fg-3">{t("controls.theme")}</span>
            <ThemeSwitch wide />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
