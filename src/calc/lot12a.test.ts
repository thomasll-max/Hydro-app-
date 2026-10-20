// Lot 12a: the review of a cycle (bilan) and the comparison of two cycles, read from what the app already has.
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { comparable, compareRows, conductByStage, cycleReview, cycleSpaces, productUse, reviewRows } from "./review"
import { reviewCsv, reviewHtml, type ReviewText } from "@/lib/review-export"
import { parseHash, routeHash } from "@/app/nav"
import type { Cycle, Entry, Mix } from "@/model/types"
import type { Equipment, EquipmentAssignment, Space } from "@/model/grow"
import { validDoc } from "@/model/validate"
import { fr } from "@/i18n/fr"
import { en } from "@/i18n/en"
import { de } from "@/i18n/de"

const NOW = "2026-01-01T00:00:00Z"
const cycle = (x: Partial<Cycle> = {}): Cycle => ({
  schemaVersion: 4,
  id: "c1",
  name: "Cycle 1",
  spaceId: "fl",
  cultivars: ["Blue Zushi"],
  germinationDate: "2026-01-01",
  vegDate: "2026-01-15",
  flipDate: "2026-02-12",
  harvestDate: "2026-04-16",
  flowerWeeks: 9,
  substrate: "coco",
  waterMode: "auto",
  lights: "",
  lightsOn: "06:00",
  shotPct: 5,
  p1Shots: 6,
  p1IntervalMin: 15,
  p0DelayMin: 60,
  leafOffsetC: -2,
  createdAt: NOW,
  updatedAt: NOW,
  ...x,
})
const entry = (date: string, x: Partial<Entry> = {}): Entry => ({ schemaVersion: 2, id: `${date}_fl`, date, spaceId: "fl", cycleId: "c1", createdAt: NOW, updatedAt: NOW, ...x })
const space = (x: Partial<Space> = {}): Space => ({ schemaVersion: 1, id: "fl", name: "Floraison", template: "flower", color: "emerald", order: 0, modules: {} as Space["modules"], createdAt: NOW, updatedAt: NOW, ...x })
const lamp: Equipment = { schemaVersion: 1, id: "l1", type: "lamp", name: "Lampe", lamp: { type: "LED", watts: 300 }, createdAt: NOW, updatedAt: NOW } as Equipment
const at: EquipmentAssignment = { schemaVersion: 1, id: "a1", equipmentId: "l1", spaceId: "fl", from: "2025-12-01" }
const review = (c: Cycle, p: { entries?: Entry[]; mixes?: Mix[]; spaces?: Space[]; equipment?: Equipment[]; assignments?: EquipmentAssignment[] } = {}) =>
  cycleReview({ cycle: c, entries: p.entries ?? [], mixes: p.mixes ?? [], spaces: p.spaces ?? [space()], equipment: p.equipment ?? [], assignments: p.assignments ?? [] })

