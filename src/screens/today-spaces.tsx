// Aujourd'hui by space (spec §3): "Bonjour" card, "All" view (one card per space, grouped by room),
// and the view of one space by type — culture, propagation, drying — with the reservoir autonomy.
import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { LineIcon } from "@/components/hydro/line-icon"
import { Drop } from "@/components/hydro/wordmark"
import { Chip, Dot, Label, Reveal, ScreenHero } from "@/components/hydro/primitives"
import { SpaceDot } from "@/components/hydro/space-pill"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { stageLine } from "@/app/labels"
import { stageOn, todayIso, daysBetween } from "@/calc/stage"
import { buildDailyDigest, changedDigestDocs, digestKey, digestWeek, spaceContext, type DigestData } from "@/calc/digest"
import { status } from "@/calc/advice"
import { groupBySite } from "@/model/grow-ops"
import type { Space } from "@/model/grow"
import type { Autonomy } from "@/calc/reservoir"
import { cn } from "@/lib/utils"
import { UpcomingCard } from "./calendar-parts"

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
function usePersistDigest(data: DigestData, lang: "fr" | "en") {
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

export function BonjourCard({ only }: { only?: string }) {
  const { t, settings } = useSettings()
  const data = useDigestData()
  const digest = useMemo(() => buildDailyDigest(data, todayIso(), settings.lang), [data, settings.lang])
  usePersistDigest(data, settings.lang)
  const [open, setOpen] = useState(false)
  const spaces = only ? digest.spaces.filter((s) => s.spaceId === only) : digest.spaces
  const shown = only || open ? spaces : spaces.slice(0, 2)
  if (!spaces.length) return null
  return (
    <Card className="relative gap-2 overflow-hidden">
      <div className="relative flex items-center gap-2.5">
        <LineIcon name="sun" size={24} />
        <b className="display text-[1.1875rem] leading-tight">{digest.title}</b>
      </div>
      <div className="relative flex flex-col gap-2.5">
        {shown.map((s) => (
          <div key={s.spaceId}>
            {!only && (
              <div className="mb-0.5 flex items-center gap-1.5 text-[0.78125rem] font-semibold">
                <SpaceDot color={data.spaces.find((x) => x.id === s.spaceId)?.color} /> {s.name}
              </div>
            )}
            <ul className="flex flex-col gap-0.5">
              {s.lines.map((l, i) => (
                <li key={i} className={cn("flex gap-2 text-[0.8125rem] leading-[1.4]", l.warn ? "text-warn" : "text-fg-2")}>
                  <span className={cn("mt-[7px] size-[5px] shrink-0 rounded-full", l.warn ? "bg-warn" : "bg-primary")} aria-hidden="true" />
                  {l.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {!only && spaces.length > 2 && (
        <button onClick={() => setOpen((x) => !x)} className="relative -mb-1 h-11 self-start text-[0.78125rem] font-semibold text-primary">
          {open ? t("digest.less") : t("digest.more")}
        </button>
      )}
    </Card>
  )
}

/** "All" (or one room): one card per space, grouped by room. Tapping a card opens that space. */
export function AllToday() {
  const { t, setSpace } = useSettings()
  const { spaces, sites, selection, grow } = useGrow()
  const ed = useEditors()
  const shown = selection.kind === "site" ? spaces.filter((s) => s.siteId === selection.site.id) : spaces
  const groups = groupBySite(shown, sites)
  return (
    <>
      <ScreenHero emoji="pottedPlant" eyebrow={selection.kind === "site" ? selection.site.name : (grow?.name ?? "")} title={t("today.allTitle")}>
        <p className="mt-1 text-[0.8125rem] text-fg-2">{t("today.allSub", { n: shown.length })}</p>
      </ScreenHero>
      <Reveal i={0} className="mb-3">
        <BonjourCard />
      </Reveal>
      <Reveal i={1} className="mb-3">
        <UpcomingCard spaceIds={selection.kind === "site" ? new Set(shown.map((s) => s.id)) : null} />
      </Reveal>
      {groups.map((g, gi) => (
        <section key={g.site?.id ?? "none"} className="mb-1">
          {g.site && sites.length > 0 && <div className="eyebrow mt-1 mb-2 px-1">{g.site.name}</div>}
          {g.spaces.map((s, i) => (
            <Reveal key={s.id} i={gi + i + 1} className="mb-2.5">
              <SpaceCard space={s} onOpen={() => setSpace(s.id)} />
            </Reveal>
          ))}
        </section>
      ))}
      {!shown.length && (
        <Card className="items-center px-4 py-6 text-center">
          <p className="text-[0.8125rem] text-fg-2">{t("space.empty")}</p>
          <button onClick={() => ed.openCycle({ cycleId: "new" })} className="h-11 text-[0.8125rem] font-semibold text-primary">
            {t("today.emptyCta")}
          </button>
        </Card>
      )}
    </>
  )
}

function SpaceCard({ space, onOpen }: { space: Space; onOpen: () => void }) {
  const { t, num, dm } = useSettings()
  const data = useDigestData()
  const today = todayIso()
  const ctx = useMemo(() => spaceContext(space, data, today), [space, data, today])
  const { cycle, last, autonomy } = ctx
  const st = cycle ? stageOn(cycle, today) : null
  const tg = last?.targets
  const pills: { k: string; v: string; s?: ReturnType<typeof status> }[] = []
  if (space.modules.irrigation && last?.dryback != null) pills.push({ k: t("today.dryback"), v: `${num(last.dryback)} %`, s: tg?.dryback ? status(last.dryback, tg.dryback) : undefined })
  if (space.modules.irrigation && last?.drybackSensor != null) pills.push({ k: t("today.drybackSensor"), v: `${num(last.drybackSensor)} %` })
  if (space.modules.irrigation && last?.ecRunoff != null) pills.push({ k: t("today.ecRunoff"), v: num(last.ecRunoff, 1), s: tg?.ecRunoff ? status(last.ecRunoff, tg.ecRunoff) : undefined })
  if (space.modules.climate && last?.tempDay != null) pills.push({ k: t("today.tempRh"), v: `${num(last.tempDay)}° / ${last.rh != null ? num(last.rh) : "—"}` })
  if (space.modules.climate && last?.vpd != null) pills.push({ k: t("today.vpd"), v: num(last.vpd, 2), s: tg?.vpd ? status(last.vpd, tg.vpd) : undefined })
  if (space.modules.propagation && last?.sownCount) pills.push({ k: t("today.germination"), v: `${last.germinatedCount ?? 0}/${last.sownCount}` })
  return (
    <button onClick={onOpen} className="block w-full text-left">
      <Card className="gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="display flex items-center gap-2 text-[1.1875rem] leading-tight">
              <SpaceDot color={space.color} className="size-2.5" /> {space.name}
            </div>
            <div className="mt-0.5 truncate text-[0.78125rem] text-fg-2">
              {cycle && st ? `${cycle.name} · ${stageLine(t, st)}` : t("space.noCycle")}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Chip>{t(`template.${space.template}`)}</Chip>
            <ChevronRight className="size-4.5 text-fg-3" />
          </div>
        </div>
        {pills.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {pills.slice(0, 4).map((p) => (
              <div key={p.k} className="rounded-md border border-line bg-surface-2 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-[0.75rem] text-fg-3">
                  {p.s ? <Dot status={p.s} /> : <span className="inline-block size-[7px] rounded-full bg-track" aria-hidden="true" />} {p.k}
                </div>
                <div className="truncate text-[1.125rem] leading-tight font-medium tabular">{p.v}</div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 text-[0.75rem] text-fg-3">
          <span>{last ? t("today.lastEntry", { when: last.date === today ? (last.time ? t("today.whenToday", { time: last.time }) : t("today.whenTodayNoTime")) : t("today.whenDay", { date: dm(last.date) }) }) : t("today.noEntryTitle")}</span>
          {autonomy && <AutonomyTag a={autonomy} />}
        </div>
      </Card>
    </button>
  )
}

function AutonomyTag({ a }: { a: Autonomy }) {
  const { t, num } = useSettings()
  if (!a.days.ok) return <span className="font-semibold text-warn">{t("today.resMissingShort")}</span>
  const d = Math.floor(a.days.value)
  return (
    <span className={cn("flex items-center gap-1 font-semibold", d <= 1 || a.tooOld ? "text-warn" : "text-fg-2")}>
      <LineIcon name="bucket" size={16} /> {t("today.resDays", { n: num(d) })}
    </span>
  )
}

/** One space: Bonjour for it, then the view that fits its modules. */
export function SpaceToday({ space, Culture }: { space: Space; Culture: ComponentType<{ extra?: ReactNode }> }) {
  const { t } = useSettings()
  const data = useDigestData()
  const today = todayIso()
  const ctx = useMemo(() => spaceContext(space, data, today), [space, data, today])
  const st = ctx.cycle ? stageOn(ctx.cycle, today) : null
  const propagating = space.modules.propagation && (!ctx.cycle || st?.key === "seedling" || st?.key === "notStarted")
  const extra = (
    <>
      <Reveal i={0} className="mb-3">
        <BonjourCard only={space.id} />
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
        <ScreenHero emoji="leaf" eyebrow={space.name} title={t("today.drying")} />
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
        <ScreenHero emoji="sprout" eyebrow={space.name} title={t("today.propagation")} />
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
      <Label emoji="sprout">{t("today.propagation")}</Label>
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
        <Label emoji="bucket">{name}</Label>
        {a.source && <span className="text-[0.75rem] text-fg-3">{t(a.source === "reading" ? "today.resReading" : "today.resEstimate")}</span>}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className={cn("text-[1.875rem] leading-none font-semibold tabular", days != null && days <= 1 ? "text-warn" : "")}>{days != null ? t("today.resDays", { n: num(days) }) : "—"}</div>
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
      {a.tooOld && <p className="rounded-md bg-warn/10 px-3 py-2 text-[0.75rem] font-medium text-warn">{t("digest.tooOld", { days: num(a.mixAgeDays ?? 0) })}</p>}
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
      <Label emoji="leaf">{drying ? `${drying.name} · ${drying.cultivars[0] ?? ""}` : t("today.drying")}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Tile k={t("today.dryingDay")} v={day != null && day > 0 ? `J${day}` : "—"} sub={drying ? undefined : t("today.dryingNone")} />
        <Tile k={t("today.vpd")} v={last?.vpd != null ? `${num(last.vpd, 2)} kPa` : "—"} />
        <Tile k={t("entry.tempDay")} v={last?.tempDay != null ? `${num(last.tempDay, 1)} °C` : "—"} />
        <Tile k={t("entry.rh")} v={last?.rh != null ? `${num(last.rh)} %` : "—"} />
      </div>
    </Card>
  )
}

function Tile({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-md border border-line bg-surface-2 px-2.5 py-2">
      <div className="truncate text-[0.75rem] text-fg-3">{k}</div>
      <div className="mt-0.5 truncate text-[1.25rem] leading-tight font-medium tabular">{v}</div>
      {sub && <div className="truncate text-[0.75rem] text-fg-3">{sub}</div>}
    </div>
  )
}
