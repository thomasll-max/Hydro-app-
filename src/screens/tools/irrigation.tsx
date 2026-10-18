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
import type { Cycle, StageKey, Substrate, WaterMode } from "@/model/types"
import type { MessageKey } from "@/i18n/types"
import { cn } from "@/lib/utils"

const STEER_TO_STAGE: Record<SteerStage, StageKey> = { inst: "veg", veg: "veg", str: "stretch", mas: "bulk", fin: "finish" }

export function IrrigationTool() {
  const { t, num, range, settings } = useSettings()
  const { cycle, saveCycle } = useGrow()
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
      flow: show(b.flowMlPerMin),
      pot: show(b.potVolumeL),
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
      potVolumeL: parseNum(f.pot) ?? 15,
      shotPct: Math.min(6, Math.max(0.5, parseNum(f.shotPct) ?? 3)),
      p1Shots: parseNum(f.p1n) ?? 5,
      p1IntervalMin: parseNum(f.gap) ?? 20,
      p0DelayMin: parseNum(f.p0) ?? 90,
      flowMlPerMin: parseNum(f.flow),
    }),
    [mode, substrate, lightsOn, f],
  )
  const prec = isPrecision(input)
  const rows = buildProgram(input, stage)
  const totals = programTotals(rows)
  const tg = dayTargets(STEER_TO_STAGE[stage], { mode, substrate, flowerWeek: stage === "str" ? 2 : undefined })
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
      potVolumeL: input.potVolumeL,
      shotPct: input.shotPct,
      p1Shots: input.p1Shots,
      p1IntervalMin: input.p1IntervalMin,
      p0DelayMin: input.p0DelayMin,
      flowMlPerMin: input.flowMlPerMin,
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
          <Grid>
            <TextField id="i-on" type="time" label={t("irr.lightsOn")} value={lightsOn} onChange={(v) => setLightsOn(v || "06:00")} />
            {mode === "auto" ? (
              <NumField id="i-flow" integer label={t("irr.flow")} hint={t("irr.flowHint")} value={f.flow ?? ""} onChange={set("flow")} />
            ) : (
              <NumField id="i-pot" label={t("irr.pot")} value={f.pot ?? ""} onChange={set("pot")} />
            )}
            {mode === "auto" && <NumField id="i-pot2" label={t("irr.pot")} value={f.pot ?? ""} onChange={set("pot")} />}
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
              <Tile k={prec ? t("irr.dose") : t("irr.pass")} v={`${num(shotMl)} mL${mode === "auto" ? ` · ${input.flowMlPerMin ? dur((shotMl / input.flowMlPerMin) * 60) : "?"}` : ""}`} />
              <Tile k={t("irr.drybackT")} v={tg.dryback ? `${range(tg.dryback.lo, tg.dryback.hi)} %` : "—"} />
              <Tile
                k={t("irr.runoffT")}
                v={prec && tg.runoffPct ? t("irr.runoffPerPot", { range: `${ml(input.potVolumeL * 10 * tg.runoffPct.lo)}–${ml(input.potVolumeL * 10 * tg.runoffPct.hi)}` }) : t("irr.runoffManual")}
              />
              <Tile k={t("irr.ecRunoffT")} v={tg.ecRunoff ? range(tg.ecRunoff.lo, tg.ecRunoff.hi, 1) : "—"} />
              <Tile k={t("irr.phT")} v={tg.phIn ? range(tg.phIn.lo, tg.phIn.hi, 1) : "—"} />
            </div>
          </Card>
        </Reveal>
      )}

      <Reveal i={4}>
        <Card>
          <Label emoji="droplet">{t("irr.program")}</Label>
          {mode === "auto" && !input.flowMlPerMin && <p className="mt-2 rounded-md bg-warn/10 px-3 py-2 text-[12px] font-medium text-warn">{t("irr.noFlow")}</p>}
          <ol className="mt-2 flex flex-col">
            {rows.map((r, i) => (
              <ProgramLine key={i} r={r} />
            ))}
          </ol>
          <p className="mt-2 text-[12px] text-fg-2">
            {t("irr.totals", {
              fixed: ml(totals.fixed),
              opt: totals.optional ? t("irr.totalsOpt", { v: ml(totals.optional) }) : "",
              pots: base.potCount,
              all: ml(totals.fixed * base.potCount),
            })}
          </p>
          <p className="mt-2 text-[11.5px] leading-[1.45] text-fg-3">{prec ? t("irr.progNotePrec") : t("irr.progNoteManual")}</p>
        </Card>
      </Reveal>

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
              <Tile k={t("irr.sP1Dose")} v={`${num(sensor.p1Ml)} mL · ${dur(sensor.p1Seconds)}`} />
              <Tile k={t("irr.sP2Dose")} v={`${num(sensor.p2Ml)} mL · ${dur(sensor.p2Seconds)}`} warn={sensor.tooShort} />
              <Tile k={t("irr.sShots")} v={SENSOR[sPhase].shots} />
              <Tile k={t("irr.sRunoff")} v={`${SENSOR[sPhase].runoff} %`} />
            </div>
            {sensor.tooShort && <p className="rounded-md bg-warn/10 px-3 py-2 text-[12px] font-medium text-warn">{t("irr.tooShort")}</p>}
            <ol className="flex flex-col">
              {sensor.rows.map((r, i) => (
                <ProgramLine key={i} r={r} trigger={sensor.trigger} />
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

function ProgramLine({ r, trigger }: { r: ProgramRow; trigger?: number | null }) {
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
        {r.ml ? `${num(r.ml)} mL` : ""}
        {r.seconds != null && <span className="block text-[11px] text-fg-3">{num(r.seconds)} s</span>}
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
