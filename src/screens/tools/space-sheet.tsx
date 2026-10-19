// Add / edit a space — the one settings page of a space (lot 9): general (template, colour, room, dimensions, modules),
// nutrition (line, add-ons, dosing), watering (cycle settings + pots), light (photoperiod, lamp dimmers), air (extractor
// speed). Tools show results and the day's actions, and open this sheet at the right section.
import { useEffect, useState } from "react"
import { Archive, ArchiveRestore, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Grid, Group, NumField, Seg, Sheet, TextField } from "@/components/hydro/form"
import { spaceColor } from "@/components/hydro/space-pill"
import { useSettings } from "@/app/settings-context"
import { newId, useGrow } from "@/app/grow-context"
import { SaveBar, useSaver, useShow } from "@/screens/sheets"
import { badNums, parseNum } from "@/calc/formulas"
import { todayIso } from "@/calc/stage"
import { areaM2, equipmentAt, spaceIrrigation, volumeM3, withPots } from "@/equipment/calc"
import { MODULES, SPACE_COLORS, TEMPLATES, modulesFor, type Equipment, type Space, type TemplateId } from "@/model/grow"
import { DRYBACK_METHODS, type Cycle, type Substrate, type WaterMode } from "@/model/types"
import { drybackMethodOf } from "@/model/entry"
import { CalcValue } from "./equipment-shared"
import { archiveSpace, duplicateSpace, freeColor, newSpace } from "@/model/grow-ops"
import { cn } from "@/lib/utils"
import { SwitchRow } from "./equipment-shared"

export type SpaceSection = "general" | "nutrition" | "irrigation" | "light" | "air"
import { NutritionFields } from "./nutrition-settings"
import { joined, secondary, segment } from "@/components/hydro/styles"

