// Lot 12b: the photo gallery, the tags of the photos and the week-by-week strip, read from the journal.
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { cleanTag, filterPhotos, freeTagsUsed, galleryPhotos, groupByWeek, tagKeys, weekPhotoKey, weekStrip } from "./gallery"
import { parseHash, routeHash } from "@/app/nav"
import { validDoc } from "@/model/validate"
import type { Cycle, Entry } from "@/model/types"
import { fr } from "@/i18n/fr"
import { en } from "@/i18n/en"
import { de } from "@/i18n/de"

const NOW = "2026-01-01T00:00:00Z"
const cycle = (x: Partial<Cycle> = {}): Cycle =>
  ({ schemaVersion: 4, id: "c1", name: "Cycle 1", spaceId: "fl", cultivars: [], germinationDate: "2026-01-01", vegDate: "2026-01-15", flipDate: "2026-02-12", flowerWeeks: 9, substrate: "coco", waterMode: "auto", lights: "", lightsOn: "06:00", shotPct: 5, p1Shots: 6, p1IntervalMin: 15, p0DelayMin: 60, leafOffsetC: -2, createdAt: NOW, updatedAt: NOW, ...x }) as Cycle
const entry = (date: string, photos: string[], x: Partial<Entry> = {}): Entry => ({ schemaVersion: 2, id: `${date}_fl${x.plantId ? `_${x.plantId}` : ""}`, date, spaceId: "fl", cycleId: "c1", photos, createdAt: NOW, updatedAt: NOW, ...x })

const entries = [
  entry("2026-02-16", ["a1", "a2"], { time: "08:00", photoTags: { a1: { obs: ["yellowing"], free: ["trichomes"] } } }),
  entry("2026-02-18", ["b1"], { plantId: "P2", photoTags: { b1: { free: ["stretch", "trichomes"] } } }),
  entry("2026-02-25", ["c1"]),
  entry("2026-02-25", ["d1"], { id: "x", spaceId: "col", cycleId: "c2" }),
  entry("2026-01-05", [], { id: "none" }),
]

describe("lot 12b — galerie", () => {
  const list = galleryPhotos(entries)

  it("toutes les photos du Journal, les plus récentes d'abord, avec leur jour, espace, cycle, plante et étiquettes", () => {
    expect(list.map((p) => p.id)).toEqual(["c1", "d1", "b1", "a2", "a1"])
    expect(list.find((p) => p.id === "b1")).toMatchObject({ date: "2026-02-18", spaceId: "fl", cycleId: "c1", plantId: "P2", tags: { free: ["stretch", "trichomes"] } })
    expect(tagKeys(list.find((p) => p.id === "a1")!.tags)).toEqual(["obs:yellowing", "free:trichomes"])
  })

  it("filtres : espace, cycle, plante (ou tout l'espace), étiquette", () => {
    expect(filterPhotos(list, { spaceId: "col" }).map((p) => p.id)).toEqual(["d1"])
    expect(filterPhotos(list, { cycleId: "c1" }).map((p) => p.id)).toEqual(["c1", "b1", "a2", "a1"])
    expect(filterPhotos(list, { plantId: "P2" }).map((p) => p.id)).toEqual(["b1"])
    expect(filterPhotos(list, { plantId: "room", cycleId: "c1" }).map((p) => p.id)).toEqual(["c1", "a2", "a1"])
    expect(filterPhotos(list, { tag: "free:trichomes" }).map((p) => p.id)).toEqual(["b1", "a1"])
    expect(filterPhotos(list, { tag: "obs:yellowing" }).map((p) => p.id)).toEqual(["a1"])
  })

  it("regroupées par semaine du cycle (« Floraison S2 »), la plus récente d'abord", () => {
    const weeks = groupByWeek(list, [cycle()])
    expect(weeks.map((w) => [w.monday, w.cycleId ?? null, w.label, w.photos.length])).toEqual([
      ["2026-02-23", "c1", { kind: "flower", week: 3 }, 1],
      ["2026-02-23", "c2", null, 1],
      ["2026-02-16", "c1", { kind: "flower", week: 2 }, 3],
    ])
  })

  it("étiquettes libres : les plus utilisées proposées d'abord ; une étiquette nettoyée, jamais celle d'une observation", () => {
    expect(freeTagsUsed(entries)).toEqual(["trichomes", "stretch"])
    expect(cleanTag("  Racines   blanches ")).toBe("racines blanches")
    expect(cleanTag("yellowing")).toBeNull()
    expect(cleanTag("   ")).toBeNull()
    expect(cleanTag("x".repeat(50))).toHaveLength(30)
  })
})

