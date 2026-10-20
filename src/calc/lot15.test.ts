import { describe, expect, it } from "vitest"
import { draftDocs, emptyDraft, issueField, startCycle, stepIssues, type Draft } from "@/lib/onboarding"
import { derivedOk, doubtfulKeys, ENTRY_RANGE, fieldIssues, impossible, outOfRange, outside, stored, TANK_RANGE, trusted } from "@/calc/plausible"
import { derive } from "@/model/entry"
import { MIX_RANGE, VOICE_RANGE } from "@/calc/voice"
import { SCHEMA, type Cycle, type Entry } from "@/model/types"
import { fr } from "@/i18n/fr"
import { en } from "@/i18n/en"
import { de } from "@/i18n/de"

const NOW = "2026-10-20T06:00:00.000Z"
const names = { lamp: "Lampe", pots: (v: number) => `Pots ${v} L`, tank: (l: number) => `Réservoir ${l} L`, extractor: "Extracteur" }
const ids = () => {
  let n = 0
  return (p: string) => `${p}${++n}`
}
const docsOf = (d: Draft) => draftDocs(d, { now: NOW, today: "2026-10-20", id: ids(), names })
const named = (): Draft => ({ ...emptyDraft("Floraison"), name: "Grow de Léa" })

describe("lot 15a — un premier cycle sans pots, jamais sans date ni sans espace", () => {
  it("l'assistant crée le cycle sans pots, dans son espace, avec sa date de départ", () => {
    const d = named()
    const cycle = startCycle(d, "Cycle 1", undefined, "2026-10-20")
    const docs = docsOf({ ...d, cycle })
    const c = docs.find(([p]) => p.startsWith("cycles/"))?.[1] as unknown as Cycle
    const space = docs.find(([p]) => p.startsWith("spaces/"))?.[1] as { id: string }
    expect(c).toMatchObject({ name: "Cycle 1", spaceId: space.id, germinationDate: "2026-10-20" })
    // No pots typed: none written (« donnée manquante » where they are used).
    expect(c.potVolumeL).toBeUndefined()
    expect(c.potCount).toBeUndefined()
  })

  it("chaque problème mène à son champ (le message s'écrit dessous)", () => {
    const d = named()
    const c = startCycle(d, "", undefined, undefined)
    const withCycle = { ...d, cycle: { ...c, potL: 11, potN: 0 } }
    expect(stepIssues(withCycle, "cycle")).toEqual(["cycleName", "cycleStart", "cyclePots"])
    expect(issueField(withCycle, "cycle", "cycleName")).toBe("onb-c-name")
    expect(issueField(withCycle, "cycle", "cycleStart")).toBe("onb-c-germ")
    expect(issueField(withCycle, "cycle", "cyclePots")).toBe("onb-c-potn")
    expect(issueField({ ...d, cycle: { ...c, potL: NaN } }, "cycle", "cyclePots")).toBe("onb-c-potl")
    expect(issueField({ ...d, name: "" }, "name", "name")).toBe("onb-name")
    // The second space's height, the first space's tank.
    const two: Draft = { ...d, spaces: [{ ...d.spaces[0], gear: { tankL: -2 } }, { ...d.spaces[0], key: "k2", name: "", dims: { l: 80, h: 0 } }] }
    expect(issueField(two, "spaces", "spaceName")).toBe("onb-sp-name-1")
    expect(issueField(two, "spaces", "dims")).toBe("onb-h-1")
    expect(issueField(two, "equipment", "gear")).toBe("onb-tank-0")
    expect(issueField(two, "digest", "time")).toBe("onb-digest")
    expect(issueField(two, "spaces", "noSpace")).toBeUndefined()
  })

  it("la date de départ a les mêmes mots dans l'assistant et dans la feuille, et le pic des pots est facultatif partout", () => {
    for (const m of [fr, en, de]) {
      expect(m.cycleForm.needStart.length).toBeGreaterThan(5)
      expect(m.today.emptySpaceCta.length).toBeGreaterThan(3)
      expect(m.today.orphan.length).toBeGreaterThan(5)
      expect(m.space.needName.length).toBeGreaterThan(5)
    }
    expect(fr.onb.issue.cyclePots).toBe("Pots : des nombres plus grands que zéro, ou laisse vide.")
  })
})

const entry = (x: Partial<Entry>): Entry => ({ schemaVersion: SCHEMA.entry, id: "2026-10-20_sp1", date: "2026-10-20", spaceId: "sp1", createdAt: NOW, updatedAt: NOW, ...x })

