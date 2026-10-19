// Aujourd'hui by space (spec §3): "Bonjour" card, "All" view (one card per space, grouped by room),
// and the view of one space by type — culture, propagation, drying — with the reservoir autonomy.
import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { Emoji } from "@/components/hydro/emoji"
import { Drop } from "@/components/hydro/wordmark"
import { Label, Reveal, ScreenHero, Notice, StatePill } from "@/components/hydro/primitives"
import { Reading } from "@/components/hydro/reading"
import { SpaceDot, SpaceTile } from "@/components/hydro/space-pill"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { stageEmoji, stageLine } from "@/app/labels"
import { stageOn, todayIso, daysBetween } from "@/calc/stage"
import { buildDailyDigest, changedDigestDocs, digestKey, digestWeek, dryingCycle, spaceContext, type DigestData, type DigestLine, type DigestRow } from "@/calc/digest"
import { groupBySite } from "@/model/grow-ops"
import type { Space, SpaceColor } from "@/model/grow"
import type { Cycle } from "@/model/types"
import type { Autonomy } from "@/calc/reservoir"
import { cn } from "@/lib/utils"
import { UpcomingCard } from "./calendar-parts"
import { tertiary } from "@/components/hydro/styles"
import type { Lang } from "@/i18n/types"

function useDigestData(): DigestData {
  const { grow, spaces, sites, cycles, all, equipment, assignments, reminders, customProducts, concentrateStocks, sprays } = useGrow()
  return useMemo(
    () => ({ grow, spaces, sites, cycles, entries: all.entries, mixes: all.mixes, events: all.events, equipment, assignments, reminders, customProducts, concentrateStocks, sprays }),
    [grow, spaces, sites, cycles, all.entries, all.mixes, all.events, equipment, assignments, reminders, customProducts, concentrateStocks, sprays],
  )
}

/** Quiet time after the last change before the week of digests is computed and written. */
const DIGEST_DELAY_MS = 4000

/**
 * Keeps a week of digests current for the morning task (Claude version only). Grouped (lot 10d): computed and written
 * once things settle (4 s after the last entry, or when the app goes to the background / Today is left), and only the
 * docs whose text changed, in one batch. Old dated docs are pruned once a day.
 */
function usePersistDigest(data: DigestData, lang: Lang) {
  const { storeKind, saveDigestWeek } = useGrow()
  const written = useRef(new Map<string, string>())
  const prunedOn = useRef("")
  const pending = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (storeKind !== "artifact") return
    const run = () => {
      pending.current = null
      const today = todayIso()
      const week = digestWeek(data, today, lang)
      const only = changedDigestDocs(week, written.current)
      const prune = prunedOn.current !== today
      if (!only.length && !prune) return
      for (const [p, d] of only) written.current.set(p, digestKey(d))
      prunedOn.current = today
      void saveDigestWeek(week, { only, prune }).catch(() => {
        for (const [p] of only) written.current.delete(p)
        prunedOn.current = ""
      })
    }
    pending.current = run
    const timer = setTimeout(run, DIGEST_DELAY_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [data, lang, storeKind, saveDigestWeek])
  // Leaving Today or the app: what is pending is written now.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden") pending.current?.()
    }
    document.addEventListener("visibilitychange", flush)
    return () => {
      document.removeEventListener("visibilitychange", flush)
      pending.current?.()
    }
  }, [])
}

