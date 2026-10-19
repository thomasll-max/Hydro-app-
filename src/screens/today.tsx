import { Reading } from "@/components/hydro/reading"
import { Loading } from "@/components/hydro/wordmark"
import { useEffect, useMemo, useState } from "react"
import { SpaceToday, AllToday } from "./today-spaces"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spark } from "@/components/hydro/spark"
import { LineIcon } from "@/components/hydro/line-icon"
import { Chip, Chips, Label, Notice, Reveal, ScreenHero, SourceNote } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { stageLine } from "@/app/labels"
import { stageOn, todayIso } from "@/calc/stage"
import { type DayTargets, type Target } from "@/calc/targets"
import { oneCorrection } from "@/calc/advice"
import { buildProgram, nextIndex, PHOTOPERIOD, steerStage } from "@/calc/program"
import { PhaseTag, rowText } from "./tools/irrigation"
import { UpcomingCard } from "./calendar-parts"
import { cn } from "@/lib/utils"
import type { Entry } from "@/model/types"
import { drybackMethodOf } from "@/model/entry"
import { BackupReminder } from "./backup-reminder"
import { StartCard } from "./tools/start"
import type { MessageKey } from "@/i18n/types"
import { LastHarvest, StepCard } from "./cycle-steps"
import { nextStep } from "@/calc/steps"
import { tertiary } from "@/components/hydro/styles"
import { WeekStrip } from "./week-strip"

function useNowMinutes() {
  const now = () => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  }
  const [m, setM] = useState(now)
  useEffect(() => {
    const id = setInterval(() => setM(now()), 30_000)
    return () => clearInterval(id)
  }, [])
  return m
}

