import { useMemo, useState, type ReactNode } from "react"
import { Loading } from "@/components/hydro/wordmark"
import { CalendarPlus, ChevronRight, FlaskConical, Layers, Pencil, Plus, SlidersHorizontal } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Chip, Label, Reveal, ScreenHero } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { stageLine } from "@/app/labels"
import { stageOn, todayIso, plannedHarvest } from "@/calc/stage"
import { status } from "@/calc/advice"
import { round } from "@/calc/formulas"
import { filterEntries, journalOrder, liveFilter, NO_FILTER, type EntryFilter } from "@/model/entry"
import { PLANT_IDS, type Entry, type StageKey } from "@/model/types"
import { PhotoThumb } from "./entry-sheet"
import { SpaceDot } from "@/components/hydro/space-pill"
import { cn } from "@/lib/utils"
import { secondary, tertiary } from "@/components/hydro/styles"
import { Sheet } from "@/components/hydro/form"

const PAGE = 12

export function JournalScreen() {
  const { t, num, dm } = useSettings()
  const { ready, cycle, plants, all, spaces, selection, photoUrl, space } = useGrow()
  const ed = useEditors()
  const [filter, setFilter] = useState<EntryFilter>(NO_FILTER)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [shown, setShown] = useState(PAGE)
  // The journal follows the space selector: one space, one room, or everything.
  const scope = useMemo(
    () => (selection.kind === "space" ? [selection.space] : selection.kind === "site" ? spaces.filter((x) => x.siteId === selection.site.id) : spaces),
    [selection, spaces],
  )
  const ids = useMemo(() => new Set(scope.map((x) => x.id)), [scope])
  // Another space or room selected at the top: the filters start over (lot 10d).
  const scopeKey = scope.map((x) => x.id).join(",")
  const [filterScope, setFilterScope] = useState(scopeKey)
  if (filterScope !== scopeKey) {
    setFilterScope(scopeKey)
    setFilter(NO_FILTER)
    setShown(PAGE)
  }
  const multi = scope.length > 1
  const entries = useMemo(() => all.entries.filter((e) => ids.has(e.spaceId)), [all.entries, ids])
  const events = useMemo(() => all.events.filter((e) => (e.spaceId ? ids.has(e.spaceId) : !!cycle && e.cycleId === cycle.id)), [all.events, ids, cycle])
  const mixes = useMemo(() => all.mixes.filter((m) => m.spaceIds?.some((x) => ids.has(x)) || (!!cycle && m.cycleId === cycle.id)), [all.mixes, ids, cycle])
  const spaceOf = (id?: string) => spaces.find((x) => x.id === id)
  const showCycle = selection.kind === "space" && !!cycle

  const tagsPresent = useMemo(() => {
    const s = new Set<string>()
    entries.forEach((e) => {
      e.observations?.forEach((o) => s.add(`obs.${o.tag}`))
      e.actions?.forEach((a) => s.add(`action.${a}`))
    })
    return [...s]
  }, [entries])
  const stagesPresent = useMemo(() => [...new Set(entries.map((e) => e.targets?.stage).filter(Boolean))] as StageKey[], [entries])
  const hasPlants = entries.some((e) => e.plantId)
  const live = useMemo(
    () => liveFilter(filter, { spaces: scope.map((x) => x.id), tags: tagsPresent.map((k) => k.split(".")[1]), stages: stagesPresent, plants: hasPlants }),
    [filter, scope, tagsPresent, stagesPresent, hasPlants],
  )
  const list = useMemo(() => filterEntries(entries, live).sort(journalOrder), [entries, live])
  const filtered = live.space !== "all" || live.plant !== "all" || live.tag !== "all" || live.stage !== "all"
  const canFilter = multi || hasPlants || stagesPresent.length > 1 || tagsPresent.length > 0
  // The active filters in one line (lot 10j): « Floraison · Végé ».
  const tagKey = tagsPresent.find((k) => k.split(".")[1] === live.tag)
  const summary = [
    live.space !== "all" && scope.find((x) => x.id === live.space)?.name,
    live.plant !== "all" && (live.plant === "room" ? t("entry.wholeSpace") : live.plant),
    live.stage !== "all" && t(`stage.${live.stage}` as never),
    live.tag !== "all" && tagKey && t(tagKey as never),
  ]
    .filter(Boolean)
    .join(" · ")

  if (!ready) return <Loading label={t("app.loading")} />

  const s = cycle ? stageOn(cycle, todayIso()) : null
  const harvestPlanned = cycle ? plannedHarvest(cycle) : undefined
  const h = cycle?.harvest
  const gPerW = h?.dryG && h?.watts ? round(h.dryG / h.watts, 2) : undefined
  const eyebrow = selection.kind === "space" ? (cycle ? `${selection.space.name} · ${cycle.name} · ${cycle.cultivars.join(", ")}` : selection.space.name) : selection.kind === "site" ? selection.site.name : t("space.all")
  const potIds = PLANT_IDS.slice(0, Math.max(1, Math.min(PLANT_IDS.length, cycle?.potCount ?? 4)))

  return (
    <>
      <ScreenHero emoji="notebook" eyebrow={eyebrow} title={t("journal.title")}>
        <p className="mt-1 text-[0.8125rem] leading-snug text-fg-2">{t("journal.subtitle")}</p>
      </ScreenHero>

      {selection.kind === "space" && !cycle && (
        <Reveal i={0} className="mb-3">
          <Card className="flex-row items-center gap-3">
            <p className="min-w-0 flex-1 text-[0.8125rem] leading-snug text-fg-2">{t("journal.noCycleHere")}</p>
            <Button variant="outline" className="h-11 shrink-0 text-[0.8125rem] font-semibold" onClick={() => ed.openCycle({ cycleId: "new", spaceId: space?.id })}>
              <Plus /> {t("growSet.newCycle")}
            </Button>
          </Card>
        </Reveal>
      )}

      {/* Cycle */}
      {showCycle && cycle && s && (
      <Reveal i={0} className="mb-4">
        {/* The cycle is an object apart: it keeps a frame (lot 10j). */}
        <Card framed className="gap-3" id="journal-cycle">
          <div className="flex items-center justify-between">
            <Label emoji="sprout" mark>
              {t("journal.cycle")}
            </Label>
            <Button variant="link" size="sm" className="px-0" onClick={() => ed.openCycle()}>
              <Pencil /> {t("common.edit")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="primary">{stageLine(t, s)}</Chip>
            <Chip>{`${t(`mode.${cycle.waterMode}Short`)} · ${t(`substrate.${cycle.substrate}`)}`}</Chip>
            {cycle.potCount && cycle.potVolumeL ? <Chip>{`${cycle.potCount} × ${num(cycle.potVolumeL)} L`}</Chip> : null}
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[0.8125rem]">
            <Fact k={t("cycleForm.germination")} v={cycle.germinationDate && dm(cycle.germinationDate)} />
            <Fact k={t("cycleForm.transfer")} v={cycle.transferDate && dm(cycle.transferDate)} />
            <Fact k={t("cycleForm.flip")} v={cycle.flipDate ? dm(cycle.flipDate) : cycle.plannedFlipDate && `${t("cycleForm.plannedFlip")} ${dm(cycle.plannedFlipDate)}`} />
            <Fact k={t("cycleForm.harvestDate")} v={cycle.harvestDate ? dm(cycle.harvestDate) : harvestPlanned && `≈ ${dm(harvestPlanned)}`} />
            <Fact k={t("cycleForm.flow")} v={cycle.flowMlPerMin ? `${num(cycle.flowMlPerMin)} mL/min` : t("today.flowUnknown")} warn={!cycle.flowMlPerMin} />
            <Fact k={t("cycleForm.lights")} v={cycle.lights} />
          </dl>
        </Card>
      </Reveal>
      )}

      {/* Plants */}
      {showCycle && space?.modules.plants && (
      <Reveal i={1} className="mb-3">
        <Card>
          <Label emoji="pottedPlant" mark>
            {t("journal.plants")}
          </Label>
          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {potIds.map((id) => {
              const p = plants.find((x) => x.label === id)
              return (
                <button
                  key={id}
                  onClick={() => ed.openPlant(id)}
                  className="flex min-h-[64px] min-w-0 flex-col items-start rounded-[10px] border border-line-strong px-2.5 py-2 text-left"
                >
                  <span className="font-mono text-[0.875rem] font-semibold">{id}</span>
                  <span className={cn("w-full truncate text-[0.75rem]", p?.phenotype || p?.cultivar ? "text-fg-2" : "text-fg-3")}>
                    {p?.phenotype || p?.cultivar || t("journal.plantEmpty")}
                  </span>
                </button>
              )
            })}
          </div>
        </Card>
      </Reveal>
      )}

      <Reveal i={2} className="fold-2 mb-3 grid gap-2.5">
        {spaces.length > 1 && (
          <Button variant="outline" className="col-span-full h-auto min-h-12 text-[0.875rem] whitespace-normal" onClick={() => ed.openQuick()}>
            <Layers /> {t("quick.open")}
          </Button>
        )}
        <Button variant="outline" className="h-auto min-h-12 text-[0.84375rem] whitespace-normal" onClick={() => ed.openEvent()}>
          <CalendarPlus /> {t("journal.addEvent")}
        </Button>
        <Button variant="outline" className="h-auto min-h-12 text-[0.84375rem] whitespace-normal" onClick={() => ed.openMix()}>
          <FlaskConical /> {t("journal.addMix")}
        </Button>
      </Reveal>

      {/* History */}
      <Reveal i={3} className="mb-3">
        <Card>
          <div className="flex items-center justify-between">
            <Label emoji="book" mark>
              {t("journal.history")}
            </Label>
            <span className="font-mono text-[0.75rem] text-fg-3">{list.length === 1 ? t("journal.entryOne") : t("journal.entries", { n: list.length })}</span>
          </div>
          {/* Filters folded behind one button (lot 10j); the active ones in one line, with « Effacer ». */}
          {canFilter && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1" id="journal-filter-bar">
              <button type="button" id="journal-filters" aria-haspopup="dialog" onClick={() => setFiltersOpen(true)} className={cn(secondary, "px-3")}>
                <SlidersHorizontal className="size-4" /> {t("journal.filters")}
              </button>
              {filtered && (
                <>
                  <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium" id="journal-filter-summary">
                    {summary}
                  </span>
                  <button type="button" className={tertiary} onClick={() => setFilter(NO_FILTER)}>
                    {t("journal.clear")}
                  </button>
                </>
              )}
            </div>
          )}
          <Sheet
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            title={t("journal.filters")}
            dirty={false}
            footer={
              <div className="flex items-center gap-3">
                {filtered && (
                  <button type="button" className={tertiary} onClick={() => setFilter(NO_FILTER)}>
                    {t("journal.clear")}
                  </button>
                )}
                <Button className="h-12 flex-1" onClick={() => setFiltersOpen(false)}>
                  {t("journal.filtersShow", { n: list.length })}
                </Button>
              </div>
            }
          >
          {multi && (
            <FilterRow
              label={t("journal.filterSpace")}
              value={live.space ?? "all"}
              onChange={(v) => setFilter((f) => ({ ...f, space: v }))}
              options={[{ v: "all", l: t("common.all") }, ...scope.map((x) => ({ v: x.id, l: x.name }))]}
            />
          )}
          {hasPlants && (
            <FilterRow
              label={t("journal.filterPlant")}
              value={live.plant}
              onChange={(v) => setFilter((f) => ({ ...f, plant: v as EntryFilter["plant"] }))}
              options={[{ v: "all", l: t("common.all") }, { v: "room", l: t("entry.wholeSpace") }, ...PLANT_IDS.map((p) => ({ v: p, l: p }))]}
            />
          )}
          {stagesPresent.length > 1 && (
            <FilterRow
              label={t("journal.filterStage")}
              value={live.stage}
              onChange={(v) => setFilter((f) => ({ ...f, stage: v }))}
              options={[{ v: "all", l: t("common.all") }, ...stagesPresent.map((st) => ({ v: st, l: t(`stage.${st}`) }))]}
            />
          )}
          {tagsPresent.length > 0 && (
            <FilterRow
              label={t("journal.filterTag")}
              value={live.tag}
              onChange={(v) => setFilter((f) => ({ ...f, tag: v }))}
              options={[{ v: "all", l: t("common.all") }, ...tagsPresent.map((k) => ({ v: k.split(".")[1], l: t(k as never) }))]}
            />
          )}
          </Sheet>
          <ul className="mt-1">
            {dayGroups(list.slice(0, shown)).map((g) => (
              <DayRow
                key={g.key}
                room={g.room}
                plants={g.plants}
                space={multi ? spaceOf(g.spaceId) : undefined}
                onOpen={(e) => ed.openEntry({ date: e.date, plantId: e.plantId, spaceId: e.spaceId })}
                photoUrl={photoUrl}
              />
            ))}
          </ul>
          {list.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <p className="text-[0.8125rem] text-fg-3">{filtered ? t("journal.historyEmpty") : t("journal.historyNone")}</p>
              {filtered && (
                <button className={tertiary} onClick={() => setFilter(NO_FILTER)}>
                  {t("journal.clearFilters")}
                </button>
              )}
            </div>
          )}
          {list.length > shown && (
            <button className={cn("self-center", tertiary)} onClick={() => setShown((n) => n + PAGE)}>
              {t("common.more")}
            </button>
          )}
        </Card>
      </Reveal>

      <Reveal i={4}>
        <Card>
          <Accordion type="multiple">
            <AccordionItem value="events" className="border-line">
              <AccordionTrigger className="py-3.5 hover:no-underline">
                <Label emoji="calendar" mark>{`${t("journal.events")} · ${events.length}`}</Label>
              </AccordionTrigger>
              <AccordionContent>
                {events.length === 0 ? (
                  <p className="text-[0.8125rem] text-fg-3">{t("journal.eventsEmpty")}</p>
                ) : (
                  <ul>
                    {events.map((ev) => (
                      <li key={ev.id}>
                        <button onClick={() => ed.openEvent(ev)} className="flex w-full items-center gap-3 border-t border-line py-2.5 text-left first:border-t-0">
                          <span className="w-12 text-[0.78125rem] text-fg-3 tabular">{dm(ev.date)}</span>
                          {multi && <SpaceDot color={spaceOf(ev.spaceId)?.color} />}
                          <span className="flex-1 text-[0.84375rem] font-medium">{t(`event.${ev.type}`)}</span>
                          {ev.note && <span className="max-w-[40%] truncate text-[0.75rem] text-fg-3">{ev.note}</span>}
                          <ChevronRight className="size-4 text-fg-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="mixes" className="border-line">
              <AccordionTrigger className="py-3.5 hover:no-underline">
                <Label emoji="testTube" mark>{`${t("journal.mixes")} · ${mixes.length}`}</Label>
              </AccordionTrigger>
              <AccordionContent>
                {mixes.length === 0 ? (
                  <p className="text-[0.8125rem] text-fg-3">{t("journal.mixesEmpty")}</p>
                ) : (
                  <ul>
                    {mixes.map((m) => (
                      <li key={m.id}>
                        <button onClick={() => ed.openMix(m)} className="flex w-full items-center gap-3 border-t border-line py-2.5 text-left first:border-t-0">
                          <span className="w-12 text-[0.78125rem] text-fg-3 tabular">{dm(m.date)}</span>
                          <span className="flex-1 text-[0.84375rem] font-medium tabular-nums">{num(m.volumeL)} L</span>
                          <span className="text-[0.75rem] text-fg-2 tabular-nums">
                            {m.ec != null ? `EC ${num(m.ec, 1)}` : m.ecExpected != null ? `EC ≈ ${num(m.ecExpected, 1)}` : ""} {m.ph != null && `· pH ${num(m.ph, 1)}`}
                          </span>
                          <ChevronRight className="size-4 text-fg-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </AccordionContent>
            </AccordionItem>
            {cycle && (
            <AccordionItem value="harvest" className="border-0">
              <AccordionTrigger className="py-3.5 hover:no-underline">
                <Label emoji="jar" mark>
                  {t("journal.harvest")}
                </Label>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-2">
                {h && (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[0.8125rem]">
                    <Fact k={t("cycleForm.wet")} v={h.wetG != null ? `${num(h.wetG)} g` : undefined} />
                    <Fact k={t("cycleForm.dry")} v={h.dryG != null ? `${num(h.dryG)} g` : undefined} />
                    <Fact k="g/W" v={gPerW != null ? num(gPerW, 2) : undefined} />
                    <Fact k={t("cycleForm.jarRh")} v={h.jarRh != null ? `${num(h.jarRh)} %` : undefined} />
                  </dl>
                )}
                <Button variant="outline" className="h-11" onClick={() => ed.openCycle({ harvestOnly: true })}>
                  {t("journal.editHarvest")}
                </Button>
              </AccordionContent>
            </AccordionItem>
            )}
          </Accordion>
        </Card>
      </Reveal>
    </>
  )
}

function Fact({ k, v, warn }: { k: string; v?: string | false; warn?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[0.75rem] text-fg-3">{k}</dt>
      <dd className={cn("truncate font-medium tabular-nums", warn && "text-warn", !v && "text-fg-3")}>{v || "—"}</dd>
    </div>
  )
}

/** One filter of the Journal, in its sheet (lot 10j): the name above, the choices wrapping. */
function FilterRow({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div role="radiogroup" aria-label={label} className="mt-1 mb-4 flex flex-wrap items-center gap-2">
      <span aria-hidden="true" className="w-full text-[0.8125rem] font-semibold text-fg-2">
        {label}
      </span>
      {options.map((o) => (
        <button
          key={o.v}
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            // The pill shape is kept for the Journal filters only (lot 10h); the active one is filled.
            "hit h-9 shrink-0 rounded-full border px-3 text-[0.75rem] font-semibold whitespace-nowrap",
            value === o.v ? "border-fg bg-fg text-background" : "border-line-strong text-fg-2",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

/** One day of one space: its entry, then the plants' entries of that day under it (lot 10d / 10h). */
type DayGroup = { key: string; spaceId: string; room?: Entry; plants: Entry[] }
export function dayGroups(list: Entry[]): DayGroup[] {
  const out: DayGroup[] = []
  const at = new Map<string, DayGroup>()
  for (const e of list) {
    const key = `${e.date}_${e.spaceId}`
    let g = at.get(key)
    if (!g) {
      g = { key, spaceId: e.spaceId, plants: [] }
      at.set(key, g)
      out.push(g)
    }
    if (e.plantId) g.plants.push(e)
    else g.room = e
  }
  return out
}

/**
 * One line per day (lot 10h): the date in mono on the left, a summary in the middle, the key value in mono on the right
 * (dryback, else EC runoff, else temperature…). Observations, actions, note and photos under it, then the heights per plant.
 */
function DayRow({ room, plants, space, onOpen, photoUrl }: { room?: Entry; plants: Entry[]; space?: { name: string; color: Parameters<typeof SpaceDot>[0]["color"] }; onOpen: (e: Entry) => void; photoUrl: (id: string) => Promise<string> }) {
  const { t, num, dm } = useSettings()
  const e = room ?? plants[0]
  const tg = e.targets
  const st = (k: "dryback" | "ecRunoff" | "phRunoff" | "vpd") => (e[k] != null && tg?.[k] ? status(e[k]!, tg[k]!, k) : undefined)
  const tone = (s?: string) => (s === "bad" ? "text-bad" : s === "warn" ? "text-warn" : undefined)
  // The key value, on the right.
  const key: { v: string; s?: string } | null = !room
    ? null
    : e.dryback != null
      ? { v: `${num(e.dryback, 0)} %`, s: st("dryback") }
      : e.ecRunoff != null
        ? { v: `EC ${num(e.ecRunoff, 1)}`, s: st("ecRunoff") }
        : e.tempDay != null
          ? { v: `${num(e.tempDay)}°` }
          : e.reservoirL != null
            ? { v: `${num(e.reservoirL)} L` }
            : null
  const bits: ReactNode[] = []
  const bit = (k: string, label: string, v: string, s?: string) => bits.push(<span key={k} className={tone(s)}>{`${label} ${v}`}</span>)
  if (room) {
    if (tg) bits.push(<span key="st">{t(`stage.${tg.stage}`)}</span>)
    if (key?.v.startsWith("EC") === false && e.ecRunoff != null) bit("ec", t("today.ecRunoff"), num(e.ecRunoff, 1), st("ecRunoff"))
    if (e.phRunoff != null) bit("ph", t("today.phRunoff"), num(e.phRunoff, 1), st("phRunoff"))
    if (e.drybackSensor != null) bit("ds", t("entry.drybackSensor"), `${num(e.drybackSensor, 0)} %`)
    if (e.vpd != null) bit("vpd", "VPD", num(e.vpd, 2), st("vpd"))
    if ((e.tempDay != null && !key?.v.endsWith("°")) || (e.tempDay == null && e.rh != null)) bit("t", "T/HR", `${e.tempDay != null ? `${num(e.tempDay)}°` : "—"}/${e.rh != null ? num(e.rh) : "—"}`)
    if (e.reservoirL != null && !key?.v.endsWith(" L")) bit("res", t("entry.reservoir"), `${num(e.reservoirL)} L`)
    if (e.heightCm != null) bit("h", t("journal.height"), `${num(e.heightCm)} cm`)
    if (e.sownCount != null) bit("g", t("today.germination"), `${e.germinatedCount ?? 0}/${e.sownCount}`)
  } else bits.push(<span key="pl">{t("journal.plants")}</span>)
  const tags = room ? [...(room.observations ?? []).map((o) => ({ k: o.tag, l: t(`obs.${o.tag}`), s: o.severity })), ...(room.actions ?? []).map((a) => ({ k: a, l: t(`action.${a}`), s: 0 }))] : []
  return (
    <li className="border-t border-line first:border-t-0">
      <button onClick={() => onOpen(e)} className="grid w-full grid-cols-[3.375rem_minmax(0,1fr)_auto] items-baseline gap-x-2 py-2.5 text-left">
        <span className="font-mono text-[0.8125rem] text-fg-3">{dm(e.date)}</span>
        <span className="truncate text-[0.9375rem]">
          {space && (
            <span className="mr-1.5 inline-flex items-baseline gap-1 font-semibold">
              <SpaceDot color={space.color} /> {space.name}
            </span>
          )}
          {e.time && <span className="mr-1.5 font-mono text-[0.75rem] text-fg-3">{e.time}</span>}
          {bits.map((b, i) => (
            <span key={i} className="text-fg-2">
              {i > 0 && " · "}
              {b}
            </span>
          ))}
        </span>
        <span className={cn("font-mono text-[0.8125rem] font-medium", tone(key?.s) ?? "text-fg")}>{key?.v ?? ""}</span>
        {(tags.length > 0 || room?.note || room?.photos?.length) && (
          <span className="col-start-2 col-end-4 mt-1 flex min-w-0 flex-col gap-1">
            {tags.length > 0 && (
              <span className="truncate text-[0.75rem] text-fg-3">
                {tags.map((x, i) => (
                  <span key={x.k}>
                    {i > 0 && " · "}
                    <span className={x.s >= 3 ? "font-semibold text-bad" : x.s === 2 ? "font-semibold text-warn" : undefined}>{x.l}</span>
                    {x.s > 0 && <span className="sr-only"> ({t("entry.severity", { n: x.s })})</span>}
                  </span>
                ))}
              </span>
            )}
            {room?.note && <span className="line-clamp-2 text-[0.78125rem] text-fg-3">{room.note}</span>}
            {room?.photos?.length ? (
              <span className="flex gap-1.5">
                {room.photos.slice(0, 4).map((id) => (
                  <PhotoThumb key={id} id={id} url={photoUrl} size={44} />
                ))}
              </span>
            ) : null}
          </span>
        )}
      </button>
      {/* The plants of that day, grouped under it. */}
      {plants.length > 0 && (
        <ul className="-mt-1 pb-2 pl-[3.875rem]">
          {plants.map((p) => (
            <li key={p.id}>
              <button onClick={() => onOpen(p)} className="flex min-h-11 w-full items-center gap-2 text-left text-[0.8125rem] text-fg-2">
                <span className="rounded-[6px] border border-line px-1.5 py-0.5 font-mono text-[0.75rem] font-semibold text-fg-2">{p.plantId}</span>
                <span className="min-w-0 flex-1 truncate">
                  {p.heightCm != null ? `${t("journal.height")} ${num(p.heightCm)} cm` : (p.note ?? t("journal.plantEntry"))}
                </span>
                <ChevronRight className="size-4 shrink-0 text-fg-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

