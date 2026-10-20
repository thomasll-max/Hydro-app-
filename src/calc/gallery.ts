// Galerie photo et frise (lot 12b): every photo the journal already holds, with its day, space, cycle, plant and tags;
// the filters, the groups by week of the cycle, the free tags used before, and the week-by-week strip of a cycle or a
// plant (Thomas's « time-lapse »). Pure and tested (calc/lot12b.test.ts).
import type { Cycle, Entry, IsoDate, ObsTag, PlantId } from "@/model/types"
import { OBS_TAGS } from "@/model/types"
import { mondayOf, weekLabel, type WeekLabel } from "./weeks"

export type PhotoTags = { obs?: ObsTag[]; free?: string[] }
export type GalleryPhoto = { id: string; entryId: string; date: IsoDate; time?: string; spaceId: string; cycleId?: string; plantId?: PlantId; tags: PhotoTags }

/** A tag as filtered and stored in a filter: « obs:yellowing » or « free:trichomes ». */
export type TagKey = `obs:${ObsTag}` | `free:${string}`

/** Every photo of the journal, newest first (the day, then the time, then the order in the entry). */
export function galleryPhotos(entries: Entry[]): GalleryPhoto[] {
  const out: GalleryPhoto[] = []
  for (const e of entries)
    (e.photos ?? []).forEach((id) => {
      if (!id) return
      out.push({ id, entryId: e.id, date: e.date, ...(e.time ? { time: e.time } : {}), spaceId: e.spaceId, ...(e.cycleId ? { cycleId: e.cycleId } : {}), ...(e.plantId ? { plantId: e.plantId } : {}), tags: e.photoTags?.[id] ?? {} })
    })
  const order = new Map<string, number>()
  entries.forEach((e) => (e.photos ?? []).forEach((id, i) => order.set(`${e.id}|${id}`, i)))
  return out.sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? "").localeCompare(a.time ?? "") || (order.get(`${b.entryId}|${b.id}`) ?? 0) - (order.get(`${a.entryId}|${a.id}`) ?? 0))
}

export const tagKeys = (t: PhotoTags): TagKey[] => [...(t.obs ?? []).map((x) => `obs:${x}` as TagKey), ...(t.free ?? []).map((x) => `free:${x}` as TagKey)]

export type GalleryFilter = { spaceId?: string; cycleId?: string; plantId?: PlantId | "room"; tag?: TagKey }

export function filterPhotos(list: GalleryPhoto[], f: GalleryFilter): GalleryPhoto[] {
  return list.filter(
    (p) =>
      (!f.spaceId || p.spaceId === f.spaceId) &&
      (!f.cycleId || p.cycleId === f.cycleId) &&
      (!f.plantId || (f.plantId === "room" ? !p.plantId : p.plantId === f.plantId)) &&
      (!f.tag || tagKeys(p.tags).includes(f.tag)),
  )
}

export type PhotoWeek = { key: string; monday: IsoDate; cycleId?: string; label: WeekLabel | null; photos: GalleryPhoto[] }

/** Groups by week (newest first), named after the cycle's week when the photos have one (« Floraison S3 »). */
export function groupByWeek(list: GalleryPhoto[], cycles: Cycle[]): PhotoWeek[] {
  const by = new Map<string, PhotoWeek>()
  for (const p of list) {
    const monday = mondayOf(p.date)
    const key = `${monday}|${p.cycleId ?? ""}`
    let w = by.get(key)
    if (!w) {
      const c = cycles.find((x) => x.id === p.cycleId)
      w = { key, monday, ...(p.cycleId ? { cycleId: p.cycleId } : {}), label: c ? weekLabel(c, monday) : null, photos: [] }
      by.set(key, w)
    }
    w.photos.push(p)
  }
  return [...by.values()].sort((a, b) => b.monday.localeCompare(a.monday) || (a.cycleId ?? "").localeCompare(b.cycleId ?? ""))
}

/** Free tags typed before, the most used first, then alphabetically (proposed when tagging a new photo). */
export function freeTagsUsed(entries: Entry[]): string[] {
  const n = new Map<string, number>()
  for (const e of entries) for (const t of Object.values(e.photoTags ?? {})) for (const x of t.free ?? []) n.set(x, (n.get(x) ?? 0) + 1)
  return [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([x]) => x)
}

/** A free tag as kept: trimmed, single spaces, lower case, at most 30 characters; an observation's id is refused. */
export function cleanTag(s: string): string | null {
  const x = s.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 30)
  return x && !(OBS_TAGS as readonly string[]).includes(x) ? x : null
}

/** The key of the chosen « Photo de la semaine » of a cycle: the plant (or the whole cycle) and the Monday. */
export const weekPhotoKey = (plant: PlantId | "all", monday: IsoDate) => `${plant}/${monday}`

export type StripWeek = { monday: IsoDate; label: WeekLabel; photo: GalleryPhoto; chosen: boolean; count: number }

/**
 * The strip of a cycle, or of one plant: one photo per week, oldest first — the one chosen with « Photo de la semaine »,
 * else the most recent of the week. Weeks without a photo are not in it.
 */
export function weekStrip(list: GalleryPhoto[], cycle: Cycle, plant: PlantId | "all" = "all"): StripWeek[] {
  const mine = list.filter((p) => p.cycleId === cycle.id && (plant === "all" || p.plantId === plant))
  const by = new Map<IsoDate, GalleryPhoto[]>()
  for (const p of mine) by.set(mondayOf(p.date), [...(by.get(mondayOf(p.date)) ?? []), p])
  return [...by]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([monday, photos]) => {
      const pick = cycle.weekPhotos?.[weekPhotoKey(plant, monday)]
      const chosen = photos.find((p) => p.id === pick)
      // `photos` keeps the list's order: newest first.
      return { monday, label: weekLabel(cycle, monday), photo: chosen ?? photos[0], chosen: !!chosen, count: photos.length }
    })
}
