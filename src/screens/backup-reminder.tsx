// Aujourd'hui, version locale : rappel de sauvegarde tous les 7 jours (spec §3, §12). Nothing is stored on a server,
// so a lost phone means a lost grow unless a backup exists somewhere.
import { Card } from "@/components/ui/card"
import { LineIcon } from "@/components/hydro/line-icon"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { todayIso } from "@/calc/stage"
import { backupDue, lastBackup } from "@/lib/backup-reminder"
import { TARGET } from "@/store"

export function BackupReminder() {
  const { t } = useSettings()
  const { spaces, all, grow } = useGrow()
  if (TARGET !== "local") return null
  const today = todayIso()
  // Not on the day the grow is set up (nothing to lose yet), unless something is already logged.
  const hasData = all.entries.length > 0 || (spaces.length > 0 && (grow?.createdAt ?? "").slice(0, 10) < today)
  const d = backupDue(lastBackup(), today, hasData)
  if (!d.due) return null
  return (
    <Card className="mb-3 flex-row items-center gap-3 border-warn/35 px-4 py-3" id="backup-reminder">
      <LineIcon name="notebook" size={26} />
      <div className="min-w-0 flex-1">
        <b className="block text-[0.875rem] font-semibold">{d.days == null ? t("backupRem.never") : t("backupRem.days", { n: d.days })}</b>
        <span className="block text-[0.75rem] text-fg-2">{t("backupRem.why")}</span>
      </div>
      <a href="#tools/data" className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[0.78125rem] font-semibold text-primary">
        {t("backupRem.cta")}
      </a>
    </Card>
  )
}
