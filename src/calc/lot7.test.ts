import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { doseFor, GALLON_L, handList, hasMixOrder, inListOrder, LABEL_VOLUMES, litresOf, moveInOrder, ownPhaseOf, ownRecipe, ownTargetsFor, per10L, usedIn } from "./own-recipe"
import { dayTargets } from "./targets"
import { mixRecipe } from "./nutrients"
import { ownTargetsFromText } from "@/screens/tools/nutrition-settings"
import { parseBackup } from "@/lib/backup"
import { OWN_LINE } from "@/data/nutrients"
import { translate } from "@/i18n/core"
import type { CustomProduct } from "@/model/grow"

const prod = (id: string, over: Partial<CustomProduct> = {}): CustomProduct => ({
  schemaVersion: 2,
  id,
  name: id.toUpperCase(),
  unit: "mL",
  application: "tank",
  verified: false,
  source: "label",
  createdAt: `2026-10-19T08:00:0${id.length % 10}Z`,
  ...over,
})
// 2 mL per 1 L in veg and S1–8; 4–6 mL per US gallon in veg; 1 g per 4 L in S3–6.
const A = prod("a", { createdAt: "2026-10-19T08:00:01Z", labelDose: { lo: 2, hi: 2, perL: 1 }, dosePer10L: per10L(2, 2, 1), use: { veg: true, flowerFrom: 1, flowerTo: 8 } })
const B = prod("b", { createdAt: "2026-10-19T08:00:02Z", labelDose: { lo: 4, hi: 6, perL: GALLON_L, gal: true }, dosePer10L: per10L(4, 6, GALLON_L), use: { veg: true } })
const C = prod("c", { createdAt: "2026-10-19T08:00:03Z", unit: "g", labelDose: { lo: 1, hi: 1, perL: 4 }, dosePer10L: per10L(1, 1, 4), use: { flowerFrom: 3, flowerTo: 6 } })

