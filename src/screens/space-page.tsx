// The page of a space (lot 10l1, planche « Les menus », validée le 19/10): the space's tab on Aujourd'hui. Fixed order:
// the header (tinted square, name, cycle, the stage in a pill), one framed state block (the verdict of the last entry and
// the next step of the cycle), the readings (four big, the rest on one line), the day's watering in two lines, the
// reservoir, À faire ici, the sources. A section without object for the space is not shown; each number once.
import { Fragment, useMemo, type ReactNode } from "react"
import { Check, ChevronRight, NotebookPen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Reading } from "@/components/hydro/reading"
import { Notice, Reveal } from "@/components/hydro/primitives"
import { SpaceTile } from "@/components/hydro/space-pill"
import { NumText } from "@/components/hydro/value"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { navigate } from "@/app/nav"
import { stageEmoji, stageLine } from "@/app/labels"
import { addDays, daysBetween, stageOn, todayIso } from "@/calc/stage"
import { dryingCycle, spaceContext } from "@/calc/digest"
import { oneCorrection } from "@/calc/advice"
import type { DayTargets, Target } from "@/calc/targets"
import { buildProgram, nextIndex, PHOTOPERIOD, steerStage, type ProgramRow } from "@/calc/program"
import { stepDue, waterDay } from "@/calc/space-page"
import type { Autonomy } from "@/calc/reservoir"
import { forSpaces, upcoming } from "@/calendar/agenda"
import { drybackMethodOf } from "@/model/entry"
import type { Space } from "@/model/grow"
import type { Cycle, Entry } from "@/model/types"
import { cn } from "@/lib/utils"
import { LastHarvest, useStepAction } from "./cycle-steps"
import { useCalendarData } from "./calendar-parts"
import { Todo, useAdviceText, useNowMinutes } from "./today-calm"
import { useDigestData } from "./today-spaces"

