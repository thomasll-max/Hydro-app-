// Assistant de premier lancement (lot 8b, version locale) : nom du grow → espaces → équipement (facultatif) → modules →
// gamme, add-ons et méthode → premier cycle → heure du résumé. « Importer une sauvegarde » dès l'accueil. The draft
// stays on the device until "Terminer"; then everything is written at once, grow/main last.
import { useEffect, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { ChevronLeft, Copy, Plus, Trash2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AreaField, Grid, NumField, Seg, TextField } from "@/components/hydro/form"
import { Emoji } from "@/components/hydro/emoji"
import { Label, Reveal } from "@/components/hydro/primitives"
import { LangSwitch } from "@/components/hydro/top-bar"
import { spaceColor } from "@/components/hydro/space-pill"
import { navigate } from "@/app/nav"
import { useSettings } from "@/app/settings-context"
import { newId, useGrow } from "@/app/grow-context"
import { parseNum } from "@/calc/formulas"
import { todayIso } from "@/calc/stage"
import { importBackup, MAX_BACKUP_BYTES, parseBackup, type Backup } from "@/lib/backup"
import type { BatchOp } from "@/store/doc-store"
import { freeColor, newGrow } from "@/model/grow-ops"
import { MODULES, SPACE_COLORS, TEMPLATES, type TemplateId } from "@/model/grow"
import type { Substrate, WaterMode } from "@/model/types"
import type { MessageKey } from "@/i18n/types"
import {
  draftDocs,
  draftSpace,
  copyGearToOthers,
  duplicateDraftSpace,
  emptyDraft,
  loadDraft,
  loadStep,
  removeDraftSpace,
  saveDraft,
  setTemplate,
  startCycle,
  stepIssues,
  STEPS,
  type Draft,
  type DraftGear,
  type DraftSpace,
} from "@/lib/onboarding"
import { NutritionFields } from "./tools/nutrition-settings"
import { SwitchRow } from "./tools/equipment-shared"
import { InstallTip } from "./install-tip"
import { cn } from "@/lib/utils"

/** Collections the assistant writes before grow/main (cleared if an earlier attempt was cut short). */
const SETUP_COLLECTIONS = ["spaces", "equipment", "equipmentAssignments", "cycles"] as const

const deviceZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
  } catch {
    return undefined
  }
}

