// Galerie photo et frise (lot 12b). The gallery: every photo of the journal, grouped by week of the cycle, with the date
// in mono, filtered by space, cycle, plant or tag; a photo opens full screen (swipe left and right) with the day's entry
// under it, its tags and « Photo de la semaine ». The strip: one photo per week of a cycle or a plant, one after the
// other with a slider (Thomas's « time-lapse », no video to make). Thumbnails are made once and kept (lib/thumbs).
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, SlidersHorizontal, Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet } from "@/components/hydro/form"
import { NumText } from "@/components/hydro/value"
import { MissingPhoto } from "@/components/hydro/missing-photo"
import { iconButton, secondary, tertiary } from "@/components/hydro/styles"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { addLayer, goBack, navigate } from "@/app/nav"
import { filterPhotos, galleryPhotos, groupByWeek, tagKeys, weekPhotoKey, weekStrip, type GalleryFilter, type GalleryPhoto, type TagKey } from "@/calc/gallery"
import { mondayOf } from "@/calc/weeks"
import { thumb, type Thumb } from "@/lib/thumbs"
import { PLANT_IDS, type PlantId } from "@/model/types"
import type { MessageKey } from "@/i18n/types"
import { cn } from "@/lib/utils"
import { FilterRow } from "@/components/hydro/filter-row"
import { TagsEditor } from "./photo-tags"
import { useKeyValues, useWeekTitle } from "./journal-weeks"

const GROUPS = 8

/** The thumbnail of a photo, asked for when its tile comes near the screen. */
function useThumb(id: string, el: React.RefObject<HTMLElement | null>): Thumb | null {
  const { photoUrl } = useGrow()
  const [t, setT] = useState<Thumb | null>(null)
  useEffect(() => {
    let live = true
    const go = () => thumb(id, photoUrl).then((x) => live && setT(x))
    const node = el.current
    if (!node || typeof IntersectionObserver === "undefined") {
      go()
      return () => {
        live = false
      }
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          io.disconnect()
          go()
        }
      },
      { rootMargin: "300px" },
    )
    io.observe(node)
    return () => {
      live = false
      io.disconnect()
    }
  }, [id, photoUrl, el])
  return t
}

