import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { draftDocs, emptyDraft, startCycle, type Draft } from "@/lib/onboarding"
import { startChecklist, startProgress, type StartItem } from "@/calc/getting-started"
import { lowerFirst, translate } from "@/i18n/core"
import type { Equipment, EquipmentAssignment, Space } from "@/model/grow"
import type { Cycle } from "@/model/types"

const NOW = "2026-10-20T06:00:00.000Z"
const TODAY = "2026-10-20"
const names = { lamp: "Lampe", pots: (v: number) => `Pots ${v} L`, tank: (l: number) => `Réservoir ${l} L`, extractor: "Extracteur" }
const ids = () => {
  let n = 0
  return (p: string) => `${p}${++n}`
}
const byId = (items: StartItem[]) => Object.fromEntries(items.map((i) => [i.id, i])) as Record<StartItem["id"], StartItem>

/** Premiers pas from what the assistant writes. */
function checklistOf(d: Draft) {
  const docs = draftDocs(d, { now: NOW, today: TODAY, id: ids(), names })
  const pick = <T,>(c: string) => docs.filter(([p]) => p.startsWith(`${c}/`)).map(([, x]) => x as unknown as T)
  return startChecklist({ spaces: pick<Space>("spaces"), cycles: pick<Cycle>("cycles"), equipment: pick<Equipment>("equipment"), assignments: pick<EquipmentAssignment>("equipmentAssignments"), mixes: [], entries: [], today: TODAY, lastBackup: null })
}

describe("lot 15c — petits défauts", () => {
  it("le bandeau garde la casse d'origine : seule la première lettre passe en minuscule", () => {
    expect(lowerFirst("fr", translate("fr", "start.i.lamp"))).toBe("ta lampe : watts réels (et PPF ou efficacité si tu les as)")
    expect(lowerFirst("en", translate("en", "start.i.lamp"))).toContain("PPF")
    expect(lowerFirst("en", translate("en", "start.i.lamp")).charAt(0)).toBe(translate("en", "start.i.lamp").charAt(0).toLowerCase())
    // German keeps its capitals; an acronym at the start stays as it is.
    expect(lowerFirst("de", translate("de", "start.i.lamp"))).toBe(translate("de", "start.i.lamp"))
    expect(lowerFirst("fr", "EC runoff")).toBe("EC runoff")
    expect(readFileSync("src/screens/guide-line.tsx", "utf8")).toContain("lowerFirst(settings.lang")
  })

  it("Premiers pas se coche avec ce que l'assistant a reçu : lampe, pots (de l'équipement ou du cycle), cycle", () => {
    const d0: Draft = { ...emptyDraft("Floraison"), name: "Grow" }
    // Lamp and pots at the equipment step, a cycle.
    const geared: Draft = { ...d0, spaces: [{ ...d0.spaces[0], gear: { lampW: 240, potL: 11, potN: 4 } }] }
    const a = byId(checklistOf({ ...geared, cycle: startCycle(geared, "Cycle 1", undefined, TODAY) }))
    expect([a.lamp.done, a.pots.done, a.cycle.done]).toEqual([true, true, true])
    // The 20/10 case: pots typed only at the cycle step → they are the space's pots, « Tes pots » is ticked.
    const lit: Draft = { ...d0, spaces: [{ ...d0.spaces[0], gear: { lampW: 240 } }] }
    const items = checklistOf({ ...lit, cycle: { ...startCycle(lit, "Cycle 1", undefined, TODAY), potL: 15.5, potN: 4 } })
    const b = byId(items)
    expect([b.lamp.done, b.pots.done, b.cycle.done]).toEqual([true, true, true])
    expect(startProgress(items)).toMatchObject({ done: 3, total: 7 })
    // No pots anywhere: « Tes pots » stays to do (nothing invented).
    expect(byId(checklistOf({ ...lit, cycle: startCycle(lit, "Cycle 1", undefined, TODAY) })).pots.done).toBe(false)
  })

  it("les pots du cycle ne remplacent jamais ceux de l'étape équipement", () => {
    const d0: Draft = { ...emptyDraft("Floraison"), name: "Grow" }
    const geared: Draft = { ...d0, spaces: [{ ...d0.spaces[0], gear: { potL: 11, potN: 4 } }] }
    const docs = draftDocs({ ...geared, cycle: { ...startCycle(geared, "Cycle 1", undefined, TODAY), potL: 15, potN: 2 } }, { now: NOW, today: TODAY, id: ids(), names })
    const pots = docs.filter(([p]) => p.startsWith("equipment/")).map(([, e]) => e as unknown as Equipment)
    expect(pots).toHaveLength(1)
    expect(pots[0].container).toMatchObject({ volumeL: 11, count: 4 })
  })

  it("après « Terminer », l'assistant ouvre Aujourd'hui (le bandeau Premiers pas y est)", () => {
    const src = readFileSync("src/screens/onboarding.tsx", "utf8")
    expect(src).toContain('navigate({ tab: "today" })')
    expect(src).not.toContain('tool: "start"')
  })
})
