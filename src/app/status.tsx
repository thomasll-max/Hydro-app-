// Screens shown instead of the app when the data cannot be trusted (lot 10a): a read failed, the artifact database is
// missing, the viewer is not the owner, or the app crashed. Nothing is written from here except on an explicit tap.
import { useState } from "react"
import { translate } from "@/i18n/core"
import type { Lang, MessageKey } from "@/i18n/types"
import { getStores } from "@/store"
import { exportRaw } from "@/lib/backup"
import { saveFile } from "@/lib/download"
import { resetData } from "@/lib/reset"
import { todayIso } from "@/calc/stage"

/** Works outside the providers too (error boundary): the language comes from <html lang>. */
const tr = (key: MessageKey, vars?: Record<string, string | number>) => translate((document.documentElement.lang === "en" ? "en" : "fr") as Lang, key, vars)

const btn = "h-12 rounded-full px-5 text-[15px] font-bold"

function Frame({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-full" id={id}>
      <main className="mx-auto flex max-w-[480px] flex-col gap-3 px-4 pt-[calc(env(safe-area-inset-top,0px)+40px)] pb-10">
        <h1 className="text-[22px] font-bold tracking-[-0.4px]">{title}</h1>
        {children}
      </main>
    </div>
  )
}

/** A read failed, or the artifact's database is not served: never an empty grow (and never a seed over real data). */
export function ProblemScreen({ kind, onRetry }: { kind: "store" | "read"; onRetry: () => void }) {
  return (
    <Frame id="load-problem" title={tr(kind === "store" ? "safe.storeTitle" : "safe.readTitle")}>
      <p className="text-[14.5px] leading-[1.5] text-fg-2">{tr(kind === "store" ? "safe.storeBody" : "safe.readBody")}</p>
      <p className="text-[13px] leading-[1.45] text-fg-3">{tr("safe.nothingLost")}</p>
      <button type="button" className={`${btn} mt-2 self-start bg-primary text-primary-foreground`} onClick={onRetry} id="load-retry">
        {tr("safe.retry")}
      </button>
    </Frame>
  )
}

/** Claude version opened by someone the artifact is shared with: the 17 rules let only the owner read. */
export function OwnerOnly() {
  return (
    <Frame id="owner-only" title={tr("safe.ownerTitle")}>
      <p className="text-[14.5px] leading-[1.5] text-fg-2">{tr("safe.ownerBody")}</p>
    </Frame>
  )
}

/** Crash screen actions: save every document as stored (even malformed ones), or start over after a confirmation. */
export function RescueActions() {
  const [state, setState] = useState<"idle" | "busy" | "confirm">("idle")
  const [msg, setMsg] = useState<string | null>(null)
  const exportAll = async () => {
    setState("busy")
    try {
      const { docs } = await getStores()
      const res = await saveFile(`hydro-brut-${todayIso()}.json`, new Blob([await exportRaw(docs)], { type: "application/json" }))
      setMsg(tr(res === "saved" ? "safe.rawSaved" : "safe.rawFailed"))
    } catch (e) {
      setMsg(`${tr("safe.rawFailed")} (${(e as Error).message})`)
    } finally {
      setState("idle")
    }
  }
  const reset = async () => {
    setState("busy")
    try {
      const { docs, photos } = await getStores()
      await resetData(docs, photos)
      location.reload()
    } catch (e) {
      setMsg(`${tr("safe.resetFailed")} (${(e as Error).message})`)
      setState("idle")
    }
  }
  const base = { marginTop: 8, padding: "10px 16px", borderRadius: 999, marginRight: 8 } as const
  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ fontSize: 13, opacity: 0.75 }}>{tr("safe.rescueHint")}</p>
      <button type="button" style={base} onClick={exportAll} disabled={state === "busy"} id="rescue-export">
        {tr("safe.exportRaw")}
      </button>
      {state === "confirm" ? (
        <button type="button" style={{ ...base, background: "#b42318", color: "#fff" }} onClick={reset} id="rescue-reset-confirm">
          {tr("safe.resetConfirm")}
        </button>
      ) : (
        <button type="button" style={base} onClick={() => setState("confirm")} disabled={state === "busy"} id="rescue-reset">
          {tr("safe.reset")}
        </button>
      )}
      {msg && <p style={{ fontSize: 13, marginTop: 8 }}>{msg}</p>}
    </div>
  )
}