describe("lot 12a — résultat", () => {
  it("g par watt : la puissance de la récolte, sinon les lampes de l'espace à la floraison, sinon donnée manquante", () => {
    expect(review(cycle({ harvest: { dryG: 450, watts: 300 } })).result).toMatchObject({ dryG: 450, watts: 300, wattsSrc: "harvest", gPerW: 1.5 })
    const eq = review(cycle({ harvest: { dryG: 450 } }), { equipment: [lamp], assignments: [at] }).result
    expect(eq).toMatchObject({ watts: 300, wattsSrc: "equipment", gPerW: 1.5 })
    const none = review(cycle({ harvest: { dryG: 450 } })).result
    expect(none.watts).toBeUndefined()
    expect(none.gPerW).toBeUndefined()
    // Without a dry weight: no g/W, even with the watts.
    expect(review(cycle({ harvest: { watts: 300 } })).result.gPerW).toBeUndefined()
  })

  it("g par m² seulement si la surface est connue ; g par plante seulement si le nombre de pots est connu", () => {
    const withDims = review(cycle({ potCount: 4, harvest: { dryG: 405 } }), { spaces: [space({ dimensionsCm: { l: 90, w: 90, h: 180 } })] }).result
    expect(withDims).toMatchObject({ areaM2: 0.81, gPerM2: 500, plants: 4, gPerPlant: 101.3 })
    const without = review(cycle({ harvest: { dryG: 405 } })).result
    expect(without.areaM2).toBeUndefined()
    expect(without.gPerM2).toBeUndefined()
    expect(without.gPerPlant).toBeUndefined()
    expect(review(cycle()).result).toEqual({ perPlant: [] })
  })

  it("poids sec par plante : la somme ne remplace jamais le poids sec saisi, l'écart reste tel quel", () => {
    const typed = review(cycle({ harvest: { dryG: 400, dryByPlant: { P1: 110, P2: 102.5, P3: 99 } } })).result
    expect(typed).toMatchObject({ dryG: 400, drySrc: "typed", plantsSum: 311.5, gap: -88.5 })
    expect(typed.perPlant).toEqual([
      { id: "P1", g: 110 },
      { id: "P2", g: 102.5 },
      { id: "P3", g: 99 },
    ])
    const fromPlants = review(cycle({ harvest: { dryByPlant: { P1: 100, P2: 120 } } })).result
    expect(fromPlants).toMatchObject({ dryG: 220, drySrc: "plants" })
    expect(fromPlants.gap).toBeUndefined()
  })
})

describe("lot 12a — calendrier", () => {
  it("durées de chaque étape, floraison réelle contre prévue, séchage saisi ou jusqu'au curing", () => {
    const c = review(cycle({ harvest: { dryingDays: 11 } })).calendar
    expect(c).toMatchObject({ propagationDays: 14, vegDays: 28, flowerDays: 63, flowerWeeksPlanned: 9, plannedHarvest: "2026-04-16", dryingDays: 11, dryingSrc: "typed" })
    expect(review(cycle({ harvest: { curingStart: "2026-04-26" } })).calendar).toMatchObject({ dryingDays: 10, dryingSrc: "curing" })
    const open = review(cycle({ harvestDate: undefined, harvest: undefined })).calendar
    expect(open.flowerDays).toBeUndefined()
    expect(open.dryingDays).toBeUndefined()
  })
})

describe("lot 12a — conduite", () => {
  const tg = (stage: "veg" | "stretch") => ({ stage, ecRunoff: { lo: 4, hi: 6 }, phRunoff: { lo: 5.8, hi: 6.2 }, dryback: { lo: 40, hi: 50 } })
  const entries = [
    entry("2026-02-13", { ecRunoff: 4.5, phRunoff: 6.0, dryback: 42, drybackSensor: 18, tempDay: 26, targets: tg("stretch") }),
    entry("2026-02-14", { ecRunoff: 7.0, phRunoff: 6.6, dryback: 45, tempDay: 27, targets: tg("stretch") }),
    entry("2026-02-15", { id: "x", ecRunoff: 5.0, targets: tg("stretch") }),
    // A plant's entry and another cycle's never count.
    entry("2026-02-15", { id: "p", plantId: "P1", ecRunoff: 9, targets: tg("stretch") }),
    entry("2026-02-15", { id: "o", cycleId: "c2", ecRunoff: 9, targets: tg("stretch") }),
    // Without recorded targets: the cycle's stage on that day, and no share in the target.
    entry("2026-01-20", { ecRunoff: 3.2 }),
  ]
  const conduct = conductByStage(cycle(), entries)

  it("moyenne, plage, nombre de saisies et part des jours dans la cible du jour, par étape", () => {
    expect(conduct.map((s) => s.stage)).toEqual(["veg", "stretch"])
    const stretch = conduct.find((s) => s.stage === "stretch")!
    expect(stretch).toMatchObject({ entries: 3, from: "2026-02-13", to: "2026-02-15" })
    expect(stretch.lines.find((l) => l.metric === "ecRunoff")).toEqual({ metric: "ecRunoff", n: 3, avg: 5.5, min: 4.5, max: 7, withTarget: 3, inTarget: 2 })
    expect(stretch.lines.find((l) => l.metric === "phRunoff")).toMatchObject({ n: 2, avg: 6.3, withTarget: 2, inTarget: 1 })
    expect(conduct.find((s) => s.stage === "veg")!.lines[0]).toEqual({ metric: "ecRunoff", n: 1, avg: 3.2, min: 3.2, max: 3.2, withTarget: 0, inTarget: 0 })
  })

  it("dryback à la pesée et dryback capteur : deux lignes, jamais mélangées ; T° sans cible", () => {
    const stretch = conduct.find((s) => s.stage === "stretch")!
    expect(stretch.lines.find((l) => l.metric === "dryback")).toMatchObject({ n: 2, avg: 43.5, withTarget: 2, inTarget: 2 })
    expect(stretch.lines.find((l) => l.metric === "drybackSensor")).toEqual({ metric: "drybackSensor", n: 1, avg: 18, min: 18, max: 18, withTarget: 0, inTarget: 0 })
    expect(stretch.lines.find((l) => l.metric === "tempDay")).toMatchObject({ n: 2, avg: 26.5, withTarget: 0 })
  })
})