describe("lot 15b — valeurs absurdes", () => {
  it("toute saisie a les plages de la dictée (lot 11)", () => {
    for (const [k, r] of Object.entries(VOICE_RANGE)) expect(ENTRY_RANGE[k as keyof typeof ENTRY_RANGE]).toMatchObject({ min: r.min, max: r.max })
    expect(ENTRY_RANGE.phRunoff).toMatchObject({ min: 3, max: 9 })
    expect(ENTRY_RANGE.ecIn).toMatchObject({ min: 0, max: 6 })
    expect(ENTRY_RANGE.tempDay).toMatchObject({ min: 5, max: 40 })
    expect(ENTRY_RANGE.rh).toMatchObject({ min: 10, max: 100 })
    expect(ENTRY_RANGE.weightPeakKg).toMatchObject({ min: 0, max: 50 })
    expect(ENTRY_RANGE.heightCm).toMatchObject({ min: 0, max: 400 })
    expect(outOfRange("phRunoff", 13.1)).toMatchObject({ min: 3, max: 9 })
    expect(outOfRange("phRunoff", 5.8)).toBeNull()
    expect(outOfRange("tempDay", 400)).not.toBeNull()
    expect(outOfRange("note", 400)).toBeNull()
    // A tank: the ranges of a tank said aloud (volume 1–2000 L, EC 0–6, pH 3–9).
    expect(TANK_RANGE).toBe(MIX_RANGE)
    expect(outside(13.1, TANK_RANGE.ph)).toMatchObject({ min: 3, max: 9 })
    expect(outside(2.4, TANK_RANGE.ec)).toBeNull()
    expect(outside(undefined, TANK_RANGE.volumeL)).toBeNull()
    expect(outside(0, TANK_RANGE.volumeL)).not.toBeNull()
  })

  it("le cas du 20/10 : pot matin 24, pic 20, pH runoff 13,1, T° 400 → refusé sous chaque champ", () => {
    const shown = ["weightMorningKg", "weightPeakKg", "phRunoff", "tempDay", "rh"]
    const issues = fieldIssues({ weightMorningKg: 24, weightPeakKg: 20, phRunoff: 13.1, tempDay: 400, rh: 55 }, shown)
    expect(issues).toEqual([
      { key: "phRunoff", code: "range", min: 3, max: 9 },
      { key: "tempDay", code: "range", min: 5, max: 40 },
      { key: "weightMorningKg", code: "swapped" },
      { key: "weightPeakKg", code: "swapped" },
    ])
    // A field not on screen never blocks.
    expect(fieldIssues({ tempDay: 400 }, ["rh"])).toEqual([])
    // The dryback, the VPD: not computed.
    const d = derive(entry({ weightMorningKg: 24, weightPeakKg: 20, tempDay: 400, rh: 55, phRunoff: 13.1 }))
    expect(d.dryback).toBeUndefined()
    expect(d.vpd).toBeUndefined()
    expect(impossible("dryback", d)).toBe(true)
    expect(impossible("vpd", d)).toBe(true)
    // Right values: computed as before.
    const ok = derive(entry({ weightMorningKg: 20, weightPeakKg: 24, tempDay: 25, rh: 60, runoffMl: 300, volumePerPotMl: 1500, ppfd: 900, photoperiodH: 12 }))
    expect(ok).toMatchObject({ dryback: 16.7, runoffPct: 20, dli: 38.9 })
    expect(ok.vpd).toBeGreaterThan(0)
    expect(impossible("dryback", ok)).toBe(false)
  })

  it("valeurs dérivées : jamais hors de ce que leur formule peut donner", () => {
    expect(derivedOk("runoffPct", 150, { runoffMl: 3000, volumePerPotMl: 2000 })).toBe(false)
    expect(derivedOk("dryback", -20, { weightMorningKg: 24, weightPeakKg: 20 })).toBe(false)
    expect(derivedOk("vpd", 28654.56, { tempDay: 400, rh: 50 })).toBe(false)
    expect(derivedOk("dli", 38.9, { ppfd: 900, photoperiodH: 12 })).toBe(true)
    expect(derive(entry({ runoffMl: 3000, volumePerPotMl: 2000 })).runoffPct).toBeUndefined()
  })

  it("données déjà enregistrées : gardées, mises à part pour les calculs, jamais effacées par un enregistrement", () => {
    const old = entry({ weightMorningKg: 24, weightPeakKg: 20, dryback: -20, phRunoff: 13.1, ecRunoff: 3.2, tempDay: 400, rh: 55, vpd: 28654.56 })
    expect(doubtfulKeys(old)).toEqual(["tempDay", "phRunoff", "weightMorningKg", "weightPeakKg", "vpd", "dryback"])
    const tr = trusted(old)
    expect(tr).toMatchObject({ ecRunoff: 3.2, rh: 55 })
    for (const k of ["tempDay", "weightMorningKg", "weightPeakKg", "phRunoff", "vpd", "dryback"] as const) expect(tr[k]).toBeUndefined()
    expect(tr.doubtful).toMatchObject({ phRunoff: 13.1, tempDay: 400, dryback: -20, vpd: 28654.56 })
    // A plausible entry is the same object.
    const fine = entry({ phRunoff: 5.9 })
    expect(trusted(fine)).toBe(fine)
    // Saved again from elsewhere (photo tags, undo): everything is back, `doubtful` never stored.
    const back = stored({ ...tr, note: "photo" })
    expect(back).toMatchObject({ phRunoff: 13.1, tempDay: 400, weightMorningKg: 24, note: "photo" })
    expect("doubtful" in back).toBe(false)
    // A value corrected in the form wins over the old one.
    expect(stored({ ...tr, phRunoff: 6.1 }).phRunoff).toBe(6.1)
  })
})
