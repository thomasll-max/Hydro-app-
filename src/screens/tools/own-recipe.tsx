// Outils → Nutrition with « Autre marque / je dose moi-même » (lot 7a): the grower's own line, made of personal products
// typed from their labels. The tank's recipe for the week (dose × volume, in the order of the list), « Ma gamme » to
// arrange it, « Partir de l'étiquette » to add a product in a few fields. Personal and not verified; EC and pH targets
// only as typed by the grower (Réglages → Nutrition).
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AreaField, Grid, NumField, Seg, Sheet, TextField } from "@/components/hydro/form"
import { Chip, Label, Notice, Reveal, SourceNote } from "@/components/hydro/primitives"
import { SwitchRow } from "@/screens/tools/equipment-shared"
import { SaveBar, useSaver } from "@/screens/sheets"
import { useSettings } from "@/app/settings-context"
import { newId, useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { badNums, parseNum } from "@/calc/formulas"
import { stageOn, todayIso } from "@/calc/stage"
import { handList, inListOrder, LABEL_VOLUMES, litresOf, moveInOrder, ownPhaseOf, ownRecipe, per10L, type LabelVolume, type OwnItem, type OwnPhase } from "@/calc/own-recipe"
import { OWN_LINE } from "@/data/nutrients"
import { equipmentAt } from "@/equipment/calc"
import { GROW_SCHEMA, type CustomProduct } from "@/model/grow"
import { SCHEMA } from "@/model/types"
import { cn } from "@/lib/utils"
import { iconButton, secondary, tertiary } from "@/components/hydro/styles"
import { CustomProductSheet, useWeeksText } from "./nutrition-parts"

/** « 2–3 mL pour 1 L », « 5 mL pour 1 gal US », else the dose per 10 L, else « dose à saisir ». */
export function useLabelDoseText() {
  const { t, num, range } = useSettings()
  return (p: CustomProduct): string | null => {
    const d = p.labelDose
    const dec = (x: number) => (Number.isInteger(x) ? 0 : x * 10 === Math.round(x * 10) ? 1 : 2)
    if (d) return t("own.labelDose", { range: range(d.lo, d.hi, Math.max(dec(d.lo), dec(d.hi))), unit: p.unit, per: d.gal ? t("own.gal") : `${num(d.perL, dec(d.perL))} L` })
    if (p.dosePer10L) return t("nut.customDose", { range: range(p.dosePer10L.lo, p.dosePer10L.hi, 1), unit: p.unit })
    return null
  }
}

export function OwnRecipeTool() {
  const { t, num, range, dm, show } = useSettings()
  const { cycle, space, mixes, equipment, assignments, saveMix, customProducts, nutrition } = useGrow()
  const ed = useEditors()
  const here = space ? equipmentAt(space.id, todayIso(), assignments).map((a) => equipment.find((e) => e.id === a.equipmentId)) : []
  const reservoirL = here.find((e) => e?.type === "reservoir" && e.reservoir?.kind !== "runoff")?.reservoir?.usableL
  const last = mixes.find((m) => m.line === OWN_LINE)
  const st = cycle ? stageOn(cycle, todayIso()) : null
  const fromCycle = ownPhaseOf(st)
  const [stage, setStage] = useState<OwnPhase["stage"]>(fromCycle?.stage ?? "veg")
  const [f, setF] = useState<Record<string, string>>({})
  const [note, setNote] = useState("")
  const saving = useRef(false)
  const [busy, setBusy] = useState(false)
  const [justSaved, setJustSaved] = useState<string | null>(null)
  useEffect(() => {
    setStage(fromCycle?.stage ?? "veg")
    setF({ volume: show(last?.volumeL ?? reservoirL), week: show(fromCycle?.stage === "flower" ? fromCycle.week : undefined) })
    setNote("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space?.id, cycle?.id])
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }))
  const volumeL = parseNum(f.volume) ?? 0
  const week = parseNum(f.week)
  const phase: OwnPhase = stage === "veg" ? { stage: "veg" } : { stage: "flower", ...(week != null && week > 0 ? { week: Math.round(week) } : {}) }
  const recipe = useMemo(() => ownRecipe(customProducts, phase, volumeL), [customProducts, stage, week, volumeL]) // eslint-disable-line react-hooks/exhaustive-deps
  const tankProducts = customProducts.filter((p) => p.application === "tank")
  const mine = stage === "veg" ? nutrition.own?.veg : nutrition.own?.flower
  type Row = Omit<OwnItem, "unit"> & { unit: string }
  const qtyText = (i: Row) => {
    const d = (x: number) => (Number.isInteger(x) ? 0 : 1)
    if (i.qty != null) return `${num(i.qty, d(i.qty))} ${i.unit}`
    if (i.range) return `${range(i.range[0], i.range[1], Math.max(d(i.range[0]), d(i.range[1])))} ${i.unit}`
    if (i.doseMissing) return t("own.doseMissing")
    return "—"
  }

  const save = async () => {
    if (saving.current) return
    if (badNums(f).length) return toast.error(t("safe.fixFields"))
    if (!space) return toast.error(t("nut.needSpace"))
    if (volumeL <= 0) return toast.error(t("nut.invalidVolume"))
    saving.current = true
    setBusy(true)
    try {
      const id = newId("mix-")
      const poured = recipe.items.filter((i) => i.qty != null || i.range)
      await saveMix({
        schemaVersion: SCHEMA.mix,
        id,
        date: todayIso(),
        spaceIds: [space.id],
        ...(cycle ? { cycleId: cycle.id } : {}),
        volumeL,
        line: OWN_LINE,
        phase: phase.stage === "veg" ? "veg" : phase.week ? `fl${phase.week}` : "flower",
        kind: phase.stage,
        ...(parseNum(f.ecTarget) != null ? { ecTarget: parseNum(f.ecTarget) } : {}),
        ...(parseNum(f.ec) != null ? { ec: parseNum(f.ec) } : {}),
        ...(parseNum(f.ph) != null ? { ph: parseNum(f.ph) } : {}),
        // The products and quantities of the day, as for Athena.
        items: poured.map((i) => ({ id: i.id, name: i.name, qty: i.qty, unit: i.unit, ...(i.range ? { range: i.range } : {}) })),
        ...(poured.length ? { recipe: poured.map((i) => `${i.name} ${qtyText(i)}`).join(" · ") } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        createdAt: new Date().toISOString(),
      })
      toast.success(t("nut.saved"))
      setJustSaved(id)
      setF((s) => ({ ...s, ec: "", ph: "", ecTarget: "" }))
      setNote("")
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error).message }))
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Reveal i={0}>
        <Card className="gap-3" id="own-tank">
          <div className="flex items-center justify-between gap-2">
            <Label emoji="testTube">{t("own.title")}</Label>
            <Chip>{t("growSet.ownLine")}</Chip>
          </div>
          <p className="text-[0.8125rem] leading-[1.45] text-fg-2">{t("own.desc")}</p>
          {/* An older « Autre marque » space keeps its text note, shown until the recipe is filled in (lot 7a). */}
          {!recipe.items.some((i) => i.qty != null || i.range) && last?.recipe && (
            <div className="border-l-2 border-line-strong pl-3" id="own-old-note">
              <div className="text-[0.75rem] font-semibold text-fg-2">{t("own.lastNote")}</div>
              <p className="text-[0.8125rem] leading-[1.45]">{last.recipe}</p>
            </div>
          )}
          {st?.key === "flush" && <Notice>{t("row.wateringFlushOwn")}</Notice>}
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[0.75rem] font-medium text-fg-2">{t("own.phase")}</span>
              {fromCycle && <span className="text-[0.75rem] text-fg-3">{t("own.fromCycle")}</span>}
            </div>
            <Seg<OwnPhase["stage"]>
              label={t("own.phase")}
              value={stage}
              onChange={setStage}
              options={[
                { value: "veg", label: t("own.veg") },
                { value: "flower", label: t("own.flower") },
              ]}
            />
          </div>
          <Grid>
            <NumField id="own-vol" label={t("nut.volume")} value={f.volume ?? ""} onChange={set("volume")} />
            {stage === "flower" ? (
              <NumField id="own-week" integer label={t("own.week")} value={f.week ?? ""} onChange={set("week")} />
            ) : (
              <span aria-hidden="true" />
            )}
          </Grid>

          <div>
            <div className="text-[0.875rem] font-semibold">{t("own.tank")}</div>
            {!recipe.ordered && recipe.items.length > 1 && (
              <Notice tone="info" className="mt-1" id="own-order-unset">
                {t("own.orderUnset")}
              </Notice>
            )}
            <ol className="mt-1.5" id="own-recipe">
              {([{ id: "water", name: t("own.water"), qty: volumeL > 0 ? volumeL : null, unit: "L", order: recipe.ordered ? 0 : null }, ...recipe.items] as Row[]).map((i) => (
                <li key={i.id} data-item={i.id} className={cn("grid items-center gap-2.5 border-t border-line py-2.5", recipe.ordered ? "grid-cols-[24px_1fr_auto]" : "grid-cols-[1fr_auto]")}>
                  {recipe.ordered && (
                    <span className="flex size-6 items-center justify-center rounded-[6px] border-[1.5px] border-info text-[0.75rem] font-semibold text-info tabular-nums">{(i.order ?? 0) + 1}</span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-[0.875rem] font-semibold">{i.name}</span>
                    {i.id !== "water" && (
                      <span className={cn("block text-[0.75rem] leading-snug", i.weeksMissing ? "text-warn" : "text-fg-3")}>
                        {[i.brand, t("own.unverified"), i.weeksMissing ? t("own.weeksMissing") : null].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                  <span className={cn("text-right font-num text-[1rem] font-medium tabular-nums", i.doseMissing && "text-[0.75rem] text-warn")}>
                    {i.id === "water" ? (i.qty != null ? `${num(i.qty)} L` : "—") : qtyText(i)}
                  </span>
                </li>
              ))}
            </ol>
            {!recipe.items.length && <p className="mt-1 text-[0.8125rem] text-fg-3">{tankProducts.length ? t("own.none") : t("own.empty")}</p>}
          </div>
          <HandProducts phase={phase} />

          <Grid>
            <NumField
              id="own-ect"
              label={`${t("own.ecTarget")} · ${t("common.optional")}`}
              hint={mine?.ec ? t("own.yourTarget", { v: range(mine.ec.lo, mine.ec.hi, 1) }) : undefined}
              value={f.ecTarget ?? ""}
              onChange={set("ecTarget")}
            />
            <span aria-hidden="true" />
            <NumField id="own-ec" label={t("nut.ecMeasured")} value={f.ec ?? ""} onChange={set("ec")} />
            <NumField
              id="own-ph"
              label={t("nut.phTank")}
              hint={mine?.ph ? t("own.yourTarget", { v: range(mine.ph.lo, mine.ph.hi, 1) }) : undefined}
              value={f.ph ?? ""}
              onChange={set("ph")}
            />
          </Grid>
          <AreaField id="own-note" label={t("own.noteField")} value={note} onChange={setNote} />
          <Button onClick={save} disabled={busy || volumeL <= 0} className="h-12">
            {t("nut.save")}
          </Button>
          {last && (
            <div id="nut-last" className="flex items-center gap-2 border-t border-line pt-2">
              <p className="min-w-0 flex-1 text-[0.78125rem] leading-snug text-fg-2">
                {t("nut.lastTank", { date: dm(last.date), volume: num(last.volumeL) })}
                {last.ec != null && ` · EC ${num(last.ec, 1)}`}
                {last.ph != null && ` · pH ${num(last.ph, 1)}`}
                {last.id === justSaved && <b className="ml-1 font-semibold text-fg">· {t("nut.lastTankJust")}</b>}
              </p>
              <button type="button" onClick={() => ed.openMix(last)} className={tertiary}>
                {t("nut.openTank")}
              </button>
            </div>
          )}
        </Card>
      </Reveal>
      <OwnLineCard />
      <SourceNote>{t("own.note")}</SourceNote>
    </div>
  )
}

/** « Ma gamme »: the products poured in the tank, in mixing order, moved up and down; each opens its full form. */
function OwnLineCard() {
  const { t } = useSettings()
  const { customProducts, saveCustomProducts } = useGrow()
  const weeksText = useWeeksText()
  const doseText = useLabelDoseText()
  const [edit, setEdit] = useState<CustomProduct | null>(null)
  const [full, setFull] = useState(false)
  const [label, setLabel] = useState(false)
  const list = inListOrder(customProducts.filter((p) => p.application === "tank"))
  const byHand = inListOrder(customProducts.filter((p) => p.application === "hand"))
  const move = async (id: string, dir: -1 | 1) => {
    const next = moveInOrder(list, id, dir)
    const changed = next.filter((p) => list.find((x) => x.id === p.id)?.mixOrder !== p.mixOrder)
    try {
      await saveCustomProducts(changed)
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error).message }))
    }
  }
  return (
    <Reveal i={1}>
      <Card className="gap-2.5" id="own-line">
        <div className="flex items-center justify-between gap-2">
          <Label emoji="testTube">{t("own.line")}</Label>
          <button type="button" onClick={() => setLabel(true)} className={secondary} id="own-from-label">
            {t("own.fromLabel")}
          </button>
        </div>
        <p className="text-[0.75rem] leading-[1.45] text-fg-3">{t("own.lineD")}</p>
        {!list.length && <p className="text-[0.8125rem] text-fg-2">{t("own.empty")}</p>}
        <ul>
          {list.map((p, i) => {
            const w = weeksText(p)
            const dose = doseText(p)
            return (
              <li key={p.id} className="flex items-center gap-1 border-t border-line py-1.5" data-product={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setEdit(p)
                    setFull(true)
                  }}
                  className="min-w-0 flex-1 py-1 text-left"
                >
                  <b className="block truncate text-[0.875rem] font-semibold">
                    {p.name}
                    {p.brand && <span className="font-normal text-fg-3"> · {p.brand}</span>}
                  </b>
                  <span className={cn("block text-[0.75rem] leading-snug", dose && w ? "text-fg-2" : "text-warn")}>
                    {[dose ?? t("own.doseMissing"), w ? t("nut.customWeeks", { w }) : t("own.weeksMissing"), p.inactive ? t("nut.customOff") : null].filter(Boolean).join(" · ")}
                  </span>
                </button>
                <button type="button" aria-label={t("own.up", { name: p.name })} disabled={i === 0} onClick={() => move(p.id, -1)} className={cn(iconButton, "disabled:opacity-30")}>
                  <ChevronUp className="size-4" />
                </button>
                <button type="button" aria-label={t("own.down", { name: p.name })} disabled={i === list.length - 1} onClick={() => move(p.id, 1)} className={cn(iconButton, "disabled:opacity-30")}>
                  <ChevronDown className="size-4" />
                </button>
              </li>
            )
          })}
        </ul>
        {byHand.length > 0 && (
          <div id="own-line-hand">
            <div className="mt-1 text-[0.8125rem] font-semibold text-fg-2">{t("hand.list")}</div>
            <ul>
              {byHand.map((p) => {
                const w = weeksText(p)
                const dose = doseText(p)
                return (
                  <li key={p.id} className="border-t border-line first:border-t-0" data-product={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setEdit(p)
                        setFull(true)
                      }}
                      className="min-h-11 w-full py-1.5 text-left"
                    >
                      <b className="block truncate text-[0.875rem] font-semibold">
                        {p.name}
                        {p.brand && <span className="font-normal text-fg-3"> · {p.brand}</span>}
                      </b>
                      <span className={cn("block text-[0.75rem] leading-snug", dose ? "text-fg-2" : "text-warn")}>
                        {[dose ?? t("own.doseMissing"), w ? t("nut.customWeeks", { w }) : null, p.inactive ? t("nut.customOff") : null].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setEdit(null)
            setFull(true)
          }}
          className={cn("self-start", tertiary)}
        >
          {t("nut.customAdd")}
        </button>
      </Card>
      <LabelSheet open={label} onOpenChange={setLabel} />
      <CustomProductSheet open={full} onOpenChange={setFull} product={edit} />
    </Reveal>
  )
}

/** « Partir de l'étiquette » (lot 7a): name, dose, for how many litres, weeks. No NPK, no full table. */
function LabelSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, range } = useSettings()
  const { saveCustomProduct } = useGrow()
  const [f, setF] = useState<Record<string, string>>({})
  const [unit, setUnit] = useState<CustomProduct["unit"]>("mL")
  const [per, setPer] = useState<LabelVolume>(1)
  const [veg, setVeg] = useState(false)
  const [where, setWhere] = useState<"tank" | "hand">("tank")
  const { busy, run } = useSaver(() => onOpenChange(false))
  useEffect(() => {
    if (!open) return
    setF({ name: "", lo: "", hi: "", from: "", to: "" })
    setWhere("tank")
    setUnit("mL")
    setPer(1)
    setVeg(false)
  }, [open])
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }))
  const lo = parseNum(f.lo)
  const hi = parseNum(f.hi) ?? lo
  const perL = litresOf(per)
  const per10 = lo != null && hi != null ? per10L(Math.min(lo, hi), Math.max(lo, hi), perL) : undefined
  const save = () =>
    run(async () => {
      const name = (f.name ?? "").trim()
      if (!name) throw new Error(t("nut.pNeedName"))
      if (badNums(f, ["lo", "hi", "from", "to"]).length) throw new Error(t("safe.fixFields"))
      const from = parseNum(f.from)
      const to = parseNum(f.to)
      const use = veg || from != null ? { ...(veg ? { veg: true } : {}), ...(from != null ? { flowerFrom: from, flowerTo: to ?? from } : {}) } : undefined
      const p: CustomProduct = {
        schemaVersion: GROW_SCHEMA.customProduct,
        id: newId("cp-"),
        name,
        unit,
        application: where,
        verified: false,
        source: "label",
        createdAt: new Date().toISOString(),
        ...(use ? { use } : {}),
        ...(per10 && lo != null && hi != null ? { dosePer10L: per10, labelDose: { lo: Math.min(lo, hi), hi: Math.max(lo, hi), perL, ...(per === "gal" ? { gal: true } : {}) } } : {}),
      }
      await saveCustomProduct(p)
    })
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("own.labelTitle")} description={t("own.labelDesc")} footer={<SaveBar busy={busy} onSave={save} />}>
      <div className="flex flex-col gap-3" id="own-label-form">
        <TextField id="lb-name" label={t("nut.pName")} value={f.name ?? ""} onChange={set("name")} />
        <div>
          <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("nut.pWhere")}</div>
          <Seg<"tank" | "hand">
            label={t("nut.pWhere")}
            value={where}
            onChange={setWhere}
            options={[
              { value: "tank", label: t("nut.customTank") },
              { value: "hand", label: t("nut.customHand") },
            ]}
          />
          <p className="mt-1 text-[0.75rem] leading-[1.45] text-fg-3" id="lb-hand-hint">
            {t("nut.pHandHint")}
          </p>
        </div>
        <div>
          <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("nut.pUnit")}</div>
          <Seg<CustomProduct["unit"]> label={t("nut.pUnit")} value={unit} onChange={setUnit} options={(["mL", "g"] as const).map((u) => ({ value: u, label: u }))} />
        </div>
        <Grid>
          <NumField id="lb-lo" label={t("own.dose", { unit })} value={f.lo ?? ""} onChange={set("lo")} />
          <NumField id="lb-hi" label={t("own.doseMax", { unit })} value={f.hi ?? ""} onChange={set("hi")} />
        </Grid>
        <div>
          <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("own.per")}</div>
          <PerVolume value={per} onChange={(v) => v !== "other" && setPer(v)} />
          {per === "gal" && <p className="mt-1 text-[0.75rem] text-fg-3">{t("own.galNote")}</p>}
        </div>
        {per10 && <p className="text-[0.75rem] text-primary tabular">{t("nut.pPer10", { range: range(per10.lo, per10.hi, 2), unit })}</p>}
        <SwitchRow id="lb-veg" label={t("nut.pUseVeg")} checked={veg} onChange={setVeg} />
        <Grid>
          <NumField id="lb-from" integer label={t("nut.pFlowerFrom")} value={f.from ?? ""} onChange={set("from")} />
          <NumField id="lb-to" integer label={t("nut.pFlowerTo")} value={f.to ?? ""} onChange={set("to")} />
        </Grid>
        <p className="text-[0.75rem] leading-[1.45] text-fg-3">{t("nut.pNote")}</p>
      </div>
    </Sheet>
  )
}

