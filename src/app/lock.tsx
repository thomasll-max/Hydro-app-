// Verrouiller l'app (lot 12d): the gate over the whole app (Aujourd'hui and its morning summary included), the lock
// screen with its PIN pad, the fingerprint or face in the installed local version, and « PIN oublié ? » (the reset is
// the only way out). The app stays mounted under it (nothing typed is lost) but hidden and inert: a privacy screen.
import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Delete, Fingerprint } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Wordmark } from "@/components/hydro/wordmark"
import { useSettings } from "@/app/settings-context"
import { getStores } from "@/store"
import { resetData } from "@/lib/reset"
import { installed, lockedAfter, MAX_FAILS, readLock, tryPin, unlockWithBiometrics, writeLock, type LockState } from "@/lib/lock"
import { cn } from "@/lib/utils"

/** Told when the lock is turned on, off or changed in Réglages. */
export const LOCK_EVENT = "hydro-lock"
export const lockChanged = () => window.dispatchEvent(new Event(LOCK_EVENT))

/**
 * The lock screen's touches and focus stay in it: an open sheet under it would read them as a tap outside and try to
 * close (and ask to drop what was typed).
 */
function keepInside(el: HTMLDivElement | null) {
  if (!el) return
  for (const type of ["pointerdown", "mousedown", "touchstart", "focusin"]) el.addEventListener(type, (e) => e.stopPropagation())
}

export function LockGate({ children }: { children: ReactNode }) {
  const [st, setSt] = useState<LockState | null>(readLock)
  const [locked, setLocked] = useState(() => !!readLock())
  const hiddenAt = useRef<number | null>(null)
  useEffect(() => {
    const changed = () => {
      const s = readLock()
      setSt(s)
      if (!s) setLocked(false)
    }
    window.addEventListener(LOCK_EVENT, changed)
    return () => window.removeEventListener(LOCK_EVENT, changed)
  }, [])
  useEffect(() => {
    const vis = () => {
      if (document.visibilityState === "hidden") hiddenAt.current = Date.now()
      else {
        const s = readLock()
        if (s && lockedAfter(hiddenAt.current, Date.now(), s.delayMin)) {
          setSt(s)
          setLocked(true)
        }
        hiddenAt.current = null
      }
    }
    document.addEventListener("visibilitychange", vis)
    return () => document.removeEventListener("visibilitychange", vis)
  }, [])
  // Locked: everything else on the page goes inert and silent, the sheets and the toasts too (they live in their own
  // layers at the end of the page); the lock screen is the page's last layer, above them all.
  useEffect(() => {
    if (!locked) return
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    const host = document.getElementById("lock-host")
    const others = [...document.body.children].filter((el) => el !== host && !el.hasAttribute("inert")) as HTMLElement[]
    for (const el of others) {
      el.setAttribute("inert", "")
      el.setAttribute("aria-hidden", "true")
    }
    return () => {
      for (const el of others) {
        el.removeAttribute("inert")
        el.removeAttribute("aria-hidden")
      }
    }
  }, [locked])
  return (
    <>
      <div className={locked ? "invisible" : undefined}>{children}</div>
      {locked &&
        st &&
        createPortal(
          <div id="lock-host" ref={keepInside}>
            <LockScreen state={st} onState={setSt} onUnlock={() => setLocked(false)} />
          </div>,
          document.body,
        )}
    </>
  )
}

