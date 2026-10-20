// Lot 14: the whole Athena range. 14a: Blended offered everywhere beside the Pro Line, the line picked per grow and per
// space, never mixed (a Blended space never gets a Pro product, and the reverse), the Pro recipes unchanged.
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { labelOnlyOf, mixRecipe } from "./nutrients"
import { shownPerL, stackDrenchPer10L, stackSprayMl, stackSprayThisWeek, stackTankThisWeek, stackWindow } from "./stack"
import { dayTargets } from "./targets"
import { blendedCleanse, blendedManualRows, blendedReferenceRows } from "./reperes"
import { segments } from "./series"
import { ADDONS, ATHENA_BLENDED, ATHENA_PRO, GALLON_L, LABEL_ONLY, perGalToPerL, STACK, visibleCatalogs, type NutrientCatalog } from "@/data/nutrients"
import type { CustomProduct } from "@/model/grow"
import type { Cycle } from "@/model/types"
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

// ---------- 14b: Stack, Proper, Cuts ----------

const cyc = (x: Partial<Cycle> = {}) => ({ germinationDate: "2026-01-01", vegDate: "2026-01-15", flowerWeeks: 9, ...x }) as Cycle
const stackOn = ["fade", "cleanse", "balance", "stack"] as never[]
const withStack = (line: string, phaseId: string, stack: { ok: boolean; doneOn?: string } | undefined, addons = stackOn) =>
  mixRecipe(line, { phaseId, volumeL: 100, addons, stack })

