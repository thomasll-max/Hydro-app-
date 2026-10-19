// Cycle form (lot 10b, decisions of Thomas): creating a cycle asks only for a name, the variety(ies), the space and the
// start date. Planned dates are optional and folded; watering and gear come prefilled from the space's equipment, folded.
// Steps (veg, 12/12, harvest) are one tap on the day from Today; their dates can be corrected here.
import { useEffect, useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { AreaField, Grid, Group, NumField, Seg, Sheet, TextField } from "@/components/hydro/form"
import { useSettings } from "@/app/settings-context"
import { newId, useGrow } from "@/app/grow-context"
import { badNums, parseNum } from "@/calc/formulas"
import { todayIso } from "@/calc/stage"
import { equipmentPrefill, expectedHarvest } from "@/calc/steps"
import { spaceNutrition } from "@/model/grow-ops"
import type { Cycle, Substrate, WaterMode } from "@/model/types"
import { defaultCycle, SaveBar, useSaver, useShow } from "./sheets"

/** Numbers of the form. Cleared on an existing cycle = the previous value is kept (lot 10b: never Thomas's values). */
const NUM_FIELDS = ["flowerWeeks", "potVolumeL", "potCount", "flowMlPerMin", "shotPct", "p1Shots", "p1IntervalMin", "p0DelayMin", "leafOffsetC", "plannedDryingDays"] as const
/** May stay empty ("donnée manquante"): nothing is put in their place. */
const OPTIONAL = new Set<string>(["potVolumeL", "potCount", "flowMlPerMin", "plannedDryingDays"])
const H_FIELDS = ["wetG", "dryG", "watts", "dryingDays", "jarRh"] as const

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
  const { t, dm } = useSettings()
  const { cycle: active, cycles, spaces, space: curSpace, saveCycle, equipment, assignments, grow } = useGrow()
  const cycle = cycleId === "new" ? null : ((cycleId ? cycles.find((c) => c.id === cycleId) : active) ?? null)
  const show = useShow()
  const [c, setC] = useState<Cycle>(defaultCycle)
  const [s, setS] = useState<Record<string, string>>({})
  const { busy, run } = useSaver(() => onOpenChange(false))

  /** New cycle in a space: pots, flow, lamps, mode and substrate from its equipment; the line from its nutrition. */
  const fresh = (sid: string | undefined, start: string): Cycle => {
    const d = defaultCycle()
    const pre = equipmentPrefill(sid, start, equipment, assignments)
    const space = spaces.find((x) => x.id === sid)
    const lastHere = cycles.find((x) => x.spaceId === sid)
    return {
      ...d,
      id: newId("cy"),
      name: t("cycleForm.newName", { n: cycles.length + 1 }),
      spaceId: sid,
      germinationDate: start,
      potVolumeL: pre.potVolumeL,
      potCount: pre.potCount,
      flowMlPerMin: pre.flowMlPerMin,
      lights: pre.lights ?? "",
      waterMode: pre.waterMode ?? d.waterMode,
      substrate: pre.substrate ?? lastHere?.substrate ?? d.substrate,
      lightsOn: lastHere?.lightsOn ?? d.lightsOn,
      nutrientLine: spaceNutrition(grow, space).line,
    }
  }
  const load = (base: Cycle) => {
    setC(base)
    const st: Record<string, string> = { cultivars: base.cultivars.join(", ") }
    for (const k of NUM_FIELDS) st[k] = show(base[k] as number | undefined)
    for (const k of H_FIELDS) st[`h_${k}`] = show(base.harvest?.[k])
    setS(st)
  }

  useEffect(() => {
    if (!open) return
    load(cycle ?? fresh(spaceId ?? curSpace?.id ?? spaces[0]?.id, todayIso()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const txt = (k: keyof Cycle) => (v: string) => setC((x) => ({ ...x, [k]: v || undefined }))
  const sv = (k: string) => (v: string) => setS((x) => ({ ...x, [k]: v }))
  /** Another space for a new cycle: its equipment fills the folded part again. */
  const pickSpace = (sid: string) => {
    const f = fresh(sid, c.germinationDate ?? todayIso())
    load({ ...f, id: c.id, name: c.name, cultivars: (s.cultivars ?? "").split(",").map((x) => x.trim()).filter(Boolean), germinationDate: c.germinationDate })
  }

  const save = () =>
    run(async () => {
      if (badNums(s, [...NUM_FIELDS, ...H_FIELDS.map((k) => `h_${k}`)]).length) throw new Error(t("safe.fixFields"))
      if (!cycle && !c.germinationDate) throw new Error(t("cycleForm.needStart"))
      const next: Cycle = { ...c, name: c.name.trim() || t("cycleForm.newName", { n: cycles.length + 1 }), cultivars: (s.cultivars ?? "").split(",").map((x) => x.trim()).filter(Boolean) }
      for (const k of NUM_FIELDS) {
        const v = parseNum(s[k])
        // Cleared: the previous value stays (an existing cycle), the sourced default stays (a new one), optional ones stay empty.
        const keep = cycle ? (cycle[k] as number | undefined) : OPTIONAL.has(k) ? undefined : (c[k] as number | undefined)
        ;(next as Record<string, unknown>)[k] = v ?? keep
      }
      if (!next.flowerWeeks) throw new Error(t("cycleForm.needFlowerWeeks"))
      const h: NonNullable<Cycle["harvest"]> = { ...(c.harvest ?? {}) }
      for (const k of H_FIELDS) h[k] = parseNum(s[`h_${k}`])
      next.harvest = Object.values(h).some((v) => v != null && v !== "") ? h : undefined
      await saveCycle(next)
    })

  const expected = expectedHarvest({ ...c, flowerWeeks: parseNum(s.flowerWeeks) ?? c.flowerWeeks })
  const editing = !!cycle
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={harvestOnly ? t("cycleForm.harvestTitle") : editing ? t("journal.editCycle") : t("growSet.newCycle")} footer={<SaveBar busy={busy} onSave={save} />}>
      {!harvestOnly && (
        <>
          <div className="flex flex-col gap-2.5" id="cycle-essentials">
            <TextField id="c-name" label={t("cycleForm.name")} value={c.name} onChange={(v) => setC((x) => ({ ...x, name: v }))} />
            <TextField id="c-cult" label={t("cycleForm.cultivars")} hint={t("cycleForm.cultivarsHint")} value={s.cultivars ?? ""} onChange={sv("cultivars")} />
            {spaces.length > 0 && !editing && <Seg<string> label={t("cycleForm.space")} value={c.spaceId} onChange={pickSpace} options={spaces.map((x) => ({ value: x.id, label: x.name }))} />}
            <TextField id="c-germ" type="date" label={editing ? t("cycleForm.start") : `${t("cycleForm.start")} · ${t("common.required")}`} hint={t("cycleForm.startHint")} value={c.germinationDate ?? ""} onChange={txt("germinationDate")} />
          </div>

          {editing && (
            <Group title={t("cycleForm.steps")} id="cycle-steps">
              <p className="mb-2 text-[0.75rem] leading-[1.45] text-fg-3">{t("cycleForm.stepsD")}</p>
              <Grid>
                <TextField id="c-veg" type="date" label={t("cycleForm.veg")} value={c.vegDate ?? ""} onChange={txt("vegDate")} />
                <TextField id="c-flip" type="date" label={t("cycleForm.flip")} value={c.flipDate ?? ""} onChange={txt("flipDate")} />
                <TextField id="c-harv" type="date" label={t("cycleForm.harvestDate")} value={c.harvestDate ?? ""} onChange={txt("harvestDate")} />
                {c.transferDate && <TextField id="c-trans" type="date" label={t("cycleForm.oldTransfer")} value={c.transferDate} onChange={txt("transferDate")} />}
              </Grid>
              {expected && (
                <p className="mt-2 text-[0.78125rem] font-medium text-fg-2" id="cycle-expected">
                  {t("cycleForm.expectedHarvest", { date: dm(expected) })} <span className="font-normal text-fg-3">· {t("cycleForm.expectedHarvestD", { weeks: parseNum(s.flowerWeeks) ?? c.flowerWeeks })}</span>
                </p>
              )}
            </Group>
          )}

          <Accordion type="multiple" className="mt-3 rounded-lg border border-line bg-surface px-3">
            <AccordionItem value="planned" className="border-line">
              <AccordionTrigger className="py-3 text-[0.8125rem] font-semibold hover:no-underline">{t("cycleForm.planned")}</AccordionTrigger>
              <AccordionContent className="flex flex-col gap-2.5 pb-3">
                <p className="text-[0.75rem] leading-[1.45] text-fg-3">{t("cycleForm.plannedD")}</p>
                <Grid>
                  <TextField id="c-pflip" type="date" label={t("cycleForm.plannedFlip")} value={c.plannedFlipDate ?? ""} onChange={txt("plannedFlipDate")} />
                  <NumField id="c-fw" integer label={t("cycleForm.flowerWeeks")} hint={t("cycleForm.flowerWeeksHint")} value={s.flowerWeeks ?? ""} onChange={sv("flowerWeeks")} />
                  <NumField id="c-pdry" integer label={t("cycleForm.plannedDrying")} value={s.plannedDryingDays ?? ""} onChange={sv("plannedDryingDays")} />
                  {c.plannedTransferDate && <TextField id="c-ptrans" type="date" label={t("cycleForm.plannedTransfer")} hint={t("cycleForm.plannedTransferHint")} value={c.plannedTransferDate} onChange={txt("plannedTransferDate")} />}
                </Grid>
                {!editing && (
                  <>
                    <p className="text-[0.75rem] leading-[1.45] text-fg-3">{t("cycleForm.pastSteps")}</p>
                    <Grid>
                      <TextField id="c-veg" type="date" label={t("cycleForm.veg")} value={c.vegDate ?? ""} onChange={txt("vegDate")} />
                      <TextField id="c-flip" type="date" label={t("cycleForm.flip")} value={c.flipDate ?? ""} onChange={txt("flipDate")} />
                    </Grid>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="setup" className="border-0">
              <AccordionTrigger className="py-3 text-[0.8125rem] font-semibold hover:no-underline">{t("cycleForm.setupPrefilled")}</AccordionTrigger>
              <AccordionContent className="flex flex-col gap-2.5 pb-3">
                <p className="text-[0.75rem] leading-[1.45] text-fg-3">{t("cycleForm.setupD")}</p>
                <Seg<Substrate>
                  label={t("cycleForm.substrate")}
                  value={c.substrate}
                  onChange={(v) => setC((x) => ({ ...x, substrate: v }))}
                  options={(["coco", "soil", "mix7030"] as const).map((v) => ({ value: v, label: t(`substrate.${v}`) }))}
                />
                <Seg<WaterMode> label={t("cycleForm.waterMode")} value={c.waterMode} onChange={(v) => setC((x) => ({ ...x, waterMode: v }))} options={(["auto", "manual"] as const).map((v) => ({ value: v, label: t(`mode.${v}`) }))} />
                <Grid>
                  <NumField id="c-pv" label={t("cycleForm.potVolume")} value={s.potVolumeL ?? ""} onChange={sv("potVolumeL")} placeholder={t("equip.missing")} />
                  <NumField id="c-pc" integer label={t("cycleForm.potCount")} value={s.potCount ?? ""} onChange={sv("potCount")} placeholder={t("equip.missing")} />
                </Grid>
                {c.waterMode === "auto" && <NumField id="c-flow" integer label={t("cycleForm.flow")} hint={t("cycleForm.flowHint")} value={s.flowMlPerMin ?? ""} onChange={sv("flowMlPerMin")} placeholder={t("equip.missing")} />}
                <TextField id="c-lights" label={t("cycleForm.lights")} value={c.lights} onChange={(v) => setC((x) => ({ ...x, lights: v }))} />
                <Grid>
                  <TextField id="c-on" type="time" label={t("cycleForm.lightsOn")} value={c.lightsOn} onChange={(v) => setC((x) => ({ ...x, lightsOn: v || x.lightsOn }))} />
                  <NumField id="c-leaf" label={t("cycleForm.leafOffset")} value={s.leafOffsetC ?? ""} onChange={sv("leafOffsetC")} />
                </Grid>
                {c.waterMode === "auto" && (
                  <Grid>
                    <NumField id="c-shot" label={t("cycleForm.shotPct")} hint={t("cycleForm.shotPctHint")} value={s.shotPct ?? ""} onChange={sv("shotPct")} />
                    <NumField id="c-p1" integer label={t("cycleForm.p1Shots")} value={s.p1Shots ?? ""} onChange={sv("p1Shots")} />
                    <NumField id="c-p1i" integer label={t("cycleForm.p1Interval")} hint={t("cycleForm.p1IntervalHint")} value={s.p1IntervalMin ?? ""} onChange={sv("p1IntervalMin")} />
                    <NumField id="c-p0" integer label={t("cycleForm.p0Delay")} hint={t("cycleForm.p0DelayHint")} value={s.p0DelayMin ?? ""} onChange={sv("p0DelayMin")} />
                  </Grid>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
