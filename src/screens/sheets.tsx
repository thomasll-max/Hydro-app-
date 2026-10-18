import { useEffect, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { AreaField, Grid, Group, NumField, Seg, Sheet, TextField } from "@/components/hydro/form"
import { ConfirmDelete } from "@/components/hydro/confirm"
import { useSettings } from "@/app/settings-context"
import { newId, useGrow } from "@/app/grow-context"
import { parseNum } from "@/calc/formulas"
import { todayIso } from "@/calc/stage"
import { EVENT_TYPES, SCHEMA, type Cycle, type EventType, type GrowEvent, type Mix, type Plant, type PlantId, type Substrate, type WaterMode } from "@/model/types"

/** Defaults for cycle 1 — each one from the setup or the fiche (Athena / RAIN). Flow is left empty: it must be measured. */
export function defaultCycle(): Cycle {
  const now = new Date().toISOString()
  return {
    schemaVersion: SCHEMA.cycle,
    id: "cycle-1",
    name: "Cycle 1",
    cultivars: ["Cherry Limeade"],
    flowerWeeks: 9, // Athena program S1–S9
    substrate: "coco", // UGro Rhiza, 100 % coco
    waterMode: "auto", // RAIN pump on the Controller AI+ Control Plug
    potVolumeL: 15,
    potCount: 4,
    lights: "IONFRAME EVO4 300 W · IONBEAM S16",
    lightsOn: "06:00",
    shotPct: 3, // Athena: start at 3 % ≈ 450 mL in 15 L
    p1Shots: 5, // "Plan d'arrosage" default; adjust until runoff flows
    p1IntervalMin: 20, // Athena: 15–30 min
    p0DelayMin: 90, // Athena: 1–2 h
    nutrientLine: "athena-pro",
    leafOffsetC: -2, // spec default
    createdAt: now,
    updatedAt: now,
  }
}

export const useShow = () => {
  const { settings } = useSettings()
  return (v: number | undefined) => (v == null ? "" : settings.lang === "fr" ? String(v).replace(".", ",") : String(v))
}

export function SaveBar({ busy, onSave, onDelete }: { busy: boolean; onSave: () => void; onDelete?: () => Promise<void> }) {
  const { t } = useSettings()
  return (
    <div className="flex gap-2">
      {onDelete && (
        <ConfirmDelete
          onConfirm={onDelete}
          trigger={
            <Button variant="outline" size="icon-lg" className="size-12 rounded-full border-line-strong" aria-label={t("common.delete")}>
              <Trash2 className="size-5 text-bad" />
            </Button>
          }
        />
      )}
      <Button onClick={onSave} disabled={busy} className="h-12 flex-1 rounded-full text-[15px] font-bold">
        {busy && <Loader2 className="animate-spin" />}
        {t("common.save")}
      </Button>
    </div>
  )
}

export function useSaver(onDone: () => void) {
  const { t } = useSettings()
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      toast.success(t("common.saved"))
      onDone()
    } catch (err) {
      toast.error(t("common.saveError", { reason: (err as { message?: string })?.message ?? "?" }))
    } finally {
      setBusy(false)
    }
  }
  return { busy, run }
}

