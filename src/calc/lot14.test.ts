// Lot 14: the whole Athena range. 14a: Blended offered everywhere beside the Pro Line, the line picked per grow and per
// space, never mixed (a Blended space never gets a Pro product, and the reverse), the Pro recipes unchanged.
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { mixRecipe } from "./nutrients"
import { dayTargets } from "./targets"
import { blendedCleanse, blendedManualRows, blendedReferenceRows } from "./reperes"
import { segments } from "./series"
import { ADDONS, ATHENA_BLENDED, ATHENA_PRO, visibleCatalogs, type NutrientCatalog } from "@/data/nutrients"
import { switchLine } from "@/screens/tools/nutrition-settings"
import { fr } from "@/i18n/fr"
import { en } from "@/i18n/en"
import { de } from "@/i18n/de"

const read = (f: string) => readFileSync(f, "utf8")
const ids = (c: NutrientCatalog) => new Set(c.products.map((p) => p.id))
const recipeIds = (line: string, phaseId: string, addons: string[], concentrate = 0) =>
  mixRecipe(line, { phaseId, volumeL: 100, ec: 2, concentrate, addons: addons as never }).items.filter((i) => i.kind === "product").map((i) => i.id)

describe("lot 14a — Blended partout, jamais mélangé avec la Pro Line", () => {
  it("les deux gammes proposées dans la version Claude comme dans la version locale", () => {
    expect(visibleCatalogs().map((c) => c.id)).toEqual(["athena-pro", "athena-blended"])
    expect(read("src/data/nutrients/index.ts")).not.toMatch(/target === "local"/)
  })

  it("un espace Blended ne reçoit jamais un produit Pro, et l'inverse (toutes les phases, tous les add-ons demandés)", () => {
    const every = Object.keys(ADDONS)
    for (const [cat, other] of [
      [ATHENA_BLENDED, ATHENA_PRO],
      [ATHENA_PRO, ATHENA_BLENDED],
    ] as const) {
      for (const p of cat.program) {
        const got = recipeIds(cat.id, p.id, every)
        expect(got.every((id) => ids(cat).has(id)), `${cat.id}/${p.id} ${got}`).toBe(true)
        // Products of the other line only (A/B, Pro Grow…): never there.
        const theirs = [...ids(other)].filter((id) => !ids(cat).has(id))
        expect(got.filter((id) => theirs.includes(id))).toEqual([])
      }
    }
  })

  it("CaMg et PK : seulement en Blended", () => {
    expect(ADDONS.camg.lines).toEqual(["athena-blended"])
    expect(ADDONS.pk.lines).toEqual(["athena-blended"])
    expect(ATHENA_PRO.addons).not.toContain("camg")
    expect(ATHENA_PRO.addons).not.toContain("pk")
    for (const p of ATHENA_PRO.program) expect(recipeIds("athena-pro", p.id, ["camg", "pk"])).not.toContain("camg")
    // Switching line keeps only what the new line allows.
    const blended = { line: "athena-blended", addons: ["fade", "cleanse", "balance", "camg", "pk"] as never[], dosing: "conc226" as const }
    expect(switchLine(blended, "athena-pro").addons).toEqual(["fade", "cleanse", "balance"])
    expect(switchLine({ line: "own", addons: [], dosing: "powder" }, "athena-blended").addons).toEqual(ATHENA_BLENDED.defaultAddons)
    expect(switchLine(blended, "own").addons).toEqual([])
  })

  it("les cibles d'un espace Blended viennent du Blended (p. 58 et p. 60), jamais de la Pro Line", () => {
    const b = dayTargets("veg", { mode: "manual", substrate: "coco", line: "athena-blended" })!
    const p = dayTargets("veg", { mode: "manual", substrate: "coco", line: "athena-pro" })!
    expect(b.ecRunoff).toMatchObject({ lo: 3.5, hi: 4.5, page: 60 })
    expect(p.ecRunoff).not.toMatchObject({ lo: 3.5, hi: 4.5 })
  })

  it("non-régression des recettes Pro (100 L, poudre et concentré 226 g/L, add-ons par défaut)", () => {
    const golden: Record<string, string> = {
      "0/clone": "water 100 L, proBloom 129 g, proCore 77 g, cleanse 30 mL",
      "0/veg": "water 100 L, proGrow 203 g, proCore 122 g",
      "0/flower": "water 100 L, proBloom 203 g, proCore 122 g",
      "0/finish": "water 100 L, proBloom 203 g, fade 510 mL",
      "0/flush": "roWater 100 L, cleanse 260 mL",
      "226/clone": "water 100 L, proBloom 570 mL, proCore 340 mL, cleanse 30 mL",
      "226/veg": "water 100 L, proGrow 900 mL, proCore 540 mL",
      "226/flower": "water 100 L, proBloom 900 mL, proCore 540 mL",
      "226/finish": "water 100 L, proBloom 900 mL, fade 510 mL",
      "226/flush": "roWater 100 L, cleanse 260 mL",
    }
    for (const conc of [0, 226]) {
      for (const p of ATHENA_PRO.program) {
        const r = mixRecipe("athena-pro", { phaseId: p.id, volumeL: 100, ec: p.ec, concentrate: conc, addons: ATHENA_PRO.defaultAddons })
        expect(r.items.filter((i) => i.qty != null).map((i) => `${i.id} ${i.qty} ${i.unit}`).join(", "), `${conc}/${p.id}`).toBe(golden[`${conc}/${p.id}`])
      }
    }
  })
})

