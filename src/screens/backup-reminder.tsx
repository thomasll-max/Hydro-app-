// Aujourd'hui, version locale : rappel de sauvegarde tous les 7 jours (spec §3, §12). Nothing is stored on a server,
// so a lost phone means a lost grow unless a backup exists somewhere. Shown in the guide line of Aujourd'hui (lot 10j).
import { useGrow } from "@/app/grow-context"
import { todayIso } from "@/calc/stage"
import { backupDue, lastBackup } from "@/lib/backup-reminder"
import { TARGET } from "@/store"

/** Whether a backup is due (local version only), and the days since the last one (null: never). */
export function useBackupDue(): { due: boolean; days: number | null } {
  const { spaces, all, grow } = useGrow()
  if (TARGET !== "local") return { due: false, days: null }
  const today = todayIso()
  // Not on the day the grow is set up (nothing to lose yet), unless something is already logged.
  const hasData = all.entries.length > 0 || (spaces.length > 0 && (grow?.createdAt ?? "").slice(0, 10) < today)
  return backupDue(lastBackup(), today, hasData)
}