describe("lot 7a — « Autre marque » : recette perso", () => {
  it("conversions d'unités : 1 L, 4 L, 10 L, gallon US (3,785 L) → pour 10 L ; dose × volume", () => {
    expect(LABEL_VOLUMES).toEqual([1, 4, 10, "gal"])
    expect(litresOf("gal")).toBe(3.785)
    expect(per10L(2, 2, 1)).toEqual({ lo: 20, hi: 20 })
    expect(per10L(1, 1, 4)).toEqual({ lo: 2.5, hi: 2.5 })
    expect(per10L(5, 5, 10)).toEqual({ lo: 5, hi: 5 })
    expect(per10L(4, 6, GALLON_L)).toEqual({ lo: 10.57, hi: 15.85 })
    expect(doseFor({ lo: 20, hi: 20 }, 40)).toEqual([80, 80])
    expect(doseFor({ lo: 10.57, hi: 15.85 }, 40)).toEqual([42.3, 63.4])
    expect(translate("fr", "own.galNote")).toMatch(/3,785/)
  })

  it("recette du bidon : dose × volume, une fourchette en min–max ; un produit n'apparaît que dans ses semaines", () => {
    const veg = ownRecipe([A, B, C], { stage: "veg" }, 40)
    expect(veg.items.map((i) => [i.id, i.qty, i.range ?? null])).toEqual([
      ["a", 80, null],
      ["b", null, [42.3, 63.4]],
    ])
    const s4 = ownRecipe([A, B, C], { stage: "flower", week: 4 }, 40)
    expect(s4.items.map((i) => [i.id, i.qty, i.unit])).toEqual([
      ["a", 80, "mL"],
      ["c", 10, "g"],
    ])
    expect(ownRecipe([A, B, C], { stage: "flower", week: 7 }, 40).items.map((i) => i.id)).toEqual(["a"])
    expect(ownRecipe([A, B, C], { stage: "flower", week: 9 }, 40).items).toEqual([])
    expect(usedIn(C, { stage: "flower", week: 2 })).toBe(false)
    expect(usedIn(C, { stage: "flower", week: 6 })).toBe(true)
    // Weeks not typed: listed, to be completed, without a quantity; dose not typed: « dose à saisir ».
    const noWeeks = prod("d", { dosePer10L: { lo: 5, hi: 5 } })
    const noDose = prod("e", { use: { veg: true } })
    const r = ownRecipe([noWeeks, noDose], { stage: "veg" }, 40)
    expect(r.items.map((i) => [i.id, i.qty, !!i.weeksMissing, !!i.doseMissing])).toEqual([
      ["d", null, true, false],
      ["e", null, false, true],
    ])
    // Switched off, on the roots: not in the tank.
    expect(ownRecipe([prod("f", { inactive: true, use: { veg: true }, dosePer10L: { lo: 1, hi: 1 } }), prod("g", { application: "roots" })], { stage: "veg" }, 40).items).toEqual([])
    // No usable volume: nothing computed.
    expect(ownRecipe([A], { stage: "veg" }, 0).items[0].qty).toBeNull()
  })

  it("ordre de mélange : celui de la liste, déplaçable ; sans ordre saisi, « ordre non précisé »", () => {
    const r = ownRecipe([C, B, A], { stage: "veg" }, 40)
    expect(r.ordered).toBe(false)
    expect(r.items.map((i) => [i.id, i.order])).toEqual([
      ["a", null],
      ["b", null],
    ])
    const moved = moveInOrder([A, B, C], "b", -1)
    expect(moved.map((p) => [p.id, p.mixOrder])).toEqual([
      ["b", 1],
      ["a", 2],
      ["c", 3],
    ])
    expect(hasMixOrder(moved)).toBe(true)
    const o = ownRecipe(moved, { stage: "flower", week: 4 }, 40)
    expect(o.ordered).toBe(true)
    // Numbered among the products of this tank.
    expect(o.items.map((i) => [i.id, i.order])).toEqual([
      ["a", 1],
      ["c", 2],
    ])
    expect(inListOrder([{ ...C, mixOrder: 1 }, A]).map((p) => p.id)).toEqual(["c", "a"])
    expect(translate("fr", "own.orderUnset")).toMatch(/^Ordre de mélange non précisé/)
  })

  it("EC et pH : seulement les cibles saisies ; sans saisie, pas de cible ; l'app ne propose rien", () => {
    const base = { mode: "auto" as const, substrate: "coco" as const, line: OWN_LINE }
    for (const stage of ["veg", "stretch", "bulk", "finish", "flush", "seedling"] as const) {
      const t = dayTargets(stage, { ...base, flowerWeek: 4 })!
      expect(t.ecIn, stage).toBeUndefined()
      expect(t.phIn, stage).toBeUndefined()
      expect(t.ecRunoff, stage).toBeUndefined()
      expect(t.phRunoff, stage).toBeUndefined()
    }
    const own = ownTargetsFromText({ vegEc: "1,8", vegPhLo: "5,8", vegPhHi: "6,2", flowerEc: "", flowerPhLo: "6,0", flowerPhHi: "" })
    expect(own).toEqual({ veg: { ec: { lo: 1.8, hi: 1.8 }, ph: { lo: 5.8, hi: 6.2 } }, flower: { ph: { lo: 6, hi: 6 } } })
    expect(ownTargetsFromText({ vegEc: "", vegPhLo: "", vegPhHi: "", flowerEc: "", flowerPhLo: "", flowerPhHi: "" })).toBeUndefined()
    const veg = dayTargets("veg", { ...base, own })!
    expect(veg.ecIn).toEqual({ lo: 1.8, hi: 1.8, src: "user" })
    expect(veg.phIn).toEqual({ lo: 5.8, hi: 6.2, src: "user" })
    const bulk = dayTargets("bulk", { ...base, own })!
    expect(bulk.ecIn).toBeUndefined()
    expect(bulk.phIn).toEqual({ lo: 6, hi: 6, src: "user" })
    expect(ownTargetsFor(own, "flush")).toEqual({})
    // An Athena line ignores them: Pro Line and Blended unchanged.
    expect(dayTargets("veg", { mode: "auto", substrate: "coco", line: "athena-pro", own })).toEqual(dayTargets("veg", { mode: "auto", substrate: "coco", line: "athena-pro" }))
    expect(dayTargets("bulk", { mode: "manual", substrate: "coco", flowerWeek: 5, line: "athena-blended", own })).toEqual(dayTargets("bulk", { mode: "manual", substrate: "coco", flowerWeek: 5, line: "athena-blended" }))
  })

  it("phase d'après le cycle : végé, semaine de floraison ; rien pour le semis et le rinçage", () => {
    expect(ownPhaseOf({ key: "veg" })).toEqual({ stage: "veg" })
    expect(ownPhaseOf({ key: "bulk", flowerWeek: 5 })).toEqual({ stage: "flower", week: 5 })
    expect(ownPhaseOf({ key: "flush", flowerWeek: 9 })).toBeNull()
    expect(ownPhaseOf({ key: "seedling" })).toBeNull()
  })

  it("un vieux backup avec un espace en « Autre marque » s'ouvre sans perte (note texte gardée)", () => {
    const old = {
      format: "hydro-backup",
      version: 1,
      collections: {
        grow: { main: { name: "Grow", nutrition: { line: "own", addons: [], dosing: "powder" } } },
        spaces: { flo: { name: "Floraison", modules: { nutrition: true }, nutrition: { line: "own" } } },
        mixes: { m1: { schemaVersion: 3, id: "m1", date: "2026-10-01", spaceIds: ["flo"], volumeL: 40, line: "own", recipe: "Grow A 20 mL, Grow B 20 mL", items: [], ec: 1.8, createdAt: "x" } },
        customProducts: { cp1: { schemaVersion: 2, id: "cp1", name: "CalMag", unit: "mL", application: "tank", labelDose: { lo: 5, hi: 5, perL: 10 }, dosePer10L: { lo: 5, hi: 5 }, verified: false, source: "label", createdAt: "x" } },
      },
    }
    const p = parseBackup(JSON.stringify(old))
    expect(p.ok).toBe(true)
    if (!p.ok) return
    expect(p.skipped).toEqual([])
    expect(p.backup.collections.mixes!.m1).toMatchObject({ line: "own", recipe: "Grow A 20 mL, Grow B 20 mL", ec: 1.8 })
    // An old product (no weeks, no order) is listed to be completed, never given a made-up week.
    const cp = p.backup.collections.customProducts!.cp1 as unknown as CustomProduct
    expect(ownRecipe([cp], { stage: "veg" }, 40).items).toEqual([{ id: "cp1", name: "CalMag", unit: "mL", qty: null, order: null, weeksMissing: true }])
  })

  it("Pro Line et Blended : la recette Athena ne change pas avec un ordre ou des produits perso", () => {
    const withOrder = mixRecipe("athena-pro", { phaseId: "veg", volumeL: 40, ec: 3, custom: [{ ...A, mixOrder: 1 }] })
    const without = mixRecipe("athena-pro", { phaseId: "veg", volumeL: 40, ec: 3, custom: [A] })
    expect(withOrder).toEqual(without)
    expect(mixRecipe("athena-blended", { phaseId: "veg", volumeL: 40, custom: [A] }).items.map((i) => i.id)).not.toContain("proCore")
  })
})

