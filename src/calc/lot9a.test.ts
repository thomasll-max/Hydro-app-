import { describe, expect, it } from "vitest"
import { DIGEST_DAYS, digestDocs, digestWeek, morningText, staleDigestIds, type Digest } from "./digest"
import { thomasGrow } from "@/data/thomas-grow"

const NOW = "2026-10-18T06:00:00.000Z"
const TODAY = "2026-10-18"
const seed = thomasGrow(NOW, TODAY)
// Planned 12/12 in three days: the deadline must be in the digest of that day, not before.
const data = { grow: seed.grow, spaces: seed.spaces, cycles: [{ ...seed.cycles[0], plannedFlipDate: "2026-10-21" }], entries: [], mixes: [], equipment: seed.equipment, assignments: seed.assignments, customProducts: seed.customProducts, reminders: [] }

describe("lot 9 — tâche du matin", () => {
  it("une semaine de résumés préparée d'avance, échéances au bon jour", () => {
    const week = digestWeek(data, TODAY, "fr")
    expect(week).toHaveLength(DIGEST_DAYS)
    expect(week.map((d) => d.date)).toEqual(["2026-10-18", "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"])
    expect(week.every((d) => d.computedOn === TODAY)).toBe(true)
    expect(week[3].text).toContain("12/12")
    expect(week[0].text).not.toContain("12/12")
  })
  it("documents : digest/latest = aujourd'hui, puis un par jour ; les anciens (plus de 7 jours) sont supprimés", () => {
    const docs = digestDocs(digestWeek(data, TODAY, "fr"))
    expect(docs[0][0]).toBe("digest/latest")
    expect(docs[0][1].date).toBe(TODAY)
    expect(docs.map(([p]) => p)).toContain("digest/2026-10-24")
    expect(staleDigestIds(["latest", "2026-10-01", "2026-10-11", "2026-10-12", "2026-10-20"], TODAY)).toEqual(["2026-10-01"])
  })
  it("texte envoyé : le résumé du jour ; s'il a été calculé un autre jour, la note le dit ; sinon un message clair", () => {
    const week = digestWeek(data, "2026-10-16", "fr")
    const docs = Object.fromEntries(week.map((d) => [d.date, d])) as Record<string, Digest>
    const m = morningText(docs, TODAY, "fr")
    expect(m.found).toBe(true)
    expect(m.stale).toBe(true)
    expect(m.text).toContain("Calculé le 16/10")
    const fresh = morningText({ latest: digestWeek(data, TODAY, "fr")[0] }, TODAY, "fr")
    expect(fresh).toMatchObject({ found: true, stale: false })
    // Computed on a phone set to English: the French text is still there for the morning task.
    const en = digestWeek(data, TODAY, "en")[0]
    expect(en.text).toMatch(/^Good morning/)
    expect(morningText({ [TODAY]: en }, TODAY, "fr").text).toMatch(/^Bonjour/)
    expect(morningText({}, TODAY, "fr")).toMatchObject({ found: false })
  })
})
