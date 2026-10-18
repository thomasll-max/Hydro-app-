// Outils → Sauvegarde et données (lot 6): JSON backup (same format in both versions), import (merge or replace,
// with a summary and a confirmation first), journal as CSV. Lot 8: moving a grow from one app to another (Claude ↔ local,
// phone ↔ phone) with the share sheet or copy / paste, and the date of the last backup (7-day reminder, local version).
import { useRef, useState } from "react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Seg } from "@/components/hydro/form"
import { Label, Reveal, SourceNote } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { todayIso } from "@/calc/stage"
import { backupJson, backupName, entriesCsv, exportBackup, importBackup, parseBackup, type Backup, type ImportMode } from "@/lib/backup"
import { saveFile } from "@/lib/download"
import { getStores, TARGET } from "@/store"
import { markBackup } from "@/lib/backup-reminder"
import { AreaField } from "@/components/hydro/form"
import type { CollectionName } from "@/model/grow"
import type { MessageKey } from "@/i18n/types"

export function DataTool() {
  const { t, num } = useSettings()
  const { all, allSpaces } = useGrow()
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<{ backup: Backup; counts: Partial<Record<CollectionName, number>>; total: number; name: string } | null>(null)
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
    if (res === "saved") toast.success(t("data.saved"))
    else if (res === "declined") toast(t("data.declined"))
    else toast.error(t("data.unavailable"))
  }
  const exportJson = async () => {
    setBusy(true)
    try {
      const { docs } = await getStores()
      const b = await exportBackup(docs, TARGET)
      const res = await saveFile(backupName(today), new Blob([backupJson(b)], { type: "application/json" }))
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
      await navigator.clipboard.writeText(await build())
      markBackup(today)
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
    setPending({ backup: res.backup, counts: res.counts, total: res.total, name: t("data.pasted") })
    setMode("merge")
    setPaste(null)
  }
  const exportCsv = async () => {
    const name = (id: string) => allSpaces.find((s) => s.id === id)?.name ?? id
    outcome(await saveFile(backupName(todayIso(), "csv"), new Blob(["﻿" + entriesCsv(all.entries, name)], { type: "text/csv" })))
  }
  const pick = async (f?: File | null) => {
    if (!f) return
    const res = parseBackup(await f.text())
    if (!res.ok) return toast.error(t(`data.err.${res.error}` as MessageKey))
    setPending({ backup: res.backup, counts: res.counts, total: res.total, name: f.name })
    setMode("merge")
  }
  const runImport = async () => {
    if (!pending) return
    setBusy(true)
    try {
      const { docs } = await getStores()
      const r = await importBackup(docs, pending.backup, mode, (d, n) => setProgress(`${d} / ${n}`))
      toast.success(t("data.imported", { w: r.written, d: r.deleted }))
      setPending(null)
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error).message }))
    } finally {
      setBusy(false)
      setProgress(null)
      if (file.current) file.current.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Reveal i={0}>
        <Card className="gap-2.5">
          <Label emoji="bucket">{t("data.export")}</Label>
          <p className="text-[12.5px] leading-[1.45] text-fg-2">{t("data.exportD")}</p>
          <Button onClick={exportJson} disabled={busy} className="h-12 rounded-full text-[15px] font-bold" id="data-export">
            {t("data.exportBtn")}
          </Button>
          <div className="mt-1 rounded-md border border-line bg-surface-2 px-3 py-2.5" id="data-transfer">
            <div className="text-[13px] font-semibold">{t("data.transfer")}</div>
            <p className="mt-0.5 text-[11.5px] leading-[1.45] text-fg-3">{t("data.transferD")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {canShare && (
                <Button variant="outline" onClick={share} disabled={busy} className="h-10 rounded-full">
                  {t("data.share")}
                </Button>
              )}
              <Button variant="outline" onClick={copy} disabled={busy} className="h-10 rounded-full">
                {t("data.copy")}
              </Button>
            </div>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={busy || !all.entries.length} className="h-11 rounded-full">
            {t("data.csvBtn", { n: num(all.entries.length) })}
          </Button>
          <p className="text-[11.5px] text-fg-3">{t("data.photos")}</p>
        </Card>
      </Reveal>

      <Reveal i={1}>
        <Card className="gap-2.5" id="data-import">
          <Label emoji="notebook">{t("data.import")}</Label>
          <p className="text-[12.5px] leading-[1.45] text-fg-2">{t("data.importD")}</p>
          <input ref={file} type="file" accept=".json,application/json" className="hidden" id="data-file" onChange={(e) => pick(e.target.files?.[0])} />
          <Button variant="outline" onClick={() => file.current?.click()} disabled={busy} className="h-11 rounded-full">
            {t("data.chooseFile")}
          </Button>
          {paste == null ? (
            <Button variant="outline" onClick={() => setPaste("")} disabled={busy} className="h-11 rounded-full">
              {t("data.paste")}
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <AreaField id="data-paste" label={t("data.pasteLabel")} value={paste} onChange={setPaste} placeholder='{"format":"hydro-backup",…}' />
              <div className="flex gap-2">
                <Button variant="outline" className="h-10 flex-1 rounded-full" onClick={() => setPaste(null)}>
                  {t("data.cancel")}
                </Button>
                <Button className="h-10 flex-1 rounded-full font-bold" onClick={readPaste} disabled={!paste.trim()}>
                  {t("data.pasteRead")}
                </Button>
              </div>
            </div>
          )}
          {pending && (
            <div className="flex flex-col gap-2.5 rounded-md border border-line bg-surface-2 px-3 py-3" id="data-summary">
              <b className="text-[13.5px]">{t("data.fileSummary", { name: pending.name, n: pending.total, date: pending.backup.exportedAt.slice(0, 10) })}</b>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12px] text-fg-2">
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
              <p className={mode === "replace" ? "text-[12px] font-medium text-bad" : "text-[12px] text-fg-3"}>{mode === "replace" ? t("data.replaceD") : t("data.mergeD")}</p>
              <div className="flex gap-2">
                <Button variant="outline" className="h-11 flex-1 rounded-full" onClick={() => setPending(null)} disabled={busy}>
                  {t("data.cancel")}
                </Button>
                <Button className={mode === "replace" ? "h-11 flex-1 rounded-full bg-bad font-bold text-white hover:bg-bad/90" : "h-11 flex-1 rounded-full font-bold"} onClick={runImport} disabled={busy}>
                  {progress ?? t("data.confirm")}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </Reveal>
      <SourceNote>{t("data.note")}</SourceNote>
    </div>
  )
}
