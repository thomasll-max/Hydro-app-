import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Emoji } from "@/components/hydro/emoji"
import { Chip, Reveal, ScreenHero } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import type { EmojiName } from "@/assets/emoji"
import type { MessageKey } from "@/i18n/types"
import { IrrigationTool } from "./tools/irrigation"
import { NutritionTool } from "./tools/nutrition"

type ToolId = "irrigation" | "nutrition" | "light" | "climate"
const TOOLS: { id: ToolId; emoji: EmojiName; title: MessageKey; desc: MessageKey; lot?: number; wide?: boolean }[] = [
  { id: "irrigation", emoji: "droplet", title: "tools.irrigation", desc: "tools.irrigationD", wide: true },
  { id: "nutrition", emoji: "testTube", title: "tools.nutrition", desc: "tools.nutritionD" },
  { id: "light", emoji: "bulb", title: "tools.light", desc: "tools.lightD", lot: 4 },
  { id: "climate", emoji: "wind", title: "tools.climate", desc: "tools.climateD", lot: 4, wide: true },
]

/** Bento grid of tools; a tool opens in place with a back link. Deep link: #irrigation, #nutrition. */
export function ToolsScreen() {
  const { t } = useSettings()
  const initial = location.hash.replace("#", "") as ToolId
  const [open, setOpen] = useState<ToolId | null>(initial === "irrigation" || initial === "nutrition" ? initial : null)
  useEffect(() => {
    // Block body on purpose: inside the Claude app, scrollTo returns a value React would take for a cleanup function.
    window.scrollTo({ top: 0 })
  }, [open])

  if (open) {
    const tool = TOOLS.find((x) => x.id === open)!
    return (
      <>
        <button onClick={() => setOpen(null)} className="-ml-1 mb-1 flex h-10 items-center gap-1 rounded-full pr-3 text-[14px] font-semibold text-primary">
          <ChevronLeft className="size-5" /> {t("tools.back")}
        </button>
        <ScreenHero emoji={tool.emoji} title={t(tool.title)}>
          <p className="mt-1 text-[13px] leading-snug text-fg-2">{t(tool.desc)}</p>
        </ScreenHero>
        {open === "irrigation" ? <IrrigationTool /> : <NutritionTool />}
      </>
    )
  }

  return (
    <>
      <ScreenHero emoji="toolbox" title={t("tools.title")}>
        <p className="mt-1 text-[13px] leading-snug text-fg-2">{t("tools.subtitle")}</p>
      </ScreenHero>
      <div className="grid grid-cols-2 gap-2.5">
        {TOOLS.map((tool, i) => {
          const ready = !tool.lot
          return (
            <Reveal key={tool.id} i={i} className={tool.wide ? "col-span-2" : undefined}>
              <button disabled={!ready} onClick={() => setOpen(tool.id)} className="block h-full w-full text-left disabled:cursor-default">
                <Card className={tool.wide ? "h-full flex-row items-center gap-3.5 px-4 py-4" : "h-full gap-2 px-3.5 py-3.5"}>
                  <Emoji name={tool.emoji} size={tool.wide ? 52 : 40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <b className="text-[15px] font-semibold">{t(tool.title)}</b>
                      {ready ? tool.wide && <ChevronRight className="size-5 text-fg-3" /> : tool.wide && <Chip>{t("app.comingLot", { n: tool.lot! })}</Chip>}
                    </div>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-fg-3">{t(tool.desc)}</p>
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
