// Aujourd'hui by space (spec §3): the digests kept for the morning task, and the view of one space by type — culture,
// propagation, drying — with the reservoir autonomy. The « Tous » view is in today-calm.tsx (lot 10k1).
import { useEffect, useMemo, useRef, type ComponentType, type ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { Drop } from "@/components/hydro/wordmark"
import { Label, Reveal, ScreenHero, Notice } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { stageOn, todayIso, daysBetween } from "@/calc/stage"
import { changedDigestDocs, digestKey, digestWeek, dryingCycle, spaceContext, type DigestData } from "@/calc/digest"
import type { Space } from "@/model/grow"
import type { Autonomy } from "@/calc/reservoir"
import { cn } from "@/lib/utils"
import { UpcomingCard } from "./calendar-parts"
import type { Lang } from "@/i18n/types"

export function useDigestData(): DigestData {
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

/** Keeps the week of digests written while Aujourd'hui is open (it was done by the summary card until lot 10k1). */
export function DigestKeeper() {
  const { settings } = useSettings()
  usePersistDigest(useDigestData(), settings.lang)
  return null
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

/**
 * One space: its square and title, À faire, then the view that fits its modules. Since lot 10k1 the morning summary is
 * gone from here too (it repeated the readings); the page itself is redone in lot 10l.
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
      <Label>
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
        <Label>
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
      <Label>
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