function LockScreen({ state, onState, onUnlock }: { state: LockState; onState: (s: LockState) => void; onUnlock: () => void }) {
  const { t } = useSettings()
  const [pin, setPin] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [resetting, setResetting] = useState(false)
  const waitS = state.until && now < state.until ? Math.ceil((state.until - now) / 1000) : 0
  useEffect(() => {
    if (!state.until) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [state.until])
  const bio = !!state.webauthn && installed()

  const submit = async (p = pin) => {
    if (busy || p.length < 4 || waitS) return
    setBusy(true)
    const r = await tryPin(state, p)
    writeLock(r.state)
    onState(r.state)
    setPin("")
    setBusy(false)
    if (r.ok) return onUnlock()
    setNow(Date.now())
    setMsg(r.waitMs ? null : r.state.fails < MAX_FAILS ? t("lk.wrongLeft", { n: MAX_FAILS - r.state.fails }) : t("lk.wrong"))
  }
  const press = (d: string) => {
    if (waitS || busy) return
    setMsg(null)
    setPin((x) => (x.length < 6 ? x + d : x))
  }
  // The phone's keyboard too.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === "Backspace") setPin((x) => x.slice(0, -1))
      else if (e.key === "Enter") submit()
    }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  })
  const useBio = async () => {
    if (state.webauthn && (await unlockWithBiometrics(state.webauthn.id))) {
      const s = { ...state, fails: 0, until: undefined }
      writeLock(s)
      onUnlock()
    }
  }
  const reset = async () => {
    setResetting(true)
    try {
      const { docs, photos } = await getStores()
      await resetData(docs, photos)
    } finally {
      location.reload()
    }
  }

  const key = "flex h-16 items-center justify-center rounded-[14px] text-[1.5rem] font-num font-semibold text-fg active:bg-surface-2 disabled:opacity-40"
  return (
    // pointer-events: an open sheet turns them off on the page's body; the lock screen takes them back.
    <div role="dialog" aria-modal="true" aria-labelledby="lock-title" style={{ pointerEvents: "auto" }} className="fixed inset-0 z-[2147483647] flex flex-col items-center overflow-y-auto bg-background px-6 pt-[max(env(safe-area-inset-top),2.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]" id="lock-screen">
      <Wordmark size={30} />
      <h1 id="lock-title" className="display mt-8 text-[1.375rem] leading-tight">
        {t("lk.lockedTitle")}
      </h1>
      <p className="mt-1 text-[0.875rem] text-fg-2">{t("lk.enterPin")}</p>
      <div className="mt-6 flex h-4 gap-3" aria-hidden="true" id="lock-dots">
        {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
          <span key={i} className={cn("size-3.5 rounded-full border-2 border-fg-2", i < pin.length && "border-fg bg-fg")} />
        ))}
      </div>
      <p role="status" aria-live="polite" className={cn("mt-4 min-h-5 text-center text-[0.8125rem] font-semibold", waitS ? "text-warn" : "text-bad")} id="lock-msg">
        {waitS ? t("lk.wait", { s: waitS }) : msg}
      </p>
      <div className="mt-4 grid w-full max-w-[300px] grid-cols-3 gap-2" id="lock-pad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" className={key} onClick={() => press(d)} disabled={!!waitS || busy} data-key={d}>
            {d}
          </button>
        ))}
        <button type="button" className={key} onClick={() => setPin((x) => x.slice(0, -1))} aria-label={t("lk.del")} disabled={!pin} data-key="del">
          <Delete className="size-6" />
        </button>
        <button type="button" className={key} onClick={() => press("0")} disabled={!!waitS || busy} data-key="0">
          0
        </button>
        <button type="button" className={cn(key, "text-[1rem]")} onClick={() => submit()} disabled={pin.length < 4 || !!waitS || busy} data-key="ok">
          {t("lk.ok")}
        </button>
      </div>
      {bio && (
        <Button variant="outline" className="mt-5 h-12" onClick={useBio} id="lock-bio">
          <Fingerprint className="size-5" /> {t("lk.unlockBio")}
        </Button>
      )}
      <button type="button" onClick={() => setForgot((x) => !x)} className="mt-6 min-h-11 text-[0.8125rem] font-semibold text-fg-2 underline decoration-water decoration-[1.5px] underline-offset-4" id="lock-forgot" aria-expanded={forgot}>
        {t("lk.forgot")}
      </button>
      {forgot && (
        <div className="mt-2 flex max-w-[340px] flex-col gap-3 rounded-[14px] border border-line p-4" id="lock-forgot-box">
          <p className="text-[0.8125rem] leading-[1.5] text-fg-2">{t("lk.forgotD")}</p>
          <Button variant="destructive" className="h-11" onClick={reset} disabled={resetting} id="lock-reset">
            {t("lk.forgotReset")}
          </Button>
        </div>
      )}
    </div>
  )
}
