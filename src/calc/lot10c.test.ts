import { describe, expect, it } from "vitest"
import { ATHENA_PRO } from "@/data/nutrients/athena-pro"
import { ATHENA_BLENDED } from "@/data/nutrients/athena-blended"
import { chosenPer10L, concMlPer10L, interpEc, mixRecipe, phaseById, phFor } from "./nutrients"
import { dayTargets } from "./targets"
import { status } from "./advice"
import { predictBalance, type TankBalance } from "./balance"
import { buildProgram, nextIndex } from "./program"
import { todayIso } from "./stage"
import { defaultCycle } from "@/screens/sheets"

const item = (r: ReturnType<typeof mixRecipe>, id: string) => r.items.find((i) => i.id === id)

describe("lot 10c — doses Athena", () => {
  it("Fade Pro : 51 mL / 10 L quelle que soit l'EC (37 mL à EC 2,2 avant)", () => {
    expect(item(mixRecipe("athena-pro", { phaseId: "finish", volumeL: 10, ec: 2.2 }), "fade")?.qty).toBe(51)
    expect(item(mixRecipe("athena-pro", { phaseId: "finish", volumeL: 100, ec: 3.0 }), "fade")?.qty).toBe(510)
  })
  it("entre deux lignes de la p. 37 : estimation ; sur une ligne : publiée", () => {
    expect(interpEc(ATHENA_PRO.ecTable!.grams, 2.0)).toEqual({ base: 12.9, core: 7.7, exact: true })
    const mid = interpEc(ATHENA_PRO.ecTable!.grams, 2.25)!
    expect(mid.exact).toBe(false)
    expect(mid.base).toBeCloseTo(14.7, 5)
    expect(interpEc(ATHENA_PRO.ecTable!.grams, 4.5)).toBeNull()
    expect(concMlPer10L(ATHENA_PRO, 2.0, 226)).toMatchObject({ base: 57, core: 34, estimate: false })
    expect(concMlPer10L(ATHENA_PRO, 2.2, 226).estimate).toBe(true)
    // 282 g/L has no 3.5 row: grams ÷ strength, an estimate.
    expect(concMlPer10L(ATHENA_PRO, 3.5, 282).estimate).toBe(true)
    expect(item(mixRecipe("athena-pro", { phaseId: "veg", volumeL: 10, ec: 2.2 }), "proGrow")?.estimate).toBe(true)
    expect(item(mixRecipe("athena-pro", { phaseId: "veg", volumeL: 10, ec: 2.2, concentrate: 0 }), "proGrow")?.estimate).toBe(true)
  })
  it("EC au-delà du tableau (> 4,0) : signalée, doses de 4,0", () => {
    const r = mixRecipe("athena-pro", { phaseId: "veg", volumeL: 10, ec: 4.6, concentrate: 226 })
    expect(r.ecClamped).toBe(4.0)
    expect(item(r, "proGrow")?.qty).toBe(124)
    expect(mixRecipe("athena-pro", { phaseId: "veg", volumeL: 10, ec: 3.0, concentrate: 226 }).ecClamped).toBeUndefined()
  })
  it("volume invalide : quantités vides, jamais NaN ni négatives", () => {
    for (const volumeL of [0, -5, Number.NaN]) {
      const r = mixRecipe("athena-pro", { phaseId: "veg", volumeL, ec: 3 })
      expect(r.invalidVolume).toBe(true)
      expect(r.items.every((i) => i.qty === null)).toBe(true)
    }
  })
  it("dose CaMg choisie : reprise telle que tapée, sans dérive d'un bidon à l'autre", () => {
    // Blended veg at EC 2.4 (program 2.1): CaMg 10 mL/10 L typed, scaled ×1.14 in the tank (old tanks kept only that).
    const r = mixRecipe("athena-blended", { phaseId: "veg", volumeL: 50, ec: 2.4, chosenPer10L: { camg: 10 } })
    const saved = { volumeL: 50, phase: "veg", ecTarget: 2.4, items: r.items.map((i) => ({ id: i.id, qty: i.qty, unit: i.unit })) }
    expect(chosenPer10L(ATHENA_BLENDED, saved, "camg")).toBe(10)
    expect(chosenPer10L(ATHENA_BLENDED, { ...saved, items: [{ id: "camg", qty: 57.1, unit: "mL", per10L: 10 }] }, "camg")).toBe(10)
  })
})

