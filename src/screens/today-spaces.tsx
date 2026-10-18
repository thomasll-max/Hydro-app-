// Aujourd'hui by space (spec §3): "Bonjour" card, "All" view (one card per space, grouped by room),
// and the view of one space by type — culture, propagation, drying — with the reservoir autonomy.
import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Emoji } from "@/components/hydro/emoji"
import { Chip, Dot, Label, Reveal, ScreenHero } from "@/components/hydro/primitives"
import { SpaceDot } from "@/components/hydro/space-pill"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { stageLine } from "@/app/labels"
import { stageOn, todayIso, daysBetween } from "@/calc/stage"
import { buildDailyDigest, spaceContext, type Digest, type DigestData } from "@/calc/digest"
import { status } from "@/calc/advice"
import { groupBySite } from "@/model/grow-ops"
import type { Space } from "@/model/grow"
import type { Autonomy } from "@/calc/reservoir"
import { cn } from "@/lib/utils"
import { UpcomingCard } from "./calendar-parts"

function useDigestData(): DigestData {
  const { grow, spaces, sites, cycles, all, equipment, assignments, reminders, customProducts, concentrateStocks, sprays } = useGrow()
  return useMemo(
    () => ({ grow, spaces, sites, cycles, entries: all.entries, mixes: all.mixes, equipment, assignments, reminders, customProducts, concentrateStocks, sprays }),
    [grow, spaces, sites, cycles, all.entries, all.mixes, equipment, assignments, reminders, customProducts, concentrateStocks, sprays],
  )
}

/** Keeps digest/latest current for the morning task (Claude version only). */
function usePersistDigest(d: Digest) {
  const { storeKind, saveDigest } = useGrow()
  const last = useRef("")
  useEffect(() => {
    if (storeKind !== "artifact" || last.current === d.text) return
    last.current = d.text
    void saveDigest(d).catch(() => {
      last.current = ""
    })
  }, [d, storeKind, saveDigest])
}

export function BonjourCard({ only }: { only?: string }) {
  const { t, settings } = useSettings()
  const data = useDigestData()
  const digest = useMemo(() => buildDailyDigest(data, todayIso(), settings.lang), [data, settings.lang])
  usePersistDigest(digest)
  const [open, setOpen] = useState(false)
  const spaces = only ? digest.spaces.filter((s) => s.spaceId === only) : digest.spaces
  const shown = only || open ? spaces : spaces.slice(0, 2)
  if (!spaces.length) return null
  return (
    <Card className="relative gap-2 overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute -top-10 -right-8 size-36 rounded-full bg-[radial-gradient(closest-side,rgba(245,165,36,0.22),transparent)]" />
      <div className="relative flex items-center gap-2.5">
        <Emoji name="sun" size={34} className="float-y" />
        <b className="text-[16px] font-semibold tracking-[-0.2px]">{digest.title}</b>
      </div>
      <div className="relative flex flex-col gap-2.5">
        {shown.map((s) => (
          <div key={s.spaceId}>
            {!only && (
              <div className="mb-0.5 flex items-center gap-1.5 text-[12.5px] font-semibold">
                <SpaceDot color={data.spaces.find((x) => x.id === s.spaceId)?.color} /> {s.name}
              </div>
            )}
            <ul className="flex flex-col gap-0.5">
              {s.lines.map((l, i) => (
                <li key={i} className={cn("flex gap-2 text-[13px] leading-[1.4]", l.warn ? "text-warn" : "text-fg-2")}>
                  <span className={cn("mt-[7px] size-[5px] shrink-0 rounded-full", l.warn ? "bg-warn" : "bg-primary")} aria-hidden="true" />
                  {l.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {!only && spaces.length > 2 && (
        <button onClick={() => setOpen((x) => !x)} className="relative -mb-1 h-9 self-start text-[12.5px] font-semibold text-primary">
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
        <p className="mt-1 text-[13px] text-fg-2">{t("today.allSub", { n: shown.length })}</p>
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
          <p className="text-[13px] text-fg-2">{t("space.empty")}</p>
          <button onClick={() => ed.openCycle({ cycleId: "new" })} className="h-10 text-[13px] font-semibold text-primary">
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
  if (space.modules.irrigation && last?.ecRunoff != null) pills.push({ k: t("today.ecRunoff"), v: num(last.ecRunoff, 1), s: tg?.ecRunoff ? status(last.ecRunoff, tg.ecRunoff) : undefined })
  if (space.modules.climate && last?.tempDay != null) pills.push({ k: t("today.tempRh"), v: `${num(last.tempDay)}° / ${last.rh != null ? num(last.rh) : "—"}` })
  if (space.modules.climate && last?.vpd != null) pills.push({ k: t("today.vpd"), v: num(last.vpd, 2), s: tg?.vpd ? status(last.vpd, tg.vpd) : undefined })
  if (space.modules.propagation && last?.sownCount) pills.push({ k: t("today.germination"), v: `${last.germinatedCount ?? 0}/${last.sownCount}` })
  return (
    <button onClick={onOpen} className="block w-full text-left">
      <Card className="gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[16px] font-semibold">
              <SpaceDot color={space.color} className="size-2.5" /> {space.name}
            </div>
            <div className="mt-0.5 truncate text-[12.5px] text-fg-2">
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
                <div className="flex items-center gap-1.5 text-[10.5px] text-fg-3">
                  {p.s ? <Dot status={p.s} /> : <span className="inline-block size-[7px] rounded-full bg-track" aria-hidden="true" />} {p.k}
                </div>
                <div className="text-[15px] font-semibold tabular">{p.v}</div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 text-[11.5px] text-fg-3">
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
      <Emoji name="bucket" size={16} /> {t("today.resDays", { n: num(d) })}
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
        {a.source && <span className="text-[11px] text-fg-3">{t(a.source === "reading" ? "today.resReading" : "today.resEstimate")}</span>}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className={cn("text-[30px] leading-none font-semibold tabular", days != null && days <= 1 ? "text-warn" : "")}>{days != null ? t("today.resDays", { n: num(days) }) : "—"}</div>
          <div className="mt-1 text-[12px] text-fg-3">
            {a.left.ok ? (a.usableL ? t("today.resLeftOf", { left: num(a.left.value), usable: num(a.usableL) }) : t("today.resLeft", { left: num(a.left.value) })) : t("today.resMissing")}
            {a.perDay.ok && ` · ${t("today.resPerDay", { v: num(a.perDay.value, 1) })}`}
          </div>
        </div>
        {pct != null && (
          <div className="relative h-14 w-9 overflow-hidden rounded-md border border-line-strong bg-surface-2" aria-hidden="true">
            <div className="absolute inset-x-0 bottom-0 bg-info/60" style={{ height: `${pct}%` }} />
          </div>
        )}
      </div>
      {a.tooOld && <p className="rounded-md bg-warn/10 px-3 py-2 text-[12px] font-medium text-warn">{t("digest.tooOld", { days: num(a.mixAgeDays ?? 0) })}</p>}
      {!a.days.ok && <p className="text-[11.5px] text-fg-3">{t("today.resHow")}</p>}
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
      <div className="truncate text-[11px] text-fg-3">{k}</div>
      <div className="mt-0.5 truncate text-[17px] font-semibold tabular">{v}</div>
      {sub && <div className="truncate text-[10.5px] text-fg-3">{sub}</div>}
    </div>
  )
}
