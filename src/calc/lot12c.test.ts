// Lot 12c: the variety cards (only what was lived through, spellings merged only when asked) and the photo sent with
// « Demander à Claude » (only where the view may send images).
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { mergeSpellings, varieties, varietyCycles, varietyKey } from "./varieties"
import { askPhotoNote, askPrompt } from "./ask"
import { parseHash, routeHash } from "@/app/nav"
import type { Cycle, Plant } from "@/model/types"
import { fr } from "@/i18n/fr"
import { en } from "@/i18n/en"
import { de } from "@/i18n/de"

const NOW = "2026-01-01T00:00:00Z"
const cycle = (id: string, cultivars: string[], x: Partial<Cycle> = {}): Cycle =>
  ({ schemaVersion: 4, id, name: id, spaceId: "fl", cultivars, germinationDate: "2026-01-01", flowerWeeks: 9, substrate: "coco", waterMode: "auto", lights: "", lightsOn: "06:00", shotPct: 5, p1Shots: 6, p1IntervalMin: 15, p0DelayMin: 60, leafOffsetC: -2, createdAt: NOW, updatedAt: NOW, ...x }) as Cycle
const plant = (cycleId: string, label: Plant["label"], cultivar: string): Plant => ({ schemaVersion: 2, id: `${cycleId}_${label}`, label, cycleId, cultivar, updatedAt: NOW })

const cycles = [
  cycle("c1", ["Blue Zushi"], { potCount: 4, flipDate: "2026-02-01", harvestDate: "2026-04-05", harvest: { dryG: 480 } }),
  cycle("c2", ["blue  zushi", "Melonade Runtz"], { potCount: 4, flipDate: "2026-05-01", harvestDate: "2026-07-05", harvest: { dryG: 500, dryByPlant: { P1: 130, P3: 118 } } }),
  cycle("c3", ["Melonade Runtz"], { potCount: 4 }),
]
const plants = [plant("c2", "P1", "Blue Zushi"), plant("c2", "P2", "Melonade Runtz"), plant("c2", "P3", "Blue Zushi"), plant("c2", "P4", "Melonade Runtz")]

describe("lot 12c — variétés", () => {
  it("regroupées sans tenir compte des majuscules ni des espaces ; le nom le plus écrit est montré ; les orthographes comptées", () => {
    expect(varietyKey("  Blue   ZUSHI ")).toBe("blue zushi")
    const list = varieties(cycles, plants)
    expect(list.map((v) => v.name)).toEqual(["Blue Zushi", "Melonade Runtz"])
    const bz = list[0]
    expect(bz.key).toBe("blue zushi")
    expect(bz.spellings).toEqual([
      { name: "Blue Zushi", n: 3 },
      { name: "blue  zushi", n: 1 },
    ])
    expect(bz.cycleIds.sort()).toEqual(["c1", "c2"])
  })

  it("ses cycles : poids sec par plante tapé (ses plantes seulement), sinon poids du cycle ÷ pots quand elle était seule, sinon donnée manquante", () => {
    const bz = varietyCycles("blue zushi", cycles, plants)
    expect(bz.map((r) => [r.cycle.id, r.plants, r.gPerPlant ?? null, r.gPerPlantSrc ?? null, r.flowerDays ?? null])).toEqual([
      ["c2", ["P1", "P3"], 124, "plants", 65],
      ["c1", ["P1", "P2", "P3", "P4"], 120, "cycle", 63],
    ])
    // Melonade Runtz in c2: its plants have no weight typed, and it did not grow alone: missing, never guessed.
    const mr = varietyCycles("melonade runtz", cycles, plants)
    expect(mr.find((r) => r.cycle.id === "c2")).toMatchObject({ plants: ["P2", "P4"], dryPlants: [] })
    expect(mr.find((r) => r.cycle.id === "c2")!.gPerPlant).toBeUndefined()
    // Still running: no weight, no flowering length.
    expect(mr.find((r) => r.cycle.id === "c3")).toMatchObject({ plants: ["P1", "P2", "P3", "P4"] })
    expect(mr.find((r) => r.cycle.id === "c3")!.flowerDays).toBeUndefined()
  })

  it("fusionner deux orthographes : seulement sur demande, seulement les documents qui changent", () => {
    const m = mergeSpellings(cycles, plants, ["blue  zushi"], "Blue Zushi")
    expect(m.cycles.map((c) => [c.id, c.cultivars])).toEqual([["c2", ["Blue Zushi", "Melonade Runtz"]]])
    expect(m.plants).toEqual([])
    // Rewriting toward the other spelling touches the cycles and plants written the first way.
    const back = mergeSpellings(cycles, plants, ["Blue Zushi"], "blue zushi")
    expect(back.cycles.map((c) => c.id)).toEqual(["c1"])
    expect(back.plants.map((p) => p.id)).toEqual(["c2_P1", "c2_P3"])
    // Nothing merged by itself: the cycles given in are untouched.
    expect(cycles[1].cultivars).toEqual(["blue  zushi", "Melonade Runtz"])
  })

  it("la simulation d'un an : trois variétés, chacune avec ses cycles", async () => {
    const { data } = await import("../../scripts/sim/generate")
    const list = varieties(data.cycles, data.plants)
    expect(list.map((v) => v.name)).toEqual(["Blue Zushi", "Cherry Limeade", "Melonade Runtz"])
    for (const v of list) expect(varietyCycles(v.key, data.cycles, data.plants).length).toBeGreaterThan(0)
  }, 60_000)
})

