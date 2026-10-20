import { describe, expect, it } from "vitest"
import { draftDocs, emptyDraft, issueField, startCycle, stepIssues, type Draft } from "@/lib/onboarding"
import type { Cycle } from "@/model/types"
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