describe("lot 7b — « à la main » et produits perso dans Athena", () => {
  const D = prod("d", { createdAt: "2026-10-19T08:00:04Z", application: "hand", labelDose: { lo: 1, hi: 2, perL: 1 }, dosePer10L: per10L(1, 2, 1), use: { veg: true, flowerFrom: 1, flowerTo: 6 } })
  const E = prod("e", { createdAt: "2026-10-19T08:00:05Z", application: "hand", unit: "g", labelDose: { lo: 5, hi: 5, perL: 10 }, dosePer10L: per10L(5, 5, 10) })

  it("produits « à la main » : ni dans la recette ni dans l'EC du bac, Athena comme « Autre marque »", () => {
    expect(ownRecipe([A, D, E], { stage: "veg" }, 40).items.map((i) => i.id)).toEqual(["a"])
    const pro = mixRecipe("athena-pro", { phaseId: "veg", volumeL: 40, ec: 3, custom: [D, E] })
    expect(pro.items.some((i) => i.kind === "custom")).toBe(false)
    expect(pro).toEqual(mixRecipe("athena-pro", { phaseId: "veg", volumeL: 40, ec: 3, custom: [] }))
    const blended = mixRecipe("athena-blended", { phaseId: "veg", volumeL: 40, custom: [D] })
    expect(blended.items.some((i) => i.id === "d")).toBe(false)
  })

  it("« À la main, si tu veux » : dose par litre d'arrosoir, dans ses semaines, sans fréquence", () => {
    expect(handList([A, D, E], { stage: "veg" })).toEqual([
      { id: "d", name: "D", unit: "mL", perL: [1, 2] },
      { id: "e", name: "E", unit: "g", perL: [0.5, 0.5], weeksMissing: true },
    ])
    expect(handList([D], { stage: "flower", week: 8 })).toEqual([])
    expect(handList([D, { ...E, inactive: true }], null).map((h) => h.id)).toEqual(["d"])
    expect(handList([prod("x", { application: "hand" })], { stage: "veg" })).toEqual([{ id: "x", name: "X", unit: "mL", perL: null, weeksMissing: true }])
    expect(translate("fr", "hand.perL", { range: "1–2", unit: "mL" })).toBe("1–2 mL par litre d'arrosoir")
  })

  it("choix d'application bac / à la main / racines, avec l'aide sur les produits organiques (sans chiffre)", () => {
    const hint = translate("fr", "nut.pHandHint")
    expect(hint).toBe("Produits organiques (enzymes, sucres, extraits) : plutôt à la main, ils peuvent boucher les goutteurs et se dégrader dans un bac de plusieurs jours.")
    expect(hint).not.toMatch(/\d/)
    const sheet = fs.readFileSync(path.resolve(import.meta.dirname, "../screens/tools/nutrition-parts.tsx"), "utf8")
    expect(sheet).toMatch(/value: "tank"[\s\S]*value: "hand"[\s\S]*value: "roots"/)
    expect(translate("en", "nut.customHand")).toBe("by hand")
    expect(translate("de", "hand.title")).toBe("Von Hand, wenn du magst")
  })
})