export function SpacePage({ space }: { space: Space }) {
  const { t, dm } = useSettings()
  const { cycle, entries, targetsFor } = useGrow()
  const data = useDigestData()
  const cal = useCalendarData()
  const today = todayIso()
  const ctx = useMemo(() => spaceContext(space, data, today), [space, data, today])
  const s = cycle ? stageOn(cycle, today) : null
  const running = !!cycle && !!s && s.key !== "harvested"
  const drying = space.modules.drying && !space.modules.irrigation ? dryingCycle(space, data.cycles, today) : undefined
  const dryingRoom = space.modules.drying && !space.modules.irrigation
  const propagating = space.modules.propagation && (!running || s?.key === "seedling" || s?.key === "notStarted")
  const tg: DayTargets | null = useMemo(
    () => (running ? targetsFor(today, cycle!) : null),
    [running, cycle, s?.key, s?.flowerWeek, targetsFor], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const room = entries.filter((e) => !e.plantId)
  const last: Entry | undefined = dryingRoom ? ctx.last : room[0]
  // À faire ici: the next 7 days, without the step the state block already offers (« Passer en 12/12 · dans 2 j »).
  const due = running && !dryingRoom ? stepDue(cycle!, today) : null
  const items = useMemo(
    () =>
      forSpaces(upcoming(cal, today, 60, 7, cal.tz), new Set([space.id])).filter(
        (i) => i.date <= addDays(today, 7) && !(i.type === "deadline" && due && i.deadline.kind === due.step && (!i.deadline.cycleId || i.deadline.cycleId === cycle?.id)),
      ),
    [cal, today, space.id, due?.step, cycle?.id], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // The header: tinted square with the stage's drawing, the name, the cycle and its variety, the stage in a pill.
  const dryDay = drying?.harvestDate ? daysBetween(drying.harvestDate, today) + 1 : null
  const sub = drying ? t("today.cycle", { name: drying.name, cultivar: drying.cultivars[0] ?? "" }) : running ? t("today.cycle", { name: cycle!.name, cultivar: cycle!.cultivars[0] ?? "" }) : propagating ? t("today.propagation") : t("sp.noCycle")
  // The stage in a pill; a drying room says its day in the readings instead (each number once).
  const pill = running && !dryingRoom && s!.key !== "notStarted" ? stageLine(t, s!) : null
  const emoji = dryingRoom ? (drying ? "scissors" : "pottedPlant") : running ? stageEmoji(s!.key) : propagating ? "sprout" : "pottedPlant"

  return (
    <div className="flex flex-col gap-8 pt-1" id="space-page" data-space={space.id}>
      <Reveal i={0}>
        <header className="flex flex-wrap items-center gap-x-3.5 gap-y-2" id="space-head">
          {/* The square gives its room to the name on a very narrow screen (200 % zoom). */}
          <span className="contents max-[259px]:hidden">
            <SpaceTile color={space.color} emoji={emoji} size={48} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="display text-[1.75rem] leading-[1.1] [overflow-wrap:anywhere]">{space.name}</h1>
            <p className="mt-0.5 truncate text-[0.8125rem] text-fg-3">{sub}</p>
          </div>
          {pill && (
            <span id="space-stage" className="ml-auto flex h-[26px] shrink-0 items-center self-start rounded-[13px] border border-leaf/45 px-2.5 text-[0.75rem] font-semibold whitespace-nowrap text-leaf-ink">
              <span>
                <NumText quiet>{pill}</NumText>
              </span>
            </span>
          )}
        </header>
      </Reveal>

      {running && !dryingRoom && <StateBlock cycle={cycle!} last={last} tg={tg} />}
      {!running && !dryingRoom && !propagating && <NoCycleBlock space={space} />}
      {!running && !dryingRoom && <LastHarvest spaceId={space.id} />}

      {propagating && <Propagation entries={ctx.entries} cycle={running ? cycle! : undefined} />}

      {dryingRoom ? (
        <DryingReadings last={last} day={dryDay} total={drying?.plannedDryingDays} />
      ) : (
        running && <Readings space={space} last={last} lastTg={last?.targets ?? tg ?? undefined} when={last ? dm(last.date) : undefined} />
      )}

      {running && !dryingRoom && space.modules.irrigation && <WaterToday cycle={cycle!} last={last} />}

      {ctx.autonomy && <Reservoir a={ctx.autonomy} />}

      {items.length > 0 && (
        <Reveal i={5}>
          <Todo items={items} showSpace={false} spaceId={space.id} here />
        </Reveal>
      )}

      {running && !dryingRoom && <Sources cycle={cycle!} tg={tg} />}
    </div>
  )
}

/** A section title, with its small link on the right (« 07/02 · Graphiques → », « Programme → »). */
function SectionHead({ title, link, onLink, id }: { title: string; link?: string; onLink?: () => void; id?: string }) {
  return (
    // The link goes under the title when they do not fit side by side (German, 200 % zoom).
    <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3">
      <h2 id={id} className="display text-[1.1875rem] leading-tight">
        {title}
      </h2>
      {link && (
        <button type="button" onClick={onLink} className="-my-3 ml-auto min-h-11 text-right text-[0.8125rem] font-semibold text-fg-2 hover:text-fg">
          <NumText quiet>{link}</NumText>
        </button>
      )}
    </div>
  )
}

/** The only framed block of the page: the verdict of the last entry, then the next step of the cycle when it is near. */
function StateBlock({ cycle, last, tg }: { cycle: Cycle; last?: Entry; tg: DayTargets | null }) {
  const { t, dm } = useSettings()
  const adviceText = useAdviceText()
  const today = todayIso()
  const advice = last && tg ? oneCorrection(last, { ...tg, ...(last.targets as object) } as DayTargets, cycle.waterMode) : null
  const due = stepDue(cycle, today)
  const { go, busy } = useStepAction(cycle)
  const status = advice ? advice.status : last ? "ok" : "none"
  const text = advice ? adviceText(advice) : null
  const title = text ? text.title : last ? t("sp.allGood") : t("sp.noEntry")
  const sub = text ? text.body : last ? t("sp.nothing", { date: dm(last.date) }) : t("sp.noEntrySub")
  const when = due && due.days != null ? (due.days > 0 ? t("today.inDays", { n: due.days }) : due.days === 0 ? t("today.todayShort") : t("sp.stepLate", { n: -due.days })) : null
  return (
    <Reveal i={1}>
      <section id="space-status" data-status={status} className="flex flex-col gap-3 rounded-[16px] border border-line bg-surface p-3.5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-[9px] font-bold",
              status === "ok" ? "bg-leaf/20 text-leaf-ink" : status === "warn" ? "bg-warn/20 text-warn" : status === "bad" ? "bg-bad/20 text-bad" : "bg-line text-fg-2",
            )}
          >
            {status === "ok" ? <Check className="size-[18px]" strokeWidth={2.6} /> : status === "none" ? <NotebookPen className="size-[17px]" strokeWidth={1.8} /> : "!"}
          </span>
          <div className="min-w-0 flex-1">
            <b className={cn("block text-[0.96875rem] leading-snug font-semibold", status === "warn" && "text-warn", status === "bad" && "text-bad")}>{title}</b>
            <span className="block text-[0.78125rem] leading-snug text-fg-3">
              <NumText quiet>{sub}</NumText>
            </span>
          </div>
        </div>
        {due && (
          <button
            type="button"
            onClick={() => go(due.step)}
            disabled={busy}
            id={`step-${due.step}`}
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[10px] border border-line-strong px-3.5 text-left text-[0.9375rem] font-semibold transition-transform active:translate-y-px disabled:opacity-50"
          >
            <span className="min-w-0">{t(`step.${due.step}`)}</span>
            <span className="flex shrink-0 items-center gap-1.5 text-[0.8125rem] font-normal text-fg-3" data-when>
              {when && (
                <span>
                  <NumText quiet>{when}</NumText>
                </span>
              )}
              <ChevronRight aria-hidden="true" className="size-[18px]" />
            </span>
          </button>
        )}
      </section>
    </Reveal>
  )
}

