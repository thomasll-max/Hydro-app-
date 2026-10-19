import { describe, expect, it } from "vitest"
import { formatDate, interpolate, placeholders, translate } from "@/i18n/core"
import { freeColor } from "@/model/grow-ops"
import { copyGearToOthers, draftSpace, duplicateDraftSpace, emptyDraft } from "@/lib/onboarding"

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
