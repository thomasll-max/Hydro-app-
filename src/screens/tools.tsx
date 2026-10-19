import { useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Emoji } from "@/components/hydro/emoji"
import { Chip, ComingSoon, Reveal, ScreenHero } from "@/components/hydro/primitives"
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
import { IpwTool } from "./tools/ipw"
import { LightTool } from "./tools/light"
import { ClimateTool } from "./tools/climate"
import { AskTool } from "./tools/ask"
import { DataTool } from "./tools/data"
import { StartTool } from "./tools/start"
import { useSample } from "@/lib/sample"
import { navigate, useRoute, type ToolId } from "@/app/nav"

type Tool = { id: ToolId; emoji: EmojiName; title: MessageKey; desc: MessageKey; lot?: number; soon?: MessageKey; wide?: boolean; perSpace?: boolean; needsSample?: boolean }
const TOOLS: Tool[] = [
  { id: "start", emoji: "sprout", title: "tools.start", desc: "tools.startD", wide: true },
  { id: "irrigation", emoji: "droplet", title: "tools.irrigation", desc: "tools.irrigationD", wide: true, perSpace: true },
  { id: "nutrition", emoji: "testTube", title: "tools.nutrition", desc: "tools.nutritionD", perSpace: true },
  { id: "ph", emoji: "scales", title: "tools.ph", desc: "tools.phD", perSpace: true },
  { id: "ipw", emoji: "sweat", title: "tools.ipw", desc: "tools.ipwD", perSpace: true },
  { id: "light", emoji: "bulb", title: "tools.light", desc: "tools.lightD", perSpace: true },
  { id: "climate", emoji: "cyclone", title: "tools.climate", desc: "tools.climateD", wide: true, perSpace: true },
  { id: "ask", emoji: "book", title: "tools.ask", desc: "tools.askD", wide: true, perSpace: true, needsSample: true },
  { id: "equipment", emoji: "plug", title: "tools.equipment", desc: "tools.equipmentD", wide: true },
  { id: "data", emoji: "notebook", title: "tools.data", desc: "tools.dataD" },
  { id: "reperes", emoji: "compass", title: "tools.reperes", desc: "tools.reperesD" },
  { id: "settings", emoji: "gear", title: "tools.settings", desc: "tools.settingsD", wide: true },
]

/** Bento grid of tools; a tool opens in place with a back link. Route: #tools/irrigation… (old links #irrigation still work). */
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
        <button onClick={() => setOpen(null)} className="-ml-1 mb-1 flex h-11 items-center gap-1 rounded-full pr-3 text-[0.875rem] font-semibold text-primary">
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
          <IpwTool />
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
      <ScreenHero emoji="toolbox" title={t("tools.title")}>
        <p className="mt-1 text-[0.8125rem] leading-snug text-fg-2">{t("tools.subtitle")}</p>
      </ScreenHero>
      <div className="grid grid-cols-2 gap-2.5">
        {TOOLS.filter((tool) => !tool.needsSample || sample).map((tool, i) => {
          const ready = !tool.lot
          return (
            <Reveal key={tool.id} i={i} className={tool.wide ? "col-span-2" : undefined}>
              <button onClick={() => setOpen(tool.id)} className="block h-full w-full text-left">
                <Card className={tool.wide ? "h-full flex-row items-center gap-3.5 px-4 py-4" : "h-full gap-2 px-3.5 py-3.5"}>
                  <Emoji name={tool.emoji} size={tool.wide ? 52 : 40} className={ready ? undefined : "opacity-80 grayscale-[35%]"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <b className="text-[0.9375rem] font-semibold">{t(tool.title)}</b>
                      {tool.wide && (ready ? <ChevronRight className="size-5 text-fg-3" /> : <Chip>{t("app.comingLot", { n: tool.lot! })}</Chip>)}
                    </div>
                    <p className="mt-0.5 text-[0.78125rem] leading-snug text-fg-3">{t(tool.desc)}</p>
                    {!tool.wide && <div className="mt-2">{ready ? <ChevronRight className="size-5 text-fg-3" /> : <Chip>{t("app.comingLot", { n: tool.lot! })}</Chip>}</div>}
                  </div>
                </Card>
              </button>
            </Reveal>
          )
        })}
      </div>
    </>
  )
}
