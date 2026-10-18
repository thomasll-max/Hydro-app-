import { describe, expect, it } from "vitest"
import { balanceHistory, balanceTotalMl, phStatus, predictBalance, START_FRACTION, titrationTotal } from "./balance"
import { ipwAllowed, ipwDoseMl, ipwLastDay, ipwSchedule, nextIpw } from "./ipw"
import { addDays, stageOn } from "./stage"
import { deadlines } from "@/calendar/deadlines"
import { deadlineTitle } from "@/calendar/labels"
import { thomasGrow, FLOWER_ID } from "@/data/thomas-grow"
import type { Spray } from "@/model/grow"
import type { Mix } from "@/model/types"

const NOW = "2026-10-18T06:00:00.000Z"
const mix = (id: string, date: string, volumeL: number, p: Partial<Mix> = {}): Mix => ({ schemaVersion: 4, id, date, volumeL, line: "athena-pro", createdAt: NOW, ...p })

describe("lot 5 — pH / Balance", () => {
  it("bac de 100 L → palier de 25 mL ; 3 paliers → 75 mL", () => {
    expect(titrationTotal({ volumeL: 100, startMl: 0, steps: 1 })).toEqual({ stepMl: 25, totalMl: 25 })
    expect(titrationTotal({ volumeL: 100, startMl: 0, steps: 3 }).totalMl).toBe(75)
  })
  it("prédiction à partir de 2 bidons, départ à 80 %", () => {
    const one = balanceHistory([mix("a", "2026-10-01", 100, { balanceAddedMl: 30 })])
    expect(predictBalance(one, 100)).toBeNull()
    const two = balanceHistory([mix("a", "2026-10-01", 100, { balanceAddedMl: 30 }), mix("b", "2026-10-07", 50, { balanceAddedMl: 15 })])
    const p = predictBalance(two, 100)!
    expect(START_FRACTION).toBe(0.8)
    expect(p).toMatchObject({ predictedMl: 30, startMl: 24, basis: "per10L", tanks: 2 })
    // Then steps of 1 mL per 4 L on top of the start.
    expect(titrationTotal({ volumeL: 100, startMl: p.startMl, steps: 1 }).totalMl).toBe(49)
  })
  it("avec le pH avant : prédiction par point de pH, vers le milieu de la cible", () => {
    const h = balanceHistory([
      mix("a", "2026-10-01", 100, { balanceAddedMl: 30, phBefore: 5.4, ph: 6.0 }), // 3 mL/10 L for 0.6 → 5 per point
      mix("b", "2026-10-07", 50, { balanceAddedMl: 10, phBefore: 5.6, ph: 6.0 }), // 2 mL/10 L for 0.4 → 5 per point
    ])
    const p = predictBalance(h, 100, { phBefore: 5.4, target: { lo: 5.8, hi: 6.2 } })!
    expect(p).toMatchObject({ basis: "perPh", rate: 5, predictedMl: 30, startMl: 24 })
  })
  it("Balance total d'un bidon = quantité versée en premier + ajouts", () => {
    expect(balanceTotalMl({ volumeL: 100, balanceMlPer10L: 2.4, balanceAddedMl: 6 })).toBe(30)
    expect(balanceTotalMl({ volumeL: 100 })).toBeUndefined()
  })
  it("dépassement : statut « over », aucune dose proposée", () => {
    const target = { lo: 5.8, hi: 6.2 }
    expect(phStatus(5.5, target)).toBe("low")
    expect(phStatus(6.0, target)).toBe("ok")
    expect(phStatus(6.5, target)).toBe("over")
    // Nothing in the engine produces a negative or "down" dose: the prediction never goes below 0.
    const h = balanceHistory([mix("a", "2026-10-01", 100, { balanceAddedMl: 30, phBefore: 5.4, ph: 6.0 }), mix("b", "2026-10-07", 100, { balanceAddedMl: 30, phBefore: 5.4, ph: 6.0 })])
    expect(predictBalance(h, 100, { phBefore: 6.5, target })).toMatchObject({ predictedMl: 0, startMl: 0 })
  })
})

