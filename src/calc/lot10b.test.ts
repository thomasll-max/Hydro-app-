import { describe, expect, it } from "vitest"
import { stageOn } from "./stage"
import { applyStep, autoEventOps, equipmentPrefill, expectedHarvest, nextStep, undoStep } from "./steps"
import { deadlines, deadlineState } from "@/calendar/deadlines"
import { thomasGrow, FLOWER_ID, COLUMN_ID } from "@/data/thomas-grow"
import { cycleOfSpace, newSpace, transferCycle } from "@/model/grow-ops"
import { defaultCycle } from "@/screens/sheets"
import type { Cycle, Entry, GrowEvent, Mix } from "@/model/types"
import { cycleNumber } from "./targets"
import { reservoirAutonomy } from "./reservoir"
import { buildDailyDigest, digestWeek, morningText } from "./digest"
import { stageShort } from "@/app/labels"
import { translate } from "@/i18n/core"

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

// ---------- Lot 10b2 ----------
const ent = (p: Partial<Entry> & { date: string; spaceId: string }): Entry => ({ schemaVersion: 2, id: `${p.date}_${p.spaceId}`, createdAt: NOW, updatedAt: NOW, ...p })

describe("lot 10b2 — un seul « cycle d'un espace »", () => {
  it("le cycle actif s'il tourne dans l'espace, sinon le plus récent en cours ; jamais un cycle récolté", () => {
    const a = cyc({ id: "a", spaceId: "fl", createdAt: "2026-01-01" })
    const b = cyc({ id: "b", spaceId: "fl", createdAt: "2026-03-01" })
    const done = cyc({ id: "c", spaceId: "fl", createdAt: "2026-05-01", harvestDate: "2026-06-01" })
    expect(cycleOfSpace([a, b, done], "fl")?.id).toBe("b")
    expect(cycleOfSpace([a, b, done], "fl", "a")?.id).toBe("a")
    expect(cycleOfSpace([a, b, done], "fl", "c")?.id).toBe("b")
    expect(cycleOfSpace([done], "fl")).toBeNull()
  })
})

describe("lot 10b2 — numéro de cycle", () => {
  it("rang par date de création, jamais lu dans le nom", () => {
    const first = cyc({ id: "x", name: "Blue Zushi 2026", createdAt: "2026-01-01" })
    const second = cyc({ id: "y", name: "Cycle 1", createdAt: "2026-04-01" })
    expect(cycleNumber(first, [first, second])).toBe(1)
    expect(cycleNumber(second, [first, second])).toBe(2)
  })
})

describe("lot 10b2 — consommation du réservoir", () => {
  it("deux relevés séparés par un bidon ne donnent pas une consommation", () => {
    const entries = [ent({ date: "2026-10-10", spaceId: "fl", reservoirL: 90 }), ent({ date: "2026-10-12", spaceId: "fl", reservoirL: 70 }), ent({ date: "2026-10-16", spaceId: "fl", reservoirL: 100 }), ent({ date: "2026-10-18", spaceId: "fl", reservoirL: 80 })]
    // Refill on the 14th (an older tank than the last reading): the 12 → 16 pair is skipped, 16 → 18 gives 10 L/day.
    const mixes = [{ schemaVersion: 4, id: "m1", date: "2026-10-14", volumeL: 100, createdAt: NOW }] as Mix[]
    const a = reservoirAutonomy({ entries, mixes, today: "2026-10-18" })
    expect(a.perDay).toEqual({ ok: true, value: 10 })
    // Only a refill between the two latest readings: the older pair (10 L/day) is used, never "−15 L/day".
    const b = reservoirAutonomy({ entries: entries.slice(0, 3), mixes, today: "2026-10-16" })
    expect(b.perDay).toEqual({ ok: true, value: 10 })
  })
})

