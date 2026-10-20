// Cycle form (lot 10b, decisions of Thomas): creating a cycle asks only for a name, the variety(ies), the space and the
// start date. Planned dates are optional and folded; watering and gear come prefilled from the space's equipment, folded.
// Steps (veg, 12/12, harvest) are one tap on the day from Today; their dates can be corrected here.
// Lot 15a: a cycle is never saved without a space (one is created here when there is none) nor without its start date;
// every error is written under its field, which is scrolled to and focused.
import { useEffect, useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { AreaField, FieldError, focusField, Grid, Group, NumField, Seg, Sheet, TextField } from "@/components/hydro/form"
import { useSettings } from "@/app/settings-context"
import { newId, useGrow } from "@/app/grow-context"
import { badNums, parseNum } from "@/calc/formulas"
import { todayIso } from "@/calc/stage"
import { equipmentPrefill, expectedHarvest } from "@/calc/steps"
import { freeColor, newSpace, spaceNutrition } from "@/model/grow-ops"
import { TEMPLATES, type TemplateId } from "@/model/grow"
import { PLANT_IDS, type Cycle, type PlantId, type Substrate, type WaterMode } from "@/model/types"
import { defaultCycle, SaveBar, useSaver, useShow } from "./sheets"
import { joined, segment, tertiary } from "@/components/hydro/styles"
import { openVariety } from "./tools/varieties"

/** Numbers of the form. Cleared on an existing cycle = the previous value is kept (lot 10b: never Thomas's values). */
const NUM_FIELDS = ["flowerWeeks", "potVolumeL", "potCount", "flowMlPerMin", "shotPct", "p1Shots", "p1IntervalMin", "p0DelayMin", "leafOffsetC", "plannedDryingDays"] as const
/** May stay empty ("donnée manquante"): nothing is put in their place. */
const OPTIONAL = new Set<string>(["potVolumeL", "potCount", "flowMlPerMin", "plannedDryingDays"])
const H_FIELDS = ["wetG", "dryG", "watts", "dryingDays", "jarRh"] as const
/** Where each number is typed, in the order of the form (the first error is the one focused). */
const FIELD_ID: Record<string, string> = {
  flowerWeeks: "c-fw",
  plannedDryingDays: "c-pdry",
  potVolumeL: "c-pv",
  potCount: "c-pc",
  flowMlPerMin: "c-flow",
  leafOffsetC: "c-leaf",
  shotPct: "c-shot",
  p1Shots: "c-p1",
  p1IntervalMin: "c-p1i",
  p0DelayMin: "c-p0",
  h_wetG: "h-wet",
  h_dryG: "h-dry",
  h_watts: "h-w",
  h_dryingDays: "h-dd",
  h_jarRh: "h-rh",
  ...Object.fromEntries(PLANT_IDS.map((id) => [`hp_${id}`, `h-p-${id}`])),
}
/** The folded part holding a field: an error there opens it first. */
const PART_OF: Record<string, string> = { "c-fw": "planned", "c-pdry": "planned", "c-pv": "setup", "c-pc": "setup", "c-flow": "setup", "c-leaf": "setup", "c-shot": "setup", "c-p1": "setup", "c-p1i": "setup", "c-p0": "setup" }
/** The plants of a cycle for the dry weight per plant (lot 12a): as many as its pots, P1–P4. */
const plantIdsOf = (c: Pick<Cycle, "potCount">) => PLANT_IDS.slice(0, Math.max(1, Math.min(PLANT_IDS.length, c.potCount ?? PLANT_IDS.length)))

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
  const { cycle: active, cycles, spaces, allSpaces, space: curSpace, saveCycle, saveSpace, equipment, assignments, grow } = useGrow()
  const cycle = cycleId === "new" ? null : ((cycleId ? cycles.find((c) => c.id === cycleId) : active) ?? null)
  const show = useShow()
  const [c, setC] = useState<Cycle>(defaultCycle)
  const [s, setS] = useState<Record<string, string>>({})
  // No space yet: the cycle's space is created with it (name and template, as in the assistant).
  const [ns, setNs] = useState<{ name: string; template: TemplateId }>({ name: "", template: "flower" })
  // Errors show once Save is tapped, and go away as soon as the field is right.
  const [tried, setTried] = useState(false)
  const [parts, setParts] = useState<string[]>([])
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
    for (const id of PLANT_IDS) st[`hp_${id}`] = show(base.harvest?.dryByPlant?.[id])
    setS(st)
  }

  useEffect(() => {
    if (!open) return
    setTried(false)
    setParts([])
    setNs({ name: t("onb.firstSpace"), template: "flower" })
    // A cycle saved without a space (before lot 15a) gets the only space, else waits for a choice.
    const lost = cycle && !allSpaces.some((x) => x.id === cycle.spaceId)
    load(cycle ? (lost ? { ...cycle, spaceId: spaces.length === 1 ? spaces[0].id : undefined } : cycle) : fresh(spaceId ?? curSpace?.id ?? spaces[0]?.id, todayIso()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const txt = (k: keyof Cycle) => (v: string) => setC((x) => ({ ...x, [k]: v || undefined }))
  const sv = (k: string) => (v: string) => setS((x) => ({ ...x, [k]: v }))
  /** Another space for a new cycle: its equipment fills the folded part again. A cycle without a space only takes it. */
  const pickSpace = (sid: string) => {
    if (cycle) return setC((x) => ({ ...x, spaceId: sid }))
    const f = fresh(sid, c.germinationDate ?? todayIso())
    load({ ...f, id: c.id, name: c.name, cultivars: (s.cultivars ?? "").split(",").map((x) => x.trim()).filter(Boolean), germinationDate: c.germinationDate })
  }

  const editing = !!cycle
  // A new cycle, or one saved without a space before lot 15a (« Cycle sans espace » on Today).
  const needsSpace = !harvestOnly && (!editing || !allSpaces.some((x) => x.id === cycle.spaceId))
  /** What blocks Save, by field id, in the order of the form. */
  const check = (): Record<string, string> => {
    const e: Record<string, string> = {}
    if (needsSpace && !spaces.length && !ns.name.trim()) e["c-sp-name"] = t("space.needName")
    if (needsSpace && spaces.length && !spaces.some((x) => x.id === c.spaceId)) e["c-space"] = t("cycleForm.needSpace")
    if (!harvestOnly && !c.germinationDate) e["c-germ"] = t("cycleForm.needStart")
    const bad = new Set(badNums(s, Object.keys(FIELD_ID)))
    const fw = parseNum(s.flowerWeeks) ?? cycle?.flowerWeeks ?? c.flowerWeeks
    for (const [k, id] of Object.entries(FIELD_ID)) {
      if (bad.has(k)) e[id] = t("safe.badNumber")
      else if (k === "flowerWeeks" && !(fw > 0)) e[id] = t("cycleForm.needFlowerWeeks")
      else if ((k === "potVolumeL" || k === "potCount") && (parseNum(s[k]) ?? 1) <= 0) e[id] = t("onb.issue.cyclePots")
    }
    return e
  }
  const errs = tried ? check() : {}

  const save = () => {
    const first = Object.keys(check())[0]
    if (first) {
      setTried(true)
      const part = PART_OF[first]
      if (part) setParts((p) => (p.includes(part) ? p : [...p, part]))
      focusField(first)
      return
    }
    return run(async () => {
      let sid = c.spaceId
      if (needsSpace && !spaces.length) {
        const sp = newSpace({ id: newId("sp"), name: ns.name.trim(), template: ns.template, order: allSpaces.length, now: new Date().toISOString(), color: freeColor(allSpaces.map((x) => x.color)) })
        await saveSpace(sp)
        sid = sp.id
      }
      const next: Cycle = { ...c, spaceId: sid, name: c.name.trim() || t("cycleForm.newName", { n: cycles.length + 1 }), cultivars: (s.cultivars ?? "").split(",").map((x) => x.trim()).filter(Boolean) }
      for (const k of NUM_FIELDS) {
        const v = parseNum(s[k])
        // Cleared: the previous value stays (an existing cycle), the sourced default stays (a new one), optional ones stay empty.
        const keep = cycle ? (cycle[k] as number | undefined) : OPTIONAL.has(k) ? undefined : (c[k] as number | undefined)
        ;(next as Record<string, unknown>)[k] = v ?? keep
      }
      const h: NonNullable<Cycle["harvest"]> = { ...(c.harvest ?? {}) }
      for (const k of H_FIELDS) h[k] = parseNum(s[`h_${k}`])
      // The dry weight per plant: only what was typed; the sum never replaces the dry weight (lot 12a).
      const byPlant = Object.fromEntries(PLANT_IDS.map((id) => [id, parseNum(s[`hp_${id}`])]).filter(([, v]) => v != null)) as Partial<Record<PlantId, number>>
      h.dryByPlant = Object.keys(byPlant).length ? byPlant : undefined
      if (!h.reviewNote?.trim()) h.reviewNote = undefined
      next.harvest = Object.values(h).some((v) => v != null && v !== "") ? h : undefined
      await saveCycle(next)
    })
  }

  const expected = expectedHarvest({ ...c, flowerWeeks: parseNum(s.flowerWeeks) ?? c.flowerWeeks })
  const future = !!c.germinationDate && c.germinationDate > todayIso()
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={harvestOnly ? t("cycleForm.harvestTitle") : editing ? t("journal.editCycle") : t("growSet.newCycle")} footer={<SaveBar busy={busy} onSave={save} />}>
      {!harvestOnly && (
        <>
          <div className="flex flex-col gap-2.5" id="cycle-essentials">
            <TextField id="c-name" label={t("cycleForm.name")} value={c.name} onChange={(v) => setC((x) => ({ ...x, name: v }))} />
            <TextField id="c-cult" label={t("cycleForm.cultivars")} hint={t("cycleForm.cultivarsHint")} value={s.cultivars ?? ""} onChange={sv("cultivars")} />
            {/* The card of each variety already saved with the cycle (lot 12c). */}
            {cycle && cycle.cultivars.length > 0 && (
              <div className="-mt-1 flex flex-wrap gap-x-4" id="c-varieties">
                {cycle.cultivars.map((x) => (
                  <button
                    key={x}
                    type="button"
                    className={tertiary}
                    onClick={() => {
                      onOpenChange(false)
                      openVariety(x)
                    }}
                    data-variety-link
                  >
                    {t("vr.seeCard", { name: x })}
                  </button>
                ))}
              </div>
            )}
            {needsSpace && spaces.length > 0 && (
              <div id="c-space">
                <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("cycleForm.space")}</div>
                <Seg<string> label={t("cycleForm.space")} value={c.spaceId} onChange={pickSpace} options={spaces.map((x) => ({ value: x.id, label: x.name }))} />
                {errs["c-space"] && <FieldError id="c-space-err">{errs["c-space"]}</FieldError>}
              </div>
            )}
            {needsSpace && !spaces.length && (
              <div id="c-new-space" className="flex flex-col gap-2.5 rounded-[10px] border border-line p-3">
                <p className="text-[0.75rem] leading-[1.45] text-fg-2">{t("cycleForm.spaceNew")}</p>
                <TextField id="c-sp-name" label={`${t("space.name")} · ${t("common.required")}`} value={ns.name} onChange={(v) => setNs((x) => ({ ...x, name: v }))} error={errs["c-sp-name"]} />
                <div>
                  <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("space.template")}</div>
                  <div className={joined(3)} id="c-sp-template">
                    {TEMPLATES.map((tp) => (
                      <button key={tp} type="button" aria-pressed={ns.template === tp} onClick={() => setNs((x) => ({ ...x, template: tp }))} className={segment(ns.template === tp)}>
                        {t(`template.${tp}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <TextField
              id="c-germ"
              type="date"
              label={`${t("cycleForm.start")} · ${t("common.required")}`}
              hint={t("cycleForm.startHint")}
              value={c.germinationDate ?? ""}
              onChange={txt("germinationDate")}
              error={errs["c-germ"]}
            />
            {future && (
              <p className="-mt-1.5 text-[0.75rem] leading-snug text-fg-2" id="c-germ-future">
                {t("cycleForm.startFuture", { date: dm(c.germinationDate!) })}
              </p>
            )}
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

          <Accordion type="multiple" value={parts} onValueChange={setParts} className="mt-3 border-y border-line">
            <AccordionItem value="planned" className="border-line">
              <AccordionTrigger className="py-3 text-[0.8125rem] font-semibold hover:no-underline">{t("cycleForm.planned")}</AccordionTrigger>
              <AccordionContent className="flex flex-col gap-2.5 pb-3">
                <p className="text-[0.75rem] leading-[1.45] text-fg-3">{t("cycleForm.plannedD")}</p>
                <Grid>
                  <TextField id="c-pflip" type="date" label={t("cycleForm.plannedFlip")} value={c.plannedFlipDate ?? ""} onChange={txt("plannedFlipDate")} />
                  <NumField id="c-fw" error={errs["c-fw"]} integer label={t("cycleForm.flowerWeeks")} hint={t("cycleForm.flowerWeeksHint")} value={s.flowerWeeks ?? ""} onChange={sv("flowerWeeks")} />
                  <NumField id="c-pdry" error={errs["c-pdry"]} integer label={t("cycleForm.plannedDrying")} value={s.plannedDryingDays ?? ""} onChange={sv("plannedDryingDays")} />
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
                  <NumField id="c-pv" error={errs["c-pv"]} label={t("cycleForm.potVolume")} value={s.potVolumeL ?? ""} onChange={sv("potVolumeL")} placeholder={t("equip.missing")} />
                  <NumField id="c-pc" error={errs["c-pc"]} integer label={t("cycleForm.potCount")} value={s.potCount ?? ""} onChange={sv("potCount")} placeholder={t("equip.missing")} />
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
            <div className="flex flex-col gap-1.5" id="h-plants">
              <span className="text-[0.8125rem] font-semibold text-fg-2">{t("cycleForm.dryPlants")}</span>
              <div className="grid grid-cols-4 gap-2">
                {plantIdsOf({ potCount: parseNum(s.potCount) ?? c.potCount }).map((id) => (
                  <NumField key={id} id={`h-p-${id}`} label={id} value={s[`hp_${id}`] ?? ""} onChange={sv(`hp_${id}`)} />
                ))}
              </div>
              <span className="text-[0.75rem] leading-snug text-fg-3">{t("cycleForm.dryPlantsD")}</span>
            </div>
            <AreaField id="h-review" label={t("cycleForm.reviewNote")} value={c.harvest?.reviewNote ?? ""} onChange={(v) => setC((x) => ({ ...x, harvest: { ...x.harvest, reviewNote: v || undefined } }))} />
          </div>
        </Group>
      )}
    </Sheet>
  )
}