export function SpaceSheet({ open, onOpenChange, space, section }: { open: boolean; onOpenChange: (o: boolean) => void; space?: Space; section?: SpaceSection }) {
  const { t, num, settings } = useSettings()
  const { allSpaces, sites, grow, assignments, equipment, saveSpace, saveGrow, addAssignment, cycleIn, saveCycle, saveEquipment, assignEquipment } = useGrow()
  const show = useShow()
  const [s, setS] = useState<Space>(() => newSpace({ id: "x", name: "", template: "flower", order: 0, now: "" }))
  const [dims, setDims] = useState({ l: "", w: "", h: "" })
  const [own, setOwn] = useState(false)
  // Operational settings (existing spaces): the running cycle's watering, pots, lamps, extractor.
  const cycle: Cycle | null = space ? cycleIn(space.id) : null
  const today = todayIso()
  const here = space ? equipmentAt(space.id, today, assignments).map((a) => equipment.find((e) => e.id === a.equipmentId)).filter((e): e is Equipment => !!e) : []
  const lamps = here.filter((e) => e.type === "lamp")
  const ext = here.find((e) => e.type === "extractor")
  const irr = space ? spaceIrrigation(space.id, today, equipment, assignments) : null
  const [w, setW] = useState<{ mode: WaterMode; substrate: Substrate; lightsOn: string; establishing: boolean }>({ mode: "auto", substrate: "coco", lightsOn: "06:00", establishing: false })
  const [f, setF] = useState<Record<string, string>>({})
  const sf = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const { busy, run } = useSaver(() => onOpenChange(false))
  // Opened from a tool: only that section, the rest one tap away.
  const [all, setAll] = useState(true)
  // Grow-wide nutrition, editable here too when the space follows the grow (one place to change it).
  const [growNut, setGrowNut] = useState(grow?.nutrition)
  const shows = (sec: SpaceSection) => all || sec === section

  useEffect(() => {
    if (!open) return
    setAll(!section || section === "general")
    setGrowNut(grow?.nutrition)
    const base = space ?? newSpace({ id: newId("sp"), name: "", template: "flower", order: allSpaces.length, now: new Date().toISOString(), color: freeColor(allSpaces.map((x) => x.color)) })
    setS(base)
    setDims({ l: show(base.dimensionsCm?.l), w: show(base.dimensionsCm?.w), h: show(base.dimensionsCm?.h) })
    setOwn(!!base.nutrition && Object.keys(base.nutrition).length > 0)
    setW({ mode: cycle?.waterMode ?? "auto", substrate: cycle?.substrate ?? "coco", lightsOn: cycle?.lightsOn ?? "06:00", establishing: !!cycle?.establishing })
    setF({
      potL: show(irr?.potL.ok ? irr.potL.value : undefined),
      potN: show(irr?.potCount),
      shotPct: show(cycle?.shotPct),
      p1n: show(cycle?.p1Shots),
      gap: show(cycle?.p1IntervalMin),
      p0: show(cycle?.p0DelayMin),
      hours: show(base.light?.photoperiodH),
      speed: show(ext?.extractor?.speedPct),
      ...Object.fromEntries(lamps.map((l) => [`dim_${l.id}`, show(l.lamp?.dimmerPct)])),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const d = { l: parseNum(dims.l), w: parseNum(dims.w), h: parseNum(dims.h) }
  const area = areaM2(d)
  const vol = volumeM3(d)
  const build = (): Space => {
    const out: Space = { ...s, name: s.name.trim() }
    // Dryback method: weighing is the default, so it is not stored; a sensor name only for "Autre capteur".
    const dm = drybackMethodOf(s)
    const sensorName = dm === "sensor" ? s.irrigation?.sensorName?.trim() : undefined
    if (dm === "weight") delete out.irrigation
    else out.irrigation = { drybackMethod: dm, ...(sensorName ? { sensorName } : {}) }
    const hours = parseNum(f.hours)
    if (hours && hours > 0 && hours <= 24) out.light = { ...(out.light ?? {}), photoperiodH: hours }
    else delete out.light
    const dc = Object.fromEntries(Object.entries(d).filter(([, v]) => v != null))
    if (Object.keys(dc).length) out.dimensionsCm = dc
    else delete out.dimensionsCm
    if (!own) delete out.nutrition
    else out.nutrition = { ...(grow?.nutrition ?? {}), ...(s.nutrition ?? {}) }
    return out
  }
  const save = () =>
    run(async () => {
      if (badNums(f).length || badNums(dims).length) throw new Error(t("safe.fixFields"))
      const next = build()
      if (!next.name) throw new Error(t("space.name"))
      await saveSpace(next)
      if (!own && growNut && JSON.stringify(growNut) !== JSON.stringify(grow?.nutrition)) await saveGrow({ nutrition: growNut })
      if (!space) return
      const now = new Date().toISOString()
      // Watering settings belong to the running cycle.
      if (cycle) {
        const num_ = (k: string, fallback: number) => parseNum(f[k]) ?? fallback
        const nextCycle: Cycle = {
          ...cycle,
          waterMode: w.mode,
          substrate: w.substrate,
          lightsOn: w.lightsOn,
          establishing: w.establishing,
          shotPct: Math.min(6, Math.max(0.5, num_("shotPct", cycle.shotPct))),
          p1Shots: num_("p1n", cycle.p1Shots),
          p1IntervalMin: num_("gap", cycle.p1IntervalMin),
          p0DelayMin: num_("p0", cycle.p0DelayMin),
        }
        const potL = parseNum(f.potL)
        if (potL) nextCycle.potVolumeL = potL
        const potN = parseNum(f.potN)
        if (potN) nextCycle.potCount = Math.round(potN)
        if (irr?.flow.ok) nextCycle.flowMlPerMin = irr.flow.value
        if (JSON.stringify(nextCycle) !== JSON.stringify(cycle)) await saveCycle(nextCycle)
      }
      // Pots: the space's container (created and placed here if there is none).
      const potL = parseNum(f.potL)
      const potN = parseNum(f.potN)
      if (potL && (potL !== (irr?.potL.ok ? irr.potL.value : undefined) || (potN && potN !== irr?.potCount))) {
        const existing = equipment.find((e) => e.id === irr?.containerId)
        const pots = withPots(existing, { volumeL: potL, count: potN ? Math.round(potN) : undefined, substrate: w.substrate, id: newId("eq-"), now, name: t("irr.potsName", { v: num(potL, potL % 1 ? 1 : 0) }), decimal: settings.lang === "fr" ? "," : "." })
        await saveEquipment(pots)
        if (!existing) await assignEquipment(pots.id, space.id)
        else if (potN && irr?.containerAssignment?.quantity != null) await addAssignment({ ...irr.containerAssignment, quantity: Math.round(potN) })
      }
      for (const l of lamps) {
        const d = parseNum(f[`dim_${l.id}`])
        if (d != null && d !== l.lamp?.dimmerPct) await saveEquipment({ ...l, lamp: { ...l.lamp, dimmerPct: Math.min(100, Math.max(0, d)) } })
      }
      const sp = parseNum(f.speed)
      if (ext && sp != null && sp !== ext.extractor?.speedPct) await saveEquipment({ ...ext, extractor: { ...ext.extractor, speedPct: Math.min(100, Math.max(0, sp)) } })
    })
  const duplicate = () =>
    run(async () => {
      const src = build()
      let n = 0
      const d2 = duplicateSpace(src, { id: newId("sp"), name: t("space.copyName", { name: src.name }), order: allSpaces.length, now: new Date().toISOString(), date: todayIso(), color: freeColor(allSpaces.map((x) => x.color)) }, assignments, () => `${newId("as")}${++n}`)
      await saveSpace(d2.space)
      for (const a of d2.assignments) await addAssignment(a)
      return t("space.duplicated")
    })
  const archive = () =>
    run(async () => {
      await saveSpace(archiveSpace(build(), !s.archived, new Date().toISOString()))
      if (!s.archived) return t("space.archivedToast")
    })

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={space ? t("space.settingsOf", { name: space.name }) : t("space.new")} footer={<SaveBar busy={busy} onSave={save} />}>
      {!all && (
        <button type="button" onClick={() => setAll(true)} className={cn(secondary, "mb-1")} id="sp-all">
          {t("space.showAll")}
        </button>
      )}
      {shows("general") && (
        <>
      <Group title={t("space.name")}>
        <TextField id="sp-name" label={`${t("space.name")} · ${t("common.required")}`} value={s.name} onChange={(v) => setS((x) => ({ ...x, name: v }))} />
      </Group>
      <Group title={t("space.template")}>
        <div className={joined(3)}>
          {TEMPLATES.map((tp) => (
            <button
              key={tp}
              type="button"
              aria-pressed={s.template === tp}
              onClick={() => setS((x) => ({ ...x, template: tp as TemplateId, modules: space ? x.modules : modulesFor(tp) }))}
              className={segment(s.template === tp)}
            >
              {t(`template.${tp}`)}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[0.75rem] text-fg-3">{t("space.templateHint")}</p>
      </Group>
      <Group title={t("space.color")}>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("space.color")}>
          {SPACE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={s.color === c}
              aria-label={t(`space.colorNames.${c}`)}
              title={t(`space.colorNames.${c}`)}
              onClick={() => setS((x) => ({ ...x, color: c }))}
              className={cn("size-11 rounded-[10px] outline-offset-2", s.color === c ? "outline-2 outline-fg outline-solid" : "")}
              style={{ background: spaceColor(c) }}
            />
          ))}
        </div>
      </Group>
      {sites.length > 0 && (
        <Group title={t("space.site")}>
          <Seg<string>
            label={t("space.site")}
            value={s.siteId ?? "none"}
            onChange={(v) => setS((x) => ({ ...x, siteId: v === "none" ? undefined : v }))}
            options={[{ value: "none", label: t("space.noSite") }, ...sites.map((x) => ({ value: x.id, label: x.name }))]}
          />
        </Group>
      )}
      <Group title={t("space.dims")} aside={<span className="text-[0.75rem] text-fg-3 tabular">{area.ok ? `${num(area.value, 2)} m²` : ""}{vol.ok ? ` · ${num(vol.value, 2)} m³` : ""}</span>}>
        <Grid cols={3}>
          <NumField id="sp-l" integer label={t("space.l")} value={dims.l} onChange={(v) => setDims((x) => ({ ...x, l: v }))} />
          <NumField id="sp-w" integer label={t("space.w")} value={dims.w} onChange={(v) => setDims((x) => ({ ...x, w: v }))} />
          <NumField id="sp-h" integer label={t("space.h")} value={dims.h} onChange={(v) => setDims((x) => ({ ...x, h: v }))} />
        </Grid>
      </Group>
      <Group title={t("space.modules")}>
        <div className="rounded-md border border-line bg-surface px-3">
          {MODULES.map((m) => (
            <SwitchRow key={m} id={`sp-m-${m}`} label={t(`module.${m}`)} checked={!!s.modules[m]} onChange={(v) => setS((x) => ({ ...x, modules: { ...x.modules, [m]: v } }))} />
          ))}
        </div>
        <p className="mt-1.5 text-[0.75rem] text-fg-3">{t("space.modulesD")}</p>
      </Group>
        </>
      )}
      {s.modules.nutrition && shows("nutrition") && (
        <Group title={t("space.nutrition")} className="scroll-mt-4" id="sp-sec-nutrition">
          <Seg<"inherit" | "own">
            label={t("space.nutrition")}
            value={own ? "own" : "inherit"}
            onChange={(v) => setOwn(v === "own")}
            options={[
              { value: "inherit", label: t("space.inherit") },
              { value: "own", label: t("space.custom") },
            ]}
          />
          {!own && growNut && (
            <div className="mt-2.5">
              <p className="mb-2 text-[0.75rem] text-fg-3">{t("space.growNutHint")}</p>
              <NutritionFields value={growNut} onChange={setGrowNut} idPrefix="spg" />
            </div>
          )}
          {own && (
            <div className="mt-2.5">
              <NutritionFields value={{ ...(grow?.nutrition ?? { line: "athena-pro", addons: [], dosing: "conc226" }), ...(s.nutrition ?? {}) }} onChange={(n) => setS((x) => ({ ...x, nutrition: n }))} idPrefix="sp" />
            </div>
          )}
        </Group>
      )}
      {space && s.modules.irrigation && shows("irrigation") && (
        <Group title={t("space.secIrrigation")} id="sp-sec-irrigation">
          <div className="flex flex-col gap-2.5">
            <div id="sp-dryback">
              <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("space.drybackMethod")}</div>
              <div className={joined(2)}>
                {DRYBACK_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={drybackMethodOf(s) === m}
                    onClick={() => setS((x) => ({ ...x, irrigation: { ...x.irrigation, drybackMethod: m } }))}
                    className={segment(drybackMethodOf(s) === m)}
                  >
                    {t(`space.dm.${m}`)}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[0.75rem] leading-snug text-fg-3">{t(`space.dmD.${drybackMethodOf(s)}`)}</p>
              {drybackMethodOf(s) === "sensor" && (
                <TextField
                  id="sp-sensor-name"
                  className="mt-2"
                  label={t("space.sensorName")}
                  value={s.irrigation?.sensorName ?? ""}
                  onChange={(v) => setS((x) => ({ ...x, irrigation: { ...x.irrigation, sensorName: v } }))}
                />
              )}
            </div>
            {!cycle && <p className="text-[0.75rem] text-fg-3">{t("space.noCycleIrr")}</p>}
            {cycle && (
              <>
                <Seg<WaterMode> label={t("irr.mode")} value={w.mode} onChange={(v) => setW((x) => ({ ...x, mode: v }))} options={(["auto", "manual"] as const).map((v) => ({ value: v, label: t(`mode.${v}`) }))} />
                <Seg<Substrate> label={t("irr.substrate")} value={w.substrate} onChange={(v) => setW((x) => ({ ...x, substrate: v }))} options={(["coco", "soil", "mix7030"] as const).map((v) => ({ value: v, label: t(`substrate.${v}`) }))} />
              </>
            )}
            <Grid>
              <NumField id="sp-potL" label={t("irr.pot")} value={f.potL ?? ""} onChange={sf("potL")} />
              <NumField id="sp-potN" integer label={t("irr.potCount")} value={f.potN ?? ""} onChange={sf("potN")} />
            </Grid>
            {cycle && (
              <Grid>
                <TextField id="sp-on" type="time" label={t("irr.lightsOn")} value={w.lightsOn} onChange={(v) => setW((x) => ({ ...x, lightsOn: v || "06:00" }))} />
                <NumField id="sp-shot" label={t("irr.shotPct")} hint={t("irr.shotHint")} value={f.shotPct ?? ""} onChange={sf("shotPct")} />
                <NumField id="sp-p1n" integer label={w.mode === "auto" && w.substrate === "coco" ? t("irr.p1n") : t("irr.p1nPass")} hint={t("irr.p1nHint")} value={f.p1n ?? ""} onChange={sf("p1n")} />
                <NumField id="sp-gap" integer label={t("irr.gap")} hint={t("irr.gapHint")} value={f.gap ?? ""} onChange={sf("gap")} />
                {w.mode === "auto" && w.substrate === "coco" && <NumField id="sp-p0" integer label={t("irr.p0")} hint={t("irr.p0Hint")} value={f.p0 ?? ""} onChange={sf("p0")} />}
              </Grid>
            )}
            {cycle && (
              <div className="rounded-md border border-line bg-surface px-3">
                <SwitchRow id="sp-est" label={t("irr.establishing")} hint={t("irr.establishingHint")} checked={w.establishing} onChange={(v) => setW((x) => ({ ...x, establishing: v }))} />
              </div>
            )}
            {irr && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface px-3 py-2">
                <span className="min-w-0">
                  <span className="block text-[0.8125rem] font-medium">{t("irr.flow")}</span>
                  <span className="block text-[0.75rem] text-fg-3">{t("space.flowFromEquip")}</span>
                </span>
                <CalcValue c={irr.flow} fmt={(v) => `${num(v)} mL/min`} />
              </div>
            )}
          </div>
        </Group>
      )}
      {space && s.modules.light && shows("light") && (
        <Group title={t("space.secLight")} id="sp-sec-light">
          <Grid>
            <NumField id="sp-hours" label={t("lgt.hours")} hint={t("space.hoursHint")} value={f.hours ?? ""} onChange={sf("hours")} />
            {lamps.map((l) => (
              <NumField key={l.id} id={`sp-dim-${l.id}`} integer label={t("lgt.dimmer", { name: l.name })} hint={l.lamp?.dimmable ? t("lgt.dimLevels", { n: l.lamp.dimmable }) : undefined} value={f[`dim_${l.id}`] ?? ""} onChange={sf(`dim_${l.id}`)} />
            ))}
          </Grid>
          {!lamps.length && <p className="mt-1.5 text-[0.75rem] text-fg-3">{t("lgt.noLamp")}</p>}
        </Group>
      )}
      {space && s.modules.climate && ext && shows("air") && (
        <Group title={t("space.secAir")} id="sp-sec-air">
          <NumField id="sp-speed" integer label={t("clim.speed", { name: ext.name })} hint={ext.extractor?.speedPct == null ? t("clim.speedUnknown") : undefined} value={f.speed ?? ""} onChange={sf("speed")} />
        </Group>
      )}
      {space && all && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={duplicate} disabled={busy} className="h-11 text-[0.84375rem] font-semibold">
            <Copy className="size-4" /> {t("space.duplicate")}
          </Button>
          <Button variant="outline" onClick={archive} disabled={busy} className="h-11 text-[0.84375rem] font-semibold">
            {s.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />} {s.archived ? t("space.unarchive") : t("space.archive")}
          </Button>
        </div>
      )}
    </Sheet>
  )
}