describe("lot 14a — choix de la gamme", () => {
  it("dans Réglages, l'assistant de démarrage et la fiche d'un espace (le bouton Réglages de Nutrition y mène) ; une ligne d'explication sous chaque choix", () => {
    expect(read("src/screens/tools/settings.tsx")).toMatch(/idPrefix="g" confirmSwitch=\{lineInUse\}/)
    expect(read("src/screens/onboarding.tsx")).toMatch(/<NutritionFields value=\{draft\.nutrition\}/)
    const sheet = read("src/screens/tools/space-sheet.tsx")
    expect(sheet).toMatch(/idPrefix="spg" confirmSwitch=\{growLineInUse\}/)
    expect(sheet).toMatch(/idPrefix="sp" confirmSwitch=\{spaceLineInUse\}/)
    expect(read("src/screens/tools/nutrition.tsx")).toMatch(/ed\.openSpace\(space\.id, "nutrition"\)/)
    for (const d of [fr, en, de]) for (const k of ["lineProD", "lineBlendedD", "ownLineShort", "switchTitle", "switchBody", "switchOk"] as const) expect(d.growSet[k]).toBeTruthy()
    expect(fr.growSet.lineBlendedD).toMatch(/B avant A/)
    // The technical ids do not change.
    expect([ATHENA_PRO.id, ATHENA_BLENDED.id]).toEqual(["athena-pro", "athena-blended"])
  })

  it("changer de gamme en cours de cycle demande d'abord ; les bidons gardent leur gamme", () => {
    const f = read("src/screens/tools/nutrition-settings.tsx")
    expect(f).toMatch(/if \(confirmSwitch\) setPending\(id\)/)
    expect(f).toMatch(/t\("growSet\.switchBody", \{ from: nameOf\(value\.line\), to: nameOf\(pending \?\? value\.line\) \}\)/)
    expect(fr.growSet.switchBody).toMatch(/Les bidons déjà faits gardent leur gamme/)
    expect(read("src/screens/tools/nutrition.tsx")).toMatch(/line: cat\.id,/)
  })

  it("les graphiques ne relient jamais un bidon Pro à un bidon Blended", () => {
    const pts = [
      { date: "2026-10-01", v: 2, line: "athena-pro" },
      { date: "2026-10-03", v: 2.2, line: "athena-pro" },
      { date: "2026-10-05", v: 1.4, line: "athena-blended" },
      { date: "2026-10-07", v: 1.5, line: "athena-blended" },
    ]
    const s = segments(pts, 7, Infinity)
    expect(s.solid.map((p) => p.map((x) => x.date))).toEqual([
      ["2026-10-01", "2026-10-03"],
      ["2026-10-05", "2026-10-07"],
    ])
    expect(s.dotted).toEqual([])
  })
})

describe("lot 14a — Repères : les tableaux Blended à côté de ceux de la Pro Line", () => {
  it("programme Blended p. 58, lu dans son catalogue", () => {
    const rows = blendedReferenceRows()
    expect(rows.map((r) => r.phase.id)).toEqual(["presoak", "clone", "veg", "fl1", "fl2", "fl3", "fl4", "fl5", "fl6", "fl7", "fl8", "fl9"])
    expect(rows.find((r) => r.phase.id === "veg")).toMatchObject({ ab: 29, camg: [8, 13], ec: 2.1 })
    expect(rows.find((r) => r.phase.id === "fl3")).toMatchObject({ ab: 32, pk: 11, camg: [8, 13], ec: 2.5 })
    expect(rows.find((r) => r.phase.id === "fl8")).toMatchObject({ fade: 32, pk: 32, ec: 1.5 })
    expect(rows.find((r) => r.phase.id === "fl8")!.camg).toBeUndefined()
    expect(blendedCleanse()).toEqual([5, 13])
    expect(blendedManualRows()).toBe(ATHENA_BLENDED.manual)
  })

  it("dans l'écran, avec leurs pages ; plus de « Blended dans l'app installée »", () => {
    const g = read("src/screens/guide.tsx")
    expect(g).toMatch(/<Section value="blended"/)
    expect(g).toMatch(/<Section value="manualBlended"/)
    expect(fr.guide.blendedNote).toMatch(/p\. 58/)
    expect(fr.guide.manualBlendedNote).toMatch(/p\. 60/)
    for (const d of [fr, en, de]) {
      expect(JSON.stringify(d)).not.toMatch(/blendedSoon|lineOnly/)
      expect(d.info.reperes).toMatch(/58/)
    }
  })
})