describe("lot 10c — pH", () => {
  it("pastilles pH : marge absolue de 0,2 (6,8 en coco est à corriger)", () => {
    const coco = { lo: 5.8, hi: 6.2 }
    expect(status(6.3, coco, "phRunoff")).toBe("warn")
    expect(status(6.4, coco, "phRunoff")).toBe("warn")
    expect(status(6.8, coco, "phRunoff")).toBe("bad")
    expect(status(5.5, coco, "phIn")).toBe("bad")
  })
  it("une seule source, le catalogue : Blended S8 = 5,8–6,2 en coco dans la recette et dans les cibles", () => {
    const s8 = phaseById(ATHENA_BLENDED, "fl8")!
    expect(phFor(ATHENA_BLENDED, s8, "coco")).toMatchObject({ lo: 5.8, hi: 6.2 })
    const t = dayTargets("finish", { mode: "auto", substrate: "coco", flowerWeek: 8, line: "athena-blended" })!
    expect([t.phIn?.lo, t.phIn?.hi]).toEqual([5.8, 6.2])
    const s9 = dayTargets("finish", { mode: "auto", substrate: "coco", flowerWeek: 9, line: "athena-blended" })!
    expect([s9.phIn?.lo, s9.phIn?.hi]).toEqual([6.0, 6.4])
  })
  it("Pro : 6,0–6,4 avec Fade (tous substrats), sinon celui du substrat ; 5,6 en semis", () => {
    const finish = phaseById(ATHENA_PRO, "finish")!
    expect(phFor(ATHENA_PRO, finish, "coco", ["fade"])).toMatchObject({ lo: 6.0, hi: 6.4 })
    expect(phFor(ATHENA_PRO, finish, "coco", ["cleanse"])).toMatchObject({ lo: 5.8, hi: 6.2 })
    expect(phFor(ATHENA_PRO, finish, "soil", ["fade"])).toMatchObject({ lo: 6.0, hi: 6.4 })
    expect(dayTargets("seedling", { mode: "auto", substrate: "coco" })!.phIn).toMatchObject({ lo: 5.6, hi: 5.6 })
  })
  it("Balance : rien quand le pH est déjà dans la cible ou au-dessus", () => {
    const h: TankBalance[] = [
      { date: "2026-10-10", volumeL: 100, totalMl: 50 },
      { date: "2026-10-04", volumeL: 100, totalMl: 40 },
    ]
    const target = { lo: 5.8, hi: 6.2 }
    expect(predictBalance(h, 80, { phBefore: 6.5, target })).toMatchObject({ predictedMl: 0, startMl: 0 })
    expect(predictBalance(h, 80, { phBefore: 5.9, target })).toMatchObject({ predictedMl: 0 })
    expect(predictBalance(h, 80, { phBefore: 5.3, target })!.predictedMl).toBeGreaterThan(0)
  })
})

describe("lot 10c — cibles et programme", () => {
  it("cibles de précision seulement en coco sur l'arrosage automatique ; runoff manuel = repère de l'app", () => {
    expect(dayTargets("bulk", { mode: "auto", substrate: "coco", flowerWeek: 5 })!.steer).toBe("vegetative")
    const soilAuto = dayTargets("bulk", { mode: "auto", substrate: "soil", flowerWeek: 5 })!
    expect(soilAuto.steer).toBeUndefined()
    expect(soilAuto.runoffPct).toMatchObject({ lo: 10, hi: 25, src: "app" })
  })
  it("prochaine étape quand l'éclairage passe minuit", () => {
    const c = { ...defaultCycle(), lightsOn: "18:00", potVolumeL: 15 }
    const rows = buildProgram(c, "str", 12) // 18:00 → 06:00
    const at2am = nextIndex(rows, 2 * 60)
    expect(at2am).toBeGreaterThan(0)
    expect(rows[at2am].minutes).toBeGreaterThanOrEqual(1440 + 120)
    expect(nextIndex(rows, 17 * 60)).toBe(0) // before lights-on: the first row
    expect(nextIndex(rows, 12 * 60)).toBe(0) // day off, 12:00: next is tonight's lights-on
  })
  it("aujourd'hui dans le fuseau du grow", () => {
    const late = new Date("2026-10-19T23:30:00Z") // 01:30 on the 20th in Oslo, 19:30 on the 19th in New York
    expect(todayIso(late, "Europe/Oslo")).toBe("2026-10-20")
    expect(todayIso(late, "America/New_York")).toBe("2026-10-19")
  })
})