describe("lot 12c — photo pour Claude", () => {
  it("la consigne : décrire, relier aux mesures, des pistes, jamais de diagnostic certain, dire quand la photo ne suffit pas ; aucune valeur inventée", () => {
    const note = askPhotoNote({ date: "2026-10-19", space: "Floraison", plant: "P2", tags: ["Jaunissement", "trichomes"] })
    expect(note).toContain("PHOTO JOINTE (prise le 2026-10-19, espace « Floraison », plante P2, étiquettes du cultivateur : Jaunissement, trichomes)")
    expect(note).toMatch(/Décris ce que tu vois/)
    expect(note).toMatch(/relie-le aux mesures/)
    expect(note).toMatch(/Ne présente jamais un diagnostic comme certain/)
    expect(note).toMatch(/Si la photo ne suffit pas/)
    // No number but the date's.
    expect(note.replace("2026-10-19", "").match(/\d/g) ?? []).toEqual(["2"])
    const turns = askPrompt("CONTEXTE", "Qu'est-ce que c'est ?", [], "fr", { date: "2026-10-19" })
    expect(turns).toHaveLength(1)
    expect(turns[0].content).toMatch(/QUESTION\nQu'est-ce que c'est \?\n\nPHOTO JOINTE \(prise le 2026-10-19\)/)
    expect(askPrompt("CONTEXTE", "Q", [], "fr")[0].content).not.toMatch(/PHOTO/)
  })

  it("le bouton photo n'existe que si la vue peut envoyer des images (capacité non redéclarée) ; jamais dans la version locale", () => {
    const ask = readFileSync("src/screens/tools/ask.tsx", "utf8")
    expect(ask).toMatch(/const images = useSampleImages\(\)/)
    expect(ask).toMatch(/\{images && !photo && \(/)
    // The picker opens from a label around the field, for any image (the Claude app keeps it shut otherwise).
    expect(ask).toMatch(/<label[^>]*id="ask-photo-add"/)
    expect(ask).toMatch(/accept="image\/\*"/)
    expect(ask).toMatch(/images: \[sent\.blob\]/)
    expect(readFileSync("src/screens/gallery.tsx", "utf8")).toMatch(/\{images && !broken && \(/)
    expect(readFileSync("src/lib/sample.ts", "utf8")).toMatch(/l\?\.images \?/)
    // The local version has no sample at all.
    expect(readFileSync("src/lib/sample.ts", "utf8")).toMatch(/TARGET === "artifact"/)
  })
})

describe("lot 12c — écrans, textes", () => {
  it("route d'une fiche variété ; l'outil Variétés ; les noms mènent à la fiche", () => {
    expect(parseHash("#tools/varieties/blue%20zushi")).toEqual({ tab: "tools", tool: "varieties", variety: "blue zushi" })
    expect(routeHash({ tab: "tools", tool: "varieties", variety: "blue zushi" })).toBe("#tools/varieties/blue%20zushi")
    expect(parseHash("#tools/varieties")).toEqual({ tab: "tools", tool: "varieties" })
    expect(readFileSync("src/screens/tools.tsx", "utf8")).toMatch(/id: "varieties"/)
    for (const f of ["src/screens/cycle-review.tsx", "src/screens/cycle-sheet.tsx", "src/screens/sheets.tsx"]) expect(readFileSync(f, "utf8")).toMatch(/openVariety\(/)
  })

  it("textes en trois langues", () => {
    for (const d of [fr, en, de]) {
      for (const k of ["notes", "source", "sourceD", "cyclesTitle", "mergeTitle", "mergeHint", "noBreeder"] as const) expect(d.vr[k]).toBeTruthy()
      expect(d.tools.varieties).toBeTruthy()
      expect(d.ask.photoAdd).toBeTruthy()
    }
  })
})