export function CycleSheet({
  open,
  onOpenChange,
  harvestOnly,
  cycleId,
  spaceId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  harvestOnly?: boolean
  /** "new" creates another cycle; an id edits that cycle; absent edits the active one. */
  cycleId?: string
  spaceId?: string
}) {
  const { t } = useSettings()
  const { cycle: active, cycles, spaces, space: curSpace, saveCycle } = useGrow()
  const cycle = cycleId === "new" ? null : ((cycleId ? cycles.find((c) => c.id === cycleId) : active) ?? null)
  const show = useShow()
  const [c, setC] = useState<Cycle>(defaultCycle)
  const [s, setS] = useState<Record<string, string>>({})
  const { busy, run } = useSaver(() => onOpenChange(false))

  const NUM_FIELDS = ["flowerWeeks", "potVolumeL", "potCount", "flowMlPerMin", "shotPct", "p1Shots", "p1IntervalMin", "p0DelayMin", "leafOffsetC"] as const
  const H_FIELDS = ["wetG", "dryG", "watts", "dryingDays", "jarRh"] as const

  useEffect(() => {
    if (!open) return
    const fresh = (): Cycle => {
      const d = defaultCycle()
      if (!cycles.length) return { ...d, spaceId: spaceId ?? curSpace?.id }
      return { ...d, id: newId("cy"), name: `Cycle ${cycles.length + 1}`, cultivars: [], spaceId: spaceId ?? curSpace?.id }
    }
    const base = cycle ?? fresh()
    setC(base)
    const st: Record<string, string> = { cultivars: base.cultivars.join(", ") }
    for (const k of NUM_FIELDS) st[k] = show(base[k] as number | undefined)
    for (const k of H_FIELDS) st[`h_${k}`] = show(base.harvest?.[k])
    setS(st)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const txt = (k: keyof Cycle) => (v: string) => setC((x) => ({ ...x, [k]: v || undefined }))
  const sv = (k: string) => (v: string) => setS((x) => ({ ...x, [k]: v }))

  const save = () =>
    run(async () => {
      const next: Cycle = { ...c, cultivars: (s.cultivars ?? "").split(",").map((x) => x.trim()).filter(Boolean) }
      for (const k of NUM_FIELDS) {
        const v = parseNum(s[k])
        ;(next as Record<string, unknown>)[k] = v ?? (k === "flowMlPerMin" ? undefined : (defaultCycle()[k] as number))
      }
      const h: NonNullable<Cycle["harvest"]> = { ...(c.harvest ?? {}) }
      for (const k of H_FIELDS) h[k] = parseNum(s[`h_${k}`])
      next.harvest = Object.values(h).some((v) => v != null && v !== "") ? h : undefined
      await saveCycle(next)
    })

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={harvestOnly ? t("cycleForm.harvestTitle") : cycle ? t("journal.editCycle") : t("journal.create")} footer={<SaveBar busy={busy} onSave={save} />}>
      {!harvestOnly && (
        <>
          <Group title={t("cycleForm.title")}>
            <div className="flex flex-col gap-2.5">
              <TextField id="c-name" label={t("cycleForm.name")} value={c.name} onChange={(v) => setC((x) => ({ ...x, name: v }))} />
              <TextField id="c-cult" label={t("cycleForm.cultivars")} hint={t("cycleForm.cultivarsHint")} value={s.cultivars ?? ""} onChange={sv("cultivars")} />
              {spaces.length > 0 && !cycle && (
                <Seg<string>
                  label={t("cycleForm.space")}
                  value={c.spaceId}
                  onChange={(v) => setC((x) => ({ ...x, spaceId: v }))}
                  options={spaces.map((x) => ({ value: x.id, label: x.name }))}
                />
              )}
            </div>
          </Group>
          <Group title={t("cycleForm.dates")}>
            <Grid>
              <TextField id="c-germ" type="date" label={t("cycleForm.germination")} value={c.germinationDate ?? ""} onChange={txt("germinationDate")} />
              <TextField id="c-trans" type="date" label={t("cycleForm.transfer")} value={c.transferDate ?? ""} onChange={txt("transferDate")} />
              <TextField id="c-pflip" type="date" label={t("cycleForm.plannedFlip")} value={c.plannedFlipDate ?? ""} onChange={txt("plannedFlipDate")} />
              <TextField id="c-flip" type="date" label={t("cycleForm.flip")} value={c.flipDate ?? ""} onChange={txt("flipDate")} />
              <NumField id="c-fw" integer label={t("cycleForm.flowerWeeks")} hint={t("cycleForm.flowerWeeksHint")} value={s.flowerWeeks ?? ""} onChange={sv("flowerWeeks")} />
              <TextField id="c-harv" type="date" label={t("cycleForm.harvestDate")} value={c.harvestDate ?? ""} onChange={txt("harvestDate")} />
            </Grid>
          </Group>
          <Group title={t("cycleForm.setup")}>
            <div className="flex flex-col gap-2.5">
              <Seg<Substrate>
                label={t("cycleForm.substrate")}
                value={c.substrate}
                onChange={(v) => setC((x) => ({ ...x, substrate: v }))}
                options={(["coco", "soil", "mix7030"] as const).map((v) => ({ value: v, label: t(`substrate.${v}`) }))}
              />
              <Seg<WaterMode>
                label={t("cycleForm.waterMode")}
                value={c.waterMode}
                onChange={(v) => setC((x) => ({ ...x, waterMode: v }))}
                options={(["auto", "manual"] as const).map((v) => ({ value: v, label: t(`mode.${v}`) }))}
              />
              <Grid>
                <NumField id="c-pv" label={t("cycleForm.potVolume")} value={s.potVolumeL ?? ""} onChange={sv("potVolumeL")} />
                <NumField id="c-pc" integer label={t("cycleForm.potCount")} value={s.potCount ?? ""} onChange={sv("potCount")} />
              </Grid>
              <NumField id="c-flow" integer label={t("cycleForm.flow")} hint={t("cycleForm.flowHint")} value={s.flowMlPerMin ?? ""} onChange={sv("flowMlPerMin")} />
              <TextField id="c-lights" label={t("cycleForm.lights")} value={c.lights} onChange={(v) => setC((x) => ({ ...x, lights: v }))} />
              <Grid>
                <TextField id="c-on" type="time" label={t("cycleForm.lightsOn")} value={c.lightsOn} onChange={(v) => setC((x) => ({ ...x, lightsOn: v || "06:00" }))} />
                <NumField id="c-leaf" label={t("cycleForm.leafOffset")} value={s.leafOffsetC ?? ""} onChange={sv("leafOffsetC")} />
              </Grid>
            </div>
          </Group>
          {c.waterMode === "auto" && (
            <Group title={t("cycleForm.schedule")}>
              <Grid>
                <NumField id="c-shot" label={t("cycleForm.shotPct")} hint={t("cycleForm.shotPctHint")} value={s.shotPct ?? ""} onChange={sv("shotPct")} />
                <NumField id="c-p1" integer label={t("cycleForm.p1Shots")} value={s.p1Shots ?? ""} onChange={sv("p1Shots")} />
                <NumField id="c-p1i" integer label={t("cycleForm.p1Interval")} hint={t("cycleForm.p1IntervalHint")} value={s.p1IntervalMin ?? ""} onChange={sv("p1IntervalMin")} />
                <NumField id="c-p0" integer label={t("cycleForm.p0Delay")} hint={t("cycleForm.p0DelayHint")} value={s.p0DelayMin ?? ""} onChange={sv("p0DelayMin")} />
              </Grid>
            </Group>
          )}
        </>
      )}
      {(harvestOnly || c.harvestDate) && (
        <Group title={t("cycleForm.harvestTitle")}>
          <div className="flex flex-col gap-2.5">
            {harvestOnly && <TextField id="c-harv2" type="date" label={t("cycleForm.harvestDate")} value={c.harvestDate ?? ""} onChange={txt("harvestDate")} />}
            <Grid>
              <NumField id="h-wet" label={t("cycleForm.wet")} value={s.h_wetG ?? ""} onChange={sv("h_wetG")} />
              <NumField id="h-dry" label={t("cycleForm.dry")} value={s.h_dryG ?? ""} onChange={sv("h_dryG")} />
              <NumField id="h-w" integer label={t("cycleForm.watts")} value={s.h_watts ?? ""} onChange={sv("h_watts")} />
              <NumField id="h-dd" integer label={t("cycleForm.dryingDays")} value={s.h_dryingDays ?? ""} onChange={sv("h_dryingDays")} />
              <TextField id="h-cure" type="date" label={t("cycleForm.curingStart")} value={c.harvest?.curingStart ?? ""} onChange={(v) => setC((x) => ({ ...x, harvest: { ...x.harvest, curingStart: v || undefined } }))} />
              <NumField id="h-rh" label={t("cycleForm.jarRh")} value={s.h_jarRh ?? ""} onChange={sv("h_jarRh")} />
            </Grid>
            <AreaField id="h-dn" label={t("cycleForm.dryingNotes")} value={c.harvest?.dryingNotes ?? ""} onChange={(v) => setC((x) => ({ ...x, harvest: { ...x.harvest, dryingNotes: v || undefined } }))} />
            <AreaField id="h-tast" label={t("cycleForm.tasting")} value={c.harvest?.tasting ?? ""} onChange={(v) => setC((x) => ({ ...x, harvest: { ...x.harvest, tasting: v || undefined } }))} />
          </div>
        </Group>
      )}
    </Sheet>
  )
}

export function PlantSheet({ open, onOpenChange, plantId }: { open: boolean; onOpenChange: (o: boolean) => void; plantId: PlantId }) {
  const { t } = useSettings()
  const { plants, cycle, savePlant } = useGrow()
  const blank = (): Plant => ({ schemaVersion: SCHEMA.plant, id: `${cycle?.id ?? "cycle"}_${plantId}`, label: plantId, cycleId: cycle?.id ?? "", cultivar: cycle?.cultivars[0] ?? "", updatedAt: "" })
  const [p, setP] = useState<Plant>(blank)
  const { busy, run } = useSaver(() => onOpenChange(false))
  useEffect(() => {
    if (!open) return
    setP(plants.find((x) => x.label === plantId) ?? blank())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plantId, plants, cycle])
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("plantForm.title", { id: plantId })} footer={<SaveBar busy={busy} onSave={() => run(() => savePlant(p))} />}>
      <div className="flex flex-col gap-2.5">
        <TextField id="p-cult" label={t("plantForm.cultivar")} value={p.cultivar} onChange={(v) => setP((x) => ({ ...x, cultivar: v }))} />
        <TextField id="p-pheno" label={t("plantForm.phenotype")} value={p.phenotype ?? ""} onChange={(v) => setP((x) => ({ ...x, phenotype: v || undefined }))} />
        <AreaField id="p-notes" label={t("plantForm.notes")} value={p.notes ?? ""} onChange={(v) => setP((x) => ({ ...x, notes: v || undefined }))} />
      </div>
    </Sheet>
  )
}

