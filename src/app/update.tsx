// Version locale (lot 8e) : « Nouvelle version disponible — Mettre à jour ». version.json is checked when the app comes
// back to the foreground and every 30 min. Never reloads by itself, and the button waits while a form is open.
import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { useSettings } from "./settings-context"
import { useEditors } from "./editors"
import { TARGET } from "@/store"
import { CHECK_EVERY_MS, CURRENT_BUILD, isNewerBuild, parseBuildInfo, VERSION_FILE, type BuildInfo } from "@/lib/version"

export function useNewBuild(): BuildInfo | null {
  const [remote, setRemote] = useState<BuildInfo | null>(null)
  useEffect(() => {
    if (TARGET !== "local" || !location.protocol.startsWith("http")) return
    let stopped = false
    const check = async () => {
      if (navigator.onLine === false) return // offline: next time the app comes back to the foreground
      try {
        const res = await fetch(`${VERSION_FILE}?t=${Date.now()}`, { cache: "no-store" })
        if (!res.ok) return
        const b = parseBuildInfo(await res.json())
        if (!stopped && isNewerBuild(CURRENT_BUILD, b)) setRemote(b)
      } catch {
        /* offline: try again later */
      }
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") void check()
    }
    void check()
    document.addEventListener("visibilitychange", onVisible)
    const timer = window.setInterval(check, CHECK_EVERY_MS)
    return () => {
      stopped = true
      document.removeEventListener("visibilitychange", onVisible)
      window.clearInterval(timer)
    }
  }, [])
  return remote
}

export function UpdateBanner() {
  const { t } = useSettings()
  const { editing } = useEditors()
  const remote = useNewBuild()
  if (!remote || editing) return null
  const update = async () => {
    try {
      // Fetch the new service worker too, so the reload is served by it.
      await (await navigator.serviceWorker?.getRegistration())?.update()
    } catch {
      /* the reload still gets the new page (network first) */
    }
    location.reload()
  }
  return (
    <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+60px)] z-30 px-4" role="status" id="update-banner">
      <div className="mx-auto flex max-w-[448px] items-center gap-3 rounded-full border border-primary/40 bg-surface/95 py-1.5 pr-1.5 pl-4 shadow-[0_6px_20px_rgba(0,0,0,0.35)] backdrop-blur">
        <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold">{t("update.available")}</span>
        <button type="button" onClick={update} className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 text-[0.8125rem] font-bold text-primary-foreground" id="update-now">
          <RefreshCw className="size-3.5" /> {t("update.now")}
        </button>
      </div>
    </div>
  )
}
