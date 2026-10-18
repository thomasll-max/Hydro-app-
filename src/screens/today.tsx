import { useEffect, useMemo, useState } from "react"
import { SpaceToday, AllToday } from "./today-spaces"
import { motion } from "motion/react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BorderBeam } from "@/components/magicui/border-beam"
import { NumberTicker } from "@/components/magicui/number-ticker"
import { ArcGauge } from "@/components/hydro/arc-gauge"
import { Spark } from "@/components/hydro/spark"
import { Emoji } from "@/components/hydro/emoji"
import { Chip, Chips, Dot, Label, Reveal, ScreenHero, SourceNote } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { stageLine } from "@/app/labels"
import { stageOn, todayIso } from "@/calc/stage"
import { type DayTargets, type Target } from "@/calc/targets"
import { oneCorrection, status, type Status } from "@/calc/advice"
import { buildProgram, nextIndex, PHOTOPERIOD, steerStage } from "@/calc/program"
import { PhaseTag, rowText } from "./tools/irrigation"
import { UpcomingCard } from "./calendar-parts"
import { cn } from "@/lib/utils"
import type { EmojiName } from "@/assets/emoji"
import type { Entry } from "@/model/types"
import type { MessageKey } from "@/i18n/types"

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
  const { t, num, range, locale, dm } = useSettings()
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

  if (!ready) return <p className="py-10 text-center text-fg-3">{t("app.loading")}</p>
  if (!cycle || !s)
    return (
      <>
        <ScreenHero emoji="sprout" eyebrow={space?.name} title={t("today.emptyTitle")} />
        {extra}
        <Reveal>
          <Card className="gap-3 px-4 py-4">
            <p className="text-[13.5px] leading-[1.5] text-fg-2">{t("today.emptyBody")}</p>
            <Button onClick={() => ed.openCycle({ cycleId: "new", spaceId: space?.id })} className="h-12 rounded-full text-[15px] font-bold">
              {t("today.emptyCta")}
            </Button>
          </Card>
        </Reveal>
        <Reveal i={1} className="mt-3">
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

  const pill = (v: number | undefined, r?: Pick<Target, "lo" | "hi">): Status | undefined => (v != null && r ? status(v, r) : undefined)
  const when = last ? (last.date === today ? (last.time ? t("today.whenToday", { time: last.time }) : t("today.whenTodayNoTime")) : t("today.whenDay", { date: dm(last.date) })) : ""

  // Sources actually used by today's targets.
  const srcs = new Set(Object.values(tg ?? {}).flatMap((v) => (v && typeof v === "object" && "src" in v ? [(v as Target).src] : [])))
  const srcList = [
    srcs.has("athena") && t("today.srcAthena"),
    srcs.has("spec") && t("today.srcSpec"),
    srcs.has("common") && t("today.srcCommon"),
    srcs.has("estimate") && t("today.srcEstimate"),
    cycle.waterMode === "auto" && (cycle.flowMlPerMin ? t("today.srcFlow", { flow: num(cycle.flowMlPerMin / 1000, 1) }) : t("today.srcFlowMissing")),
  ].filter(Boolean)

  return (
    <>
      <ScreenHero emoji={s.flowerWeek ? "blossom" : s.key === "seedling" || s.key === "notStarted" ? "sprout" : "herb"} eyebrow={`${space ? `${space.name} · ` : ""}${t("today.cycle", { name: cycle.name, cultivar: cycle.cultivars[0] ?? "" })}`} title={stageLine(t, s)}>
        <Chips>
          {tg?.steer && <Chip tone="primary">{`${t(`steer.${tg.steer}`)} · ${t(`stage.${s.key}`)}`}</Chip>}
          {!tg?.steer && s.key !== "notStarted" && <Chip tone="primary">{t(`stage.${s.key}`)}</Chip>}
          <Chip>{`${t(`mode.${cycle.waterMode}Short`)} · ${t(`substrate.${cycle.substrate}`).toLowerCase()}`}</Chip>
        </Chips>
      </ScreenHero>
      {extra}

      {/* One correction */}
      <Reveal i={0} className="mb-3">
        <div className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          {advice && <BorderBeam size={90} duration={4} colorFrom={advice.status === "bad" ? "var(--bad)" : "var(--warn)"} colorTo="transparent" borderWidth={1.5} />}
          <div className="flex items-center gap-3 px-3.5 py-3">
            <Emoji name={advice ? (advice.metric.startsWith("ph") || advice.metric === "vpd" ? "thermometer" : advice.metric === "dli" ? "bulb" : "droplet") : last ? "pottedPlant" : "notebook"} size={38} />
            <div className="min-w-0">
              <b className="block text-[14.5px] font-semibold">
                {advice ? t(`${advice.key}.title` as MessageKey) : last ? t("today.allGood") : t("today.noEntryTitle")}
              </b>
              <p className="mt-0.5 text-[13px] leading-[1.35] text-fg-2">
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
            {advice && (
              <span className={cn("ml-auto text-[11px] font-bold whitespace-nowrap", advice.status === "bad" ? "text-bad" : "text-warn")}>{t("today.alertTag")}</span>
            )}
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-2 gap-2.5">
        <Reveal i={1}>
          <GaugeCard emoji="droplet" label={t("today.dryback")} value={last?.dryback} target={lastTg?.dryback} max={70} unit="%" decimals={0} />
        </Reveal>
        <Reveal i={2}>
          <GaugeCard emoji="testTube" label={t("today.ecRunoff")} value={last?.ecRunoff} target={lastTg?.ecRunoff} max={12} decimals={1} />
        </Reveal>

        <Reveal i={3} className="col-span-2">
          <Card>
            <Label emoji="chart">{last ? t("today.lastEntry", { when }) : t("today.noEntryTitle")}</Label>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <Metric k={t("today.runoff")} status={pill(last?.runoffPct, lastTg?.runoffPct)} target={lastTg?.runoffPct ? `${range(lastTg.runoffPct.lo, lastTg.runoffPct.hi)} %` : "—"}>
                {last?.runoffPct != null ? (
                  <>
                    <NumberTicker value={last.runoffPct} locale={locale} />%
                  </>
                ) : (
                  "—"
                )}
              </Metric>
              <Metric k={t("today.phRunoff")} status={pill(last?.phRunoff, lastTg?.phRunoff)} target={lastTg?.phRunoff ? range(lastTg.phRunoff.lo, lastTg.phRunoff.hi, 1) : "—"}>
                {last?.phRunoff != null ? <NumberTicker value={last.phRunoff} decimalPlaces={1} locale={locale} /> : "—"}
              </Metric>
              <Metric k={t("today.vpd")} status={pill(last?.vpd, lastTg?.vpd)} target={lastTg?.vpd ? `${range(lastTg.vpd.lo, lastTg.vpd.hi, 1)} kPa` : "kPa"}>
                {last?.vpd != null ? <NumberTicker value={last.vpd} decimalPlaces={2} locale={locale} /> : "—"}
              </Metric>
              <Metric k={t("today.ecIn")} status={pill(last?.ecIn, lastTg?.ecIn)} target={lastTg?.ecIn ? range(lastTg.ecIn.lo, lastTg.ecIn.hi, 1) : "—"}>
                {last?.ecIn != null ? <NumberTicker value={last.ecIn} decimalPlaces={1} locale={locale} /> : "—"}
              </Metric>
              <Metric k={t("today.dli")} status={pill(last?.dli, lastTg?.dli)} target={last?.ppfd != null ? `PPFD ${num(last.ppfd)}` : lastTg?.dli ? range(lastTg.dli.lo, lastTg.dli.hi) : "—"}>
                {last?.dli != null ? <NumberTicker value={last.dli} decimalPlaces={1} locale={locale} /> : "—"}
              </Metric>
              <Metric k={t("today.tempRh")} target={t("today.dayShort")}>
                {last?.tempDay != null ? `${num(last.tempDay)}°` : "—"}
                <span className="font-medium text-fg-3">/{last?.rh != null ? num(last.rh) : "—"}</span>
              </Metric>
            </div>
            {spark.length >= 2 && lastTg?.dryback && (
              <div className="mt-2">
                <Spark
                  data={spark.map((e) => ({ x: dm(e.date), v: e.dryback! }))}
                  lo={lastTg.dryback.lo}
                  hi={lastTg.dryback.hi}
                  domain={[Math.min(10, ...spark.map((e) => e.dryback! - 5)), Math.max(70, ...spark.map((e) => e.dryback! + 5))]}
                  label={t("today.dryback")}
                  formatValue={(v) => `${num(v)} %`}
                />
                <div className="mt-0.5 flex justify-between text-[10.5px] text-fg-3">
                  <span>{t("today.spark", { n: spark.length })}</span>
                  <span>{t("today.band")}</span>
                </div>
              </div>
            )}
          </Card>
        </Reveal>

        <Reveal i={4} className="col-span-2">
          <Card>
            <Label emoji="droplet">{t("today.program")}</Label>
            {!ss && <p className="mt-2 text-[13px] text-fg-2">{t("irr.seedlingNote")}</p>}
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
                    className={cn("relative grid grid-cols-[48px_38px_1fr_auto] items-center gap-2 rounded-md px-2 py-[9px] text-[13.5px]", done && !isNext && "opacity-40")}
                  >
                    {isNext && <motion.span layoutId="next-row" className="absolute inset-0 rounded-md bg-primary/9 outline outline-1 outline-primary/30" />}
                    <span className={cn("relative tabular", isNext ? "font-semibold text-primary" : "text-fg-2")}>{r.time}</span>
                    <PhaseTag phase={r.phase} />
                    <span className="relative min-w-0 truncate">{text}</span>
                    <span className="relative text-[12.5px] text-fg-3 tabular">{r.seconds != null ? `${num(r.seconds)} s` : r.ml && cycle.waterMode === "auto" ? "?" : "—"}</span>
                  </li>
                )
              })}
            </ol>
            {cycle.waterMode === "auto" && !cycle.flowMlPerMin && (
              <button onClick={() => ed.openCycle()} className="mt-1 w-full rounded-md bg-warn/10 px-3 py-2 text-left text-[12px] font-medium text-warn">
                {t("today.flowUnknown")} · {t("cycleForm.flowHint")}
              </button>
            )}
            {program.length > 5 && (
              <button className="mt-1 w-full rounded-md p-2 text-center text-[12.5px] font-semibold text-primary hover:bg-primary/8" onClick={() => setAllRows((x) => !x)}>
                {allRows ? t("common.less") : t("common.more")}
              </button>
            )}
          </Card>
        </Reveal>

        <Reveal i={5} className="col-span-2">
          <UpcomingCard spaceIds={space ? new Set([space.id]) : null} />
        </Reveal>
      </div>

      <SourceNote>{t("today.sources", { list: srcList.join(" · ") })}</SourceNote>
    </>
  )
}