export function EventSheet({ open, onOpenChange, event }: { open: boolean; onOpenChange: (o: boolean) => void; event?: GrowEvent }) {
  const { t } = useSettings()
  const { saveEvent, deleteEvent } = useGrow()
  const [e, setE] = useState<GrowEvent>({ schemaVersion: SCHEMA.event, id: "", date: todayIso(), type: "flip", createdAt: "" })
  const { busy, run } = useSaver(() => onOpenChange(false))
  useEffect(() => {
    if (open) setE(event ?? { schemaVersion: SCHEMA.event, id: newId("ev-"), date: todayIso(), type: "other", createdAt: new Date().toISOString() })
  }, [open, event])
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("event.title")}
      footer={<SaveBar busy={busy} onSave={() => run(() => saveEvent(e))} onDelete={event ? async () => { await deleteEvent(event.id); onOpenChange(false) } : undefined} />}
    >
      <div className="flex flex-col gap-2.5">
        <TextField id="ev-date" type="date" label={t("event.date")} value={e.date} onChange={(v) => setE((x) => ({ ...x, date: v }))} />
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("event.type")}>
          {EVENT_TYPES.map((ty: EventType) => (
            <button
              key={ty}
              type="button"
              role="radio"
              aria-checked={e.type === ty}
              onClick={() => setE((x) => ({ ...x, type: ty }))}
              className={`h-10 rounded-full border px-3.5 text-[13px] font-semibold ${e.type === ty ? "border-primary/40 bg-primary/12 text-primary" : "border-line bg-surface-2 text-fg-2"}`}
            >
              {t(`event.${ty}`)}
            </button>
          ))}
        </div>
        <AreaField id="ev-note" label={t("event.note")} value={e.note ?? ""} onChange={(v) => setE((x) => ({ ...x, note: v || undefined }))} />
      </div>
    </Sheet>
  )
}

