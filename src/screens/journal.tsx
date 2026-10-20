import { useMemo, useState, type ReactNode } from "react"
import { Loading } from "@/components/hydro/wordmark"
import { Camera, ChevronDown, ChevronRight, Plus, Search, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Reveal, ScreenHero } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { todayIso } from "@/calc/stage"
import { status } from "@/calc/advice"
import { buildWeeks } from "@/calc/weeks"
import { filterEntries, journalOrder, liveFilter, NO_FILTER, type EntryFilter } from "@/model/entry"
import { PLANT_IDS, type Entry, type StageKey } from "@/model/types"
import { PhotoThumb } from "./entry-sheet"
import { WeekCard } from "./journal-weeks"
import { WeekPage } from "./journal-week"
import { ReviewPage } from "./cycle-review"
import { GalleryPage, StripPage } from "./gallery"
import { navigate, useRoute } from "@/app/nav"
import { SpaceDot } from "@/components/hydro/space-pill"
import { cn } from "@/lib/utils"
import { iconButton, tertiary } from "@/components/hydro/styles"
import { Sheet, TextField } from "@/components/hydro/form"
import { FilterRow } from "@/components/hydro/filter-row"

const WEEKS = 8

/**
 * Journal (lot 10k3, planche « Les menus »): the cycle to show (a space's tab), the search and the filters on one line,
 * then one card per week of the cycle (per week and per space in « Tous »), folded except the running one. Tanks and
 * events sit in the weeks, at their date (the drawers « Événements · Bidons · Récolte » are gone).
 */
export function JournalScreen() {
  const route = useRoute()
  const { ready } = useGrow()
  const { t } = useSettings()
  if (!ready) return <Loading label={t("app.loading")} />
  if (route.review) return <ReviewPage cycleId={route.review} vs={route.vs} />
  if (route.photos) return <GalleryPage cycleId={route.photos === "all" ? undefined : route.photos} />
  if (route.strip) return <StripPage cycleId={route.strip} plant={route.plant} />
  if (route.week) {
    const [spaceId, monday] = route.week.split("/")
    return <WeekPage spaceId={spaceId} monday={monday} day={route.day} />
  }
  return <JournalWeeks />
}