/** For 1 L, 4 L, 10 L or 1 US gallon (lot 7a). */
export function PerVolume({ value, onChange, other }: { value: LabelVolume | "other"; onChange: (v: LabelVolume | "other") => void; other?: boolean }) {
  const { t } = useSettings()
  const options = [
    ...LABEL_VOLUMES.map((v) => ({ value: String(v), label: v === "gal" ? t("own.gal") : `${v} L` })),
    ...(other ? [{ value: "other", label: t("own.other") }] : []),
  ]
  const back = (s: string): LabelVolume | "other" => (s === "gal" || s === "other" ? s : (Number(s) as LabelVolume))
  return <Seg<string> label={t("own.per")} value={String(value)} onChange={(s) => onChange(back(s))} options={options} />
}

/**
 * « À la main, si tu veux » (lot 7b): products given in the watering can, under the recipe, with their dose per litre.
 * Not in the tank nor its EC; no frequency, no automatic reminder — « Ajouter un rappel » if the grower wants one.
 */
export function HandProducts({ phase, athena }: { phase: OwnPhase | null; athena?: boolean }) {
  const { t, range } = useSettings()
  const { customProducts, space } = useGrow()
  const ed = useEditors()
  const items = handList(customProducts, phase)
  if (!items.length) return null
  const dec = (x: number) => (Number.isInteger(x) ? 0 : Math.round(x * 10) === x * 10 ? 1 : 2)
  return (
    <div className="flex flex-col gap-1.5" id="hand-products">
      <div>
        <div className="text-[0.875rem] font-semibold">{t("hand.title")}</div>
        <p className="text-[0.75rem] leading-[1.45] text-fg-3">{t("hand.desc")}</p>
      </div>
      <ul>
        {items.map((i) => (
          <li key={i.id} data-hand={i.id} className="flex items-center justify-between gap-3 border-t border-line py-2">
            <span className="min-w-0">
              <span className="block text-[0.875rem] font-semibold">{i.name}</span>
              <span className={cn("block text-[0.75rem] leading-snug", i.weeksMissing ? "text-warn" : "text-fg-3")}>
                {[i.brand, athena ? t("hand.offAthena") : t("own.unverified"), i.weeksMissing ? t("own.weeksMissing") : null].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className={cn("max-w-[48%] shrink-0 text-right font-num text-[0.8125rem] leading-snug", i.perL ? "text-fg" : "text-warn")}>
              {i.perL ? t("hand.perL", { range: range(i.perL[0], i.perL[1], Math.max(dec(i.perL[0]), dec(i.perL[1]))), unit: i.unit }) : t("own.doseMissing")}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        id="hand-reminder"
        onClick={() => ed.openReminder({ title: t("hand.reminderTitle", { names: items.map((i) => i.name).join(", ") }), spaceId: space?.id })}
        className={cn("self-start", tertiary)}
      >
        {t("hand.reminder")}
      </button>
    </div>
  )
}