describe("lot 14b — Stack (page officielle, consultée le 20/10/2026)", () => {
  it("conversions gal → L : 1 gal = 3,785 L ; 1–2 mL/gal = 0,26–0,53 mL/L ; 7 mL/gal = 1,85 ; 2 = 0,53 ; 4 = 1,06", () => {
    expect(GALLON_L).toBe(3.785)
    expect([1, 2, 7, 4].map((x) => shownPerL(perGalToPerL(x)))).toEqual([0.26, 0.53, 1.85, 1.06])
    expect(stackDrenchPer10L().map((x) => Math.round(x * 100) / 100)).toEqual([2.64, 5.28])
    expect(stackSprayMl(2)).toBe(3.7)
    expect(STACK.drench.mlPerGal).toEqual([1, 2])
    expect(STACK.foliar.mlPerGal).toBe(7)
  })

  it("avec Pro et Blended, désactivé par défaut", () => {
    for (const c of [ATHENA_PRO, ATHENA_BLENDED]) {
      expect(c.addons).toContain("stack")
      expect(c.defaultAddons).not.toContain("stack")
    }
    expect(ADDONS.stack.lines).toEqual(["athena-pro", "athena-blended"])
  })

  it("fenêtre : de la dernière semaine de végé (7 jours avant le 12/12) à la fin de la floraison S3 ; sans date de 12/12 en végé, inconnue", () => {
    const planned = cyc({ plannedFlipDate: "2026-02-15" })
    expect(stackWindow(planned, "2026-02-07")).toEqual({ ok: false, reason: "early" })
    expect(stackWindow(planned, "2026-02-08")).toEqual({ ok: true, until: "2026-03-07" })
    expect(stackWindow(cyc(), "2026-02-08")).toEqual({ ok: false, reason: "noFlip" })
    expect(stackWindow(cyc(), "2026-01-10")).toEqual({ ok: false, reason: "early" }) // seedling
    const flipped = cyc({ flipDate: "2026-02-15" })
    expect(stackWindow(flipped, "2026-03-07")).toMatchObject({ ok: true }) // flowering day 21, week 3
    expect(stackWindow(flipped, "2026-03-08")).toEqual({ ok: false, reason: "late" }) // week 4
    expect(stackWindow(null, "2026-03-08")).toEqual({ ok: false, reason: "notStarted" })
  })

  it("dans le bidon : ajouté en dernier, 1–2 mL/gal convertis, absent hors de sa fenêtre ou add-on éteint ; une fois par semaine", () => {
    for (const line of ["athena-pro", "athena-blended"]) {
      const r = withStack(line, "veg", { ok: true })
      const last = r.items.at(-1)!
      expect(last).toMatchObject({ id: "stack", qty: null, range: [26.4, 52.8], src: { kind: "athenaWeb", ref: "stack", converted: true }, note: "stack" })
      expect(withStack(line, "veg", { ok: false }).items.map((i) => i.id)).not.toContain("stack")
      expect(withStack(line, "veg", { ok: true }, ["fade", "cleanse", "balance"] as never[]).items.map((i) => i.id)).not.toContain("stack")
      expect(withStack(line, "veg", undefined).items.map((i) => i.id)).not.toContain("stack") // by hand or sprayed
      expect(withStack(line, "veg", { ok: true, doneOn: "2026-02-10" }).items.at(-1)).toMatchObject({ id: "stack", qty: null, note: "stackDone" })
    }
    // Last even after the personal products.
    const own: CustomProduct = { schemaVersion: 2, id: "x", name: "X", unit: "mL", application: "tank", verified: false, source: "label", createdAt: "", dosePer10L: { lo: 1, hi: 1 }, use: { veg: true } }
    const r = mixRecipe("athena-pro", { phaseId: "veg", volumeL: 10, addons: stackOn, stack: { ok: true }, custom: [own], chosenPer10L: { stack: 3 } })
    expect(r.items.map((i) => i.id).slice(-2)).toEqual(["x", "stack"])
    expect(r.items.at(-1)!.qty).toBe(3)
    // This week's tank or spray that already had Stack.
    const mixes = [{ schemaVersion: 4, id: "m", date: "2026-02-10", volumeL: 50, spaceIds: ["fl"], createdAt: "", items: [{ id: "stack", qty: 13, unit: "mL" }] }]
    expect(stackTankThisWeek(mixes as never, ["fl"], "2026-02-16")).toBe("2026-02-10")
    expect(stackTankThisWeek(mixes as never, ["fl"], "2026-02-17")).toBeUndefined()
    expect(stackSprayThisWeek([{ schemaVersion: 1, id: "s", date: "2026-02-12", spaceIds: ["fl"], product: "ipw", litres: 2, stackMlPerL: 1.85 }], "fl", "2026-02-14")).toBe("2026-02-12")
  })

  it("pulvérisation : 7 mL/gal convertis, refusée après la floraison S3 avec un message clair, combinable avec l'IPW", () => {
    const tool = read("src/screens/tools/stack-spray.tsx")
    expect(tool).toMatch(/disabled=\{!win\.ok \|\| !sprayed/)
    expect(tool).toMatch(/t\(`nut\.stackWhy_\$\{win\.reason\}`\)/)
    expect(fr.nut.stackWhy_late).toBe("Plus de Stack après la floraison S3.")
    expect(read("src/screens/tools/ipw.tsx")).toMatch(/stackMlPerL: shownPerL\(stackFoliarPerL\(\)\)/)
    expect(read("src/screens/tools/spray.tsx")).toMatch(/kind === "stack" \? <StackSprayTool \/>/)
  })

  it("à la main possible (règle du lot 7b), rappel hebdomadaire proposé, jamais créé tout seul", () => {
    expect(read("src/screens/tools/nutrition-settings.tsx")).toMatch(/STACK_USES\.map/)
    expect(read("src/screens/tools/stack-card.tsx")).toMatch(/ed\.openReminder\(\{ title: STACK\.name, spaceId, repeat: "weekly"/)
    for (const f of ["src/calc/reminders.ts", "src/calc/deadlines.ts"]) {
      let src = ""
      try {
        src = read(f)
      } catch {
        continue
      }
      expect(src).not.toMatch(/stack/i)
    }
  })

  it("source dans l'ⓘ et dans À propos ; textes en trois langues", () => {
    for (const d of [fr, en, de]) {
      expect(d.info.nutrition).toMatch(/Stack.*20[./]10[./]2026/)
      expect(d.about.athena4).toMatch(/\{drench\}.*\{foliar\}.*\{week\}/)
      for (const k of ["stackSub", "stackDone", "stackHandD", "stackFoliarD", "stackShake", "stackReminder", "lbl", "lblD", "lblMissing", "lblTyped", "lblAdd"] as const) expect(d.nut[k]).toBeTruthy()
    }
  })
})

describe("lot 14b — Proper et Cuts : aucune dose publiée par Athena", () => {
  const product = (x: Partial<CustomProduct>): CustomProduct => ({ schemaVersion: 2, id: x.athena ?? "p", name: "P", unit: "mL", application: "tank", verified: false, source: "label", createdAt: "", ...x })
  const proper = product({ name: "Proper", athena: "proper" })
  const cuts = product({ name: "Cuts", athena: "cuts", use: { clone: true } })

  it("sans dose saisie, dans aucune recette (Pro et Blended, toutes les phases)", () => {
    for (const c of [ATHENA_PRO, ATHENA_BLENDED]) for (const p of c.program) {
      const ids = mixRecipe(c.id, { phaseId: p.id, volumeL: 100, custom: [proper, cuts] }).items.map((i) => i.id)
      expect(ids).not.toContain("proper")
      expect(ids).not.toContain("cuts")
    }
    // An older « Proper » typed by hand with the brand Athena is the same product.
    expect(labelOnlyOf({ name: " proper ", brand: "Athena" })).toBe("proper")
    expect(labelOnlyOf({ name: "Proper", brand: "Autre" })).toBeUndefined()
  })

  it("avec la dose de l'étiquette : Proper avec les deux gammes ; Cuts seulement en Blended, au stade bouture", () => {
    const p = { ...proper, dosePer10L: { lo: 2, hi: 2 }, use: { veg: true } }
    const c = { ...cuts, dosePer10L: { lo: 1, hi: 1 } }
    expect(mixRecipe("athena-pro", { phaseId: "veg", volumeL: 10, custom: [p] }).items.map((i) => i.id)).toContain("proper")
    expect(mixRecipe("athena-blended", { phaseId: "veg", volumeL: 10, custom: [p] }).items.map((i) => i.id)).toContain("proper")
    expect(mixRecipe("athena-blended", { phaseId: "clone", volumeL: 10, custom: [c] }).items.find((i) => i.id === "cuts")).toMatchObject({ qty: 1, src: { kind: "label" } })
    expect(mixRecipe("athena-pro", { phaseId: "clone", volumeL: 10, custom: [c] }).items.map((i) => i.id)).not.toContain("cuts")
    expect(mixRecipe("athena-blended", { phaseId: "veg", volumeL: 10, custom: [c] }).items.map((i) => i.id)).not.toContain("cuts")
  })

  it("aucune valeur pour Proper ou Cuts dans le code ; proposés dans la liste des produits avec la mention", () => {
    expect(LABEL_ONLY).toEqual([
      { id: "proper", name: "Proper", lines: ["athena-pro", "athena-blended"] },
      { id: "cuts", name: "Cuts", lines: ["athena-blended"], stage: "clone" },
    ])
    expect(read("src/data/nutrients/athena-extras.ts")).not.toMatch(/(proper|cuts)[^\n]*\d+\s*mL/i)
    const parts = read("src/screens/tools/nutrition-parts.tsx")
    expect(parts).toMatch(/id="nut-label-only"/)
    expect(parts).toMatch(/athena: x\.id, application: "tank"/)
    expect(fr.nut.lblMissing).toBe("dose non publiée par Athena : saisis celle de ton étiquette")
    expect(fr.nut.lblTyped).toBe("dose de l'étiquette, saisie par toi")
  })
})