function JournalWeeks() {
  const { t, settings } = useSettings()
  const { ready, cycle: active, cycles, plants, all, spaces, selection, photoUrl, space } = useGrow()
  const ed = useEditors()
  const [filter, setFilter] = useState<EntryFilter>(NO_FILTER)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [plantsOpen, setPlantsOpen] = useState(false)
  const [shown, setShown] = useState(WEEKS)
  const [query, setQuery] = useState<string | null>(null)
  const [opened, setOpened] = useState<Record<string, boolean>>({})
  // The journal follows the space selector: one space, one room, or everything.
  const scope = useMemo(
    () => (selection.kind === "space" ? [selection.space] : selection.kind === "site" ? spaces.filter((x) => x.siteId === selection.site.id) : spaces),
    [selection, spaces],
  )
  const ids = useMemo(() => new Set(scope.map((x) => x.id)), [scope])
  const one = selection.kind === "space" ? selection.space : null
  // The cycles of the space, newest first; the active one by default.
  const spaceCycles = useMemo(
    () => (one ? cycles.filter((c) => c.spaceId === one.id || all.entries.some((e) => e.spaceId === one.id && e.cycleId === c.id)).sort((a, b) => (b.germinationDate ?? b.createdAt ?? "").localeCompare(a.germinationDate ?? a.createdAt ?? "")) : []),
    [one, cycles, all.entries],
  )
  const [cycleId, setCycleId] = useState<string | undefined>()
  const cycle = one ? (spaceCycles.find((c) => c.id === cycleId) ?? spaceCycles.find((c) => c.id === active?.id) ?? spaceCycles[0]) : undefined
  // Another space or room selected at the top: the filters, the search and the cycle start over (lot 10d).
  const scopeKey = scope.map((x) => x.id).join(",")
  const [filterScope, setFilterScope] = useState(scopeKey)
  if (filterScope !== scopeKey) {
    setFilterScope(scopeKey)
    setFilter(NO_FILTER)
    setShown(WEEKS)
    setQuery(null)
    setCycleId(undefined)
    setOpened({})
  }
  const multi = scope.length > 1
  // A space: the entries of the chosen cycle in it. « Tous » or a room: everything in scope.
  const entries = useMemo(() => all.entries.filter((e) => ids.has(e.spaceId) && (!cycle || e.cycleId === cycle.id)), [all.entries, ids, cycle])
  const events = useMemo(() => all.events.filter((e) => (e.spaceId ? ids.has(e.spaceId) : !!cycle && e.cycleId === cycle.id) && (!cycle || !e.cycleId || e.cycleId === cycle.id)), [all.events, ids, cycle])
  const mixes = useMemo(
    () => all.mixes.filter((m) => (m.spaceIds?.length ? m.spaceIds.some((x) => ids.has(x)) : !!cycle && m.cycleId === cycle.id) && (!cycle || !m.cycleId || m.cycleId === cycle.id)),
    [all.mixes, ids, cycle],
  )
  const spaceOf = (id?: string) => spaces.find((x) => x.id === id)
  const photoCount = useMemo(() => all.entries.reduce((n, e) => n + (e.photos?.length ?? 0), 0), [all.entries])

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

  // Weeks computed once per change of the journal (a year of entries stays fast, lot 10k3).
  const today = todayIso()
  const isDrying = (id?: string) => !!spaceOf(id ?? one?.id)?.modules.drying && !spaceOf(id ?? one?.id)?.modules.irrigation
  const weeks = useMemo(
    () =>
      buildWeeks({
        entries: list,
        mixes: filtered ? [] : mixes,
        events: filtered ? [] : events,
        cycles,
        today,
        perSpace: !one,
        ...(cycle ? { cycle } : {}),
        drying: isDrying,
      }).sort((x, y) => (x.monday === y.monday ? spaces.findIndex((sp) => sp.id === x.spaceId) - spaces.findIndex((sp) => sp.id === y.spaceId) : 0)),
    [list, mixes, events, cycles, today, one, cycle, filtered, spaces], // eslint-disable-line react-hooks/exhaustive-deps
  )
  // Search in the notes, the observations and the actions (in the language shown).
  const fold = (s: string) => s.toLocaleLowerCase(settings.lang).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  const q = query?.trim() ? fold(query.trim()) : ""
  const found = useMemo(
    () =>
      q
        ? list.filter((e) => fold([e.note ?? "", ...(e.observations ?? []).map((o) => t(`obs.${o.tag}` as never)), ...(e.actions ?? []).map((a) => t(`action.${a}` as never))].join(" ")).includes(q))
        : [],
    [q, list], // eslint-disable-line react-hooks/exhaustive-deps
  )

  if (!ready) return <Loading label={t("app.loading")} />

  // Open by default: the running week (each space's in « Tous »); when it has no entry yet, the one before too.
  const hasCurrent = weeks.some((w) => w.current)
  const isOpen = (key: string, current: boolean, i: number) =>
    opened[key] ?? (current || (!hasCurrent && i === 0) || (i === 1 && !!weeks[0]?.current && !weeks[0].entries.length && !weeks[0].spaceId))
  const potIds = PLANT_IDS.slice(0, Math.max(1, Math.min(PLANT_IDS.length, cycle?.potCount ?? 4)))

  return (
    <>
      <ScreenHero emoji="notebook" title={t("journal.title")} />
      {/* The photo gallery, at the top of the Journal (lot 12b). */}
      {photoCount > 0 && (
        <button type="button" className={cn(tertiary, "-mt-2 mb-3")} onClick={() => navigate({ tab: "journal", photos: "all" }, { push: true })} id="journal-photos">
          <Camera className="size-4" strokeWidth={1.8} /> {t("ph.openN", { n: photoCount })}
        </button>
      )}

      {one && !spaceCycles.length && (
        <Reveal i={0} className="mb-4">
          <div className="flex items-center gap-3 border-t border-line pt-4">
            <p className="min-w-0 flex-1 text-[0.8125rem] leading-snug text-fg-2">{t("journal.noCycleHere")}</p>
            <Button variant="outline" className="h-11 shrink-0 text-[0.8125rem] font-semibold" onClick={() => ed.openCycle({ cycleId: "new", spaceId: space?.id })}>
              <Plus /> {t("growSet.newCycle")}
            </Button>
          </div>
        </Reveal>
      )}

      {/* One line: the cycle (a space's tab), the search, the filters. */}
      <div className="mb-4 flex items-center gap-1 border-b border-line" id="journal-bar">
        <div role="group" aria-label={t("jw.cycles")} className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" id="journal-cycles">
          {spaceCycles.map((c) => {
            const on = c.id === cycle?.id
            return (
              <button key={c.id} type="button" aria-pressed={on} onClick={() => setCycleId(c.id)} className={cn("relative h-11 shrink-0 px-2 text-[0.875rem] whitespace-nowrap", on ? "font-semibold text-fg" : "text-fg-3")}>
                {c.name}
                {on && <span aria-hidden="true" className="absolute inset-x-1 -bottom-px h-0.5 rounded-[1px] bg-water" />}
              </button>
            )
          })}
        </div>
        <button type="button" id="journal-search-btn" aria-pressed={query != null} aria-label={query != null ? t("jw.closeSearch") : t("jw.search")} onClick={() => setQuery((x) => (x == null ? "" : null))} className={iconButton}>
          {query != null ? <X className="size-5" /> : <Search className="size-5" strokeWidth={1.7} />}
        </button>
        {canFilter && (
          <button type="button" id="journal-filters" aria-haspopup="dialog" aria-label={t("journal.filters")} onClick={() => setFiltersOpen(true)} className={cn(iconButton, "relative -mr-2")}>
            <SlidersHorizontal className="size-5" strokeWidth={1.7} />
            {filtered && <span aria-hidden="true" className="absolute top-2.5 right-2.5 size-2 rounded-full bg-water" />}
          </button>
        )}
      </div>

      {query != null && (
        <div className="-mt-2 mb-4">
          <TextField id="journal-search" label={t("jw.search")} value={query} onChange={setQuery} placeholder={t("jw.searchPh")} />
        </div>
      )}

      {filtered && (
        <div className="-mt-2 mb-4 flex flex-wrap items-center gap-x-3 gap-y-1" id="journal-filter-bar">
          <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium" id="journal-filter-summary">
            {summary}
          </span>
          <button type="button" className={tertiary} onClick={() => setFilter(NO_FILTER)}>
            {t("journal.clear")}
          </button>
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

      {q ? (
        <section id="journal-results" aria-live="polite">
          <p className="mb-1 text-[0.8125rem] text-fg-3">{found.length ? t("jw.results", { n: found.length }) : t("jw.noResult")}</p>
          <ul>
            {dayGroups(found.slice(0, 60)).map((g) => (
              <DayRow key={g.key} room={g.room} plants={g.plants} space={multi ? spaceOf(g.spaceId) : undefined} onOpen={(e) => ed.openEntry({ date: e.date, plantId: e.plantId, spaceId: e.spaceId })} photoUrl={photoUrl} />
            ))}
          </ul>
        </section>
      ) : (
        <div className="flex flex-col gap-3" id="journal-weeks">
          {weeks.slice(0, shown).map((w, i) => (
            <WeekCard
              key={w.key}
              w={w}
              open={isOpen(w.key, w.current, i)}
              onToggle={() => setOpened((o) => ({ ...o, [w.key]: !isOpen(w.key, w.current, i) }))}
              space={!one ? spaceOf(w.spaceId) : undefined}
              {...(one ? { spaceId: one.id } : {})}
              drying={isDrying(w.spaceId)}
            />
          ))}
          {weeks.length > shown && (
            <button type="button" className={cn("self-center", tertiary)} onClick={() => setShown((n) => n + WEEKS)} id="journal-older">
              {t("jw.older")} <ChevronDown className="size-4" />
            </button>
          )}
          {weeks.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <p className="text-[0.8125rem] text-fg-3">{filtered ? t("journal.historyEmpty") : t("journal.historyNone")}</p>
              {filtered && (
                <button className={tertiary} onClick={() => setFilter(NO_FILTER)}>
                  {t("journal.clearFilters")}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* The cycle itself: its sheet (dates, harvest) and its plants, in one quiet line at the bottom. */}
      {one && cycle && (
        <p className="mt-6 flex flex-wrap items-center gap-x-4 text-[0.8125rem] text-fg-3" id="journal-cycle">
          <span className="font-semibold text-fg-2">{cycle.name}</span>
          <button type="button" className={tertiary} onClick={() => ed.openCycle({ cycleId: cycle.id })}>
            {t("jw.editCycle")}
          </button>
          {(cycle.harvestDate || cycle.flipDate) && (
            <button type="button" className={tertiary} onClick={() => ed.openCycle({ cycleId: cycle.id, harvestOnly: true })}>
              {t("jw.harvest")}
            </button>
          )}
          {cycle.harvestDate && (
            <button type="button" className={tertiary} onClick={() => navigate({ tab: "journal", review: cycle.id }, { push: true })} id="journal-review">
              {t("rv.open")}
            </button>
          )}
          {one.modules.plants && (
            <button type="button" className={tertiary} onClick={() => setPlantsOpen(true)} id="journal-plants">
              {t("jw.plants")}
            </button>
          )}
        </p>
      )}
      {one && cycle && (
        <Sheet open={plantsOpen} onOpenChange={setPlantsOpen} title={t("journal.plants")} dirty={false}>
          <div className="grid grid-cols-4 gap-2 pb-2">
            {potIds.map((id) => {
              const p = plants.find((x) => x.label === id)
              return (
                <button
                  key={id}
                  onClick={() => {
                    setPlantsOpen(false)
                    ed.openPlant(id)
                  }}
                  className="flex min-h-[64px] min-w-0 flex-col items-start rounded-[10px] border border-line-strong px-2.5 py-2 text-left"
                >
                  <span className="font-num text-[0.875rem] font-semibold">{id}</span>
                  <span className={cn("w-full truncate text-[0.75rem]", p?.phenotype || p?.cultivar ? "text-fg-2" : "text-fg-3")}>{p?.phenotype || p?.cultivar || t("journal.plantEmpty")}</span>
                </button>
              )
            })}
          </div>
        </Sheet>
      )}
    </>
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
        <span className="font-num text-[0.8125rem] text-fg-3">{dm(e.date)}</span>
        <span className="truncate text-[0.9375rem]">
          {space && (
            <span className="mr-1.5 inline-flex items-baseline gap-1 font-semibold">
              <SpaceDot color={space.color} /> {space.name}
            </span>
          )}
          {e.time && <span className="mr-1.5 font-num text-[0.75rem] text-fg-3">{e.time}</span>}
          {bits.map((b, i) => (
            <span key={i} className="text-fg-2">
              {i > 0 && " · "}
              {b}
            </span>
          ))}
        </span>
        <span className={cn("font-num text-[0.8125rem] font-medium", tone(key?.s) ?? "text-fg")}>{key?.v ?? ""}</span>
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
                <span className="rounded-[6px] border border-line px-1.5 py-0.5 font-num text-[0.75rem] font-semibold text-fg-2">{p.plantId}</span>
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

