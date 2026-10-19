import { describe, expect, it } from "vitest"
import { stageOn } from "./stage"
import { applyStep, autoEventOps, equipmentPrefill, expectedHarvest, nextStep, undoStep } from "./steps"
import { deadlines, deadlineState } from "@/calendar/deadlines"
import { thomasGrow, FLOWER_ID, COLUMN_ID } from "@/data/thomas-grow"
import { transferCycle } from "@/model/grow-ops"
import { defaultCycle } from "@/screens/sheets"
import type { Cycle, GrowEvent, Mix } from "@/model/types"

const NOW = "2026-10-19T06:00:00.000Z"
const cyc = (p: Partial<Cycle> = {}): Cycle => ({ ...defaultCycle(), id: "cy1", name: "Blue Zushi", ...p })

describe("lot 10b — stades : « Passer en végé »", () => {
  it("la végé commence au jour du bouton, dans n'importe quel espace (plus de semis au-delà)", () => {
    const c = cyc({ germinationDate: "2026-10-01", vegDate: "2026-10-15" })
    expect(stageOn(c, "2026-10-14").key).toBe("seedling")
    expect(stageOn(c, "2026-10-15").key).toBe("veg")
    // Old cycles without the button: veg from the transfer into the flowering space, as before.
    expect(stageOn(cyc({ germinationDate: "2026-10-01", transferDate: "2026-11-05" }), "2026-10-20").key).toBe("seedling")
  })
})

describe("lot 10b — étapes en un geste", () => {
  it("étape suivante : végé → 12/12 → récolte, rien avant le départ ni après la récolte", () => {
    expect(nextStep(cyc(), "2026-10-19")).toBeNull()
    expect(nextStep(cyc({ germinationDate: "2026-10-20" }), "2026-10-19")).toBeNull()
    expect(nextStep(cyc({ germinationDate: "2026-10-01" }), "2026-10-19")).toBe("veg")
    expect(nextStep(cyc({ germinationDate: "2026-10-01", vegDate: "2026-10-15" }), "2026-10-19")).toBe("flip")
    expect(nextStep(cyc({ germinationDate: "2026-10-01", flipDate: "2026-10-18" }), "2026-10-19")).toBe("harvest")
    expect(nextStep(cyc({ germinationDate: "2026-10-01", flipDate: "2026-10-18", harvestDate: "2026-12-20" }), "2026-12-21")).toBeNull()
  })
  it("une étape n'écrit que sa date ; Annuler la remet comme avant", () => {
    const c = cyc({ germinationDate: "2026-10-01", vegDate: "2026-10-15" })
    const flipped = applyStep(c, "flip", "2026-10-19")
    expect(flipped.flipDate).toBe("2026-10-19")
    expect(flipped.harvestDate).toBeUndefined()
    expect(undoStep(flipped, "flip").flipDate).toBeUndefined()
    expect(undoStep(applyStep(c, "veg", "2026-10-19"), "veg", "2026-10-15").vegDate).toBe("2026-10-15")
  })
  it("récolte prévue = 12/12 + semaines de floraison, jamais écrite comme récolte", () => {
    const c = cyc({ flipDate: "2026-10-19", flowerWeeks: 9 })
    expect(expectedHarvest(c)).toBe("2026-12-21")
    expect(expectedHarvest({ ...c, harvestDate: "2026-12-18" })).toBeUndefined()
    expect(applyStep(c, "flip", "2026-10-19").harvestDate).toBeUndefined()
  })
})

describe("lot 10b — événements automatiques du cycle", () => {
  const ev = (p: Partial<GrowEvent>): GrowEvent => ({ schemaVersion: 2, id: "cy1_auto-flip", date: "2026-10-19", type: "flip", cycleId: "cy1", createdAt: NOW, ...p })
  it("créé avec la date, déplacé (note et Great White gardés), supprimé quand la date est effacée", () => {
    const prev = cyc({ flipDate: "2026-10-19" })
    const kept = ev({ note: "Passage en 12/12", products: [{ productId: "great-white" }] })
    const moved = autoEventOps(prev, { ...prev, flipDate: "2026-10-20" }, [kept], NOW)
    expect(moved).toEqual([["cy1_auto-flip", { ...kept, date: "2026-10-20", spaceId: undefined }]])
    expect(autoEventOps(prev, { ...prev, flipDate: undefined }, [kept], NOW)).toEqual([["cy1_auto-flip", null]])
    const created = autoEventOps(cyc(), cyc({ vegDate: "2026-10-15" }), [], NOW)
    expect(created.map(([id, e]) => [id, e?.type, e?.date])).toEqual([["cy1_auto-veg", "veg", "2026-10-15"]])
    expect(autoEventOps(prev, prev, [kept], NOW)).toEqual([])
  })
})

