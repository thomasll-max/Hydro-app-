import { useEffect, useState } from "react"
import { isOwnLine } from "@/data/nutrients"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { AreaField, focusFirstInvalid, Grid, NumField, Sheet, TextField } from "@/components/hydro/form"
import { ConfirmDelete } from "@/components/hydro/confirm"
import { useSettings } from "@/app/settings-context"
import { newId, useGrow } from "@/app/grow-context"
import { badNums, parseNum } from "@/calc/formulas"
import { todayIso } from "@/calc/stage"
import { RootProductsField, useRootProducts } from "./root-products"
import { EVENT_TYPES, SCHEMA, type Cycle, type EventType, type GrowEvent, type Mix, type Plant, type PlantId } from "@/model/types"
import { joined, segment, tertiary } from "@/components/hydro/styles"
import { cn } from "@/lib/utils"
import { openVariety } from "./tools/varieties"

/**
 * Defaults of a new cycle, each one sourced (Athena or the spec). Nothing about pots, pump or lamps: those come from
 * the space's equipment, or stay empty (lot 10b: never Thomas's 15 L × 4 for someone else).
 */
export function defaultCycle(): Cycle {
  const now = new Date().toISOString()
  return {
    schemaVersion: SCHEMA.cycle,
    id: "cycle-1",
    name: "Cycle 1",
    cultivars: [],
    flowerWeeks: 9, // Athena program S1–S9
    substrate: "coco", // Athena coco program (the app's catalogs)
    waterMode: "auto",
    lights: "",
    lightsOn: "06:00", // spec default, changed in the space settings
    shotPct: 3, // Athena: start at 3 % of the pot
    p1Shots: 5, // "Plan d'arrosage" starting value; adjust until runoff flows
    p1IntervalMin: 20, // Athena: 15–30 min
    p0DelayMin: 90, // Athena: 1–2 h
    nutrientLine: "athena-pro",
    leafOffsetC: -2, // spec default
    createdAt: now,
    updatedAt: now,
  }
}

export const useShow = () => useSettings().show

export function SaveBar({ busy, onSave, onDelete }: { busy: boolean; onSave: () => void; onDelete?: () => Promise<void> }) {
  const { t } = useSettings()
  return (
    <div className="flex flex-wrap gap-2">
      {onDelete && (
        <ConfirmDelete
          onConfirm={onDelete}
          trigger={
            <Button variant="outline" size="icon-lg" className="size-12" aria-label={t("common.delete")}>
              <Trash2 className="size-5 text-bad" />
            </Button>
          }
        />
      )}
      <Button onClick={onSave} disabled={busy} className="h-12 min-w-[6rem] flex-1">
        {busy && <Loader2 className="animate-spin" />}
        {t("common.save")}
      </Button>
    </div>
  )
}

