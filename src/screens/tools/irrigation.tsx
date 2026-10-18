import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Grid, NumField, Seg, TextField } from "@/components/hydro/form"
import { Chip, Label, Reveal, SourceNote } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { parseNum } from "@/calc/formulas"
import { stageOn, todayIso } from "@/calc/stage"
import { dayTargets } from "@/calc/targets"
import { buildProgram, isPrecision, programTotals, sensorPlan, steerStage, SENSOR, type ProgramRow, type SensorPhase, type SteerStage } from "@/calc/program"
import { defaultCycle } from "@/screens/sheets"
import { spaceIrrigation, withPots } from "@/equipment/calc"
import { newId } from "@/app/grow-context"
import { CalcValue } from "./equipment-shared"
import { getCatalog, type ManualPhase } from "@/data/nutrients"
import { manualRow } from "@/calc/targets"
import type { Cycle, StageKey, Substrate, WaterMode } from "@/model/types"
import type { MessageKey } from "@/i18n/types"
import { cn } from "@/lib/utils"

const STEER_TO_STAGE: Record<SteerStage, StageKey> = { inst: "veg", veg: "veg", str: "stretch", mas: "bulk", fin: "finish" }

export function IrrigationTool() {
  const { t, num, range, settings } = useSettings()
  const { cycle, saveCycle, space, equipment, assignments, nutrition, saveEquipment, assignEquipment, addAssignment } = useGrow()
  // Pot volume and pump flow come from the space's equipment (lot 4b). The pots can be changed here: the change is
  // written to the space's container (created if there is none). Nothing is guessed: empty stays "donnée manquante".
  const eq = space ? spaceIrrigation(space.id, todayIso(), equipment, assignments) : null
  const [pots, setPots] = useState<{ vol: string; n: string }>({ vol: "", n: "" })
  const potTyped = parseNum(pots.vol)
  const countTyped = parseNum(pots.n)
  const potL = potTyped && potTyped > 0 ? potTyped : eq?.potL.ok ? eq.potL.value : undefined
  const potOk = potL != null
  const potsDirty = (potTyped != null && potTyped !== (eq?.potL.ok ? eq.potL.value : undefined)) || (countTyped != null && countTyped !== eq?.potCount)
  const cat = getCatalog(nutrition.line)
  const show = (v?: number) => (v == null ? "" : settings.lang === "fr" ? String(v).replace(".", ",") : String(v))

  const base = cycle ?? defaultCycle()
  const cycleStage = cycle ? steerStage(stageOn(cycle, todayIso()).key, cycle.establishing) : null
  const [mode, setMode] = useState<WaterMode>(base.waterMode)
  const [substrate, setSubstrate] = useState<Substrate>(base.substrate)
  const [stage, setStage] = useState<SteerStage>(cycleStage ?? "veg")
  const [f, setF] = useState<Record<string, string>>({})
  const [lightsOn, setLightsOn] = useState(base.lightsOn)
  const [sPhase, setSPhase] = useState<SensorPhase>(base.sensor?.phase ?? "veg")

  useEffect(() => {
    const b = cycle ?? defaultCycle()
    setMode(b.waterMode)
    setSubstrate(b.substrate)
    setLightsOn(b.lightsOn)
    setF({
      shotPct: show(b.shotPct),
      p1n: show(b.p1Shots),
      gap: show(b.p1IntervalMin),
      p0: show(b.p0DelayMin),
      sBase: show(b.sensor?.base),
      sPeak: show(b.sensor?.peak),
      sP2: show(b.sensor?.p2Pct ?? 1.5),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle?.id, settings.lang])

  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }))
  const input = useMemo(
    () => ({
      waterMode: mode,
      substrate,
      lightsOn,
      potVolumeL: potL ?? 0,
      shotPct: Math.min(6, Math.max(0.5, parseNum(f.shotPct) ?? 3)),
      p1Shots: parseNum(f.p1n) ?? 5,
      p1IntervalMin: parseNum(f.gap) ?? 20,
      p0DelayMin: parseNum(f.p0) ?? 90,
      flowMlPerMin: eq?.flow.ok ? eq.flow.value : undefined,
    }),
    [mode, substrate, lightsOn, f, potL, eq?.flow],
  )
  const prec = isPrecision(input)
  const rows = buildProgram(input, stage)
  const totals = programTotals(rows)
  const cs = cycle ? stageOn(cycle, todayIso()) : null
  const flowerWeek = stage === cycleStage && cs?.flowerWeek ? cs.flowerWeek : stage === "str" ? 2 : undefined
  const tg = dayTargets(STEER_TO_STAGE[stage], { mode, substrate, flowerWeek, line: cat.id })
  const currentManual = manualRow(cat, STEER_TO_STAGE[stage], flowerWeek)
  const potCount = (countTyped && countTyped > 0 ? countTyped : eq?.potCount) ?? base.potCount
  useEffect(() => {
    setPots({ vol: show(eq?.potL.ok ? eq.potL.value : undefined), n: show(eq?.potCount) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space?.id, eq?.containerId, eq?.potL.ok && eq.potL.value, eq?.potCount, settings.lang])
  const savePots = async () => {
    if (!space || !potTyped || potTyped <= 0) return
    try {
      const existing = equipment.find((e) => e.id === eq?.containerId)
      const count = countTyped && countTyped > 0 ? Math.round(countTyped) : undefined
      const next = withPots(existing, { volumeL: potTyped, count, substrate, id: newId("eq-"), now: new Date().toISOString(), name: t("irr.potsName", { v: num(potTyped, potTyped % 1 ? 1 : 0) }) })
      await saveEquipment(next)
      if (!existing) await assignEquipment(next.id, space.id)
      else if (count && eq?.containerAssignment?.quantity != null) await addAssignment({ ...eq.containerAssignment, quantity: count })
      toast.success(t("irr.potsSaved"))
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error).message }))
    }
  }
  const shotMl = Math.round(input.potVolumeL * 10 * input.shotPct)
  const ml = (v: number) => (v >= 1000 ? `${num(v / 1000, 1)} L` : `${num(v)} mL`)
  const dur = (s?: number) => (s == null ? "—" : s >= 60 ? `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, "0")} s` : `${num(Math.round(s))} s`)

  const sensor = sensorPlan(input, sPhase, parseNum(f.sBase) ?? null, parseNum(f.sPeak) ?? null, parseNum(f.sP2) ?? 1.5)

  const apply = async () => {
    if (!cycle) return toast(t("irr.noCycle"))
    const next: Cycle = {
      ...cycle,
      waterMode: mode,
      substrate,
      lightsOn,
      potVolumeL: potOk ? input.potVolumeL : cycle.potVolumeL,
      potCount,
      shotPct: input.shotPct,
      p1Shots: input.p1Shots,
      p1IntervalMin: input.p1IntervalMin,
      p0DelayMin: input.p0DelayMin,
      flowMlPerMin: input.flowMlPerMin ?? cycle.flowMlPerMin,
      establishing: stage === "inst",
      sensor: { phase: sPhase, base: parseNum(f.sBase), peak: parseNum(f.sPeak), p2Pct: parseNum(f.sP2) },
    }
    try {
      await saveCycle(next)
      toast.success(t("irr.applied"))
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error).message }))
    }
  }

  const stages: { v: SteerStage; k: MessageKey }[] = [
    { v: "inst", k: "irr.stInst" },
    { v: "veg", k: "irr.stVeg" },
    { v: "str", k: "irr.stStr" },
    { v: "mas", k: "irr.stMas" },
    { v: "fin", k: "irr.stFin" },
  ]

  return (
    <div className="flex flex-col gap-3">
      <Reveal i={0}>
        <Card className="gap-3">
          <Label emoji="droplet">{t("irr.mode")}</Label>
          <Seg<WaterMode> label={t("irr.mode")} value={mode} onChange={setMode} options={(["auto", "manual"] as const).map((v) => ({ value: v, label: t(`mode.${v}`) }))} />
          <Seg<Substrate> label={t("irr.substrate")} value={substrate} onChange={setSubstrate} options={(["coco", "soil", "mix7030"] as const).map((v) => ({ value: v, label: t(`substrate.${v}`) }))} />
          <p className="text-[12.5px] leading-[1.45] text-fg-2">
            {prec ? t("irr.methodPrec") : mode === "manual" && substrate === "coco" ? t("irr.methodManualCoco") : t("irr.methodManual")}
          </p>
        </Card>
      </Reveal>

      <Reveal i={1}>
        <Card className="gap-3">
          <div className="flex items-center justify-between">
            <Label emoji="sprout">{t("irr.stage")}</Label>
            {cycleStage && <Chip tone="primary">{t(stages.find((s) => s.v === cycleStage)!.k)}</Chip>}
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("irr.stage")}>
            {stages.map((s) => (
              <button
                key={s.v}
                role="radio"
                aria-checked={stage === s.v}
                onClick={() => setStage(s.v)}
                className={cn("h-10 rounded-full border px-3.5 text-[13px] font-semibold", stage === s.v ? "border-primary/40 bg-primary/12 text-primary" : "border-line bg-surface-2 text-fg-2")}
              >
                {t(s.k)}
              </button>
            ))}
          </div>
          {(stage === "inst" || stage === "veg") && (
            <label className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface-2 px-3 py-2.5">
              <span>
                <span className="block text-[13.5px] font-medium">{t("irr.establishing")}</span>
                <span className="block text-[11.5px] text-fg-3">{t("irr.establishingHint")}</span>
              </span>
              <Switch checked={stage === "inst"} onCheckedChange={(v) => setStage(v ? "inst" : "veg")} />
            </label>
          )}
        </Card>
      </Reveal>

      <Reveal i={2}>
        <Card className="gap-3">
          <Label emoji="gear">{t("irr.settings")}</Label>
          <div className="rounded-md border border-line bg-surface-2 px-3 py-1" id="irr-equipment">
            <div className="border-b border-line py-2">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] text-fg-3">{eq?.containerName ?? t("irr.fromEquipment")}</span>
                {eq && !eq.potL.ok && !potTyped && <CalcValue c={eq.potL} fmt={(v) => `${num(v)} L`} />}
              </div>
              <Grid>
                <NumField id="i-pot" label={t("irr.pot")} value={pots.vol} onChange={(v) => setPots((x) => ({ ...x, vol: v }))} />
                <NumField id="i-pots" integer label={t("irr.potCount")} value={pots.n} onChange={(v) => setPots((x) => ({ ...x, n: v }))} />
              </Grid>
              {potsDirty && potTyped != null && potTyped > 0 && (
                <button type="button" onClick={savePots} className="mt-2 h-9 rounded-full border border-primary/40 bg-primary/10 px-3 text-[12.5px] font-semibold text-primary">
                  {eq?.containerId ? t("irr.potsSave") : t("irr.potsCreate")}
                </button>
              )}
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3 py-1.5">
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium">{t("irr.flow")}</span>
                <span className="block text-[11px] text-fg-3">{eq?.pumpName ?? t("irr.fromEquipment")}</span>
              </span>
              {eq ? <CalcValue c={eq.flow} fmt={(v) => `${num(v)} mL/min`} /> : "—"}
            </div>
          </div>
          {(!eq?.potL.ok || !eq?.flow.ok) && (
            <a href="#equipment" className="-mt-1 text-[12.5px] font-semibold text-primary">
              {t("irr.openEquipment")}
            </a>
          )}
          <Grid>
            <TextField id="i-on" type="time" label={t("irr.lightsOn")} value={lightsOn} onChange={(v) => setLightsOn(v || "06:00")} />
            <NumField id="i-shot" label={prec ? t("irr.shotPct") : t("irr.shotPctPass")} hint={t("irr.shotHint")} value={f.shotPct ?? ""} onChange={set("shotPct")} />
            <NumField id="i-p1n" integer label={prec ? t("irr.p1n") : t("irr.p1nPass")} hint={t("irr.p1nHint")} value={f.p1n ?? ""} onChange={set("p1n")} />
            <NumField id="i-gap" integer label={t("irr.gap")} hint={t("irr.gapHint")} value={f.gap ?? ""} onChange={set("gap")} />
            {prec && <NumField id="i-p0" integer label={t("irr.p0")} hint={t("irr.p0Hint")} value={f.p0 ?? ""} onChange={set("p0")} />}
          </Grid>
        </Card>
      </Reveal>

      {tg && stage !== "inst" && (
        <Reveal i={3}>
          <Card>
            <Label emoji="chart">{t("irr.targets")}</Label>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <Tile k={t("irr.steer")} v={tg.steer ? t(`steer.${tg.steer}`) : "—"} />
              <Tile
                k={prec ? t("irr.dose") : t("irr.pass")}
                v={potOk ? `${num(shotMl)} mL${mode === "auto" ? ` · ${input.flowMlPerMin ? dur((shotMl / input.flowMlPerMin) * 60) : "?"}` : ""}` : `${num(input.shotPct, 1)} % · ${t("equip.missing")}`}
                warn={!potOk}
              />
              <Tile k={t("irr.drybackT")} v={tg.dryback ? `${range(tg.dryback.lo, tg.dryback.hi)} %` : "—"} />
              <Tile
                k={t("irr.runoffT")}
                v={prec && tg.runoffPct && potOk ? t("irr.runoffPerPot", { range: `${ml(input.potVolumeL * 10 * tg.runoffPct.lo)}–${ml(input.potVolumeL * 10 * tg.runoffPct.hi)}` }) : t("irr.runoffManual")}
              />
              <Tile k={t("irr.ecRunoffT")} v={tg.ecRunoff ? range(tg.ecRunoff.lo, tg.ecRunoff.hi, 1) : "—"} />
              <Tile k={t("irr.phT")} v={tg.phIn ? range(tg.phIn.lo, tg.phIn.hi, 1) : "—"} />
            </div>
            {mode === "manual" && tg.ecRunoff?.page && <p className="mt-2 text-[11px] text-fg-3">{t("irr.manualSrc", { line: cat.name, p: tg.ecRunoff.page })}</p>}
          </Card>
        </Reveal>
      )}

      <Reveal i={4}>
        <Card>
          <Label emoji="droplet">{t("irr.program")}</Label>
          {mode === "auto" && !input.flowMlPerMin && <p className="mt-2 rounded-md bg-warn/10 px-3 py-2 text-[12px] font-medium text-warn">{t("irr.noFlow")}</p>}
          <ol className="mt-2 flex flex-col">
            {rows.map((r, i) => (
              <ProgramLine key={i} r={r} showMl={potOk} />
            ))}
          </ol>
          {potOk && <p className="mt-2 text-[12px] text-fg-2">
            {t("irr.totals", {
              fixed: ml(totals.fixed),
              opt: totals.optional ? t("irr.totalsOpt", { v: ml(totals.optional) }) : "",
              pots: potCount,
              all: ml(totals.fixed * potCount),
            })}
          </p>}
          <p className="mt-2 text-[11.5px] leading-[1.45] text-fg-3">{prec ? t("irr.progNotePrec") : t("irr.progNoteManual")}</p>
        </Card>
      </Reveal>

      {mode === "manual" && cat.manual.length > 0 && (
        <Reveal i={5}>
          <ManualTable rows={cat.manual} current={currentManual} line={cat.name} />
        </Reveal>
      )}

      {mode === "auto" && (
        <Reveal i={5}>
          <Card className="gap-3">
            <Label emoji="scales">{t("irr.sensor")}</Label>
            <p className="text-[12.5px] leading-[1.45] text-fg-2">{t("irr.sensorD")}</p>
            <Seg<SensorPhase>
              label={t("irr.sensor")}
              value={sPhase}
              onChange={setSPhase}
              options={[
                { value: "veg", label: t("irr.sPhVeg") },
                { value: "gen", label: t("irr.sPhGen") },
                { value: "bulk", label: t("irr.sPhBulk") },
                { value: "ripe", label: t("irr.sPhRipe") },
              ]}
            />
            <Grid cols={3}>
              <NumField id="s-base" label={t("irr.sBase")} value={f.sBase ?? ""} onChange={set("sBase")} />
              <NumField id="s-peak" label={t("irr.sPeak")} value={f.sPeak ?? ""} onChange={set("sPeak")} />
              <NumField id="s-p2" label={t("irr.sP2")} hint={t("irr.sP2Hint")} value={f.sP2 ?? ""} onChange={set("sP2")} />
            </Grid>
            <div className="grid grid-cols-2 gap-2">
              <Tile k={t("irr.sTrigger")} v={sensor.trigger != null ? `${num(Math.round(sensor.trigger))} %` : "—"} />
              <Tile k={t("irr.sDryback")} v={sensor.dryback != null ? `${num(sensor.dryback, 1)} %` : "—"} />
              <Tile k={t("irr.sP1Dose")} v={potOk ? `${num(sensor.p1Ml)} mL · ${dur(sensor.p1Seconds)}` : t("equip.missing")} warn={!potOk} />
              <Tile k={t("irr.sP2Dose")} v={potOk ? `${num(sensor.p2Ml)} mL · ${dur(sensor.p2Seconds)}` : t("equip.missing")} warn={sensor.tooShort || !potOk} />
              <Tile k={t("irr.sShots")} v={SENSOR[sPhase].shots} />
              <Tile k={t("irr.sRunoff")} v={`${SENSOR[sPhase].runoff} %`} />
            </div>
            {sensor.tooShort && <p className="rounded-md bg-warn/10 px-3 py-2 text-[12px] font-medium text-warn">{t("irr.tooShort")}</p>}
            <ol className="flex flex-col">
              {sensor.rows.map((r, i) => (
                <ProgramLine key={i} r={r} trigger={sensor.trigger} showMl={potOk} />
              ))}
            </ol>
            <ul className="flex flex-col gap-1.5 text-[11.5px] leading-[1.45] text-fg-3">
              {(["sNote1", "sNote2", "sNote3", "sNote4"] as const).map((k) => (
                <li key={k}>{t(`irr.${k}`)}</li>
              ))}
            </ul>
          </Card>
        </Reveal>
      )}

      <Button onClick={apply} disabled={!cycle} className="h-12 rounded-full text-[15px] font-bold">
        {t("irr.apply")}
      </Button>
      {!cycle && <p className="text-center text-[12px] text-fg-3">{t("irr.noCycle")}</p>}
      <SourceNote>{t("irr.sources")}</SourceNote>
    </div>
  )
}