describe("lot 10b — création minimale, rien d'inventé", () => {
  it("les pots, le débit et les lampes viennent de l'équipement de l'espace ; sans équipement, ils restent vides", () => {
    const s = thomasGrow(NOW, "2026-10-19")
    const fl = equipmentPrefill(FLOWER_ID, "2026-10-19", s.equipment, s.assignments)
    expect(fl.potVolumeL).toBe(15)
    expect(fl.potCount).toBe(4)
    expect(fl.waterMode).toBe("auto")
    expect(fl.lights).toContain("EVO4")
    const none = equipmentPrefill("nowhere", "2026-10-19", s.equipment, s.assignments)
    expect(none.potVolumeL).toBeUndefined()
    expect(none.potCount).toBeUndefined()
    expect(none.waterMode).toBe("manual")
    // The defaults of a new cycle carry no pots, no cultivar, no lamps (they were Thomas's).
    const d = defaultCycle()
    expect(d.potVolumeL).toBeUndefined()
    expect(d.potCount).toBeUndefined()
    expect(d.cultivars).toEqual([])
    expect(d.lights).toBe("")
  })
})

describe("lot 10b — Fade, rinçage et Great White se cochent avec les données", () => {
  const s = thomasGrow(NOW, "2026-10-19")
  const base = (c: Partial<Cycle>, extra: { mixes?: Mix[]; events?: GrowEvent[] } = {}) => ({
    grow: s.grow,
    spaces: s.spaces,
    cycles: [{ ...s.cycles[0], ...c }],
    entries: [],
    mixes: extra.mixes ?? [],
    events: extra.events ?? [],
    equipment: s.equipment,
    assignments: s.assignments,
    customProducts: s.customProducts,
    reminders: [],
  })
  const mix = (date: string, p: Partial<Mix>): Mix => ({ schemaVersion: 4, id: `m-${date}`, date, cycleId: "cycle-1", spaceIds: [FLOWER_ID], volumeL: 60, createdAt: NOW, ...p })
  const flipped = { spaceId: FLOWER_ID, germinationDate: "2026-07-01", vegDate: "2026-07-15", flipDate: "2026-08-24", flowerWeeks: 9 }

  it("Fade : fait dès le bac de Fade de la S8 (ou l'événement)", () => {
    const today = "2026-10-15" // flowering week 8
    const find = (d: ReturnType<typeof base>) => deadlines(d, today).find((x) => x.kind === "fade")!
    const late = find(base(flipped))
    expect(deadlineState(late).done).toBe(false)
    const withTank = find(base(flipped, { mixes: [mix("2026-10-12", { phase: "finish", items: [{ id: "fade", qty: 306, unit: "mL" }] })] }))
    expect(withTank.doneBy).toBe("mix")
    expect(deadlineState(withTank).done).toBe(true)
    const withEvent = find(base(flipped, { events: [{ schemaVersion: 2, id: "e", date: "2026-10-12", type: "fade", cycleId: "cycle-1", createdAt: NOW }] }))
    expect(withEvent.doneBy).toBe("event")
  })
  it("rinçage : fait dès le bac de rinçage", () => {
    const today = "2026-10-24"
    const dl = deadlines(base(flipped, { mixes: [mix("2026-10-23", { phase: "flush", kind: "flush" })] }), today).find((x) => x.kind === "flush")!
    expect(deadlineState(dl).done).toBe(true)
  })
  it("un transfert (déplacement le jour même) amène le rappel Great White, fait si le transfert l'a noté", () => {
    const moved = transferCycle({ ...s.cycles[0], spaceId: COLUMN_ID, germinationDate: "2026-09-01" }, FLOWER_ID, "2026-10-18", NOW)
    const d = (events: GrowEvent[]) => deadlines({ ...base({}), cycles: [moved], events }, "2026-10-19").find((x) => x.kind === "greatWhite")
    expect(d([])?.date).toBe("2026-10-18")
    expect(deadlineState(d([])!).done).toBe(false)
    const tr: GrowEvent = { schemaVersion: 2, id: "t", date: "2026-10-18", type: "transfer", cycleId: "cycle-1", products: [{ productId: "great-white" }], createdAt: NOW }
    expect(deadlineState(d([tr])!).done).toBe(true)
    // An old move (more than 2 weeks): no reminder any more.
    expect(deadlines({ ...base({}), cycles: [moved] }, "2026-11-10").some((x) => x.kind === "greatWhite")).toBe(false)
  })
})
