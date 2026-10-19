// Outils → Sauvegarde et données (lot 6): JSON backup (same format in both versions), import (merge or replace,
// with a summary and a confirmation first), journal as CSV. Lot 8: moving a grow from one app to another (Claude ↔ local,
// phone ↔ phone) with the share sheet or copy / paste, and the date of the last backup (7-day reminder, local version).
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Seg } from "@/components/hydro/form"
import { Label, Reveal, SourceNote, Notice } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { todayIso } from "@/calc/stage"
import { backupJson, backupName, entriesCsv, exportBackup, importBackup, MAX_BACKUP_BYTES, parseBackup, type Backup, type ImportMode } from "@/lib/backup"
import { saveFile } from "@/lib/download"
import { getStores, TARGET } from "@/store"
import { markBackup } from "@/lib/backup-reminder"
import { AreaField } from "@/components/hydro/form"
import type { CollectionName } from "@/model/grow"
import type { MessageKey } from "@/i18n/types"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { askPersist, isInstalled, isIos, persistState, type PersistState } from "@/lib/persist"

export function DataTool() {
  const { t, num, dmy, settings } = useSettings()
  const { all, allSpaces, skipped } = useGrow()
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<{ backup: Backup; counts: Partial<Record<CollectionName, number>>; total: number; skipped: number; name: string } | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [mode, setMode] = useState<ImportMode>("merge")
  const [progress, setProgress] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const [paste, setPaste] = useState<string | null>(null)
  const today = todayIso()
  const build = async () => backupJson(await exportBackup((await getStores()).docs, TARGET))
  const canShare = (() => {
    try {
      return typeof navigator.share === "function" && !!navigator.canShare?.({ files: [new File(["{}"], "x.json", { type: "application/json" })] })
    } catch {
      return false
    }
  })()

  const outcome = (res: Awaited<ReturnType<typeof saveFile>>) => {
    if (res === "saved" || res === "started") toast.success(t("data.saved"))
    else if (res === "declined") toast(t("data.declined"))
    else toast.error(t("data.unavailable"))
  }
  const exportJson = async () => {
    setBusy(true)
    try {
      const { docs } = await getStores()
      const b = await exportBackup(docs, TARGET)
      const res = await saveFile(backupName(today), new Blob([backupJson(b)], { type: "application/json" }))
      // Only a confirmed file counts as a backup (an iPhone download link may silently fail).
      if (res === "saved") markBackup(today)
      outcome(res)
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error).message }))
    } finally {
      setBusy(false)
    }
  }
  // To another app or phone: the system share sheet (Messages, AirDrop, Drive…), or the clipboard.
  const share = async () => {
    setBusy(true)
    try {
      const f = new File([await build()], backupName(today), { type: "application/json" })
      await navigator.share({ files: [f], title: "Hydro" })
      markBackup(today)
      toast.success(t("data.shared"))
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast.error(t("data.unavailable"))
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => {
    setBusy(true)
    try {
      // A copy is a transfer, not a backup: the reminder is not reset.
      await navigator.clipboard.writeText(await build())
      toast.success(t("data.copied"))
    } catch {
      toast.error(t("data.copyFailed"))
    } finally {
      setBusy(false)
    }
  }
  const readPaste = () => {
    const res = parseBackup((paste ?? "").trim())
    if (!res.ok) return toast.error(t(`data.err.${res.error}` as MessageKey))
    setPending({ backup: res.backup, counts: res.counts, total: res.total, skipped: res.skipped.length, name: t("data.pasted") })
    setMode("merge")
    setPaste(null)
  }
  const exportCsv = async () => {
    const name = (id: string) => allSpaces.find((s) => s.id === id)?.name ?? id
    outcome(await saveFile(backupName(todayIso(), "csv"), new Blob(["﻿" + entriesCsv(all.entries, name, settings.lang)], { type: "text/csv" })))
  }
  const clearFile = () => {
    if (file.current) file.current.value = ""
  }
  const pick = async (f?: File | null) => {
    if (!f) return
    try {
      if (f.size > MAX_BACKUP_BYTES) return toast.error(t("data.err.size"))
      const res = parseBackup(await f.text())
      if (!res.ok) return toast.error(t(`data.err.${res.error}` as MessageKey))
      setPending({ backup: res.backup, counts: res.counts, total: res.total, skipped: res.skipped.length, name: f.name })
      setMode("merge")
    } catch {
      toast.error(t("safe.fileFailed"))
    } finally {
      clearFile() // the same file can be picked again
    }
  }
  const runImport = async () => {
    if (!pending) return
    setBusy(true)
    try {
      const { docs } = await getStores()
      if (mode === "replace") {
        // Safety copy first: no copy, no replacement.
        const before = await exportBackup(docs, TARGET)
        const res = await saveFile(backupName(`${today}-${t("safe.preImportName")}`), new Blob([backupJson(before)], { type: "application/json" }))
        if (res !== "saved" && res !== "started") {
          toast.error(t("safe.preImportFailed"))
          return
        }
      }
      const r = await importBackup(docs, pending.backup, mode, (d, n) => setProgress(`${d} / ${n}`))
      toast.success(t("data.imported", { w: r.written, d: r.deleted }))
      setPending(null)
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error).message }))
    } finally {
      setBusy(false)
      setProgress(null)
      clearFile()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Reveal i={0}>
        <Card className="gap-2.5">
          <Label emoji="bucket">{t("data.export")}</Label>
          <p className="text-[0.78125rem] leading-[1.45] text-fg-2">{t("data.exportD")}</p>
          <Button onClick={exportJson} disabled={busy} className="h-12" id="data-export">
            {t("data.exportBtn")}
          </Button>
          <div className="mt-1 rounded-md border border-line bg-surface-2 px-3 py-2.5" id="data-transfer">
            <div className="text-[0.8125rem] font-semibold">{t("data.transfer")}</div>
            <p className="mt-0.5 text-[0.75rem] leading-[1.45] text-fg-3">{t("data.transferD")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {canShare && (
                <Button variant="outline" onClick={share} disabled={busy} className="h-11">
                  {t("data.share")}
                </Button>
              )}
              <Button variant="outline" onClick={copy} disabled={busy} className="h-11">
                {t("data.copy")}
              </Button>
            </div>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={busy || !all.entries.length} className="h-11">
            {t("data.csvBtn", { n: num(all.entries.length) })}
          </Button>
          <p className="text-[0.75rem] text-fg-3">{t("data.photos")}</p>
        </Card>
      </Reveal>

      <Reveal i={1}>
        <Card className="gap-2.5" id="data-import">
          <Label emoji="notebook">{t("data.import")}</Label>
          <p className="text-[0.78125rem] leading-[1.45] text-fg-2">{t("data.importD")}</p>
          <input ref={file} type="file" accept=".json,application/json" className="hidden" id="data-file" onChange={(e) => pick(e.target.files?.[0])} />
          <Button variant="outline" onClick={() => file.current?.click()} disabled={busy} className="h-11">
            {t("data.chooseFile")}
          </Button>
          {paste == null ? (
            <Button variant="outline" onClick={() => setPaste("")} disabled={busy} className="h-11">
              {t("data.paste")}
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <AreaField id="data-paste" label={t("data.pasteLabel")} value={paste} onChange={setPaste} placeholder='{"format":"hydro-backup",…}' />
              <div className="flex gap-2">
                <Button variant="outline" className="h-11 flex-1" onClick={() => setPaste(null)}>
                  {t("data.cancel")}
                </Button>
                <Button className="h-11 flex-1" onClick={readPaste} disabled={!paste.trim()}>
                  {t("data.pasteRead")}
                </Button>
              </div>
            </div>
          )}
          {pending && (
            <div className="flex flex-col gap-2.5 rounded-md border border-line bg-surface-2 px-3 py-3" id="data-summary">
              <b className="text-[0.84375rem]">{t("data.fileSummary", { name: pending.name, n: pending.total, date: dmy(pending.backup.exportedAt) })}</b>
              {pending.skipped > 0 && <p className="text-[0.75rem] font-medium text-warn">{t("safe.importSkipped", { n: pending.skipped })}</p>}
              <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[0.75rem] text-fg-2">
                {Object.entries(pending.counts).map(([c, n]) => (
                  <li key={c} className="flex justify-between gap-2">
                    <span>{t(`data.col.${c}` as MessageKey)}</span>
                    <span className="tabular-nums">{n}</span>
                  </li>
                ))}
              </ul>
              <Seg<ImportMode>
                label={t("data.mode")}
                value={mode}
                onChange={setMode}
                options={[
                  { value: "merge", label: t("data.merge") },
                  { value: "replace", label: t("data.replace") },
                ]}
              />
              <p className={mode === "replace" ? "text-[0.75rem] font-medium text-bad" : "text-[0.75rem] text-fg-3"}>{mode === "replace" ? t("data.replaceD") : t("data.mergeD")}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-11 flex-1"
                  onClick={() => {
                    setPending(null)
                    clearFile()
                  }}
                  disabled={busy}
                >
                  {t("data.cancel")}
                </Button>
                <Button
                  variant={mode === "replace" ? "destructive" : "default"}
                  className="h-11 flex-1"
                  onClick={() => (mode === "replace" ? setConfirmReplace(true) : runImport())}
                  disabled={busy}
                  id="data-import-run"
                >
                  {progress ?? t("data.confirm")}
                </Button>
              </div>
            </div>
          )}
          <AlertDialog open={confirmReplace} onOpenChange={setConfirmReplace}>
            <AlertDialogContent className="max-w-[340px] rounded-[14px] border-line-strong bg-surface">
              <AlertDialogHeader>
                <AlertDialogTitle>{t("safe.replaceTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("safe.replaceBody")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row gap-2">
                <AlertDialogCancel className="h-11 flex-1">{t("common.cancel")}</AlertDialogCancel>
                <Button
                  variant="destructive"
                  className="h-auto min-h-11 flex-1 whitespace-normal"
                  id="data-replace-confirm"
                  onClick={() => {
                    setConfirmReplace(false)
                    runImport()
                  }}
                >
                  {t("safe.replaceGo")}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      </Reveal>
      {skipped.length > 0 && (
        <Notice id="data-skipped">{t("safe.skipped", { n: skipped.length })}</Notice>
      )}
      {TARGET === "local" && <StorageState />}
      <SourceNote>{t("data.note")}</SourceNote>
    </div>
  )
}

/** Local version: is the storage protected from the browser's clean-ups? (lot 10a) */
function StorageState() {
  const { t } = useSettings()
  const [st, setSt] = useState<PersistState>("unknown")
  useEffect(() => {
    let live = true
    persistState().then((s) => live && setSt(s))
    return () => {
      live = false
    }
  }, [])
  const ios = isIos() && !isInstalled()
  if (st === "unknown" && !ios) return null
  return (
    <Card className="gap-2" id="data-storage">
      {st !== "unknown" && <p className={st === "on" ? "text-[0.78125rem] leading-[1.45] text-fg-2" : "text-[0.78125rem] leading-[1.45] font-medium text-warn"}>{t(st === "on" ? "safe.persistOn" : "safe.persistOff")}</p>}
      {st === "off" && (
        <Button variant="outline" className="h-11 self-start" onClick={() => askPersist(true).then(setSt)}>
          {t("safe.persistAsk")}
        </Button>
      )}
      {ios && <p className="text-[0.78125rem] leading-[1.45] font-medium text-warn">{t("safe.ios")}</p>}
    </Card>
  )
}
