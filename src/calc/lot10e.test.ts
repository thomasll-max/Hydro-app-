import { describe, expect, it } from "vitest"
import { formatDate, interpolate, placeholders, translate } from "@/i18n/core"
import { freeColor } from "@/model/grow-ops"
import { copyGearToOthers, draftSpace, duplicateDraftSpace, emptyDraft } from "@/lib/onboarding"
import { dayTargets } from "./targets"
import { buildDailyDigest } from "./digest"
import { deadlines } from "@/calendar/deadlines"
import { OWN_LINE } from "@/data/nutrients"
import { FLOWER_ID, thomasGrow } from "@/data/thomas-grow"

describe("lot 10e — textes", () => {
  it("pluriels : plus de « espace(s) » ; 0 et 1 au singulier en français, seulement 1 en anglais", () => {
    expect(translate("fr", "site.spaces", { n: 1 })).toBe("1 espace")
    expect(translate("fr", "site.spaces", { n: 0 })).toBe("0 espace")
    expect(translate("fr", "site.spaces", { n: 3 })).toBe("3 espaces")
    expect(translate("en", "site.spaces", { n: 0 })).toBe("0 spaces")
    expect(translate("en", "site.spaces", { n: 1 })).toBe("1 space")
    expect(translate("fr", "quick.saved", { n: 2 })).toBe("2 espaces enregistrés")
    expect(interpolate("{n} {n|bidon|bidons}", { n: "1,5" }, "fr")).toBe("1,5 bidon")
    expect(placeholders("{n} {n|a|b} {steps|x|y}")).toEqual(["n", "steps"])
  })
  it("dates de sauvegarde avec l'année", () => {
    const d = new Date("2026-10-19T12:00:00")
    expect(formatDate("fr", d)).toBe("19/10/2026")
    expect(formatDate("en", d)).toBe("Oct 19, 2026")
  })
})

describe("lot 10e — espaces et assistant", () => {
  it("la couleur d'un nouvel espace est la première libre, et ne dépend plus de l'ordre", () => {
    expect(freeColor([])).toBe("emerald")
    expect(freeColor(["emerald", "violet"])).toBe("sky")
    // Space 2 (sky) removed: a new space takes sky again, space 3 keeps violet.
    expect(freeColor(["emerald", "violet"], 2)).toBe("sky")
  })
  it("l'assistant garde la couleur choisie à l'ajout", () => {
    let d = emptyDraft("Floraison")
    d = { ...d, spaces: [...d.spaces, draftSpace("k2", "Colonne", "veg", freeColor(d.spaces.map((s) => s.color)))] }
    d = duplicateDraftSpace(d, "k2", "k3", (n) => `${n} 2`)
    expect(d.spaces.map((s) => s.color)).toEqual(["emerald", "sky", "violet"])
    d = { ...d, spaces: d.spaces.filter((s) => s.key !== "k2") }
    expect(d.spaces.map((s) => s.color)).toEqual(["emerald", "violet"])
  })
  it("étape Équipement : « Copier vers les autres espaces » ne crée pas d'espace", () => {
    let d = emptyDraft("Floraison")
    d = { ...d, spaces: [{ ...d.spaces[0], gear: { lampW: 240, potL: 15 } }, draftSpace("k2", "Colonne", "veg", "sky")] }
    const out = copyGearToOthers(d, d.spaces[0].key)
    expect(out.spaces.length).toBe(2)
    expect(out.spaces[1].gear).toEqual({ lampW: 240, potL: 15 })
    expect(out.spaces[1].name).toBe("Colonne")
  })
})

describe("lot 10e — « Autre marque / je dose moi-même »", () => {
  const NOW = "2026-10-18T06:00:00.000Z"
  it("aucune cible d'EC ni de pH ; les repères d'arrosage restent", () => {
    const auto = dayTargets("bulk", { mode: "auto", substrate: "coco", flowerWeek: 5, line: OWN_LINE })!
    expect([auto.ecIn, auto.phIn, auto.ecRunoff, auto.phRunoff]).toEqual([undefined, undefined, undefined, undefined])
    expect(auto.dryback).toMatchObject({ lo: 30, hi: 40 })
    expect(auto.vpd).toBeDefined()
    const manual = dayTargets("veg", { mode: "manual", substrate: "coco", line: OWN_LINE })!
    expect(manual.ecRunoff).toBeUndefined()
    expect(manual.runoffPct).toMatchObject({ lo: 10, hi: 25, src: "app" })
    expect(dayTargets("seedling", { mode: "auto", substrate: "coco", line: OWN_LINE })!.ecIn).toBeUndefined()
    // Athena lines unchanged.
    expect(dayTargets("bulk", { mode: "auto", substrate: "coco", flowerWeek: 5, line: "athena-pro" })!.ecRunoff).toBeDefined()
  })
  it("ni Fade ni rinçage Athena dans le calendrier ; la carte Bonjour renvoie aux consignes de la marque", () => {
    const s = thomasGrow(NOW, "2026-06-01")
    const grow = { ...s.grow, nutrition: { line: OWN_LINE, addons: [], dosing: "powder" as const } }
    const cycle = { ...s.cycles[0], spaceId: FLOWER_ID, germinationDate: "2026-07-01", vegDate: "2026-07-15", flipDate: "2026-08-24", flowerWeeks: 9 }
    const data = { grow, spaces: s.spaces, cycles: [cycle], entries: [], mixes: [], events: [], equipment: s.equipment, assignments: s.assignments, customProducts: s.customProducts, reminders: [] }
    const kinds = deadlines(data, "2026-10-15").map((d) => d.kind)
    expect(kinds).not.toContain("fade")
    expect(kinds).not.toContain("flush")
    const d = buildDailyDigest(data, "2026-10-24", "fr")
    expect(d.spaces.find((x) => x.spaceId === FLOWER_ID)!.lines.map((l) => l.text)).toContain("Rinçage : suis les consignes de ta marque")
  })
})