/** The line's manual method, week by week (Pro p. 41, Blended p. 60); the row of the chosen stage is highlighted. */
function ManualTable({ rows, current, line }: { rows: ManualPhase[]; current: ManualPhase | null; line: string }) {
  const { t, num, range } = useSettings()
  const label = (m: ManualPhase) =>
    m.stage === "veg" ? t("irr.mVeg") : m.stage === "flush" ? t("irr.mFlush") : m.weeks![0] === m.weeks![1] ? t("irr.mWeek", { w: m.weeks![0] }) : t("irr.mWeeks", { a: m.weeks![0], b: m.weeks![1] })
  const r1 = (x: [number, number]) => (x[0] === x[1] ? num(x[0], 1) : range(x[0], x[1], 1))
  const page = rows[0]?.src.kind === "athena" ? rows[0].src.page : undefined
  return (
    <Card className="gap-2" id="irr-manual">
      <Label emoji="droplet">{t("irr.manualTable", { line })}</Label>
      <div className="grid grid-cols-[1.2fr_0.8fr_1fr_1fr] gap-x-2 px-1 text-[10.5px] font-semibold text-fg-3 uppercase">
        <span>{t("irr.mStage")}</span>
        <span>{t("irr.mEc")}</span>
        <span>{t("irr.ecRunoffT")}</span>
        <span>{t("irr.drybackT")}</span>
      </div>
      <ol>
        {rows.map((m, i) => (
          <li
            key={i}
            data-current={m === current || undefined}
            className={cn("grid grid-cols-[1.2fr_0.8fr_1fr_1fr] items-center gap-x-2 rounded-md px-1 py-2 text-[13px] tabular-nums", m === current ? "bg-primary/12 font-semibold text-fg" : "text-fg-2")}
          >
            <span>{label(m)}</span>
            <span>{r1(m.ecIn)}</span>
            <span>{r1(m.ecRunoff)}</span>
            <span>{range(m.dryback[0], m.dryback[1])} %</span>
          </li>
        ))}
      </ol>
      <p className="text-[11px] leading-[1.45] text-fg-3">{t("irr.manualNote", { p: page ?? "" })}</p>
    </Card>
  )
}

