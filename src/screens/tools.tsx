import { useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { LineIcon } from "@/components/hydro/line-icon"
import { Chip, ComingSoon, ScreenHero } from "@/components/hydro/primitives"
import { SpaceDot } from "@/components/hydro/space-pill"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import type { EmojiName } from "@/assets/emoji"
import type { MessageKey } from "@/i18n/types"
import { IrrigationTool } from "./tools/irrigation"
import { NutritionTool } from "./tools/nutrition"
import { EquipmentTool } from "./tools/equipment"
import { SettingsTool } from "./tools/settings"
import { GuideScreen } from "./guide"
import { PhBalanceTool } from "./tools/ph-balance"
import { SprayTool } from "./tools/spray"
import { LightTool } from "./tools/light"
import { ClimateTool } from "./tools/climate"
import { AskTool } from "./tools/ask"
import { DataTool } from "./tools/data"
import { StartTool } from "./tools/start"
import { useSample } from "@/lib/sample"
import { navigate, useRoute, type ToolId } from "@/app/nav"

type Group = "daily" | "room" | "setup"
type Tool = { id: ToolId | "calendar"; emoji: EmojiName; title: MessageKey; desc: MessageKey; lot?: number; soon?: MessageKey; perSpace?: boolean; needsSample?: boolean; group?: Group; tone?: "water" | "leaf" | "neutral" }
/**
 * Lot 10k2: three groups (« Chaque jour », « Régler la pièce », « Mon installation »), simple words, line icons coloured by
 * subject (« eau » for the tank and the watering, « plante » for the room, neutral for the setup). Premiers pas and
 * Réglages are not listed (the gear of the top bar and the banner of Aujourd'hui open them); their routes stay.
 */
const TOOLS: Tool[] = [
  { id: "nutrition", emoji: "testTube", title: "tools.nutrition", desc: "tools.nutritionD", perSpace: true, group: "daily", tone: "water" },
  { id: "irrigation", emoji: "droplet", title: "tools.irrigation", desc: "tools.irrigationD", perSpace: true, group: "daily", tone: "water" },
  { id: "ph", emoji: "scales", title: "tools.ph", desc: "tools.phD", perSpace: true, group: "daily", tone: "water" },
  { id: "calendar", emoji: "calendar", title: "tools.calendar", desc: "tools.calendarD", group: "daily", tone: "neutral" },
  { id: "ask", emoji: "book", title: "tools.ask", desc: "tools.askD", perSpace: true, needsSample: true, group: "daily", tone: "neutral" },
  { id: "light", emoji: "bulb", title: "tools.light", desc: "tools.lightD", perSpace: true, group: "room", tone: "leaf" },
  { id: "climate", emoji: "thermometer", title: "tools.climate", desc: "tools.climateD", perSpace: true, group: "room", tone: "leaf" },
  { id: "ipw", emoji: "sweat", title: "tools.ipw", desc: "tools.ipwD", perSpace: true, group: "room", tone: "leaf" },
  { id: "equipment", emoji: "plug", title: "tools.equipment", desc: "tools.equipmentD", group: "setup", tone: "neutral" },
  { id: "reperes", emoji: "compass", title: "tools.reperes", desc: "tools.reperesD", group: "setup", tone: "neutral" },
  { id: "data", emoji: "notebook", title: "tools.data", desc: "tools.dataD", group: "setup", tone: "neutral" },
  { id: "start", emoji: "sprout", title: "tools.start", desc: "tools.startD" },
  { id: "settings", emoji: "gear", title: "tools.settings", desc: "tools.settingsD" },
]
const GROUPS: { id: Group; title: MessageKey }[] = [
  { id: "daily", title: "tools.gDaily" },
  { id: "room", title: "tools.gRoom" },
  { id: "setup", title: "tools.gSetup" },
]

const row = "flex min-h-[54px] w-full items-center gap-3.5 py-1.5 text-left"

/** List of tools; a tool opens in place with a back link. Route: #tools/irrigation… (old links #irrigation still work). */
export function ToolsScreen() {
  const { t } = useSettings()
  const { space } = useGrow()
  const sample = useSample()
  const open = useRoute().tool ?? null
  const setOpen = (tool: ToolId | null) => navigate(tool ? { tab: "tools", tool } : { tab: "tools" })
  useEffect(() => {
    // Block body on purpose: inside the Claude app, scrollTo returns a value React would take for a cleanup function.
    window.scrollTo({ top: 0 })
  }, [open])

  if (open) {
    const tool = TOOLS.find((x) => x.id === open)!
    return (
      <>
        <button onClick={() => setOpen(null)} className="-ml-1 mb-1 flex h-11 items-center gap-1 rounded-[10px] pr-3 text-[0.875rem] font-semibold text-fg-2 hover:text-fg">
          <ChevronLeft className="size-5" /> {t("tools.back")}
        </button>
        <ScreenHero emoji={tool.emoji} title={t(tool.title)}>
          <p className="mt-1 text-[0.8125rem] leading-snug text-fg-2">{t(tool.desc)}</p>
          {tool.perSpace && space && (
            <p className="mt-1 flex items-center gap-1.5 text-[0.75rem] font-semibold text-fg-2">
              <SpaceDot color={space.color} /> {t("tools.forSpace", { name: space.name })}
            </p>
          )}
        </ScreenHero>
        {tool.lot ? (
          <ComingSoon emoji={tool.emoji} lot={t("soon.title", { n: tool.lot })} title={t(tool.title)} body={t(tool.soon!)} foot={t("soon.keep")} />
        ) : open === "start" ? (
          <StartTool />
        ) : open === "irrigation" ? (
          <IrrigationTool />
        ) : open === "nutrition" ? (
          <NutritionTool />
        ) : open === "ph" ? (
          <PhBalanceTool />
        ) : open === "ipw" ? (
          <SprayTool />
        ) : open === "light" ? (
          <LightTool />
        ) : open === "climate" ? (
          <ClimateTool />
        ) : open === "ask" ? (
          <AskTool />
        ) : open === "data" ? (
          <DataTool />
        ) : open === "equipment" ? (
          <EquipmentTool />
        ) : open === "settings" ? (
          <SettingsTool />
        ) : (
          <GuideScreen embedded />
        )}
      </>
    )
  }

  return (
    <>
      <ScreenHero emoji="toolbox" title={t("tools.title")} />
      <div className="flex flex-col gap-7" id="tools-list">
        {GROUPS.map((g) => (
          <section key={g.id} aria-labelledby={`tools-${g.id}`} data-group={g.id}>
            <h2 id={`tools-${g.id}`} className="mb-1 font-num text-[0.75rem] font-semibold tracking-[0.12em] text-fg-3 uppercase">
              {t(g.title)}
            </h2>
            <ul>
              {TOOLS.filter((tool) => tool.group === g.id && (!tool.needsSample || sample)).map((tool) => {
                const ready = !tool.lot
                // The Calendar has no tab since lot 10h: it opens over Outils, back returns here.
                const go = () => (tool.id === "calendar" ? navigate({ tab: "calendar" }, { push: true }) : setOpen(tool.id))
                return (
                  <li key={tool.id}>
                    <button onClick={go} className={row} id={`tool-${tool.id}`}>
                      <LineIcon name={tool.emoji} size={24} tone={tool.tone} className={ready ? undefined : "opacity-70"} />
                      <span className="min-w-0 flex-1">
                        <b className="block text-[0.9375rem] font-semibold">{t(tool.title)}</b>
                        <span className="block text-[0.78125rem] leading-snug text-fg-3">{t(tool.desc)}</span>
                      </span>
                      {ready ? <ChevronRight className="size-5 shrink-0 text-fg-3" /> : <Chip>{t("app.comingLot", { n: tool.lot! })}</Chip>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        <p className="text-[0.8125rem] text-fg-3" id="tools-foot">
          {t("tools.foot")}
        </p>
      </div>
    </>
  )
}
