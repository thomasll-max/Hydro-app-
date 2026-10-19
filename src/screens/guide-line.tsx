// Aujourd'hui (lot 10j): one thin line for « Premiers pas » and the backup reminder, instead of two blocks.
import { useState } from "react"
import { X } from "lucide-react"
import { Emoji } from "@/components/hydro/emoji"
import { useSettings } from "@/app/settings-context"
import { setStartHidden, startHidden, startProgress } from "@/calc/getting-started"
import { lowerWord } from "@/i18n/core"
import type { MessageKey } from "@/i18n/types"
import { cn } from "@/lib/utils"
import { iconButton, secondary } from "@/components/hydro/styles"
import { useStartChecklist } from "./tools/start"
import { useBackupDue } from "./backup-reminder"

/**
 * « Premiers pas 6/7 : ta première sauvegarde » with « Sauvegarder » (or « Continuer ») and ×. Without the guide (done or
 * hidden), the same line says how long since the last backup when one is due (local version). × hides the guide only.
 */
export function GuideLine() {
  const { t, settings } = useSettings()
  const items = useStartChecklist()
  const [hidden, setHidden] = useState(startHidden)
  const { done, total, next } = startProgress(items)
  const backup = useBackupDue()
  const guide = !hidden && next
  if (!guide && !backup.due) return null
  const backupText = backup.days == null ? t("backupRem.never") : t("backupRem.days", { n: backup.days })
  return (
    <div
      id={guide ? "start-card" : "backup-line"}
      className="mt-2 mb-5 flex min-h-[52px] flex-wrap items-center gap-x-2.5 gap-y-1 rounded-[12px] border border-line bg-surface py-2 pr-1.5 pl-2.5"
    >
      <Emoji name={guide ? "sprout" : "notebook"} size={22} />
      {/* Narrow screens (zoom 200 %): the button and × go under the text. */}
      <a href={guide ? "#tools/start" : "#tools/data"} className="flex min-h-11 min-w-0 flex-1 basis-[9rem] flex-col justify-center text-[0.8125rem] leading-[1.3]">
        <span className="line-clamp-2 font-medium">
          {guide ? t("start.line", { done, total, what: lowerWord(settings.lang, t(`start.i.${next.id}` as MessageKey)) }) : backupText}
        </span>
        {backup.due && (
          <span id="backup-reminder" className="block truncate text-[0.75rem] text-fg-2">
            {guide ? backupText : t("backupRem.why")}
          </span>
        )}
      </a>
      <a href={backup.due ? "#tools/data" : "#tools/start"} className={cn(secondary, "ml-auto px-3")}>
        {backup.due ? t("backupRem.cta") : t("start.go")}
      </a>
      {guide && (
        <button
          type="button"
          aria-label={t("start.hide")}
          onClick={() => {
            setStartHidden(true)
            setHidden(true)
          }}
          className={cn("shrink-0", iconButton)}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
