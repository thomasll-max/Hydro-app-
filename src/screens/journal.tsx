import { useMemo, useState } from "react"
import { CalendarPlus, ChevronRight, FlaskConical, Layers, Pencil, Plus } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Chip, Dot, Label, Reveal, ScreenHero } from "@/components/hydro/primitives"
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

const PAGE = 12

export function JournalScreen() {
  const { t, num, dm } = useSettings()
  const { ready, cycle, plants, all, spaces, selection, photoUrl, space } = useGrow()
  const ed = useEditors()
  const [filter, setFilter] = useState<EntryFilter>(NO_FILTER)
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

  if (!ready) return <p className="py-10 text-center text-fg-3">{t("app.loading")}</p>

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
          <Card className="flex-row items-center gap-3 px-4 py-3.5">
            <p className="min-w-0 flex-1 text-[0.8125rem] leading-snug text-fg-2">{t("journal.noCycleHere")}</p>
            <Button variant="outline" className="h-11 shrink-0 rounded-full border-line-strong text-[0.8125rem] font-semibold" onClick={() => ed.openCycle({ cycleId: "new", spaceId: space?.id })}>
              <Plus /> {t("growSet.newCycle")}
            </Button>
          </Card>
        </Reveal>
      )}

      {/* Cycle */}
      {showCycle && cycle && s && (
      <Reveal i={0} className="mb-3">
        <Card className="gap-3">
          <div className="flex items-center justify-between">
            <Label emoji="sprout">{t("journal.cycle")}</Label>
            <Button variant="ghost" size="sm" className="h-11 rounded-full text-primary" onClick={() => ed.openCycle()}>
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
          <Label emoji="pottedPlant">{t("journal.plants")}</Label>
          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {potIds.map((id) => {
              const p = plants.find((x) => x.label === id)
              return (
                <button
                  key={id}
                  onClick={() => ed.openPlant(id)}
                  className="flex min-h-[64px] min-w-0 flex-col items-start rounded-md border border-line bg-surface-2 px-2.5 py-2 text-left"
                >
                  <span className="text-[0.875rem] font-bold">{id}</span>
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
          <Button className="col-span-full h-auto min-h-12 rounded-full text-[0.875rem] font-bold whitespace-normal" onClick={() => ed.openQuick()}>
            <Layers /> {t("quick.open")}
          </Button>
        )}
        <Button variant="outline" className="h-auto min-h-12 rounded-full border-line-strong bg-surface text-[0.84375rem] font-semibold whitespace-normal" onClick={() => ed.openEvent()}>
          <CalendarPlus /> {t("journal.addEvent")}
        </Button>
        <Button variant="outline" className="h-auto min-h-12 rounded-full border-line-strong bg-surface text-[0.84375rem] font-semibold whitespace-normal" onClick={() => ed.openMix()}>
          <FlaskConical /> {t("journal.addMix")}
        </Button>
      </Reveal>

      {/* History */}
      <Reveal i={3} className="mb-3">
        <Card className="px-0 pb-1.5">
          <div className="flex items-center justify-between px-3.5">
            <Label emoji="book">{t("journal.history")}</Label>
            <span className="text-[0.75rem] text-fg-3">{list.length === 1 ? t("journal.entryOne") : t("journal.entries", { n: list.length })}</span>
          </div>
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
          <ul className="mt-1">
            {list.slice(0, shown).map((e) => (
              <EntryRow key={e.id} e={e} space={multi ? spaceOf(e.spaceId) : undefined} onOpen={() => ed.openEntry({ date: e.date, plantId: e.plantId, spaceId: e.spaceId })} photoUrl={photoUrl} />
            ))}
          </ul>
          {list.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-3.5 py-6 text-center">
              <p className="text-[0.8125rem] text-fg-3">{filtered ? t("journal.historyEmpty") : t("journal.historyNone")}</p>
              {filtered && (
                <button className="h-11 rounded-full px-3 text-[0.8125rem] font-semibold text-primary" onClick={() => setFilter(NO_FILTER)}>
                  {t("journal.clearFilters")}
                </button>
              )}
            </div>
          )}
          {list.length > shown && (
            <button className="w-full p-2.5 text-[0.78125rem] font-semibold text-primary" onClick={() => setShown((n) => n + PAGE)}>
              {t("common.more")}
            </button>
          )}
        </Card>
      </Reveal>

      <Reveal i={4}>
        <Card className="px-3.5 py-1">
          <Accordion type="multiple">
            <AccordionItem value="events" className="border-line">
              <AccordionTrigger className="py-3.5 hover:no-underline">
                <Label emoji="scissors">{`${t("journal.events")} · ${events.length}`}</Label>
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
                <Label emoji="testTube">{`${t("journal.mixes")} · ${mixes.length}`}</Label>
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
                <Label emoji="jar">{t("journal.harvest")}</Label>
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
                <Button variant="outline" className="h-11 rounded-full border-line-strong" onClick={() => ed.openCycle({ harvestOnly: true })}>
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

function FilterRow({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div role="radiogroup" aria-label={label} className="no-scrollbar mt-2 flex items-center gap-1.5 overflow-x-auto px-3.5">
      <span aria-hidden="true" className="w-12 shrink-0 text-[0.75rem] font-semibold text-fg-3">
        {label}
      </span>
      {options.map((o) => (
        <button
          key={o.v}
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "h-11 shrink-0 rounded-full border px-3 text-[0.75rem] font-semibold whitespace-nowrap",
            value === o.v ? "border-primary/40 bg-primary/12 text-primary" : "border-line bg-surface-2 text-fg-2",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

function EntryRow({ e, space, onOpen, photoUrl }: { e: Entry; space?: { name: string; color: Parameters<typeof SpaceDot>[0]["color"] }; onOpen: () => void; photoUrl: (id: string) => Promise<string> }) {
  const { t, num, dm } = useSettings()
  const tg = e.targets
  const m = (k: "dryback" | "ecRunoff" | "phRunoff" | "vpd", label: string, d: number, unit = "") => {
    const v = e[k]
    if (v == null) return null
    const r = tg?.[k]
    return (
      <span className="flex items-center gap-1 text-[0.75rem] text-fg-2">
        {r && <Dot status={status(v, r, k)} />}
        {label} <b className="font-semibold text-fg tabular-nums">{`${num(v, d)}${unit}`}</b>
      </span>
    )
  }
  return (
    <li>
      <button onClick={onOpen} className="flex w-full flex-col gap-1.5 border-t border-line px-3.5 py-3 text-left">
        <div className="flex w-full items-center gap-2">
          <span className="text-[0.875rem] font-semibold tabular-nums">{dm(e.date)}</span>
          {e.time && <span className="text-[0.75rem] text-fg-3 tabular-nums">{e.time}</span>}
          {space && (
            <span className="flex items-center gap-1 text-[0.75rem] font-semibold text-fg-2">
              <SpaceDot color={space.color} /> {space.name}
            </span>
          )}
          {e.plantId && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.75rem] font-semibold text-fg-2">{e.plantId}</span>}
          {tg && <span className="text-[0.75rem] text-fg-3">{t(`stage.${tg.stage}`)}</span>}
          <ChevronRight className="ml-auto size-4 text-fg-3" />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {m("dryback", t("entry.dryback"), 0, " %")}
          {e.drybackSensor != null && (
            <span className="text-[0.75rem] text-fg-2">
              {t("entry.drybackSensor")} <b className="font-semibold text-fg tabular-nums">{`${num(e.drybackSensor, 0)} %`}</b>
            </span>
          )}
          {m("ecRunoff", t("today.ecRunoff"), 1)}
          {m("phRunoff", t("today.phRunoff"), 1)}
          {m("vpd", "VPD", 2)}
          {e.tempDay != null && (
            <span className="text-[0.75rem] text-fg-2">
              T/HR <b className="font-semibold text-fg tabular-nums">{`${num(e.tempDay)}°/${e.rh != null ? num(e.rh) : "—"}`}</b>
            </span>
          )}
          {e.heightCm != null && (
            <span className="text-[0.75rem] text-fg-2">
              {t("journal.height")} <b className="font-semibold text-fg tabular-nums">{num(e.heightCm)} cm</b>
            </span>
          )}
          {e.reservoirL != null && (
            <span className="text-[0.75rem] text-fg-2">
              {t("entry.reservoir")} <b className="font-semibold text-fg tabular-nums">{num(e.reservoirL)} L</b>
            </span>
          )}
          {e.sownCount != null && (
            <span className="text-[0.75rem] text-fg-2">
              {t("today.germination")} <b className="font-semibold text-fg tabular-nums">{`${e.germinatedCount ?? 0}/${e.sownCount}`}</b>
            </span>
          )}
        </div>
        {!!(e.observations?.length || e.actions?.length) && (
          <div className="flex flex-wrap gap-1">
            {e.observations?.map((o) => (
              <span key={o.tag} className={cn("rounded-full px-2 py-0.5 text-[0.75rem] font-semibold", o.severity >= 3 ? "bg-bad/12 text-bad" : o.severity === 2 ? "bg-warn/12 text-warn" : "bg-surface-2 text-fg-2")}>
                {t(`obs.${o.tag}`)}
                <span className="sr-only"> ({t("entry.severity", { n: o.severity })})</span>
              </span>
            ))}
            {e.actions?.map((a) => (
              <span key={a} className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.75rem] font-semibold text-primary">
                {t(`action.${a}`)}
              </span>
            ))}
          </div>
        )}
        {e.photos?.length ? (
          <div className="flex gap-1.5">
            {e.photos.slice(0, 4).map((id) => (
              <PhotoThumb key={id} id={id} url={photoUrl} size={48} />
            ))}
          </div>
        ) : null}
        {e.note && <p className="line-clamp-2 text-[0.78125rem] text-fg-3">{e.note}</p>}
      </button>
    </li>
  )
}