describe("lot 12a — bidons et incidents", () => {
  const mix = (id: string, x: Partial<Mix>): Mix => ({ schemaVersion: 4, id, date: "2026-02-20", volumeL: 100, createdAt: NOW, ...x })
  it("bidons du cycle (ou de son espace pendant le cycle), produits sommés par gamme sans jamais mélanger Pro et Blended", () => {
    const mixes = [
      mix("a", { cycleId: "c1", line: "athena-pro", items: [{ id: "proCore", qty: 120, unit: "g" }, { id: "proBloom", qty: null, unit: "g" }] }),
      mix("b", { spaceIds: ["fl"], line: "athena-pro", items: [{ id: "proCore", qty: 80, unit: "g" }] }),
      mix("c", { spaceIds: ["fl"], line: "athena-blended", items: [{ id: "proCore", qty: 5, unit: "g" }] }),
      // Before the cycle in its space, or another cycle's: not counted.
      mix("d", { spaceIds: ["fl"], date: "2025-12-01", items: [{ id: "proCore", qty: 999, unit: "g" }] }),
      mix("e", { cycleId: "c2", items: [{ id: "proCore", qty: 999, unit: "g" }] }),
    ]
    const t = review(cycle(), { mixes }).tanks
    expect(t.count).toBe(3)
    expect(t.litres).toBe(300)
    expect(t.products).toEqual([
      { line: "athena-blended", id: "proCore", unit: "g", qty: 5, tanks: 1, unknown: 0 },
      { line: "athena-pro", id: "proCore", unit: "g", qty: 200, tanks: 2, unknown: 0 },
      { line: "athena-pro", id: "proBloom", unit: "g", qty: 0, tanks: 0, unknown: 1 },
    ])
    expect(productUse([])).toEqual([])
  })

  it("incidents par semaine du cycle : jours et gravité maximale des observations, actions", () => {
    const inc = review(cycle(), {
      entries: [
        entry("2026-02-23", { observations: [{ tag: "yellowing", severity: 1 }], actions: ["lst"] }),
        entry("2026-02-24", { observations: [{ tag: "yellowing", severity: 2 }, { tag: "claws", severity: 1 }] }),
        entry("2026-03-02", { actions: ["defoliation"] }),
      ],
    }).incidents
    expect(inc).toEqual([
      { monday: "2026-02-23", label: { kind: "flower", week: 3 }, obs: [{ tag: "yellowing", days: 2, max: 2 }, { tag: "claws", days: 1, max: 1 }], actions: [{ tag: "lst", days: 1 }] },
      { monday: "2026-03-02", label: { kind: "flower", week: 4 }, obs: [], actions: [{ tag: "defoliation", days: 1 }] },
    ])
  })
})