export function useSaver(onDone: () => void) {
  const { t } = useSettings()
  const [busy, setBusy] = useState(false)
  /** `fn` may return its own success message: one toast per save (lot 10d). */
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      const msg = await fn()
      toast.success(typeof msg === "string" ? msg : t("common.saved"))
      onDone()
    } catch (err) {
      toast.error(t("common.saveError", { reason: (err as { message?: string })?.message ?? "?" }))
    } finally {
      setBusy(false)
    }
  }
  return { busy, run }
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
        {/* Its variety's card (lot 12c), for the name already saved. */}
        {plants.find((x) => x.label === plantId)?.cultivar?.trim() && (
          <button
            type="button"
            className={cn(tertiary, "-mt-1 self-start")}
            onClick={() => {
              onOpenChange(false)
              openVariety(plants.find((x) => x.label === plantId)!.cultivar)
            }}
            id="p-variety"
          >
            {t("vr.seeCard", { name: plants.find((x) => x.label === plantId)!.cultivar.trim() })}
          </button>
        )}
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
  const rootState = useRootProducts(open, event?.products, false)
  const rooting = e.type === "transplant" || e.type === "transfer"
  useEffect(() => {
    if (open) setE(event ?? { schemaVersion: SCHEMA.event, id: newId("ev-"), date: todayIso(), type: "other", createdAt: new Date().toISOString() })
  }, [open, event])
  const build = (): GrowEvent => {
    const out = { ...e }
    if (rooting && rootState.value.length) out.products = rootState.value
    else delete out.products
    return out
  }
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("event.title")}
      footer={<SaveBar busy={busy} onSave={() => run(async () => {
        if (rooting && rootState.bad) {
          focusFirstInvalid()
          throw new Error(t("safe.fixFields"))
        }
        await saveEvent(build())
      })} onDelete={event ? async () => { await deleteEvent(event.id); onOpenChange(false) } : undefined} />}
    >
      <div className="flex flex-col gap-2.5">
        <TextField id="ev-date" type="date" label={t("event.date")} value={e.date} onChange={(v) => setE((x) => ({ ...x, date: v }))} />
        <div className={joined()} role="radiogroup" aria-label={t("event.type")}>
          {EVENT_TYPES.map((ty: EventType) => (
            <button
              key={ty}
              type="button"
              role="radio"
              aria-checked={e.type === ty}
              onClick={() => setE((x) => ({ ...x, type: ty }))}
              className={segment(e.type === ty)}
            >
              {t(`event.${ty}`)}
            </button>
          ))}
        </div>
        {rooting && <RootProductsField state={rootState} />}
        <AreaField id="ev-note" label={t("event.note")} value={e.note ?? ""} onChange={(v) => setE((x) => ({ ...x, note: v || undefined }))} />
      </div>
    </Sheet>
  )
}

export function MixSheet({ open, onOpenChange, mix }: { open: boolean; onOpenChange: (o: boolean) => void; mix?: Mix }) {
  const { t } = useSettings()
  const { saveMix, deleteMix, nutrition } = useGrow()
  // Another brand: one pH (the tank's), no Balance fields (lot 10e).
  const own = isOwnLine(mix?.line ?? nutrition.line)
  const show = useShow()
  const [date, setDate] = useState(todayIso())
  const [s, setS] = useState({ volume: "", ec: "", ph: "", phBefore: "", balAdded: "" })
  const [note, setNote] = useState("")
  const { busy, run } = useSaver(() => onOpenChange(false))
  useEffect(() => {
    if (!open) return
    setDate(mix?.date ?? todayIso())
    setS({ volume: show(mix?.volumeL), ec: show(mix?.ec), ph: show(mix?.ph), phBefore: show(mix?.phBefore), balAdded: show(mix?.balanceAddedMl) })
    setNote(mix?.note ?? "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mix])
  const save = () =>
    run(async () => {
      if (badNums(s).length) {
        focusFirstInvalid()
        throw new Error(t("safe.fixFields"))
      }
      const volumeL = parseNum(s.volume)
      if (!volumeL) throw new Error(t("mixForm.volume"))
      // Editing keeps the recipe, the line and the spaces the tank feeds.
      await saveMix({
        ...(mix ?? {}),
        schemaVersion: SCHEMA.mix,
        id: mix?.id ?? newId("mix-"),
        date,
        volumeL,
        ec: parseNum(s.ec),
        ph: parseNum(s.ph),
        phBefore: parseNum(s.phBefore),
        balanceAddedMl: parseNum(s.balAdded),
        recipe: mix?.recipe,
        ...(!mix && own ? { line: nutrition.line } : {}),
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
          <NumField id="m-ph" label={own ? t("nut.phTank") : t("mixForm.ph")} value={s.ph} onChange={(v) => setS((x) => ({ ...x, ph: v }))} />
        </Grid>
        {!own && <Grid>
          <NumField id="m-phb" label={t("nut.phBefore", { name: "Balance" })} value={s.phBefore} onChange={(v) => setS((x) => ({ ...x, phBefore: v }))} />
          <NumField id="m-bal" label={t("nut.balanceAdded", { name: "Balance" })} value={s.balAdded} onChange={(v) => setS((x) => ({ ...x, balAdded: v }))} />
        </Grid>}
        <AreaField id="m-note" label={t("mixForm.note")} value={note} onChange={setNote} />
      </div>
    </Sheet>
  )
}