/** Culture view of one space (stage, targets, program, last entry, one correction). `extra` goes under the hero. */
function CultureToday({ extra }: { extra?: React.ReactNode }) {
  const { t, num, range, dm } = useSettings()
  const { ready, cycle, entries, space, targetsFor } = useGrow()
  const ed = useEditors()
  const nowMin = useNowMinutes()
  const [allRows, setAllRows] = useState(false)
  const today = todayIso()

  const s = cycle ? stageOn(cycle, today) : null
  const tg: DayTargets | null = useMemo(
    () => (cycle && s ? targetsFor(today, cycle) : null),
    [cycle, s?.key, s?.flowerWeek, targetsFor], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const room = entries.filter((e) => !e.plantId)
  const last: Entry | undefined = room[0]
  const lastTg = last?.targets ?? tg ?? undefined
  const advice = last && tg ? oneCorrection(last, { ...tg, ...(last.targets as object) } as DayTargets, cycle!.waterMode) : null

  if (!ready) return <Loading label={t("app.loading")} />
  // A harvested cycle is no longer running: the space offers to log the harvest and to start the next cycle.
  if (!cycle || !s || s.key === "harvested")
    return (
      <>
        <ScreenHero emoji="sprout" eyebrow={space?.name} title={t("today.emptyTitle")} />
        {extra}
        <Reveal>
          <Card className="gap-3">
            <p className="text-[0.84375rem] leading-[1.5] text-fg-2">{t("today.emptyBody")}</p>
            <Button onClick={() => ed.openCycle({ cycleId: "new", spaceId: space?.id })} className="h-12">
              {t("today.emptyCta")}
            </Button>
          </Card>
        </Reveal>
        <Reveal i={1} className="mt-3">
          <LastHarvest spaceId={space?.id} />
        </Reveal>
        <Reveal i={2} className="mt-3">
          <UpcomingCard spaceIds={space ? new Set([space.id]) : null} />
        </Reveal>
      </>
    )

  const ss = steerStage(s.key, cycle.establishing)
  const program = ss ? buildProgram(cycle, ss, last?.photoperiodH ?? PHOTOPERIOD[ss]) : []
  const nextI = nextIndex(program, nowMin)
  const start = Math.max(0, Math.min(nextI < 0 ? program.length : nextI - 1, program.length - 5))
  const rows = allRows ? program : program.slice(start, start + 5)
  const spark = room.filter((e) => e.dryback != null).slice(0, 7).reverse()
  // Sensor spaces: the gauge shows the sensor dryback, on its own scale (no Athena target).
  const bySensor = ["acinfinity", "sensor"].includes(drybackMethodOf(space))

  const when = last ? (last.date === today ? (last.time ? t("today.whenToday", { time: last.time }) : t("today.whenTodayNoTime")) : t("today.whenDay", { date: dm(last.date) })) : ""

  // Sources actually used by today's targets.
  const srcs = new Set(Object.values(tg ?? {}).flatMap((v) => (v && typeof v === "object" && "src" in v ? [(v as Target).src] : [])))
  const srcList = [
    srcs.has("athena") && t("today.srcAthena"),
    srcs.has("spec") && t("today.srcSpec"),
    srcs.has("common") && t("today.srcCommon"),
    srcs.has("app") && t("today.srcApp"),
    srcs.has("estimate") && t("today.srcEstimate"),
    cycle.waterMode === "auto" && (cycle.flowMlPerMin ? t("today.srcFlow", { flow: num(cycle.flowMlPerMin / 1000, 1) }) : t("today.srcFlowMissing")),
  ].filter(Boolean)

  return (
    <>
      <ScreenHero emoji={s.flowerWeek ? "blossom" : s.key === "seedling" || s.key === "notStarted" ? "sprout" : "herb"} eyebrow={`${space ? `${space.name} · ` : ""}${t("today.cycle", { name: cycle.name, cultivar: cycle.cultivars[0] ?? "" })}`} title={stageLine(t, s)}>
        <Chips>
          {tg?.steer && <Chip tone="leaf">{`${t(`stage.${s.key}`)} · ${t(`steerChip.${tg.steer}`)}`}</Chip>}
          {!tg?.steer && s.key !== "notStarted" && <Chip tone="leaf">{t(`stage.${s.key}`)}</Chip>}
          <Chip tone="water">{`${t(`mode.${cycle.waterMode}Short`)} · ${t(`substrate.${cycle.substrate}`).toLowerCase()}`}</Chip>
        </Chips>
      </ScreenHero>
      {extra}

      {/* One correction: normal text, a small marker in « à surveiller » / « alerte » (lot 10h). */}
      <Reveal i={0} className="mb-3">
        <section className="flex items-start gap-3 border-t border-line pt-4 pb-1" id="advice" data-status={advice?.status}>
          {advice ? (
            <span aria-hidden="true" className={cn("mt-[7px] size-2 shrink-0 rounded-[2px]", advice.status === "bad" ? "bg-bad" : "bg-warn")} />
          ) : (
            <LineIcon name={last ? "pottedPlant" : "notebook"} size={24} />
          )}
          <div className="min-w-0 flex-1">
            <b className="block text-[0.9375rem] font-semibold">
              {advice ? t(`${advice.key}.title` as MessageKey) : last ? t("today.allGood") : t("today.noEntryTitle")}
            </b>
            <p className="mt-0.5 text-[0.875rem] leading-[1.45] text-fg-2">
              {advice
                ? t(advice.bodyKey as MessageKey, {
                    value: num(advice.vars.value, advice.metric.startsWith("ph") || advice.metric.startsWith("ec") || advice.metric === "dli" ? 1 : advice.metric === "vpd" ? 2 : 0),
                    aim: num(advice.vars.aim, 1),
                    range: t("advice.range", { range: range(advice.vars.lo, advice.vars.hi, advice.metric.startsWith("ph") || advice.metric.startsWith("ec") || advice.metric === "vpd" ? 1 : 0) }),
                  })
                : last
                  ? t("today.allGoodBody")
                  : t("today.noEntryBody")}
            </p>
          </div>
          {advice && <span className={cn("text-[0.75rem] font-semibold whitespace-nowrap", advice.status === "bad" ? "text-bad" : "text-warn")}>{t("today.alertTag")}</span>}
        </section>
      </Reveal>

      {nextStep(cycle, today) && (
        <Reveal i={0} className="mb-3">
          <StepCard cycle={cycle} />
        </Reveal>
      )}

      <div className="flex flex-col gap-3">
        <Reveal i={1}>
          {/* Readings (lot 10h): label, value in mono, a bar with the day's target zone and a tick at the value. */}
          <Card className="gap-3" id="readings">
            <div className="flex items-baseline justify-between gap-2">
              <Label>{t("today.readings")}</Label>
              <span className="truncate font-mono text-[0.75rem] text-fg-3">{last ? when : t("today.noEntryTitle")}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-4">
              {bySensor ? (
                <Reading label={t("today.drybackSensor")} term="drybackSensor" value={last?.drybackSensor} unit="%" decimals={0} max={70} note={t("today.sensorScale")} />
              ) : (
                <Reading label={t("today.dryback")} term="dryback" value={last?.dryback} target={lastTg?.dryback} unit="%" decimals={0} max={70} />
              )}
              <Reading label={t("today.ecRunoff")} term="ec" value={last?.ecRunoff} target={lastTg?.ecRunoff} decimals={1} max={12} />
              <Reading label={t("today.runoff")} term="runoff" value={last?.runoffPct} target={lastTg?.runoffPct} unit="%" decimals={0} />
              <Reading label={t("today.phRunoff")} value={last?.phRunoff} target={lastTg?.phRunoff} metric="phRunoff" decimals={1} />
              <Reading label={t("today.vpd")} term="vpd" value={last?.vpd} target={lastTg?.vpd} unit="kPa" decimals={2} />
              <Reading label={t("today.ecIn")} value={last?.ecIn} target={lastTg?.ecIn} decimals={1} />
              <Reading label={t("today.dli")} term="dli" value={last?.dli} target={lastTg?.dli} decimals={1} note={last?.ppfd != null ? `PPFD ${num(last.ppfd)}` : undefined} />
              <Reading label={t("today.tempRh")} value={last?.tempDay} note={t("today.dayShort")}>
                {last?.tempDay != null ? (
                  <>
                    {`${num(last.tempDay)}°`}
                    <span className="text-fg-3">/{last?.rh != null ? num(last.rh) : "—"}</span>
                  </>
                ) : undefined}
              </Reading>
            </div>
            {spark.length >= 2 && lastTg?.dryback && (
              <div className="mt-1">
                <Spark
                  data={spark.map((e) => ({ x: dm(e.date), v: e.dryback! }))}
                  lo={lastTg.dryback.lo}
                  hi={lastTg.dryback.hi}
                  domain={[Math.min(10, ...spark.map((e) => e.dryback! - 5)), Math.max(70, ...spark.map((e) => e.dryback! + 5))]}
                  label={t("today.dryback")}
                  formatValue={(v) => `${num(v)} %`}
                />
                <div className="mt-0.5 flex justify-between text-[0.75rem] text-fg-3">
                  <span>{t("today.spark", { n: spark.length })}</span>
                  <span>{t("today.band")}</span>
                </div>
              </div>
            )}
          </Card>
        </Reveal>

        <Reveal i={4}>
          <Card>
            <Label emoji="droplet">{t("today.program")}</Label>
            {!ss && <p className="mt-2 text-[0.8125rem] text-fg-2">{t("irr.seedlingNote")}</p>}
            <ol className="mt-2.5 flex flex-col gap-0.5">
              {rows.map((r) => {
                const idx = program.indexOf(r)
                const isNext = idx === nextI
                const done = nextI < 0 || idx < nextI
                const text = `${rowText(t, r)}${r.ml ? ` · ${num(r.ml)} mL` : ""}`
                return (
                  <li
                    key={`${r.phase}-${r.time}-${r.n ?? 0}`}
                    aria-current={isNext ? "step" : undefined}
                    className={cn("relative grid grid-cols-[48px_38px_1fr_auto] items-center gap-2 rounded-md px-2 py-[9px] text-[0.84375rem]", done && !isNext && "opacity-40")}
                  >
                    {isNext && <span className="absolute inset-0 rounded-[10px] bg-surface-2 shadow-[inset_2px_0_0_var(--water)]" />}
                    <span className={cn("relative tabular", isNext ? "font-semibold text-fg" : "text-fg-2")}>{r.time}</span>
                    <PhaseTag phase={r.phase} />
                    <span className="relative min-w-0 truncate">{text}</span>
                    <span className="relative text-[0.78125rem] text-fg-3 tabular">{r.seconds != null ? `${num(r.seconds)} s` : r.ml && cycle.waterMode === "auto" ? "?" : "—"}</span>
                  </li>
                )
              })}
            </ol>
            {cycle.waterMode === "auto" && !cycle.flowMlPerMin && (
              <button onClick={() => ed.openCycle()} className="mt-1 w-full text-left">
                <Notice as="span" className="text-[0.75rem]">
                  {t("today.flowUnknown")} · {t("cycleForm.flowHint")}
                </Notice>
              </button>
            )}
            {program.length > 5 && (
              <button className={cn("mt-1 self-center", tertiary)} onClick={() => setAllRows((x) => !x)}>
                {allRows ? t("common.less") : t("common.more")}
              </button>
            )}
          </Card>
        </Reveal>

        <Reveal i={5}>
          <UpcomingCard spaceIds={space ? new Set([space.id]) : null} />
        </Reveal>
      </div>

      <SourceNote>{t("today.sources", { list: srcList.join(" · ") })}</SourceNote>
    </>
  )
}

export function TodayScreen() {
  const { t } = useSettings()
  const { ready, selection } = useGrow()
  if (!ready) return <Loading label={t("app.loading")} />
  return (
    <>
      <WeekStrip />
      <StartCard />
      <BackupReminder />
      {selection.kind === "space" ? <SpaceToday space={selection.space} Culture={CultureToday} /> : <AllToday />}
    </>
  )
}