describe("lot 12a — comparer, exporter", () => {
  it("cycles proposés : récoltés, filtrés par variété (majuscules et espaces ignorés) ou par espace", () => {
    const a = cycle()
    const b = cycle({ id: "c2", cultivars: ["blue  zushi"], harvestDate: "2026-07-01" })
    const c = cycle({ id: "c3", cultivars: ["Melonade"], spaceId: "col", harvestDate: "2026-09-01", transfers: [] })
    const d = cycle({ id: "c4", harvestDate: undefined })
    expect(comparable([a, b, c, d], a).map((x) => x.id)).toEqual(["c3", "c2"])
    expect(comparable([a, b, c, d], a, { cultivar: "BLUE ZUSHI" }).map((x) => x.id)).toEqual(["c2"])
    expect(comparable([a, b, c, d], a, { spaceId: "col" }).map((x) => x.id)).toEqual(["c3"])
    expect(cycleSpaces(cycle({ spaceId: "dry", transfers: [{ date: "2026-01-15", from: "col", to: "fl" }, { date: "2026-04-16", from: "fl", to: "dry" }] }))).toEqual(["col", "fl", "dry"])
  })

  it("deux colonnes, mêmes lignes, l'écart B − A seulement quand les deux ont un nombre", () => {
    const a = review(cycle({ harvest: { dryG: 400, watts: 300 } }))
    const b = review(cycle({ id: "c2", harvest: { dryG: 460 } }))
    const rows = compareRows(a, b)
    expect(rows.find((r) => r.id === "dry")).toMatchObject({ diff: 60 })
    expect(rows.find((r) => r.id === "gPerW")?.diff).toBeUndefined()
    expect(rows.find((r) => r.id === "flowerDays")).toMatchObject({ diff: 0 })
    expect(rows.map((r) => r.id).slice(0, 3)).toEqual(["dry", "wet", "gPerW"])
    // A gap smaller than the digits shown is ±0.
    const c = review(cycle({ harvest: { dryG: 400.4 } }))
    expect(compareRows(review(cycle({ harvest: { dryG: 400 } })), c).find((r) => r.id === "dry")?.diff).toBe(0)
  })

  const text = (lang: "fr" | "en" | "de"): ReviewText => ({
    lang,
    head: { fr, en, de }[lang].rv.csvHead,
    section: (s) => s,
    stage: (s) => s,
    label: (r) => r.label,
    unit: (u) => u,
    num: (v, d) => v.toFixed(d),
    date: (d) => d,
  })
  const rv = review(cycle({ harvest: { dryG: 405.5, watts: 300 } }), { entries: [entry("2026-02-13", { phRunoff: 6.05, targets: { stage: "stretch", phRunoff: { lo: 5.8, hi: 6.2 } } })] })

  it("CSV : séparateur « ; », virgule décimale en français et en allemand, point en anglais", () => {
    const csv = reviewCsv(rv, text("fr")).split("\n")
    expect(csv[0]).toBe("Section;Étape;Mesure;Valeur;Unité;Min;Max;Saisies;Dans la cible")
    expect(csv).toContain("result;;rv.dry;405,5;g;;;;")
    expect(csv).toContain("conduct;stretch;jw.m.phRunoff;6,05;none;6,05;6,05;1;1/1")
    expect(csv).toContain("calendar;;rv.flip;2026-02-12;date;;;;")
    expect(reviewCsv(rv, text("de")).split("\n")).toContain("result;;rv.dry;405,5;g;;;;")
    expect(reviewCsv(rv, text("en")).split("\n")).toContain("result;;rv.dry;405.5;g;;;;")
    // A missing value is an empty cell, never a number.
    expect(csv).toContain("result;;rv.gPerPlant;;g;;;;")
  })

  it("version imprimable : une page HTML simple, sans script, le texte échappé", () => {
    const html = reviewHtml(rv, text("fr"), { title: "Bilan · <Cycle>", sub: "s", foot: "f", missing: "donnée manquante", notes: [{ label: "Dégustation", text: "fruité & <doux>" }] })
    expect(html.startsWith("<!doctype html>")).toBe(true)
    expect(html).not.toMatch(/<script/i)
    expect(html).toContain("Bilan · &lt;Cycle&gt;")
    expect(html).toContain("fruité &amp; &lt;doux&gt;")
    expect(html).toContain("<i>donnée manquante</i>")
    expect(reviewRows(rv).filter((r) => r.section === "conduct")).toHaveLength(1)
  })
})

