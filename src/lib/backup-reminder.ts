// Version locale : rappel de sauvegarde tous les 7 jours (spec §12). The date of the last export is a per-device
// convenience (browser storage): the data itself lives in IndexedDB.
import type { IsoDate } from "@/model/types"

export const BACKUP_EVERY_DAYS = 7
const KEY = "hydro.lastBackup"

export function lastBackup(): IsoDate | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}
export function markBackup(date: IsoDate): void {
  try {
    localStorage.setItem(KEY, date)
  } catch {
    /* ignore */
  }
}

/** Due when there is something to lose and no backup for 7 days (or never). Returns the days since, or null if not due. */
export function backupDue(last: IsoDate | null, today: IsoDate, hasData: boolean, every = BACKUP_EVERY_DAYS): { due: boolean; days: number | null } {
  if (!hasData) return { due: false, days: null }
  if (!last) return { due: true, days: null }
  const days = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${last}T12:00:00Z`)) / 86_400_000)
  return { due: days >= every, days }
}
