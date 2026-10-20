// Réglages → Verrouiller l'app (lot 12d): turn the PIN on (typed twice, « note-le » and a backup offered at once), the
// delay in the background (1, 5 or 15 min), the fingerprint or face in the installed local version, change the PIN,
// turn it off (with the PIN). One line says it plainly: a privacy screen, not an encryption.
import { useEffect, useState } from "react"
import { Lock } from "lucide-react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Seg, Sheet, TextField } from "@/components/hydro/form"
import { Label, Notice, Reveal } from "@/components/hydro/primitives"
import { tertiary } from "@/components/hydro/styles"
import { useSettings } from "@/app/settings-context"
import { navigate, whenSheetsClosed } from "@/app/nav"
import { lockChanged } from "@/app/lock"
import { TARGET } from "@/store"
import { biometricsAvailable, installed, LOCK_DELAYS, makeLock, readLock, registerBiometrics, storageWorks, tryPin, validPin, writeLock, type LockDelay, type LockState } from "@/lib/lock"
import { SwitchRow } from "./equipment-shared"

type Mode = "on" | "change" | "off"

export function LockCard({ i }: { i: number }) {
  const { t } = useSettings()
  const [st, setSt] = useState<LockState | null>(readLock)
  const [mode, setMode] = useState<Mode | null>(null)
  const [bioOk, setBioOk] = useState(false)
  const canStore = storageWorks()
  useEffect(() => {
    // Fingerprint or face: the installed local version only (the artifact keeps the PIN alone).
    if (TARGET === "local" && installed()) biometricsAvailable().then(setBioOk)
  }, [])
  const save = (s: LockState | null) => {
    writeLock(s)
    setSt(s)
    lockChanged()
  }
  const setDelay = (d: string) => st && save({ ...st, delayMin: Number(d) as LockDelay })
  const toggleBio = async (on: boolean) => {
    if (!st) return
    if (!on) return save({ ...st, webauthn: undefined })
    const c = await registerBiometrics()
    if (c) save({ ...st, webauthn: c })
    else toast.error(t("lk.bioFail"))
  }
  return (
    <Reveal i={i} className="mb-3">
      <Card className="gap-2.5" id="lock-card">
        <Label>{t("lk.title")}</Label>
        <p className="text-[0.78125rem] leading-[1.45] text-fg-2">{t("lk.desc")}</p>
        <Notice tone="info" id="lock-honest">
          {t("lk.honest")}
        </Notice>
        {!canStore ? (
          <Notice id="lock-nostorage">{t("lk.noStorage")}</Notice>
        ) : !st ? (
          <Button variant="outline" className="h-11 self-start" onClick={() => setMode("on")} id="lock-on">
            <Lock className="size-4" /> {t("lk.on")}
          </Button>
        ) : (
          <>
            <p className="flex items-center gap-1.5 text-[0.875rem] font-semibold" id="lock-state">
              <Lock className="size-4" /> {t("lk.enabled")}
            </p>
            <div className="flex flex-col gap-1">
              <span className="text-[0.8125rem] font-semibold text-fg-2">
                {t("lk.delay")} <span className="font-normal text-fg-3">· {t("lk.delayD")}</span>
              </span>
              <Seg label={t("lk.delay")} value={String(st.delayMin)} onChange={setDelay} options={LOCK_DELAYS.map((d) => ({ value: String(d), label: t("lk.delayN", { n: d }) }))} />
            </div>
            {bioOk && <SwitchRow id="lock-bio-on" label={t("lk.bio")} hint={t("lk.bioD")} checked={!!st.webauthn} onChange={toggleBio} />}
            <div className="flex flex-wrap gap-x-4">
              <button type="button" className={tertiary} onClick={() => setMode("change")} id="lock-change">
                {t("lk.change")}
              </button>
              <button type="button" className={tertiary} onClick={() => setMode("off")} id="lock-off">
                {t("lk.off")}
              </button>
            </div>
          </>
        )}
      </Card>
      <PinSheet mode={mode} state={st} onClose={() => setMode(null)} onSave={save} />
    </Reveal>
  )
}

function PinSheet({ mode, state, onClose, onSave }: { mode: Mode | null; state: LockState | null; onClose: () => void; onSave: (s: LockState | null) => void }) {
  const { t } = useSettings()
  const [cur, setCur] = useState("")
  const [a, setA] = useState("")
  const [b, setB] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!mode) return
    setCur("")
    setA("")
    setB("")
    setErr(null)
    setDone(false)
  }, [mode])
  const digits = (set: (v: string) => void) => (v: string) => set(v.replace(/\D/g, "").slice(0, 6))
  const go = async () => {
    setErr(null)
    if (mode !== "on" && state) {
      const r = await tryPin(state, cur)
      writeLock(r.state)
      if (!r.ok) return setErr(r.waitMs ? t("lk.wait", { s: Math.ceil(r.waitMs / 1000) }) : t("lk.wrong"))
      if (mode === "off") {
        onSave(null)
        toast.success(t("lk.disabled"))
        return onClose()
      }
    }
    if (!validPin(a)) return setErr(t("lk.invalid"))
    if (a !== b) return setErr(t("lk.mismatch"))
    setBusy(true)
    try {
      const s = await makeLock(a, state?.delayMin)
      onSave(state?.webauthn ? { ...s, webauthn: state.webauthn } : s)
      toast.success(t(mode === "on" ? "lk.enabled" : "lk.changed"))
      // Turned on: « note-le », and a backup offered right away.
      if (mode === "on") setDone(true)
      else onClose()
    } finally {
      setBusy(false)
    }
  }
  const title = mode === "off" ? t("lk.off") : mode === "change" ? t("lk.change") : t("lk.on")
  const pinField = (id: string, label: string, v: string, set: (v: string) => void) => <TextField id={id} label={label} value={v} onChange={digits(set)} type="password" inputMode="numeric" autoComplete="off" />
  return (
    <Sheet
      open={!!mode}
      onOpenChange={(o) => !o && onClose()}
      title={title}
      dirty={false}
      footer={
        done ? (
          <Button className="h-12 w-full" onClick={onClose} id="pin-close">
            {t("common.close")}
          </Button>
        ) : (
          <Button className="h-12 w-full" onClick={go} disabled={busy} id="pin-save">
            {mode === "off" ? t("lk.off") : t("lk.ok")}
          </Button>
        )
      }
    >
      {done ? (
        <div className="flex flex-col gap-3 pb-3" id="pin-done">
          <Notice tone="warn">{t("lk.writeIt")}</Notice>
          <button
            type="button"
            className={tertiary}
            onClick={() => {
              onClose()
              whenSheetsClosed(() => navigate({ tab: "tools", tool: "data" }))
            }}
            id="pin-backup"
          >
            {t("lk.backupNow")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-3">
          {mode !== "on" && pinField("pin-current", t("lk.current"), cur, setCur)}
          {mode !== "off" && (
            <>
              {pinField("pin-a", t("lk.choose"), a, setA)}
              {pinField("pin-b", t("lk.again"), b, setB)}
              {mode === "on" && <Notice tone="warn">{t("lk.writeIt")}</Notice>}
            </>
          )}
          {err && (
            <p role="alert" className="text-[0.8125rem] font-semibold text-bad" id="pin-err">
              {err}
            </p>
          )}
        </div>
      )}
    </Sheet>
  )
}
