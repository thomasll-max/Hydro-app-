// Aujourd'hui (lot 10k1): the Premiers pas banner, « comme le tuto d'un jeu vidéo » (Thomas). Thin, at the very top,
// closable. The backup is no longer a block of its own: it is the guide's step when it comes next, else a line of À faire.
import { useState } from "react"
import { X } from "lucide-react"
import { Emoji } from "@/components/hydro/emoji"
import { useSettings } from "@/app/settings-context"
import { setStartHidden, startHidden, startProgress } from "@/calc/getting-started"
import { lowerWord } from "@/i18n/core"
import type { MessageKey } from "@/i18n/types"
import { cn } from "@/lib/utils"
import { iconButton, secondary } from "@/components/hydro/styles"
import { useStartAction, useStartChecklist } from "./tools/start"

/** « Premiers pas · 6/7 », the next step in one line, a progress bar (« plante »), « Y aller » and ×. Gone once done or closed. */
export function GuideLine() {
  const { t, settings } = useSettings()
  const items = useStartChecklist()
  const go = useStartAction()
  const [hidden, setHidden] = useState(startHidden)
  const { done, total, next } = startProgress(items)
  if (hidden || !next) return null
  const title = t("calm.startTitle", { done, total })
  return (
    <div id="start-card" className="mt-2 mb-[22px] flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[14px] border border-line bg-surface py-2.5 pr-1 pl-3">
      <Emoji name="sprout" size={30} />
      {/* Narrow screens (zoom 200 %): the button and × go under the text. */}
      <div className="min-w-0 flex-1 basis-[7.5rem]">
        <b className="block text-[0.875rem] leading-tight font-semibold">{title}</b>
        <span className="line-clamp-2 block text-[0.78125rem] leading-snug text-fg-2">{t("calm.startNext", { what: lowerWord(settings.lang, t(`start.i.${next.id}` as MessageKey)) })}</span>
        <span role="progressbar" aria-label={title} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} className="mt-[7px] block h-1 overflow-hidden rounded-[2px] bg-line">
          <span className="block h-full rounded-[2px] bg-leaf" style={{ width: `${Math.round((done / total) * 100)}%` }} />
        </span>
      </div>
      <button type="button" onClick={() => go(next)} className={cn(secondary, "ml-auto px-3")}>
        {t("calm.startGo")}
      </button>
      <button
        type="button"
        aria-label={t("start.hide")}
        onClick={() => {
          setStartHidden(true)
          setHidden(true)
        }}
        className={cn("-ml-1", iconButton)}
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