describe("lot 12b — frise", () => {
  const list = galleryPhotos(entries)

  it("une photo par semaine, de la plus ancienne à la plus récente : la plus récente de la semaine, ou celle choisie", () => {
    const s = weekStrip(list, cycle())
    expect(s.map((w) => [w.monday, w.photo.id, w.chosen, w.count])).toEqual([
      ["2026-02-16", "b1", false, 3],
      ["2026-02-23", "c1", false, 1],
    ])
    const chosen = weekStrip(list, cycle({ weekPhotos: { [weekPhotoKey("all", "2026-02-16")]: "a1" } }))
    expect(chosen[0]).toMatchObject({ photo: { id: "a1" }, chosen: true })
    // A choice that no longer exists (photo removed): back to the most recent.
    expect(weekStrip(list, cycle({ weekPhotos: { "all/2026-02-16": "gone" } }))[0]).toMatchObject({ photo: { id: "b1" }, chosen: false })
  })

  it("la frise d'une plante n'a que ses photos, avec son propre choix", () => {
    expect(weekStrip(list, cycle(), "P2").map((w) => w.photo.id)).toEqual(["b1"])
    expect(weekStrip(list, cycle(), "P1")).toEqual([])
  })
})

describe("lot 12b — données, écrans, textes", () => {
  it("étiquettes et photo de la semaine : champs facultatifs, sans changement de version, validés à l'import", () => {
    expect(validDoc("entries", entries[0])).toBe(true)
    expect(validDoc("entries", { ...entries[0], photoTags: "x" })).toBe(false)
    expect(validDoc("cycles", cycle({ weekPhotos: { "all/2026-02-16": "a1" } }))).toBe(true)
    expect(validDoc("cycles", { ...cycle(), weekPhotos: [] })).toBe(false)
  })

  it("routes de la galerie et de la frise", () => {
    expect(parseHash("#journal/photos")).toEqual({ tab: "journal", photos: "all" })
    expect(parseHash("#journal/photos/c1")).toEqual({ tab: "journal", photos: "c1" })
    expect(parseHash("#journal/frise/c1/P2")).toEqual({ tab: "journal", strip: "c1", plant: "P2" })
    expect(routeHash({ tab: "journal", strip: "c1" })).toBe("#journal/frise/c1")
    expect(routeHash({ tab: "journal", photos: "all" })).toBe("#journal/photos")
  })

  it("miniatures faites une fois et gardées dans leur propre base ; effacées avec « Réinitialiser l'app » ; photo introuvable signalée", () => {
    const thumbs = readFileSync("src/lib/thumbs.ts", "utf8")
    expect(thumbs).toMatch(/const DB = "hydro-thumbs"/)
    expect(thumbs).toMatch(/await op\("readwrite", \(s\) => s\.put\(blob!, id\)\)/)
    expect(readFileSync("src/lib/reset.ts", "utf8")).toMatch(/clearThumbs\(\)/)
    expect(readFileSync("src/screens/entry-sheet.tsx", "utf8")).toMatch(/<MissingPhoto small \/>/)
    expect(readFileSync("src/screens/gallery.tsx", "utf8")).toMatch(/addLayer\(/)
    // The Journal leads to the photos, the review too.
    expect(readFileSync("src/screens/journal.tsx", "utf8")).toMatch(/id="journal-photos"/)
    expect(readFileSync("src/screens/cycle-review.tsx", "utf8")).toMatch(/id="review-photos"/)
  })

  it("textes en trois langues", () => {
    for (const d of [fr, en, de]) for (const k of ["title", "missing", "missingD", "tags", "weekPhoto", "strip", "stripTitle", "filterTag"] as const) expect(d.ph[k]).toBeTruthy()
  })
})