describe("lot 12a — un cycle de la simulation d'un an", () => {
  it("bilan complet sans plantage, valeurs tirées des données simulées", async () => {
    const { data } = await import("../../scripts/sim/generate")
    const harvested = data.cycles.filter((c) => c.harvestDate)
    expect(harvested.length).toBeGreaterThan(2)
    for (const c of harvested) {
      const rv = cycleReview({ cycle: c, entries: data.entries, mixes: data.mixes, spaces: data.spaces, equipment: data.equipment, assignments: data.assignments })
      expect(rv.result.dryG).toBe(c.harvest!.dryG)
      expect(rv.result.gPerW).toBeCloseTo(c.harvest!.dryG! / 300, 2)
      // Flowered in Floraison (90 × 90 cm), even though it hangs in the drying room now.
      expect(rv.spaceId).toBe("floraison")
      expect(rv.result.gPerM2).toBe(Math.round(c.harvest!.dryG! / 0.81))
      expect(rv.calendar.flowerDays).toBe(63)
      expect(rv.conduct.length).toBeGreaterThanOrEqual(4)
      const stretch = rv.conduct.find((s) => s.stage === "stretch")!
      const ec = stretch.lines.find((l) => l.metric === "ecRunoff")!
      expect(ec.withTarget).toBeGreaterThan(0)
      expect(ec.inTarget).toBeLessThanOrEqual(ec.withTarget)
      // The weighing dryback and the sensor's never share a line.
      for (const s of rv.conduct) expect(new Set(s.lines.map((l) => l.metric)).size).toBe(s.lines.length)
      expect(rv.tanks.count).toBeGreaterThan(0)
      expect(rv.tanks.products.every((p) => p.line === "athena-pro")).toBe(true)
    }
  }, 60_000)
})

describe("lot 12a — écrans, données, textes", () => {
  it("route du bilan et de la comparaison", () => {
    expect(parseHash("#journal/bilan/c1")).toEqual({ tab: "journal", review: "c1" })
    expect(parseHash("#journal/bilan/c1/c2")).toEqual({ tab: "journal", review: "c1", vs: "c2" })
    expect(routeHash({ tab: "journal", review: "c1", vs: "c2" })).toBe("#journal/bilan/c1/c2")
    expect(parseHash("#journal/floraison/2026-02-02")).toEqual({ tab: "journal", week: "floraison/2026-02-02" })
  })

  it("poids sec par plante et note de bilan : champs facultatifs de la récolte, sans changement de version", () => {
    expect(validDoc("cycles", { ...cycle(), harvest: { dryG: 400, dryByPlant: { P1: 100 }, reviewNote: "ok" } })).toBe(true)
    const sheet = readFileSync("src/screens/cycle-sheet.tsx", "utf8")
    expect(sheet).toMatch(/h\.dryByPlant = /)
    expect(sheet).toMatch(/id="h-review"/)
  })

  it("le bilan s'ouvre depuis le Journal, les Réglages et la dernière récolte", () => {
    expect(readFileSync("src/screens/journal.tsx", "utf8")).toMatch(/navigate\(\{ tab: "journal", review: cycle\.id \}/)
    expect(readFileSync("src/screens/tools/settings.tsx", "utf8")).toMatch(/navigate\(\{ tab: "journal", review: c\.id \}/)
    expect(readFileSync("src/screens/cycle-steps.tsx", "utf8")).toMatch(/review: last\.id/)
  })

  it("textes en trois langues", () => {
    for (const d of [fr, en, de]) {
      for (const k of ["title", "result", "calendar", "conduct", "tanks", "incidents", "notes", "compare", "csv", "print", "missing", "csvHead"] as const) expect(d.rv[k]).toBeTruthy()
      expect(d.cycleForm.dryPlants).toBeTruthy()
      expect(d.jw.m.ppfd).toBe("PPFD")
    }
  })
})
