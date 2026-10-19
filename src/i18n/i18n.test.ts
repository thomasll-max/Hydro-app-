import { describe, expect, it } from "vitest"
import { fr } from "./fr"
import { en } from "./en"
import { de } from "./de"
import {
  flattenKeys,
  formatDayMonth,
  formatNumber,
  formatRange,
  formatTime,
  lookup,
  placeholders,
  translate,
} from "./core"

describe("dictionnaires FR/EN/DE (lot 10i)", () => {
  const frKeys = flattenKeys(fr)

  it("ont exactement les mêmes clés", () => {
    expect(flattenKeys(en)).toEqual(frKeys)
    expect(flattenKeys(de)).toEqual(frKeys)
  })

  it("utilisent les mêmes variables dans chaque texte", () => {
    for (const key of frKeys) {
      const k = key as Parameters<typeof lookup>[1]
      expect(placeholders(lookup(en, k)), key).toEqual(placeholders(lookup(fr, k)))
      expect(placeholders(lookup(de, k)), key).toEqual(placeholders(lookup(fr, k)))
    }
  })

  it("n'ont aucun texte vide", () => {
    for (const key of frKeys) {
      const k = key as Parameters<typeof lookup>[1]
      for (const dict of [fr, en, de]) expect(lookup(dict, k).trim(), key).not.toBe("")
    }
  })
})

describe("traduction", () => {
  it("remplace les variables", () => {
    expect(translate("fr", "today.rowShot", { n: 2, total: 6, ml: 450 })).toBe("Dose 2/6 · 450 mL")
    expect(translate("en", "today.rowShot", { n: 2, total: 6, ml: 450 })).toBe("Shot 2/6 · 450 mL")
  })
  it("retombe sur la clé si elle manque", () => {
    expect(lookup(fr, "nope.missing" as never)).toBe("nope.missing")
  })
})

describe("formats selon la langue", () => {
  it("nombres : FR 2,0 / EN 2.0 / DE 2,0", () => {
    expect(formatNumber("fr", 2, 1)).toBe("2,0")
    expect(formatNumber("en", 2, 1)).toBe("2.0")
    expect(formatNumber("de", 2, 1)).toBe("2,0")
  })
  it("plages", () => {
    expect(formatRange("fr", 5.8, 6.2, 1)).toBe("5,8–6,2")
    expect(formatRange("en", 5.8, 6.2, 1)).toBe("5.8–6.2")
  })
  it("dates : FR 18/10 / EN Oct 18", () => {
    const d = new Date(2026, 9, 18, 7, 42)
    expect(formatDayMonth("fr", d)).toBe("18/10")
    expect(formatDayMonth("en", d)).toBe("Oct 18")
    expect(formatDayMonth("de", d)).toBe("18.10.")
  })
  it("heure sur 24 h", () => {
    const d = new Date(2026, 9, 18, 7, 42)
    expect(formatTime("fr", d)).toBe("07:42")
    expect(formatTime("en", d)).toBe("07:42")
  })
})

describe("toutes les corrections ont un texte", () => {
  it("advice.<mesure>.<sens> a un titre et un corps (ou auto/manuel)", async () => {
    const { oneCorrection } = await import("@/calc/advice")
    const { dayTargets } = await import("@/calc/targets")
    const t = dayTargets("stretch", { mode: "auto", substrate: "coco", flowerWeek: 3 })!
    const metrics = ["phRunoff", "ecRunoff", "dryback", "runoffPct", "phIn", "ecIn", "vpd", "dli"] as const
    for (const mode of ["auto", "manual"] as const)
      for (const m of metrics)
        for (const v of [-100, 1000]) {
          const a = oneCorrection({ schemaVersion: 1, id: "x", date: "2026-10-18", spaceId: "s", createdAt: "", updatedAt: "", [m]: v }, t, mode)!
          for (const lang of [fr, en, de]) {
            expect(lookup(lang, `${a.key}.title` as never), a.key).not.toBe(`${a.key}.title`)
            expect(lookup(lang, a.bodyKey as never), a.bodyKey).not.toBe(a.bodyKey)
          }
        }
  })
})