function GaugeCard({ emoji, label, value, target, max, unit, decimals }: { emoji: EmojiName; label: string; value?: number; target?: Pick<Target, "lo" | "hi">; max: number; unit?: string; decimals: number }) {
  const { t, range, locale } = useSettings()
  return (
    <Card className="h-full items-center px-2.5 pt-3.5 pb-3 text-center">
      <Label emoji={emoji}>{label}</Label>
      {value != null ? (
        <ArcGauge value={value} lo={target?.lo ?? 0} hi={target?.hi ?? 0} max={Math.max(max, value)} decimals={decimals} unit={unit} locale={locale} tone={target ? status(value, target) : "ok"} />
      ) : (
        <div className="my-1.5 flex size-[92px] items-center justify-center rounded-full border-[9px] border-track text-[22px] font-semibold text-fg-3">—</div>
      )}
      <div className="flex items-center gap-1.5 text-[11.5px] text-fg-3">
        {value != null && target && <Dot status={status(value, target)} />}
        {target ? (
          <>
            {t("today.target")} <span className="tabular-nums">{`${range(target.lo, target.hi, decimals)}${unit ? ` ${unit}` : ""}`}</span>
          </>
        ) : (
          "—"
        )}
      </div>
    </Card>
  )
}

function Metric({ k, status: st, target, children }: { k: string; status?: Status; target: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-line bg-surface-2 px-2.5 py-[9px]">
      <div className="flex items-center gap-[5px] text-[11px] text-fg-3">
        {st ? <Dot status={st} /> : <span className="inline-block size-[7px] rounded-full bg-track" aria-hidden="true" />}
        <span className="truncate">{k}</span>
      </div>
      <div className="mt-[3px] truncate text-[17px] font-semibold tabular">{children}</div>
      <div className="mt-px truncate text-[10.5px] text-fg-3">{target}</div>
    </div>
  )
}


export function TodayScreen() {
  const { t } = useSettings()
  const { ready, selection } = useGrow()
  if (!ready) return <p className="py-10 text-center text-fg-3">{t("app.loading")}</p>
  return selection.kind === "space" ? <SpaceToday space={selection.space} Culture={CultureToday} /> : <AllToday />
}