describe("lot 5 — IPW", () => {
  it("2 L × 24 mL/L → 48 mL ; pression 32 mL/L", () => {
    expect(ipwDoseMl(2, "prevention")).toBe(48)
    expect(ipwDoseMl(2, "pressure")).toBe(64)
  })
  it("bloqué en S5 ; autorisé en végé et jusqu'en floraison S3", () => {
    const c = { germinationDate: "2026-08-01", transferDate: "2026-08-15", flipDate: "2026-10-02", flowerWeeks: 9 }
    expect(ipwAllowed(stageOn(c, addDays("2026-10-02", 4 * 7)))).toEqual({ ok: false, reason: "flowerLate" }) // S5
    expect(ipwAllowed(stageOn(c, addDays("2026-10-02", 3 * 7)))).toEqual({ ok: false, reason: "flowerLate" }) // S4
    expect(ipwAllowed(stageOn(c, addDays("2026-10-02", 20))).ok).toBe(true) // last day of S3
    expect(ipwAllowed(stageOn(c, "2026-09-01")).ok).toBe(true) // veg
    expect(ipwAllowed(stageOn(c, "2026-08-05"))).toEqual({ ok: false, reason: "seedling" })
    expect(ipwLastDay("2026-10-02")).toBe("2026-10-22")
  })
  it("calendriers : 2 / semaine, 3 / semaine, restauration 2 jours + 1 de pause sur 9 jours", () => {
    expect(ipwSchedule("prevention", "2026-10-05", undefined, 2)).toEqual(["2026-10-05", "2026-10-08", "2026-10-12", "2026-10-15"])
    expect(ipwSchedule("pressure", "2026-10-05", undefined, 1)).toEqual(["2026-10-05", "2026-10-07", "2026-10-09"])
    expect(ipwSchedule("restoration", "2026-10-05")).toEqual(["2026-10-05", "2026-10-06", "2026-10-08", "2026-10-09", "2026-10-11", "2026-10-12"])
    // Never after the end of flowering S3.
    expect(ipwSchedule("pressure", "2026-10-19", "2026-10-22")).toEqual(["2026-10-19", "2026-10-21"])
  })
  const spray = (date: string, p: Partial<Spray> = {}): Spray => ({ schemaVersion: 2, id: `s-${date}`, date, spaceIds: [FLOWER_ID], product: "ipw", mlPerL: 24, litres: 2, protocol: "prevention", protocolStart: "2026-10-05", ...p })
  it("prochaine pulvérisation du protocole en cours", () => {
    expect(nextIpw([spray("2026-10-05")], FLOWER_ID)).toMatchObject({ date: "2026-10-08", protocol: "prevention" })
    expect(nextIpw([spray("2026-10-05"), spray("2026-10-08")], FLOWER_ID)?.date).toBe("2026-10-12")
    expect(nextIpw([spray("2026-10-19")], FLOWER_ID, "2026-10-21")).toBeNull()
  })
  it("rappel IPW dans le calendrier seulement si IPW est activé, et jamais après S3", () => {
    const seed = thomasGrow(NOW, "2026-10-18")
    const cycle = { ...seed.cycles[0], spaceId: FLOWER_ID, germinationDate: "2026-08-01", transferDate: "2026-08-15", flipDate: "2026-10-02" }
    const base = { spaces: seed.spaces, cycles: [cycle], entries: [], mixes: [], equipment: seed.equipment, assignments: seed.assignments, sprays: [spray("2026-10-12")] }
    // Thomas: IPW off (not bought yet) → no reminder.
    expect(deadlines({ ...base, grow: seed.grow }, "2026-10-13").some((d) => d.kind === "ipw")).toBe(false)
    const on = { ...seed.grow, nutrition: { ...seed.grow.nutrition, addons: [...seed.grow.nutrition.addons, "ipw" as const] } }
    const dl = deadlines({ ...base, grow: on }, "2026-10-13").find((d) => d.kind === "ipw")!
    expect(dl).toMatchObject({ date: "2026-10-15", spaceId: FLOWER_ID, source: "athena" })
    expect(deadlineTitle("fr", dl)).toBe("Pulvérisation IPW · Floraison")
    // Last allowed day 22/10: after the 19/10 spray, the next (22/10) is still allowed; after it, nothing.
    expect(deadlines({ ...base, grow: on, sprays: [spray("2026-10-22")] }, "2026-10-22").some((d) => d.kind === "ipw")).toBe(false)
  })
})