function Tile({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div className="min-w-0 rounded-md border border-line bg-surface-2 px-2.5 py-2">
      <div className="truncate text-[11px] text-fg-3">{k}</div>
      <div className={cn("text-[14px] leading-snug font-semibold tabular-nums", warn && "text-warn")}>{v}</div>
    </div>
  )
}

export function rowText(t: (k: MessageKey, v?: Record<string, string | number>) => string, r: ProgramRow): string {
  switch (r.kind) {
    case "lightsOn":
      return t("irr.rowLightsOn")
    case "lightsOff":
      return t("irr.rowLightsOff")
    case "last":
      return t("irr.rowP3")
    case "inst":
      return t("irr.rowInst")
    case "manual":
      return t("irr.rowPass", { n: r.n!, total: r.total! })
    default:
      if (r.phase === "P1") return r.total === 1 && !r.n ? t("irr.sP1Dose") : t("irr.rowP1", { n: r.n!, total: r.total! })
      if (r.n == null) return t("irr.sP2Dose")
      return t(r.optional ? "irr.rowP2opt" : "irr.rowP2", { n: r.n, total: r.total! })
  }
}

function ProgramLine({ r, trigger, showMl = true }: { r: ProgramRow; trigger?: number | null; showMl?: boolean }) {
  const { t, num } = useSettings()
  const note = r.noteKey ? t(`irr.${r.noteKey}` as MessageKey, { trigger: trigger != null ? num(Math.round(trigger)) : "?" }) : null
  return (
    <li className={cn("grid grid-cols-[48px_40px_1fr_auto] items-start gap-2 border-t border-line px-1 py-2.5 text-[13.5px] first:border-t-0", r.optional && "opacity-75")}>
      <span className="text-fg-2 tabular">{r.time}</span>
      <PhaseTag phase={r.phase} />
      <span className="min-w-0">
        {rowText(t, r)}
        {note && <span className="block text-[11.5px] leading-snug text-fg-3">{note}</span>}
      </span>
      <span className="text-right text-[12.5px] text-fg-2 tabular-nums">
        {r.ml && showMl ? `${num(r.ml)} mL` : ""}
        {r.seconds != null && showMl && <span className="block text-[11px] text-fg-3">{num(r.seconds)} s</span>}
      </span>
    </li>
  )
}

export function PhaseTag({ phase }: { phase: ProgramRow["phase"] }) {
  const label = phase === "OFF" ? "☾" : phase === "MAN" ? "M" : phase === "INST" ? "★" : phase
  return (
    <span
      className={cn(
        "rounded-[6px] py-[3px] text-center text-[10.5px] font-bold",
        (phase === "P0" || phase === "OFF") && "bg-surface-2 text-fg-2",
        (phase === "P1" || phase === "MAN" || phase === "INST") && "bg-info/14 text-info",
        phase === "P2" && "bg-primary/14 text-primary",
        phase === "P3" && "bg-phase-3/14 text-phase-3",
      )}
      aria-label={phase}
    >
      {label}
    </span>
  )
}