/** A space without a running cycle: the only filled button of the page starts one. */
function NoCycleBlock({ space }: { space: Space }) {
  const { t } = useSettings()
  const ed = useEditors()
  return (
    <Reveal i={1}>
      <section id="space-status" data-status="none" className="flex flex-col gap-3 rounded-[16px] border border-line bg-surface p-3.5">
        <div>
          <b className="block text-[0.96875rem] leading-snug font-semibold">{t("today.emptyTitle")}</b>
          <p className="mt-1 text-[0.8125rem] leading-[1.45] text-fg-2">{t("today.emptyBody")}</p>
        </div>
        <Button onClick={() => ed.openCycle({ cycleId: "new", spaceId: space.id })} className="h-12">
          {t("today.emptyCta")}
        </Button>
      </section>
    </Reveal>
  )
}

/** Relevés: the four values that drive the watering, big with their target bar; the rest on one line. */
function Readings({ space, last, lastTg, when }: { space: Space; last?: Entry; lastTg?: Partial<Record<"dryback" | "ecRunoff" | "runoffPct" | "phRunoff", Pick<Target, "lo" | "hi">>>; when?: string }) {
  const { t, num } = useSettings()
  const bySensor = ["acinfinity", "sensor"].includes(drybackMethodOf(space))
  const also: [string, ReactNode][] = []
  if (last?.vpd != null) also.push([t("today.vpd"), num(last.vpd, 2)])
  if (last?.ecIn != null) also.push([t("today.ecIn"), num(last.ecIn, 1)])
  if (last?.dli != null) also.push([t("today.dli"), num(last.dli)])
  if (last?.tempDay != null) also.push(["", `${num(last.tempDay)}°${last.rh != null ? ` / ${num(last.rh)} %` : ""}`])
  return (
    <Reveal i={2}>
      <section id="readings" aria-labelledby="readings-title">
        <SectionHead id="readings-title" title={t("today.readings")} link={when ? `${when} · ${t("sp.charts")}` : t("sp.charts")} onLink={() => navigate({ tab: "charts" })} />
        {/* Without an entry yet the four readings show « — » with the day's target: what to aim for. */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-[18px]">
          {bySensor ? (
            <Reading label={t("today.drybackSensor")} term="drybackSensor" value={last?.drybackSensor} unit="%" decimals={0} max={70} note={t("today.sensorScale")} />
          ) : (
            <Reading label={t("today.dryback")} term="dryback" value={last?.dryback} target={lastTg?.dryback} unit="%" decimals={0} max={70} />
          )}
          <Reading label={t("today.ecRunoff")} term="ec" value={last?.ecRunoff} target={lastTg?.ecRunoff} decimals={1} max={12} />
          <Reading label={t("today.runoff")} term="runoff" value={last?.runoffPct} target={lastTg?.runoffPct} unit="%" decimals={0} />
          <Reading label={t("today.phRunoff")} value={last?.phRunoff} target={lastTg?.phRunoff} metric="phRunoff" decimals={1} />
        </div>
        {also.length > 0 && (
          <p id="readings-also" className="mt-3.5 text-[0.8125rem] leading-snug text-fg-3">
            {/* The line wraps between the values only (the separator is outside the unbreakable value). */}
            {also.map(([k, v], i) => (
              <Fragment key={i}>
                {i > 0 && " · "}
                <span className="whitespace-nowrap">
                  {k && `${k} `}
                  <span className="font-num font-semibold text-fg">{v}</span>
                </span>
              </Fragment>
            ))}
          </p>
        )}
      </section>
    </Reveal>
  )
}

/** A drying room: temperature, humidity, VPD and the day of drying (no Athena target here). */
function DryingReadings({ last, day, total }: { last?: Entry; day: number | null; total?: number }) {
  const { t, dm } = useSettings()
  return (
    <Reveal i={2}>
      <section id="readings" aria-labelledby="readings-title">
        <SectionHead id="readings-title" title={t("today.readings")} link={last ? `${dm(last.date)} · ${t("sp.charts")}` : t("sp.charts")} onLink={() => navigate({ tab: "charts" })} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-[18px]">
          <Reading label={t("jw.m.tempDay")} value={last?.tempDay} unit="°C" decimals={1} />
          <Reading label={t("jw.m.rh")} value={last?.rh} unit="%" decimals={0} />
          <Reading label={t("today.vpd")} term="vpd" value={last?.vpd} unit="kPa" decimals={2} />
          <Reading label={t("today.dryingDay")} value={day != null && day > 0 ? day : undefined} decimals={0}>
            {day != null && day > 0 ? (
              <>
                {t("sp.day", { n: day })}
                {total ? <span className="text-fg-3">/{total}</span> : null}
              </>
            ) : undefined}
          </Reading>
        </div>
      </section>
    </Reveal>
  )
}

/** Arrosage du jour in two lines: what is done, the next dose; the whole program is in the Arrosage tool. */
function WaterToday({ cycle, last }: { cycle: Cycle; last?: Entry }) {
  const { t, num } = useSettings()
  const ed = useEditors()
  const nowMin = useNowMinutes()
  const s = stageOn(cycle, todayIso())
  const ss = steerStage(s.key, cycle.establishing)
  const program = ss ? buildProgram(cycle, ss, last?.photoperiodH ?? PHOTOPERIOD[ss]) : []
  const day = waterDay(program, nextIndex(program, nowMin))
  if (!program.length || (!day.done && !day.next && !day.over)) return null
  const phase = (p: ProgramRow["phase"]) => (p === "MAN" ? t("sp.passes") : p === "INST" ? t("sp.small") : p)
  const n = day.next
  return (
    <Reveal i={3}>
      <section id="water-today" aria-labelledby="water-title">
        <SectionHead id="water-title" title={t("today.program")} link={t("sp.program")} onLink={() => navigate({ tab: "tools", tool: "irrigation" })} />
        <div className="flex flex-col gap-1.5 text-[0.90625rem]">
          {day.done && (
            <span className="text-fg-2" data-water="done">
              <span aria-hidden="true" className="text-leaf-ink">
                ✓{" "}
              </span>
              <NumText>{t("sp.waterDone", { phase: phase(day.done.phase), n: day.done.n, total: day.done.total })}</NumText>
            </span>
          )}
          {n ? (
            <span data-water="next">
              <b className="font-num font-semibold">{n.time}</b>{" "}
              <NumText>{[t("sp.waterNext", { phase: phase(n.phase), n: n.n ?? 1, total: n.total ?? 1 }), n.ml ? `${num(n.ml)} mL` : null, n.optional ? t("sp.optional") : null].filter(Boolean).join(" · ")}</NumText>
            </span>
          ) : (
            <span className="text-fg-2" data-water="over">
              {t("irr.rowP3")}
            </span>
          )}
          {cycle.waterMode === "auto" && !cycle.flowMlPerMin && (
            <button onClick={() => ed.openCycle()} className="text-left">
              <Notice as="span" className="text-[0.75rem]">
                {t("today.flowUnknown")} · {t("cycleForm.flowHint")}
              </Notice>
            </button>
          )}
        </div>
      </section>
    </Reveal>
  )
}

/** Réservoir: a bar filled to the litres left, « 33 L sur 120 L », then « ≈ 2 j · 12,5 L/jour, estimé ». */
function Reservoir({ a }: { a: Autonomy }) {
  const { t, num } = useSettings()
  const days = a.days.ok ? Math.floor(a.days.value) : null
  const pct = a.left.ok && a.usableL ? Math.min(100, (a.left.value / a.usableL) * 100) : null
  const warn = a.tooOld || (days != null && days <= 1)
  const line = [days != null ? t("sp.days", { n: num(days) }) : null, a.perDay.ok ? t("today.resPerDay", { v: num(a.perDay.value, 1) }) : null, a.source ? t(a.source === "reading" ? "sp.reading" : "sp.estimate") : null]
    .filter(Boolean)
    .join(" · ")
  return (
    <Reveal i={4}>
      <section id="reservoir" aria-labelledby="reservoir-title" data-warn={warn || undefined}>
        <SectionHead id="reservoir-title" title={t("sp.reservoir")} />
        {pct != null && (
          <div className="mb-2 h-2 overflow-hidden rounded-[4px] bg-track" id="res-bar" aria-hidden="true">
            <span className="block h-full rounded-[4px] bg-water" style={{ width: `${pct}%` }} />
          </div>
        )}
        {a.left.ok ? (
          <p className="text-[0.90625rem] text-fg-2">
            <b className="font-num text-[1.125rem] font-semibold tracking-[-0.02em] text-fg">{t("sp.left", { left: num(a.left.value) })}</b>
            {a.usableL ? ` ${t("sp.of", { usable: num(a.usableL) })}` : null}
          </p>
        ) : (
          <p className="text-[0.875rem] text-fg-3">{t("today.resMissing")}</p>
        )}
        {line && <p className={cn("mt-0.5 font-num text-[0.78125rem]", warn ? "text-warn" : "text-fg-3")}>{line}</p>}
        {a.tooOld && <Notice className="mt-1.5 text-[0.75rem]">{t("digest.tooOld", { days: num(a.mixAgeDays ?? 0) })}</Notice>}
        {!a.days.ok && <p className="mt-1 text-[0.75rem] text-fg-3">{t("today.resHow")}</p>}
      </section>
    </Reveal>
  )
}

/** A seedling or propagation space: germination, dome, days since germination. */
function Propagation({ entries, cycle }: { entries: Entry[]; cycle?: Cycle }) {
  const { t, num } = useSettings()
  const last = entries.find((e) => e.sownCount != null || e.germinatedCount != null || e.domeOn != null)
  const sown = last?.sownCount
  const germ = last?.germinatedCount
  const since = cycle?.germinationDate ? daysBetween(cycle.germinationDate, todayIso()) + 1 : null
  return (
    <Reveal i={2}>
      <section id="propagation" aria-labelledby="propagation-title">
        <SectionHead id="propagation-title" title={t("today.propagation")} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-[18px]">
          <Reading label={t("today.germination")} decimals={0} note={sown ? `${num(((germ ?? 0) / sown) * 100)} %` : t("today.germinationHint")}>
            {sown ? `${germ ?? 0}/${sown}` : undefined}
          </Reading>
          <Reading label={t("today.dome")} decimals={0}>
            {last?.domeOn == null ? undefined : last.domeOn ? t("today.domeOn") : t("today.domeOff")}
          </Reading>
          <Reading label={t("today.sinceGerm")} decimals={0}>
            {since != null && since > 0 ? t("sp.day", { n: since }) : undefined}
          </Reading>
        </div>
      </section>
    </Reveal>
  )
}

/** Sources: one quiet line at the bottom (the targets actually used today, the measured flow). */
function Sources({ cycle, tg }: { cycle: Cycle; tg: DayTargets | null }) {
  const { t, num } = useSettings()
  const srcs = new Set(Object.values(tg ?? {}).flatMap((v) => (v && typeof v === "object" && "src" in v ? [(v as Target).src] : [])))
  const list = [
    srcs.has("athena") && t("today.srcAthena"),
    srcs.has("spec") && t("today.srcSpec"),
    srcs.has("common") && t("today.srcCommon"),
    srcs.has("app") && t("today.srcApp"),
    srcs.has("user") && t("today.srcUser"),
    srcs.has("estimate") && t("today.srcEstimate"),
    cycle.waterMode === "auto" && (cycle.flowMlPerMin ? t("today.srcFlow", { flow: num(cycle.flowMlPerMin / 1000, 1) }) : t("today.srcFlowMissing")),
  ].filter(Boolean)
  if (!list.length) return null
  return (
    <p id="space-sources" className="-mt-3 text-[0.75rem] leading-[1.5] text-fg-3">
      {t("today.sources", { list: list.join(" · ") })}
    </p>
  )
}