/** The first name of « Bonjour Thomas. »: the one set in Réglages, else the one in « Grow de Thomas » (lot 10h). */
export function ownerName(grow?: { name?: string; ownerName?: string } | null): string | undefined {
  if (grow?.ownerName?.trim()) return grow.ownerName.trim()
  // « Grow de Thomas (simulation 1 an) » → Thomas: what is in brackets is not a name; more than two words neither.
  const name = (grow?.name ?? "").replace(/\s*\(.*\)\s*$/, "").trim()
  const m = /^grow (?:de |d['’]\s*)(.+)$/i.exec(name) ?? /^(.+?)['’]s grow$/i.exec(name)
  const who = m?.[1]?.trim()
  return who && who.split(/\s+/).length <= 2 ? who : undefined
}

/** One line of the morning summary (lot 10j): drawing, short text (a quieter note), the value on the right in mono. */
function SummaryRow({ row, warn, dot }: { row: DigestRow; warn?: boolean; dot?: SpaceColor }) {
  const { t } = useSettings()
  return (
    <li className={cn("flex min-h-11 items-center gap-3 border-t border-line py-1.5", row.muted && "text-fg-2")} data-warn={warn || undefined}>
      <Emoji name={row.icon} size={24} />
      <span className="min-w-0 flex-1 text-[0.90625rem] leading-[1.3]">
        {dot && <SpaceDot color={dot} className="mr-1.5 mb-px align-middle" />}
        {row.text}
        {row.note && <span className="text-fg-2">{` · ${row.note}`}</span>}
      </span>
      {row.value && (
        <span className={cn("shrink-0 font-num text-[0.8125rem] whitespace-nowrap", warn ? "font-semibold text-warn" : "text-fg-2")}>
          {row.value}
          {warn && <span className="sr-only">{` (${t("today.alertTag")})`}</span>}
        </span>
      )}
    </li>
  )
}

/** The rows of a group (a space, the whole grow); a line without `row` (a recent last entry) is in the header. */
function SummaryRows({ lines }: { lines: DigestLine[] }) {
  return (
    <ul>
      {lines.map((l, i) => l.row && <SummaryRow key={i} row={l.row} warn={l.warn} />)}
    </ul>
  )
}

/** « dernière saisie hier » of the summary's header: the latest entry of these spaces. */
function useLastEntryWhen(spaceIds: string[]): string | null {
  const { t, dm } = useSettings()
  const { all } = useGrow()
  const today = todayIso()
  const last = all.entries.filter((e) => spaceIds.includes(e.spaceId) && e.date <= today).sort((a, b) => (a.date === b.date ? ((a.time ?? "") < (b.time ?? "") ? 1 : -1) : a.date < b.date ? 1 : -1))[0]
  if (!last) return null
  if (last.date === today) return last.time ? t("today.whenToday", { time: last.time }) : t("today.whenTodayNoTime")
  if (daysBetween(last.date, today) === 1) return t("row.yesterday")
  return t("today.whenDay", { date: dm(last.date) })
}

/**
 * The morning summary (lot 10j, replaces the sentences of 10h2): « Bonjour Thomas. » (Geologica since lot 10k), a small line
 * « 3 espaces · dernière saisie hier », then one short line per idea, grouped by space with its little square. An empty
 * space is one quiet line. Same information as the digest of the morning task, whose text does not change.
 */
export function BonjourCard({ only }: { only?: string }) {
  const { t, settings } = useSettings()
  const { grow } = useGrow()
  const data = useDigestData()
  const today = todayIso()
  const digest = useMemo(() => buildDailyDigest(data, today, settings.lang, today, { rows: true }), [data, settings.lang, today])
  usePersistDigest(data, settings.lang)
  const [open, setOpen] = useState(false)
  const spaces = only ? digest.spaces.filter((s) => s.spaceId === only) : digest.spaces
  const isEmpty = (s: (typeof spaces)[number]) => s.lines.length === 1 && s.lines[0].kind === "stage" && !!s.lines[0].row?.muted
  // Two spaces at first; an empty space is one quiet line and does not count.
  const full = spaces.filter((s) => !isEmpty(s))
  const shown = only || open || full.length <= 2 ? spaces : spaces.filter((s) => isEmpty(s) || full.indexOf(s) < 2)
  const when = useLastEntryWhen(spaces.map((s) => s.spaceId))
  if (!spaces.length) return null
  const name = ownerName(grow)
  const n = spaces.length
  const sub = only ? (when ? t("row.subOne", { when }) : t("row.subOneNone")) : when ? t("row.sub", { n, when }) : t("row.subNone", { n })
  const colorOf = (id: string) => data.spaces.find((x) => x.id === id)?.color
  return (
    <section className="flex flex-col" id="bonjour" aria-labelledby="bonjour-title">
      <h2 id="bonjour-title" className="display text-[1.875rem] leading-tight">
        {name ? t("row.hello", { name }) : t("row.helloNoName")}
      </h2>
      <p className="mt-0.5 mb-2.5 text-[0.8125rem] text-fg-2" id="bonjour-sub">
        {sub}
      </p>
      <div className="flex flex-col border-b border-line">
        {!only && digest.general.length > 0 && (
          <section aria-label={t("digest.general")}>
            <h3 className="mt-2 mb-1 text-[0.8125rem] font-semibold text-fg-2">{t("digest.general")}</h3>
            <SummaryRows lines={digest.general} />
          </section>
        )}
        {shown.map((s) => {
          // One quiet line for an empty space (its name in it when there are several).
          if (isEmpty(s) && !only)
            return (
              <ul key={s.spaceId} data-space={s.spaceId}>
                <SummaryRow row={{ ...s.lines[0].row!, text: t("row.emptyOf", { space: s.name }) }} dot={colorOf(s.spaceId)} />
              </ul>
            )
          return (
            <section key={s.spaceId} data-space={s.spaceId} aria-label={only ? undefined : s.name}>
              {!only && (
                <h3 className="mt-3 mb-1 flex items-center gap-2 text-[0.8125rem] font-semibold text-fg-2">
                  <SpaceDot color={colorOf(s.spaceId)} /> {s.name}
                </h3>
              )}
              <SummaryRows lines={s.lines} />
            </section>
          )
        })}
      </div>
      {!only && full.length > 2 && (
        <button onClick={() => setOpen((x) => !x)} className={cn("relative mt-1.5 self-start", tertiary)}>
          {open ? t("digest.less") : t("digest.more")}
        </button>
      )}
    </section>
  )
}

/**
 * "All" (or one room), lot 10j: the summary, À faire, then the spaces, one card each (grouped by room). No title: the
 * active tab says it. Tapping a card opens that space.
 */
export function AllToday() {
  const { t, setSpace } = useSettings()
  const { spaces, sites, selection } = useGrow()
  const ed = useEditors()
  const shown = selection.kind === "site" ? spaces.filter((s) => s.siteId === selection.site.id) : spaces
  const groups = groupBySite(shown, sites)
  return (
    <>
      <Reveal i={0} className="mt-2 mb-7">
        <BonjourCard />
      </Reveal>
      <Reveal i={1} className="mb-7">
        <UpcomingCard spaceIds={selection.kind === "site" ? new Set(shown.map((s) => s.id)) : null} />
      </Reveal>
      <section id="spaces" aria-labelledby="spaces-title">
        <div className="mb-3" id="spaces-title">
          <Label emoji="pottedPlant" mark>
            {t("today.spaces")}
          </Label>
        </div>
        {groups.map((g, gi) => (
          <div key={g.site?.id ?? "none"} className="mb-1">
            {g.site && sites.length > 0 && <div className="eyebrow mt-1 mb-2 px-1">{g.site.name}</div>}
            {g.spaces.map((s, i) => (
              <Reveal key={s.id} i={gi + i + 1} className="mb-3">
                <SpaceCard space={s} onOpen={() => setSpace(s.id)} />
              </Reveal>
            ))}
          </div>
        ))}
        {!shown.length && (
          <Card framed className="items-center gap-1 text-center">
            <p className="text-[0.8125rem] text-fg-2">{t("space.empty")}</p>
            <button onClick={() => ed.openCycle({ cycleId: "new" })} className={tertiary}>
              {t("today.emptyCta")}
            </button>
          </Card>
        )}
      </section>
    </>
  )
}

/** State of a space for its square and its pill (lot 10j): stage of its cycle, drying, or empty. */
export function spaceState(space: Space, ctx: Ctx, cycles: Cycle[], today: string) {
  const st = ctx.cycle ? stageOn(ctx.cycle, today) : null
  const drying = dryingCycle(space, cycles, today)
  if (ctx.cycle && st && st.key !== "harvested") {
    const flower = !!st.flowerWeek || ["stretch", "bulk", "finish", "flush"].includes(st.key)
    const pill = st.key === "notStarted" ? "notStarted" : st.key === "seedling" ? "seedling" : st.key === "veg" ? "veg" : flower ? "flower" : "veg"
    return { emoji: stageEmoji(st.key), pill, tone: pill === "flower" ? "flower" : pill === "notStarted" ? "neutral" : "leaf", st, drying: undefined } as const
  }
  if (drying) return { emoji: "scissors", pill: "drying", tone: "neutral", st: null, drying } as const
  if (ctx.cycle && st?.key === "harvested") return { emoji: "scissors", pill: "harvested", tone: "neutral", st, drying: undefined } as const
  return { emoji: "pottedPlant", pill: "empty", tone: "neutral", st: null, drying: undefined } as const
}

/**
 * The card of a space (lot 10j): a frame of its own, one level, nothing framed inside. Its tinted square with the stage
 * drawing, its name and « Cycle 2 · Végé S6 · J41 », the stage pill; up to 4 readings in 2 × 2 (the target bar when
 * there is a target); the last entry and the age of the tank.
 */
function SpaceCard({ space, onOpen }: { space: Space; onOpen: () => void }) {
  const { t, num, dm } = useSettings()
  const data = useDigestData()
  const today = todayIso()
  const ctx = useMemo(() => spaceContext(space, data, today), [space, data, today])
  const { cycle, last, autonomy } = ctx
  const state = spaceState(space, ctx, data.cycles, today)
  const tg = last?.targets
  const sub =
    cycle && state.st && state.st.key !== "harvested"
      ? `${cycle.name} · ${stageLine(t, state.st)}`
      : state.drying?.harvestDate
        ? (() => {
            const v = { cycle: state.drying.name, day: daysBetween(state.drying.harvestDate, today) + 1, total: state.drying.plannedDryingDays ?? 0 }
            return state.drying.plannedDryingDays ? t("digest.drying", v) : t("digest.dryingNoPlan", v)
          })()
        : cycle && state.st
          ? `${cycle.name} · ${stageLine(t, state.st)}`
          : t("space.noCycle")
  type R = Omit<Parameters<typeof Reading>[0], "compact">
  const reads: R[] = []
  if (space.modules.irrigation && last?.dryback != null) reads.push({ label: t("today.dryback"), emoji: "sweat", value: last.dryback, unit: "%", decimals: 0, target: tg?.dryback })
  if (space.modules.irrigation && last?.drybackSensor != null) reads.push({ label: t("today.drybackSensor"), emoji: "sweat", value: last.drybackSensor, unit: "%", decimals: 0 })
  if (space.modules.irrigation && last?.ecRunoff != null) reads.push({ label: t("today.ecRunoff"), emoji: "testTube", value: last.ecRunoff, decimals: 1, target: tg?.ecRunoff })
  if (space.modules.climate && last?.tempDay != null)
    reads.push({
      label: t("today.tempRh"),
      emoji: "thermometer",
      value: last.tempDay,
      children: (
        <>
          {`${num(last.tempDay)}°`}
          <span className="text-fg-3">{` / ${last.rh != null ? num(last.rh) : "—"}`}</span>
        </>
      ),
    })
  if (space.modules.climate && last?.vpd != null) reads.push({ label: t("today.vpd"), emoji: "droplet", value: last.vpd, decimals: 2, target: tg?.vpd })
  if (space.modules.propagation && last?.sownCount) reads.push({ label: t("today.germination"), emoji: "sprout", value: last.germinatedCount ?? 0, children: `${last.germinatedCount ?? 0}/${last.sownCount}` })
  const whenLast = last ? (last.date === today ? (last.time ? t("today.whenToday", { time: last.time }) : t("today.whenTodayNoTime")) : t("today.whenDay", { date: dm(last.date) })) : null
  return (
    <button onClick={onOpen} className="block w-full rounded-[14px] text-left" data-space-card={space.id}>
      <Card framed className="gap-3">
        <div className="flex items-center gap-3">
          <SpaceTile color={space.color} emoji={state.emoji} />
          <div className="min-w-0 flex-1">
            <div className="display truncate text-[1.25rem] leading-tight">{space.name}</div>
            <div className="mt-0.5 truncate text-[0.78125rem] text-fg-2">{sub}</div>
          </div>
          <StatePill tone={state.tone}>{t(`pill.${state.pill}`)}</StatePill>
        </div>
        {reads.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {reads.slice(0, 4).map((r) => (
              <Reading key={r.label} {...r} compact />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5 text-[0.75rem] text-fg-2">
          <span className="min-w-0 truncate">{whenLast ? t("today.lastEntry", { when: whenLast }) : t("today.noEntryTitle")}</span>
          {autonomy?.mixAgeDays != null && (
            <span className={cn("flex shrink-0 items-center gap-1", autonomy.tooOld && "font-semibold text-warn")}>
              <Emoji name="bucket" size={16} /> {t("today.mixAge", { n: num(autonomy.mixAgeDays) })}
            </span>
          )}
        </div>
      </Card>
    </button>
  )
}

/**
 * One space: its square and title, the summary for it, À faire, then the view that fits its modules (lot 10j: the same
 * order as « Tous »).
 */
export function SpaceToday({ space, Culture }: { space: Space; Culture: ComponentType<{ extra?: ReactNode }> }) {
  const { t } = useSettings()
  const data = useDigestData()
  const today = todayIso()
  const ctx = useMemo(() => spaceContext(space, data, today), [space, data, today])
  const st = ctx.cycle ? stageOn(ctx.cycle, today) : null
  const propagating = space.modules.propagation && (!ctx.cycle || st?.key === "seedling" || st?.key === "notStarted")
  const extra = (
    <>
      <Reveal i={0} className="mb-7">
        <BonjourCard only={space.id} />
      </Reveal>
      <Reveal i={1} className="mb-6">
        <UpcomingCard spaceIds={new Set([space.id])} />
      </Reveal>
      {propagating && (
        <Reveal i={1} className="mb-3">
          <PropagationCard ctx={ctx} />
        </Reveal>
      )}
      {ctx.autonomy && (
        <Reveal i={2} className="mb-3">
          <ReservoirCard a={ctx.autonomy} name={ctx.tank?.name ?? t("entry.reservoir")} />
        </Reveal>
      )}
    </>
  )
  if (space.modules.drying && !space.modules.irrigation) {
    return (
      <>
        <ScreenHero eyebrow={space.name} title={t("today.drying")} tile={{ color: space.color, emoji: dryingCycle(space, data.cycles, today) ? "scissors" : "pottedPlant" }} />
        {extra}
        <Reveal i={3}>
          <DryingCard space={space} ctx={ctx} />
        </Reveal>
      </>
    )
  }
  if (!ctx.cycle && propagating) {
    return (
      <>
        <ScreenHero eyebrow={space.name} title={t("today.propagation")} tile={{ color: space.color, emoji: "sprout" }} />
        {extra}
      </>
    )
  }
  return <Culture extra={extra} />
}

type Ctx = ReturnType<typeof spaceContext>

function PropagationCard({ ctx }: { ctx: Ctx }) {
  const { t, num } = useSettings()
  const last = ctx.entries.find((e) => e.sownCount != null || e.germinatedCount != null || e.domeOn != null)
  const sown = last?.sownCount
  const germ = last?.germinatedCount
  const since = ctx.cycle?.germinationDate ? daysBetween(ctx.cycle.germinationDate, todayIso()) + 1 : null
  return (
    <Card className="gap-2">
      <Label emoji="sprout" mark>
        {t("today.propagation")}
      </Label>
      <div className="grid grid-cols-3 gap-2">
        <Tile k={t("today.germination")} v={sown ? `${germ ?? 0}/${sown}` : "—"} sub={sown ? `${num(((germ ?? 0) / sown) * 100)} %` : t("today.germinationHint")} />
        <Tile k={t("today.dome")} v={last?.domeOn == null ? "—" : last.domeOn ? t("today.domeOn") : t("today.domeOff")} />
        <Tile k={t("today.sinceGerm")} v={since != null && since > 0 ? `J${since}` : "—"} />
      </div>
    </Card>
  )
}

function ReservoirCard({ a, name }: { a: Autonomy; name: string }) {
  const { t, num } = useSettings()
  const days = a.days.ok ? Math.floor(a.days.value) : null
  const pct = a.left.ok && a.usableL ? Math.min(100, (a.left.value / a.usableL) * 100) : null
  return (
    <Card className="gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label emoji="bucket" mark>
          {name}
        </Label>
        {a.source && <span className="text-[0.75rem] text-fg-3">{t(a.source === "reading" ? "today.resReading" : "today.resEstimate")}</span>}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className={cn("font-num text-[1.875rem] leading-none font-medium tracking-[-0.02em] tabular-nums", days != null && days <= 1 ? "text-warn" : "")}>{days != null ? t("today.resDays", { n: num(days) }) : "—"}</div>
          <div className="mt-1 text-[0.75rem] text-fg-3">
            {a.left.ok ? (a.usableL ? t("today.resLeftOf", { left: num(a.left.value), usable: num(a.usableL) }) : t("today.resLeft", { left: num(a.left.value) })) : t("today.resMissing")}
            {a.perDay.ok && ` · ${t("today.resPerDay", { v: num(a.perDay.value, 1) })}`}
          </div>
        </div>
        {pct != null && (
          // Gauge (lot 10g): the logo's drop filled to the share of litres left; the number stays next to it.
          <div className="flex shrink-0 items-end gap-2" id="res-gauge">
            <span className="tabular text-[1rem] font-medium">{`${num(pct)}\u202f%`}</span>
            <Drop height={56} fill={pct / 100} leaf={false} />
          </div>
        )}
      </div>
      {a.tooOld && <Notice className="text-[0.75rem]">{t("digest.tooOld", { days: num(a.mixAgeDays ?? 0) })}</Notice>}
      {!a.days.ok && <p className="text-[0.75rem] text-fg-3">{t("today.resHow")}</p>}
    </Card>
  )
}

function DryingCard({ space, ctx }: { space: Space; ctx: Ctx }) {
  const { t, num } = useSettings()
  const { cycles } = useGrow()
  const drying = cycles.filter((c) => c.spaceId === space.id && c.harvestDate).sort((a, b) => (a.harvestDate! < b.harvestDate! ? 1 : -1))[0]
  const day = drying?.harvestDate ? daysBetween(drying.harvestDate, todayIso()) + 1 : null
  const last = ctx.last
  return (
    <Card className="gap-2">
      <Label emoji="scissors" mark>
        {drying ? `${drying.name} · ${drying.cultivars[0] ?? ""}` : t("today.drying")}
      </Label>
      <div className="grid grid-cols-2 gap-2">
        <Tile k={t("today.dryingDay")} v={day != null && day > 0 ? `J${day}` : "—"} sub={drying ? undefined : t("today.dryingNone")} />
        <Tile k={t("today.vpd")} v={last?.vpd != null ? `${num(last.vpd, 2)} kPa` : "—"} />
        <Tile k={t("entry.tempDay")} v={last?.tempDay != null ? `${num(last.tempDay, 1)} °C` : "—"} />
        <Tile k={t("entry.rh")} v={last?.rh != null ? `${num(last.rh)} %` : "—"} />
      </div>
    </Card>
  )
}

/** A value without a target (lot 10h: no box, label and big mono value). */
function Tile({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[0.75rem] text-fg-3">{k}</div>
      <div className="mt-0.5 truncate font-num text-[1.5rem] leading-tight font-medium tabular-nums">{v}</div>
      {sub && <div className="truncate font-num text-[0.75rem] text-fg-3">{sub}</div>}
    </div>
  )
}