export function MixSheet({ open, onOpenChange, mix }: { open: boolean; onOpenChange: (o: boolean) => void; mix?: Mix }) {
  const { t } = useSettings()
  const { saveMix, deleteMix } = useGrow()
  const show = useShow()
  const [date, setDate] = useState(todayIso())
  const [s, setS] = useState({ volume: "", ec: "", ph: "" })
  const [note, setNote] = useState("")
  const { busy, run } = useSaver(() => onOpenChange(false))
  useEffect(() => {
    if (!open) return
    setDate(mix?.date ?? todayIso())
    setS({ volume: show(mix?.volumeL), ec: show(mix?.ec), ph: show(mix?.ph) })
    setNote(mix?.note ?? "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mix])
  const save = () =>
    run(async () => {
      const volumeL = parseNum(s.volume)
      if (!volumeL) throw new Error(t("mixForm.volume"))
      await saveMix({
        schemaVersion: SCHEMA.mix,
        id: mix?.id ?? newId("mix-"),
        date,
        volumeL,
        ec: parseNum(s.ec),
        ph: parseNum(s.ph),
        recipe: mix?.recipe,
        note: note.trim() || undefined,
        createdAt: mix?.createdAt ?? new Date().toISOString(),
      })
    })
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("mixForm.title")}
      description={mix?.recipe ?? t("journal.mixHint")}
      footer={<SaveBar busy={busy} onSave={save} onDelete={mix ? async () => { await deleteMix(mix.id); onOpenChange(false) } : undefined} />}
    >
      <div className="flex flex-col gap-2.5">
        <TextField id="m-date" type="date" label={t("mixForm.date")} value={date} onChange={setDate} />
        <Grid cols={3}>
          <NumField id="m-vol" label={t("mixForm.volume")} value={s.volume} onChange={(v) => setS((x) => ({ ...x, volume: v }))} />
          <NumField id="m-ec" label={t("mixForm.ec")} value={s.ec} onChange={(v) => setS((x) => ({ ...x, ec: v }))} />
          <NumField id="m-ph" label={t("mixForm.ph")} value={s.ph} onChange={(v) => setS((x) => ({ ...x, ph: v }))} />
        </Grid>
        <AreaField id="m-note" label={t("mixForm.note")} value={note} onChange={setNote} />
      </div>
    </Sheet>
  )
}
