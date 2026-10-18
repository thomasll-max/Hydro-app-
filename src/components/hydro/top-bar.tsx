import { Monitor, Moon, Sun } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useSettings } from "@/app/settings-context"
import type { ThemePref } from "@/lib/settings"
import type { Lang } from "@/i18n/types"
import { Emoji } from "./emoji"

const pill = "rounded-full border border-line bg-surface-2 p-[3px] gap-0"
const pillItem =
  "h-8 min-w-8 rounded-full! px-2.5 text-[12px] font-semibold text-fg-3 hover:bg-transparent hover:text-fg data-[state=on]:bg-surface data-[state=on]:text-fg data-[state=on]:shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-all duration-200"

export function LangSwitch() {
  const { settings, setLang, t } = useSettings()
  return (
    <ToggleGroup
      type="single"
      value={settings.lang}
      onValueChange={(v) => v && setLang(v as Lang)}
      aria-label={t("controls.language")}
      className={pill}
    >
      <ToggleGroupItem value="fr" className={pillItem} aria-label="Français">
        FR
      </ToggleGroupItem>
      <ToggleGroupItem value="en" className={pillItem} aria-label="English">
        EN
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

export function ThemeSwitch() {
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
      className={pill}
    >
      {items.map((i) => (
        <ToggleGroupItem key={i.v} value={i.v} className={pillItem} aria-label={i.label} title={i.label}>
          {i.icon}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function TopBar() {
  const { t } = useSettings()
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[480px] items-center justify-between gap-2 py-2.5 pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))]">
        <div className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.2px]">
          <Emoji name="pottedPlant" size={26} />
          {t("app.name")}
        </div>
        <div className="flex items-center gap-1.5">
          <LangSwitch />
          <ThemeSwitch />
        </div>
      </div>
    </header>
  )
}