function PhotoTile({ p, onOpen, chosen }: { p: GalleryPhoto; onOpen: () => void; chosen?: boolean }) {
  const { t, dm } = useSettings()
  const ref = useRef<HTMLButtonElement>(null)
  const th = useThumb(p.id, ref)
  const tagged = tagKeys(p.tags).length > 0
  return (
    <button ref={ref} type="button" onClick={onOpen} className="relative aspect-square min-w-0 overflow-hidden rounded-[10px] border border-line bg-surface-2" data-photo={p.id} aria-label={`${t("ph.title")} ${dm(p.date)}${p.plantId ? ` · ${p.plantId}` : ""}`}>
      {th && "url" in th && <img src={th.url} alt="" className="size-full object-cover" draggable={false} />}
      {th && "missing" in th && <MissingPhoto small />}
      <span className="absolute bottom-1 left-1 rounded-[5px] bg-black/55 px-1 py-px font-num text-[0.6875rem] leading-tight text-white">
        {dm(p.date)}
        {p.plantId ? ` · ${p.plantId}` : ""}
      </span>
      {chosen && (
        <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/55 text-white" data-chosen>
          <Star className="size-3 fill-current" />
        </span>
      )}
      {tagged && !chosen && <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-2 rounded-full bg-water ring-2 ring-black/30" />}
    </button>
  )
}

function Head({ title, sub, back, right }: { title: string; sub?: string; back: () => void; right?: ReactNode }) {
  const { t } = useSettings()
  return (
    <>
      <div className="-mt-1 flex items-center gap-2">
        <button type="button" onClick={back} className="-ml-1 flex h-11 items-center gap-1 rounded-[10px] pr-3 text-[0.9375rem] font-semibold text-fg" id="photos-back">
          <ChevronLeft className="size-5" /> {t("ph.back")}
        </button>
        {right && <span className="ml-auto flex items-center gap-1">{right}</span>}
      </div>
      <div>
        <h1 className="display text-[1.75rem] leading-tight [overflow-wrap:anywhere]">{title}</h1>
        {sub && (
          <p className="mt-1 text-[0.8125rem] text-fg-3" id="photos-sub">
            <NumText quiet>{sub}</NumText>
          </p>
        )}
      </div>
    </>
  )
}

/** Tag of a filter or a chip, in the app's language. */
function useTagLabel() {
  const { t } = useSettings()
  return (k: TagKey) => (k.startsWith("obs:") ? t(`obs.${k.slice(4)}` as MessageKey) : k.slice(5))
}

export function GalleryPage({ cycleId }: { cycleId?: string }) {
  const { t, dm } = useSettings()
  const { all, cycles, spaces } = useGrow()
  const weekTitle = useWeekTitle()
  const tagLabel = useTagLabel()
  const photos = useMemo(() => galleryPhotos(all.entries), [all.entries])
  const [f, setF] = useState<GalleryFilter>(cycleId ? { cycleId } : {})
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(GROUPS)
  const [at, setAt] = useState<number | null>(null)
  const list = useMemo(() => filterPhotos(photos, f), [photos, f])
  const weeks = useMemo(() => groupByWeek(list, cycles), [list, cycles])
  const flat = useMemo(() => weeks.flatMap((w) => w.photos), [weeks])
  const chosen = useMemo(() => new Set(cycles.flatMap((c) => Object.values(c.weekPhotos ?? {}))), [cycles])
  // The choices offered: only what the photos have.
  const spaceIds = [...new Set(photos.map((p) => p.spaceId))]
  const cycleIds = [...new Set(photos.map((p) => p.cycleId).filter(Boolean))] as string[]
  const plants = [...new Set(photos.map((p) => p.plantId).filter(Boolean))].sort() as PlantId[]
  const tags = [...new Set(photos.flatMap((p) => tagKeys(p.tags)))].sort((a, b) => tagLabel(a).localeCompare(tagLabel(b)))
  const filtered = !!(f.spaceId || f.cycleId || f.plantId || f.tag)
  const summary = [
    f.spaceId && spaces.find((s) => s.id === f.spaceId)?.name,
    f.cycleId && cycles.find((c) => c.id === f.cycleId)?.name,
    f.plantId && (f.plantId === "room" ? t("ph.room") : f.plantId),
    f.tag && tagLabel(f.tag),
  ]
    .filter(Boolean)
    .join(" · ")
  const cycleOf = (id?: string) => cycles.find((c) => c.id === id)

  return (
    <div className="flex flex-col gap-5" id="gallery-page">
      <Head
        title={t("ph.title")}
        sub={t("ph.count", { n: list.length })}
        back={goBack}
        right={
          <>
            {f.cycleId && (
              <button type="button" className={secondary} onClick={() => navigate({ tab: "journal", strip: f.cycleId!, ...(f.plantId && f.plantId !== "room" ? { plant: f.plantId } : {}) }, { push: true })} id="photos-strip">
                {t("ph.strip")}
              </button>
            )}
            {photos.length > 0 && (
              <button type="button" className={cn(iconButton, "relative")} onClick={() => setOpen(true)} aria-label={t("ph.filters")} aria-haspopup="dialog" id="photos-filters">
                <SlidersHorizontal className="size-5" strokeWidth={1.7} />
                {filtered && <span aria-hidden="true" className="absolute top-2.5 right-2.5 size-2 rounded-full bg-water" />}
              </button>
            )}
          </>
        }
      />
      {filtered && (
        <div className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1" id="photos-filter-bar">
          <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium">{summary}</span>
          <button type="button" className={tertiary} onClick={() => setF({})}>
            {t("ph.clear")}
          </button>
        </div>
      )}
      {photos.length === 0 ? (
        <p className="text-[0.875rem] text-fg-3" id="photos-none">
          {t("ph.none")}
        </p>
      ) : list.length === 0 ? (
        <p className="text-[0.875rem] text-fg-3">{t("ph.noneFilter")}</p>
      ) : (
        <div className="flex flex-col gap-5" id="photos-weeks">
          {weeks.slice(0, shown).map((w) => {
            const c = cycleOf(w.cycleId)
            return (
              <section key={w.key} className="flex flex-col gap-2" data-week={w.monday}>
                <h2 className="flex items-baseline gap-2 text-[0.9375rem] font-semibold">
                  <span>{w.label ? weekTitle(w.label, w.monday) : t("ph.week", { date: dm(w.monday) })}</span>
                  <span className="min-w-0 truncate text-[0.75rem] font-normal text-fg-3">
                    <NumText quiet>{[c?.name, t("ph.count", { n: w.photos.length })].filter(Boolean).join(" · ")}</NumText>
                  </span>
                </h2>
                <div className="grid grid-cols-3 gap-1.5">
                  {w.photos.map((p) => (
                    <PhotoTile key={`${p.entryId}|${p.id}`} p={p} chosen={chosen.has(p.id)} onOpen={() => setAt(flat.indexOf(p))} />
                  ))}
                </div>
              </section>
            )
          })}
          {weeks.length > shown && (
            <button type="button" className={cn("self-center", tertiary)} onClick={() => setShown((n) => n + GROUPS)} id="photos-older">
              {t("ph.older")}
            </button>
          )}
        </div>
      )}

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={t("ph.filters")}
        dirty={false}
        footer={
          <div className="flex items-center gap-3">
            {filtered && (
              <button type="button" className={tertiary} onClick={() => setF({})}>
                {t("ph.clear")}
              </button>
            )}
            <Button className="h-12 flex-1" onClick={() => setOpen(false)}>
              {t("ph.show", { n: list.length })}
            </Button>
          </div>
        }
      >
        {spaceIds.length > 1 && (
          <FilterRow label={t("ph.filterSpace")} value={f.spaceId ?? "all"} onChange={(v) => setF((x) => ({ ...x, spaceId: v === "all" ? undefined : v }))} options={[{ v: "all", l: t("ph.all") }, ...spaceIds.map((id) => ({ v: id, l: spaces.find((s) => s.id === id)?.name ?? id }))]} />
        )}
        {cycleIds.length > 0 && (
          <FilterRow label={t("ph.filterCycle")} value={f.cycleId ?? "all"} onChange={(v) => setF((x) => ({ ...x, cycleId: v === "all" ? undefined : v }))} options={[{ v: "all", l: t("ph.all") }, ...cycleIds.map((id) => ({ v: id, l: cycleOf(id)?.name ?? id }))]} />
        )}
        {plants.length > 0 && (
          <FilterRow
            label={t("ph.filterPlant")}
            value={f.plantId ?? "all"}
            onChange={(v) => setF((x) => ({ ...x, plantId: v === "all" ? undefined : (v as PlantId | "room") }))}
            options={[{ v: "all", l: t("ph.all") }, { v: "room", l: t("ph.room") }, ...plants.map((p) => ({ v: p, l: p }))]}
          />
        )}
        {tags.length > 0 && <FilterRow label={t("ph.filterTag")} value={f.tag ?? "all"} onChange={(v) => setF((x) => ({ ...x, tag: v === "all" ? undefined : (v as TagKey) }))} options={[{ v: "all", l: t("ph.all") }, ...tags.map((k) => ({ v: k, l: tagLabel(k) }))]} />}
      </Sheet>

      {at != null && flat[at] && <PhotoViewer list={flat} index={at} onIndex={setAt} onClose={() => setAt(null)} />}
    </div>
  )
}

/** Full screen: the photo, swipe or the arrows to go on, the day's entry under it, the tags, « Photo de la semaine ». */
export function PhotoViewer({ list, index, onIndex, onClose }: { list: GalleryPhoto[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const { t, dmy } = useSettings()
  const { all, cycles, spaces, photoUrl, saveEntry, saveCycle } = useGrow()
  const ed = useEditors()
  const keyValues = useKeyValues()
  const p = list[index]
  const entry = all.entries.find((e) => e.id === p.entryId)
  const cycle = cycles.find((c) => c.id === p.cycleId)
  const space = spaces.find((s) => s.id === p.spaceId)
  const [src, setSrc] = useState<string | null>(null)
  const [broken, setBroken] = useState(false)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  // The phone's back gesture closes the viewer first.
  useEffect(() => addLayer({ onBack: () => (closeRef.current(), true) }), [])
  useEffect(() => {
    let live = true
    setSrc(null)
    setBroken(false)
    photoUrl(p.id).then((u) => {
      if (!live) return
      if (u) setSrc(u)
      else setBroken(true)
    })
    return () => {
      live = false
    }
  }, [p.id, photoUrl])
  const go = (d: number) => {
    const i = index + d
    if (i >= 0 && i < list.length) onIndex(i)
  }
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1)
      else if (e.key === "ArrowRight") go(1)
      else if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  })
  // Swipe: a horizontal move of more than 50 px.
  const start = useRef<{ x: number; y: number } | null>(null)
  const onDown = (e: React.PointerEvent) => (start.current = { x: e.clientX, y: e.clientY })
  const onUp = (e: React.PointerEvent) => {
    const s = start.current
    start.current = null
    if (!s) return
    const dx = e.clientX - s.x
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) go(dx < 0 ? 1 : -1)
  }

  const monday = mondayOf(p.date)
  const keys = cycle ? [weekPhotoKey("all", monday), ...(p.plantId ? [weekPhotoKey(p.plantId, monday)] : [])] : []
  const isWeek = !!cycle && keys.some((k) => cycle.weekPhotos?.[k] === p.id)
  const toggleWeek = async () => {
    if (!cycle) return
    const wp = { ...(cycle.weekPhotos ?? {}) }
    for (const k of keys) {
      if (isWeek) {
        if (wp[k] === p.id) delete wp[k]
      } else wp[k] = p.id
    }
    await saveCycle({ ...cycle, weekPhotos: Object.keys(wp).length ? wp : undefined })
  }
  const values = entry ? keyValues(entry, !!space?.modules.drying && !space.modules.irrigation) : ""

  return (
    <div role="dialog" aria-modal="true" aria-label={t("ph.title")} className="fixed inset-0 z-50 flex flex-col bg-black text-white" id="photo-viewer">
      <div className="flex items-center gap-2 px-2 pt-[max(env(safe-area-inset-top),0.5rem)] pb-1">
        <button type="button" onClick={onClose} aria-label={t("ph.close")} className="flex size-11 items-center justify-center rounded-[10px] hover:bg-white/10" id="viewer-close">
          <X className="size-6" />
        </button>
        <span className="min-w-0 flex-1 truncate text-[0.875rem]">
          <span className="font-num font-semibold">{dmy(p.date)}</span>
          {p.time ? <span className="font-num text-white/70"> {p.time}</span> : null}
          <span className="text-white/70"> · {[space?.name, p.plantId].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="pr-2 font-num text-[0.8125rem] text-white/70" id="viewer-count">
          {t("ph.of", { i: index + 1, n: list.length })}
        </span>
      </div>
      <div className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center select-none" onPointerDown={onDown} onPointerUp={onUp} id="viewer-stage">
        {broken ? (
          <div className="w-60 overflow-hidden rounded-[12px]">
            <MissingPhoto />
            <p className="bg-surface-2 px-3 pb-3 text-center text-[0.75rem] text-fg-2">{t("ph.missingD")}</p>
          </div>
        ) : (
          src && <img src={src} alt="" className="max-h-full max-w-full object-contain" draggable={false} onError={() => setBroken(true)} id="viewer-img" />
        )}
        {index > 0 && (
          <button type="button" onClick={() => go(-1)} aria-label={t("ph.prev")} className="absolute top-1/2 left-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40" id="viewer-prev">
            <ChevronLeft className="size-6" />
          </button>
        )}
        {index < list.length - 1 && (
          <button type="button" onClick={() => go(1)} aria-label={t("ph.next")} className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40" id="viewer-next">
            <ChevronRight className="size-6" />
          </button>
        )}
      </div>
      <div className="max-h-[46%] overflow-y-auto rounded-t-[18px] bg-background px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] text-fg" id="viewer-panel">
        <p className="font-num text-[0.875rem] font-semibold" id="viewer-values">
          {values || <span className="font-sans font-normal text-fg-3">{t("ph.noValues")}</span>}
        </p>
        {entry?.note && <p className="mt-1 line-clamp-3 text-[0.8125rem] leading-snug text-fg-2">{entry.note}</p>}
        {entry && <TagsEditor entry={entry} photoId={p.id} onSave={saveEntry} />}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {cycle && (
            <button type="button" aria-pressed={isWeek} onClick={toggleWeek} className={cn(secondary, isWeek && "border-fg bg-fg text-background hover:bg-fg")} id="viewer-week">
              <Star className={cn("size-4", isWeek && "fill-current")} /> {t("ph.weekPhoto")}
            </button>
          )}
          {entry && (
            <button
              type="button"
              className={tertiary}
              onClick={() => {
                onClose()
                ed.openEntry({ date: entry.date, spaceId: entry.spaceId, ...(entry.plantId ? { plantId: entry.plantId } : {}) })
              }}
              id="viewer-entry"
            >
              {t("ph.openEntry")}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** The strip of a cycle (or of one plant): one photo per week, oldest first, with a slider. */
export function StripPage({ cycleId, plant }: { cycleId: string; plant?: string }) {
  const { t, dm } = useSettings()
  const { all, cycles, photoUrl } = useGrow()
  const weekTitle = useWeekTitle()
  const cycle = cycles.find((c) => c.id === cycleId)
  const p = (PLANT_IDS as string[]).includes(plant ?? "") ? (plant as PlantId) : "all"
  const photos = useMemo(() => galleryPhotos(all.entries), [all.entries])
  const strip = useMemo(() => (cycle ? weekStrip(photos, cycle, p) : []), [photos, cycle, p])
  const [i, setI] = useState(strip.length - 1)
  const [src, setSrc] = useState<string | null>(null)
  const [broken, setBroken] = useState(false)
  const cur = strip[Math.min(Math.max(i, 0), strip.length - 1)]
  useEffect(() => setI(strip.length - 1), [p, cycleId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let live = true
    setBroken(false)
    if (!cur) return
    photoUrl(cur.photo.id).then((u) => live && (u ? setSrc(u) : setBroken(true)))
    return () => {
      live = false
    }
  }, [cur?.photo.id, photoUrl]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!cycle) return null
  const plantsHere = [...new Set(photos.filter((x) => x.cycleId === cycle.id && x.plantId).map((x) => x.plantId!))].sort()
  const chip = (on: boolean) => cn("hit h-9 shrink-0 rounded-full border px-3 text-[0.75rem] font-semibold whitespace-nowrap", on ? "border-fg bg-fg text-background" : "border-line-strong text-fg-2")
  return (
    <div className="flex flex-col gap-4" id="strip-page">
      <Head title={t("ph.stripTitle", { name: cycle.name })} sub={t("ph.stripCount", { n: strip.length })} back={goBack} />
      {plantsHere.length > 0 && (
        <div role="radiogroup" aria-label={t("ph.filterPlant")} className="flex flex-wrap gap-2" id="strip-plants">
          <button type="button" role="radio" aria-checked={p === "all"} className={chip(p === "all")} onClick={() => navigate({ tab: "journal", strip: cycle.id })}>
            {t("ph.stripAll")}
          </button>
          {plantsHere.map((x) => (
            <button key={x} type="button" role="radio" aria-checked={p === x} className={chip(p === x)} onClick={() => navigate({ tab: "journal", strip: cycle.id, plant: x })}>
              {x}
            </button>
          ))}
        </div>
      )}
      {!cur ? (
        <p className="text-[0.875rem] text-fg-3" id="strip-none">
          {t("ph.stripNone")}
        </p>
      ) : (
        <>
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[14px] border border-line bg-black" id="strip-stage">
            {broken ? <MissingPhoto /> : src && <img src={src} alt="" className="size-full object-contain" onError={() => setBroken(true)} id="strip-img" />}
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <b className="text-[1.0625rem] font-semibold" id="strip-week">
              {weekTitle(cur.label, cur.monday)}
            </b>
            <span className="font-num text-[0.8125rem] text-fg-3" id="strip-date">
              {dm(cur.photo.date)}
              {cur.chosen ? ` · ${t("ph.stripChosen")}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={iconButton} disabled={i <= 0} onClick={() => setI((x) => Math.max(0, x - 1))} aria-label={t("ph.prev")} id="strip-prev">
              <ChevronLeft className="size-5" />
            </button>
            <input type="range" min={0} max={strip.length - 1} value={Math.min(Math.max(i, 0), strip.length - 1)} onChange={(e) => setI(Number(e.target.value))} aria-label={t("ph.stripWeek")} className="min-w-0 flex-1 accent-[var(--water)]" id="strip-slider" />
            <button type="button" className={iconButton} disabled={i >= strip.length - 1} onClick={() => setI((x) => Math.min(strip.length - 1, x + 1))} aria-label={t("ph.next")} id="strip-next">
              <ChevronRight className="size-5" />
            </button>
          </div>
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1" id="strip-thumbs">
            {strip.map((w, k) => (
              <StripThumb key={w.monday} w={w} on={k === i} onClick={() => setI(k)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function StripThumb({ w, on, onClick }: { w: ReturnType<typeof weekStrip>[number]; on: boolean; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const th = useThumb(w.photo.id, ref)
  const weekTitle = useWeekTitle()
  return (
    <button ref={ref} type="button" onClick={onClick} aria-pressed={on} aria-label={weekTitle(w.label, w.monday)} className={cn("relative size-16 shrink-0 overflow-hidden rounded-[8px] border-2", on ? "border-water" : "border-transparent")} data-strip-week={w.monday}>
      {th && "url" in th && <img src={th.url} alt="" className="size-full object-cover" draggable={false} />}
      {th && "missing" in th && <MissingPhoto small />}
    </button>
  )
}