export function Onboarding() {
  const { t, num } = useSettings()
  const { withSetup } = useGrow()
  const [draft, setDraft] = useState<Draft>(() => loadDraft() ?? emptyDraft(t("onb.firstSpace")))
  // 0 = welcome, 1…7 = STEPS
  const [step, setStep] = useState(() => (loadDraft() ? loadStep() : 0))
  const [busy, setBusy] = useState(false)
  const top = useRef<HTMLDivElement>(null)
  useEffect(() => {
    saveDraft(draft, step)
  }, [draft, step])
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])

  const key = STEPS[step - 1]
  const issues = key ? stepIssues(draft, key) : []
  // What is missing shows once Next is tapped, not before anything was typed (lot 10e).
  const [tried, setTried] = useState<number | null>(null)
  const showIssue = tried === step && issues.length > 0
  const next = (go: () => void) => () => {
    if (issues.length) setTried(step)
    else go()
  }
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }))
  const patchSpace = (k: string, p: Partial<DraftSpace>) => setDraft((d) => ({ ...d, spaces: d.spaces.map((s) => (s.key === k ? { ...s, ...p } : s)) }))
  const patchGear = (k: string, p: Partial<DraftGear>) => setDraft((d) => ({ ...d, spaces: d.spaces.map((s) => (s.key === k ? { ...s, gear: { ...s.gear, ...p } } : s)) }))
  const duplicate = (k: string) => setDraft((d) => duplicateDraftSpace(d, k, newId("k"), (n) => t("space.copyName", { name: n })))

  const finish = async () => {
    setBusy(true)
    try {
      const docs = draftDocs(draft, {
        now: new Date().toISOString(),
        today: todayIso(),
        id: newId,
        timeZone: deviceZone(),
        names: {
          lamp: t("onb.lamp"),
          pots: (v) => t("irr.potsName", { v: num(v, v % 1 ? 1 : 0) }),
          tank: (l) => t("onb.tankName", { l: num(l, l % 1 ? 1 : 0) }),
          extractor: t("onb.extractor"),
        },
      })
      await withSetup(async (store) => {
        // An earlier attempt cut short (app closed while writing) left documents without grow/main: they are replaced,
        // and everything is written in one go (one transaction on the phone), grow/main included (lot 10a).
        const leftovers: BatchOp[] = (await store.get("grow/main"))
          ? []
          : (await Promise.all(SETUP_COLLECTIONS.map(async (c) => Object.keys(await store.list(c)).map((id) => [`${c}/${id}`, null] as const)))).flat()
        const ops: BatchOp[] = [...leftovers, ...docs]
        if (store.batch) await store.batch(ops)
        else for (const [p, doc] of ops) await (doc ? store.set(p, doc) : store.delete(p))
      })
      saveDraft(null)
      toast.success(t("onb.ready", { name: draft.name.trim() }))
      // Next: the getting-started guide (what to enter, then how the app works).
      navigate({ tab: "tools", tool: "start" })
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error).message }))
      setBusy(false)
    }
  }
  const skip = async () => {
    setBusy(true)
    try {
      const now = new Date().toISOString()
      const zone = deviceZone()
      await withSetup((store) => store.set("grow/main", { ...newGrow(draft.name.trim() || t("onb.defaultName"), now, draft.nutrition), ...(zone ? { timeZone: zone } : {}) }))
      saveDraft(null)
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error).message }))
      setBusy(false)
    }
  }

  return (
    <div ref={top} className="relative min-h-full">
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 h-[360px] bg-[radial-gradient(closest-side,var(--glow),transparent)] [inset-inline:-30%]" />
      <main
        id="onboarding"
        className="relative mx-auto max-w-[480px] pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-[calc(env(safe-area-inset-bottom,0px)+120px)] pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))]"
      >
        {step === 0 ? (
          <Welcome onStart={() => setStep(1)} onSkip={skip} busy={busy} />
        ) : (
          <>
            <header className="mb-4">
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow" id="onb-count">
                  {t("onb.stepOf", { n: step, total: STEPS.length })}
                </span>
                <button type="button" onClick={skip} disabled={busy} className="h-11 px-1 text-[0.78125rem] font-semibold text-fg-3">
                  {t("onb.skip")}
                </button>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${(step / STEPS.length) * 100}%` }} />
              </div>
              <h1 className="mt-3 text-[1.5rem] leading-[1.15] font-semibold tracking-[-0.5px]" id="onb-title">
                {t(`onb.s.${key}` as MessageKey)}
              </h1>
              <p className="mt-1 text-[0.8125rem] leading-[1.45] text-fg-2">{t(`onb.d.${key}` as MessageKey)}</p>
            </header>

            {key === "name" && (
              <Card className="gap-2.5">
                <TextField id="onb-name" label={t("growSet.name")} placeholder={t("onb.defaultName")} value={draft.name} onChange={(v) => patch({ name: v })} />
              </Card>
            )}

            {key === "spaces" && (
              <div className="flex flex-col gap-3">
                {draft.spaces.map((s, i) => (
                  <SpaceCard key={s.key} s={s} i={i} canRemove={draft.spaces.length > 1} onChange={(p) => patchSpace(s.key, p)} onDuplicate={() => duplicate(s.key)} onRemove={() => setDraft((d) => removeDraftSpace(d, s.key))} />
                ))}
                <button
                  type="button"
                  id="onb-add-space"
                  onClick={() => setDraft((d) => ({ ...d, spaces: [...d.spaces, draftSpace(newId("k"), t("onb.spaceN", { n: d.spaces.length + 1 }), "veg", freeColor(d.spaces.map((x) => x.color)))] }))}
                  className="flex h-12 items-center justify-center gap-1.5 rounded-full border border-dashed border-line-strong text-[0.875rem] font-semibold text-primary"
                >
                  <Plus className="size-4" /> {t("space.add")}
                </button>
              </div>
            )}

            {key === "equipment" && (
              <div className="flex flex-col gap-3">
                {draft.spaces.map((s, i) => (
                  <GearCard
                    key={s.key}
                    s={s}
                    i={i}
                    onChange={(p) => patchGear(s.key, p)}
                    onCopy={
                      draft.spaces.length > 1
                        ? () => {
                            setDraft((d) => copyGearToOthers(d, s.key))
                            toast.success(t("onb.gearCopied"))
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            )}

            {key === "modules" && (
              <div className="flex flex-col gap-3">
                {draft.spaces.map((s, i) => (
                  <Card key={s.key} className="gap-1">
                    <SpaceTitle s={s} i={i} />
                    <div className="mt-1">
                      {MODULES.map((m) => (
                        <SwitchRow key={m} id={`onb-m-${s.key}-${m}`} label={t(`module.${m}`)} checked={!!s.modules[m]} onChange={(v) => patchSpace(s.key, { modules: { ...s.modules, [m]: v } })} />
                      ))}
                    </div>
                  </Card>
                ))}
                <p className="text-[0.75rem] text-fg-3">{t("space.modulesD")}</p>
              </div>
            )}

            {key === "nutrition" && (
              <Card className="gap-2.5">
                <NutritionFields value={draft.nutrition} onChange={(n) => patch({ nutrition: n })} idPrefix="onb" />
              </Card>
            )}

            {key === "cycle" && <CycleStep draft={draft} onChange={(c) => patch({ cycle: c })} />}

            {key === "digest" && (
              <div className="flex flex-col gap-3">
                <Card className="gap-2.5">
                  <TextField id="onb-digest" type="time" label={t("growSet.digest")} value={draft.digestTime} onChange={(v) => patch({ digestTime: v })} />
                  <p className="text-[0.75rem] leading-snug text-fg-3">{t("onb.digestLocal")}</p>
                </Card>
                <Recap draft={draft} />
                <InstallTip />
              </div>
            )}
          </>
        )}
      </main>

      {step > 0 && (
        <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-[480px] flex-col gap-2 pt-3 pr-[max(16px,env(safe-area-inset-right,0px))] pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pl-[max(16px,env(safe-area-inset-left,0px))]">
            {showIssue && (
              <p className="text-[0.75rem] font-medium text-warn" id="onb-issue" role="alert">
                {t(`onb.issue.${issues[0]}` as MessageKey)}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="h-12 rounded-full px-4" onClick={() => setStep((n) => n - 1)} disabled={busy} aria-label={t("onb.back")}>
                <ChevronLeft className="size-4.5" />
              </Button>
              {step < STEPS.length ? (
                <Button className="h-12 flex-1 rounded-full text-[0.9375rem] font-bold" id="onb-next" onClick={next(() => setStep((n) => n + 1))}>
                  {key === "equipment" || key === "cycle" ? (stepEmpty(draft, key) ? t("onb.later") : t("onb.next")) : t("onb.next")}
                </Button>
              ) : (
                <Button className="h-12 flex-1 rounded-full text-[0.9375rem] font-bold" id="onb-finish" disabled={busy} onClick={next(() => void finish())}>
                  {busy ? t("onb.writing") : t("onb.finish")}
                </Button>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}

/** Optional steps say "Plus tard" while nothing is filled in. */
function stepEmpty(d: Draft, key: "equipment" | "cycle") {
  if (key === "cycle") return !d.cycle
  return d.spaces.every((s) => Object.values(s.gear).every((v) => v == null || v === ""))
}

function Welcome({ onStart, onSkip, busy }: { onStart: () => void; onSkip: () => void; busy: boolean }) {
  const { t } = useSettings()
  return (
    <div className="flex flex-col gap-3">
      <Reveal i={0}>
        <div className="mt-6 mb-2 flex flex-col items-center text-center">
          <Emoji name="pottedPlant" size={88} className="float-y drop-shadow-[0_8px_14px_rgba(0,0,0,0.35)]" />
          <h1 className="mt-3 text-[1.75rem] leading-[1.1] font-semibold tracking-[-0.6px]" id="onb-welcome">
            {t("onb.welcome")}
          </h1>
          <p className="mt-2 max-w-[320px] text-[0.875rem] leading-[1.45] text-fg-2">{t("onb.welcomeD", { n: STEPS.length })}</p>
        </div>
      </Reveal>
      <Reveal i={1}>
        <div className="flex justify-center">
          <LangSwitch wide />
        </div>
      </Reveal>
      <Reveal i={2}>
        <Button className="mt-2 h-13 w-full rounded-full text-[1rem] font-bold" id="onb-start" onClick={onStart}>
          {t("onb.start")}
        </Button>
      </Reveal>
      <Reveal i={3}>
        <ImportCard />
      </Reveal>
      <Reveal i={4}>
        <button type="button" onClick={onSkip} disabled={busy} className="mx-auto block h-11 px-2 text-[0.78125rem] font-semibold text-fg-3" id="onb-skip">
          {t("onb.skipAll")}
        </button>
      </Reveal>
    </div>
  )
}

function ImportCard() {
  const { t, dmy } = useSettings()
  const { withSetup } = useGrow()
  const file = useRef<HTMLInputElement>(null)
  const [paste, setPaste] = useState<string | null>(null)
  const [pending, setPending] = useState<{ backup: Backup; total: number; name: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const read = (text: string, name: string) => {
    const res = parseBackup(text.trim())
    if (!res.ok) return toast.error(t(`data.err.${res.error}` as MessageKey))
    setPending({ backup: res.backup, total: res.total, name })
    setPaste(null)
  }
  const run = async () => {
    if (!pending) return
    setBusy("0")
    try {
      const r = await withSetup((store) => importBackup(store, pending.backup, "replace", (d, n) => setBusy(`${d} / ${n}`)))
      saveDraft(null)
      toast.success(t("data.imported", { w: r.written, d: r.deleted }))
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error).message }))
      setBusy(null)
    }
  }
  return (
    <Card className="mt-2 gap-2.5" id="onb-import">
      <Label emoji="notebook">{t("onb.importTitle")}</Label>
      <p className="text-[0.78125rem] leading-[1.45] text-fg-2">{t("onb.importD")}</p>
      {pending ? (
        <>
          <p className="rounded-md bg-primary/10 px-3 py-2 text-[0.78125rem] font-medium text-primary" id="onb-import-summary">
            {t("onb.importSummary", { name: pending.name, n: pending.total, date: pending.backup.exportedAt ? dmy(pending.backup.exportedAt) : "?" })}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="h-11 flex-1 rounded-full" onClick={() => setPending(null)} disabled={!!busy}>
              {t("common.cancel")}
            </Button>
            <Button className="h-11 flex-1 rounded-full font-bold" onClick={run} disabled={!!busy} id="onb-import-run">
              {busy ? t("onb.importing", { p: busy }) : t("onb.importRun")}
            </Button>
          </div>
        </>
      ) : paste == null ? (
        <div className="flex gap-2">
          <Button variant="outline" className="h-11 flex-1 rounded-full" onClick={() => file.current?.click()}>
            {t("onb.importFile")}
          </Button>
          <Button variant="outline" className="h-11 flex-1 rounded-full" onClick={() => setPaste("")} id="onb-paste-open">
            {t("data.paste")}
          </Button>
        </div>
      ) : (
        <>
          <AreaField id="onb-paste" label={t("data.pasteLabel")} value={paste} onChange={setPaste} placeholder='{"format":"hydro-backup",…}' />
          <div className="flex gap-2">
            <Button variant="outline" className="h-11 flex-1 rounded-full" onClick={() => setPaste(null)}>
              {t("common.cancel")}
            </Button>
            <Button className="h-11 flex-1 rounded-full font-bold" onClick={() => read(paste, t("data.pasted"))} disabled={!paste.trim()} id="onb-paste-read">
              {t("data.pasteRead")}
            </Button>
          </div>
        </>
      )}
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          const input = e.target
          try {
            if (f && f.size > MAX_BACKUP_BYTES) toast.error(t("data.err.size"))
            else if (f) read(await f.text(), f.name)
          } catch {
            toast.error(t("safe.fileFailed"))
          } finally {
            input.value = ""
          }
        }}
      />
    </Card>
  )
}

function SpaceTitle({ s, i, aside }: { s: DraftSpace; i: number; aside?: ReactNode }) {
  const { t } = useSettings()
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-2">
        <span className="size-3 shrink-0 rounded-full" style={{ background: spaceColor(s.color ?? SPACE_COLORS[i % SPACE_COLORS.length]) }} />
        <span className="truncate text-[0.9375rem] font-semibold">{s.name.trim() || t("onb.unnamed")}</span>
        {t(`template.${s.template}`) !== s.name.trim() && <span className="shrink-0 text-[0.75rem] text-fg-3">{t(`template.${s.template}`)}</span>}
      </span>
      {aside}
    </div>
  )
}

/** Number field holding its own text ("2," while typing), reporting the parsed value. */
function Num({ id, label, value, onValue, integer, hint }: { id: string; label: string; value?: number; onValue: (v: number | undefined) => void; integer?: boolean; hint?: string }) {
  const { settings } = useSettings()
  const [s, setS] = useState(value == null ? "" : settings.lang === "fr" ? String(value).replace(".", ",") : String(value))
  return (
    <NumField
      id={id}
      label={label}
      hint={hint}
      integer={integer}
      value={s}
      onChange={(v) => {
        setS(v)
        onValue(parseNum(v))
      }}
    />
  )
}

function SpaceCard({ s, i, canRemove, onChange, onDuplicate, onRemove }: { s: DraftSpace; i: number; canRemove: boolean; onChange: (p: Partial<DraftSpace>) => void; onDuplicate: () => void; onRemove: () => void }) {
  const { t } = useSettings()
  return (
    <Card className="gap-3" id={`onb-space-${i}`}>
      <TextField id={`onb-sp-name-${i}`} label={t("space.name")} value={s.name} onChange={(v) => onChange({ name: v })} />
      <div>
        <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("space.template")}</div>
        <div className="grid grid-cols-3 gap-1.5">
          {TEMPLATES.map((tp) => (
            <button
              key={tp}
              type="button"
              aria-pressed={s.template === tp}
              onClick={() => onChange(setTemplate(s, tp as TemplateId))}
              className={cn("h-11 rounded-md border text-[0.8125rem] font-semibold", s.template === tp ? "border-primary/45 bg-primary/10 text-fg" : "border-line bg-surface-2 text-fg-2")}
            >
              {t(`template.${tp}`)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("space.dims")}</div>
        <Grid cols={3}>
          <Num id={`onb-l-${i}`} integer label={t("space.l")} value={s.dims.l} onValue={(v) => onChange({ dims: { ...s.dims, l: v } })} />
          <Num id={`onb-w-${i}`} integer label={t("space.w")} value={s.dims.w} onValue={(v) => onChange({ dims: { ...s.dims, w: v } })} />
          <Num id={`onb-h-${i}`} integer label={t("space.h")} value={s.dims.h} onValue={(v) => onChange({ dims: { ...s.dims, h: v } })} />
        </Grid>
      </div>
      <div className="flex gap-2">
        <SmallBtn onClick={onDuplicate} id={`onb-dup-${i}`}>
          <Copy className="size-3.5" /> {t("onb.duplicate")}
        </SmallBtn>
        {canRemove && (
          <SmallBtn onClick={onRemove} id={`onb-rm-${i}`}>
            <Trash2 className="size-3.5" /> {t("onb.remove")}
          </SmallBtn>
        )}
      </div>
    </Card>
  )
}

function GearCard({ s, i, onChange, onCopy }: { s: DraftSpace; i: number; onChange: (p: Partial<DraftGear>) => void; onCopy?: () => void }) {
  const { t } = useSettings()
  const g = s.gear
  return (
    <Card className="gap-3" id={`onb-gear-${i}`}>
      <SpaceTitle
        s={s}
        i={i}
        aside={
          onCopy && (
            <SmallBtn onClick={onCopy} id={`onb-gcopy-${i}`}>
              <Copy className="size-3.5" /> {t("onb.copyGear")}
            </SmallBtn>
          )
        }
      />
      <Grid>
        <TextField id={`onb-lamp-${i}`} label={t("onb.lampName")} value={g.lampName ?? ""} onChange={(v) => onChange({ lampName: v || undefined })} />
        <Num id={`onb-lampw-${i}`} integer label={t("onb.lampW")} value={g.lampW} onValue={(v) => onChange({ lampW: v })} />
        <Num id={`onb-potl-${i}`} label={t("irr.pot")} value={g.potL} onValue={(v) => onChange({ potL: v })} />
        <Num id={`onb-potn-${i}`} integer label={t("irr.potCount")} value={g.potN} onValue={(v) => onChange({ potN: v })} />
        <Num id={`onb-tank-${i}`} label={t("onb.tankL")} value={g.tankL} onValue={(v) => onChange({ tankL: v })} />
        <div />
        <TextField id={`onb-ext-${i}`} label={t("onb.extName")} value={g.extName ?? ""} onChange={(v) => onChange({ extName: v || undefined })} />
        <Num id={`onb-extm-${i}`} integer label={t("onb.extM3h")} value={g.extM3h} onValue={(v) => onChange({ extM3h: v })} />
      </Grid>
    </Card>
  )
}

function CycleStep({ draft, onChange }: { draft: Draft; onChange: (c: Draft["cycle"]) => void }) {
  const { t } = useSettings()
  const c = draft.cycle
  const set = (p: Partial<NonNullable<Draft["cycle"]>>) => c && onChange({ ...c, ...p })
  return (
    <div className="flex flex-col gap-3">
      <Seg<"no" | "yes">
        label={t("onb.s.cycle")}
        value={c ? "yes" : "no"}
        onChange={(v) => onChange(v === "yes" ? startCycle(draft, t("onb.cycleName")) : null)}
        options={[
          { value: "no", label: t("onb.cycleLater") },
          { value: "yes", label: t("onb.cycleNow") },
        ]}
      />
      {c && (
        <Card className="gap-3" id="onb-cycle">
          <TextField id="onb-c-name" label={t("cycleForm.name")} value={c.name} onChange={(v) => set({ name: v })} />
          {draft.spaces.length > 1 && (
            <div>
              <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("cycleForm.space")}</div>
              <Seg<string>
                label={t("cycleForm.space")}
                value={c.spaceKey}
                onChange={(k) => {
                  const sp = draft.spaces.find((s) => s.key === k)
                  set({ spaceKey: k, potL: c.potL ?? sp?.gear.potL, potN: c.potN ?? sp?.gear.potN })
                }}
                options={draft.spaces.map((s) => ({ value: s.key, label: s.name.trim() || t("onb.unnamed") }))}
              />
            </div>
          )}
          <TextField id="onb-c-cult" label={t("cycleForm.cultivars")} hint={t("cycleForm.cultivarsHint")} value={c.cultivars} onChange={(v) => set({ cultivars: v })} />
          <TextField id="onb-c-germ" type="date" label={t("cycleForm.germination")} value={c.germinationDate ?? ""} onChange={(v) => set({ germinationDate: v || undefined })} />
          <div>
            <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("cycleForm.substrate")}</div>
            <Seg<Substrate> label={t("cycleForm.substrate")} value={c.substrate} onChange={(v) => set({ substrate: v })} options={(["coco", "soil", "mix7030"] as const).map((v) => ({ value: v, label: t(`substrate.${v}`) }))} />
          </div>
          <div>
            <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("cycleForm.waterMode")}</div>
            <Seg<WaterMode> label={t("cycleForm.waterMode")} value={c.waterMode} onChange={(v) => set({ waterMode: v })} options={(["auto", "manual"] as const).map((v) => ({ value: v, label: t(`mode.${v}`) }))} />
          </div>
          <Grid>
            <Num key={`pl-${c.spaceKey}`} id="onb-c-potl" label={t("cycleForm.potVolume")} value={c.potL} onValue={(v) => set({ potL: v })} />
            <Num key={`pn-${c.spaceKey}`} id="onb-c-potn" integer label={t("cycleForm.potCount")} value={c.potN} onValue={(v) => set({ potN: v })} />
          </Grid>
          <TextField id="onb-c-on" type="time" label={t("cycleForm.lightsOn")} value={c.lightsOn} onChange={(v) => set({ lightsOn: v })} />
          <p className="text-[0.75rem] leading-snug text-fg-3">{t("onb.cycleNote")}</p>
        </Card>
      )}
    </div>
  )
}

function Recap({ draft }: { draft: Draft }) {
  const { t } = useSettings()
  const gear = draft.spaces.reduce((n, s) => n + [s.gear.lampName || s.gear.lampW, s.gear.potL, s.gear.tankL, s.gear.extName || s.gear.extM3h].filter(Boolean).length, 0)
  const rows: [string, string][] = [
    [t("growSet.name"), draft.name.trim()],
    [t("growSet.spaces"), draft.spaces.map((s) => s.name.trim()).join(", ")],
    [t("onb.recapGear"), gear ? t("onb.recapItems", { n: gear }) : t("onb.recapNone")],
    [t("growSet.cycles"), draft.cycle ? `${draft.cycle.name}${draft.cycle.cultivars.trim() ? ` · ${draft.cycle.cultivars.trim()}` : ""}` : t("onb.recapNone")],
  ]
  return (
    <Card className="gap-1" id="onb-recap">
      <Label emoji="notebook">{t("onb.recap")}</Label>
      <dl className="mt-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-t border-line py-2 text-[0.8125rem] first:border-t-0">
            <dt className="shrink-0 text-fg-3">{k}</dt>
            <dd className="min-w-0 text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

function SmallBtn({ onClick, id, children }: { onClick: () => void; id?: string; children: ReactNode }) {
  return (
    <button type="button" id={id} onClick={onClick} className="flex h-11 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 text-[0.78125rem] font-semibold text-fg-2">
      {children}
    </button>
  )
}