describe("lot 10b2 — carte Bonjour", () => {
  // Equipment placed from 1 June (the RAIN pump is in Floraison for every date below).
  const s = thomasGrow(NOW, "2026-06-01")
  const dry = newSpace({ id: "dry", name: "Séchage", template: "drying", order: 2, now: NOW })
  const data = (cycles: Cycle[], entries: Entry[] = []) => ({ grow: s.grow, spaces: [...s.spaces, dry], cycles, entries, mixes: [], equipment: s.equipment, assignments: s.assignments })
  const lines = (d: ReturnType<typeof buildDailyDigest>, id: string) => d.spaces.find((x) => x.spaceId === id)!.lines.map((l) => l.text)
  const flowering = { ...s.cycles[0], spaceId: FLOWER_ID, germinationDate: "2026-07-01", vegDate: "2026-07-15", flipDate: "2026-08-24", flowerWeeks: 9 }

  it("espace sans cycle : une seule ligne ; séchage : jour J/total", () => {
    const harvested = { ...s.cycles[0], id: "c0", name: "Cycle 0", spaceId: "dry", harvestDate: "2026-10-17", plannedDryingDays: 10 }
    const d = buildDailyDigest(data([harvested]), "2026-10-19", "fr")
    expect(lines(d, COLUMN_ID)).toEqual(["Vide : pas de cycle en cours"])
    expect(lines(d, "dry")[0]).toBe("Cycle 0 · séchage J3/10")
  })
  it("rinçage en arrosage automatique, installation, semis en automatique : jamais « 0 doses » ni « à la main » à tort", () => {
    const flush = buildDailyDigest(data([flowering]), "2026-10-24", "fr")
    expect(lines(flush, FLOWER_ID)).toContain("Arrosage automatique : rinçage à l'eau osmosée (EC < 0,1)")
    const inst = buildDailyDigest(data([{ ...flowering, flipDate: undefined, establishing: true }]), "2026-07-20", "fr")
    expect(lines(inst, FLOWER_ID).find((l) => l.startsWith("Arrosage"))).toMatch(/^Arrosage : installation, 2 petites doses de \d+ mL/)
    const seedling = buildDailyDigest(data([{ ...flowering, vegDate: undefined, flipDate: undefined }]), "2026-07-05", "fr")
    expect(lines(seedling, FLOWER_ID).find((l) => l.startsWith("Arrosage"))).toContain("le programme automatique démarre avec « Passer en végé »")
  })
  it("nouvel utilisateur : « Pas encore de saisie » une fois, pas de « pas de mesure depuis hier »", () => {
    const d = buildDailyDigest(data([flowering]), "2026-09-10", "fr")
    const f = lines(d, FLOWER_ID)
    expect(f.filter((l) => l.startsWith("Climat"))).toEqual([])
    expect(f.filter((l) => l === "Pas encore de saisie")).toHaveLength(1)
    expect(f[0]).toBe("Cycle 1 · Floraison S3 · stretch")
  })
  it("jours suivants : l'échéance du bidon tombe le bon jour (calculée avec le vrai aujourd'hui)", () => {
    const mixes = [{ schemaVersion: 4, id: "m", date: "2026-10-18", volumeL: 60, spaceIds: [FLOWER_ID], createdAt: NOW }] as Mix[]
    const entries = [ent({ date: "2026-10-18", spaceId: FLOWER_ID, reservoirL: 60 }), ent({ date: "2026-10-19", spaceId: FLOWER_ID, reservoirL: 40 })]
    const week = digestWeek({ ...data([flowering], entries), mixes }, "2026-10-19", "fr")
    // 40 L left at 20 L/day → 2 days: the tank deadline is on the 21st, not "in 2 days" from every morning.
    const has = (i: number) => week[i].text.includes("Refaire le bidon")
    expect([has(0), has(1), has(2), has(3)]).toEqual([false, false, true, false])
    expect(week[1].text).toContain("Réservoir : ≈ 1 j")
  })
  it("plus de résumé du jour : repli sur le dernier, signalé comme ancien", () => {
    const old = { date: "2026-10-05", text: "Bonjour · 05/10", computedOn: "2026-10-05" }
    const r = morningText({ "2026-10-05": old, latest: old }, "2026-10-19", "fr")
    expect(r.found).toBe(true)
    expect(r.text).toContain("Résumé du 05/10")
  })
  it("un seul vocabulaire de stade", () => {
    const t = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) => translate("fr", k, v)
    expect(stageShort(t, stageOn(flowering, "2026-09-30"))).toBe("Floraison S6 · masse")
    expect(stageShort(t, stageOn(flowering, "2026-08-01"))).toBe("Végé S5")
  })
})
