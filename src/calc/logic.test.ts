import { describe, expect, it } from "vitest"
import { addDays, daysBetween, fadeStart, flushStart, stageOn } from "./stage"
import { dayTargets } from "./targets"
import { oneCorrection, status } from "./advice"
import { reminders, tankForecast } from "./reminders"
import type { Cycle, Entry, Mix } from "@/model/types"

const cycle: Cycle = {
  schemaVersion: 1, id: "c1", name: "Cycle 1", cultivars: ["Cherry Limeade"],
  germinationDate: "2026-08-01", transferDate: "2026-08-15", flipDate: "2026-10-02", flowerWeeks: 9,
  substrate: "coco", waterMode: "auto", potVolumeL: 15, potCount: 4, flowMlPerMin: 2000, lights: "", lightsOn: "06:00",
  shotPct: 3, p1Shots: 6, p1IntervalMin: 20, p0DelayMin: 60, p2Shots: 0, leafOffsetC: -2, createdAt: "", updatedAt: "",
}

describe("stade du cycle", () => {
  it("la floraison se compte à partir du 12/12 (J1 = jour du passage)", () => {
    expect(stageOn(cycle, "2026-10-02")).toMatchObject({ key: "stretch", day: 1, week: 1 })
    expect(stageOn(cycle, "2026-10-18")).toMatchObject({ key: "stretch", day: 17, week: 3 })
  })
  it("stretch S1–S4, masse S5–S7, finition S8–S9, rinçage sur les 3 derniers jours", () => {
    expect(stageOn(cycle, addDays("2026-10-02", 28)).key).toBe("bulk")
    expect(stageOn(cycle, addDays("2026-10-02", 49)).key).toBe("finish")
    expect(stageOn(cycle, addDays("2026-10-02", 60)).key).toBe("flush")
    expect(daysBetween(flushStart(cycle)!, addDays("2026-10-02", 63))).toBe(3)
  })
  it("Fade au début de S8", () => expect(fadeStart(cycle)).toBe("2026-11-20"))
  it("avant le transfert : semis dans la colonne ; après : végé", () => {
    expect(stageOn(cycle, "2026-08-10").key).toBe("seedling")
    expect(stageOn(cycle, "2026-08-20")).toMatchObject({ key: "veg", day: 20, week: 3 })
  })
})

describe("cibles du jour", () => {
  it("stretch en auto coco : dryback 40–50, EC runoff 4–10, runoff 1–7 %, pH 5,8–6,2, solution 2,0–2,4", () => {
    const t = dayTargets("stretch", { mode: "auto", substrate: "coco", flowerWeek: 3 })!
    expect(t.dryback).toMatchObject({ lo: 40, hi: 50 })
    expect(t.ecRunoff).toMatchObject({ lo: 4, hi: 10 })
    expect(t.runoffPct).toMatchObject({ lo: 1, hi: 7 })
    expect(t.phIn).toMatchObject({ lo: 5.8, hi: 6.2 })
    expect(t.ecIn).toMatchObject({ lo: 2.0, hi: 2.4 })
  })
  it("manuel : runoff 10–25 %, S1–S3 dryback 50–60", () => {
    const t = dayTargets("stretch", { mode: "manual", substrate: "coco", flowerWeek: 2 })!
    expect(t.runoffPct).toMatchObject({ lo: 10, hi: 25 })
    expect(t.dryback).toMatchObject({ lo: 50, hi: 60 })
  })
  it("pH : finition 6,0–6,4 ; terreau 6,0–6,4 ; 70/30 estimé 5,9–6,3 ; semis 5,6", () => {
    expect(dayTargets("finish", { mode: "auto", substrate: "coco" })!.phIn).toMatchObject({ lo: 6.0, hi: 6.4 })
    expect(dayTargets("veg", { mode: "auto", substrate: "soil" })!.phIn).toMatchObject({ lo: 6.0, hi: 6.4 })
    expect(dayTargets("veg", { mode: "auto", substrate: "mix7030" })!.phIn).toMatchObject({ lo: 5.9, hi: 6.3, src: "estimate" })
    expect(dayTargets("seedling", { mode: "auto", substrate: "coco" })!.phIn).toMatchObject({ lo: 5.6, hi: 5.6 })
  })
})

describe("une seule correction", () => {
  const t = dayTargets("stretch", { mode: "auto", substrate: "coco", flowerWeek: 3 })!
  const base: Entry = { schemaVersion: 1, id: "x", date: "2026-10-18", createdAt: "", updatedAt: "" }
  it("pH du runoff haut → viser le bas de la fourchette", () => {
    const a = oneCorrection({ ...base, phRunoff: 6.6, dryback: 44 }, t, "auto")!
    expect(a).toMatchObject({ metric: "phRunoff", dir: "high", key: "advice.phRunoff.high" })
    expect(a.vars.aim).toBe(5.8)
  })
  it("tout dans la cible → rien à faire", () => {
    expect(oneCorrection({ ...base, phRunoff: 6.0, dryback: 44, ecRunoff: 7 }, t, "auto")).toBeNull()
  })
  it("le rouge passe avant l'orange", () => {
    const a = oneCorrection({ ...base, phRunoff: 6.3, dryback: 80 }, t, "auto")!
    expect(a.metric).toBe("dryback")
    expect(a.bodyKey).toBe("advice.dryback.high.auto")
  })
  it("statut d'une cible à valeur unique", () => {
    expect(status(5.6, { lo: 5.6, hi: 5.6 })).toBe("ok")
    expect(status(5.9, { lo: 5.6, hi: 5.6 })).toBe("warn")
  })
})

describe("rappels", () => {
  const mix: Mix = { schemaVersion: 1, id: "m1", date: "2026-10-15", volumeL: 100, createdAt: "" }
  const e = (date: string, ml: number): Entry => ({ schemaVersion: 1, id: date, date, volumePerPotMl: ml, createdAt: "", updatedAt: "" })
  it("bidon : estimé d'après la consommation réelle", () => {
    const f = tankForecast([mix], [e("2026-10-15", 2700), e("2026-10-16", 2700), e("2026-10-17", 2700)], 4)!
    expect(f.perDayL).toBeCloseTo(10.8)
    expect(f.remainingL).toBeCloseTo(67.6)
    expect(Math.floor(f.daysLeft)).toBe(6)
  })
  it("Fade et rinçage apparaissent avec leur échéance", () => {
    const r = reminders(cycle, [], [], "2026-10-18")
    expect(r.find((x) => x.kind === "fade")).toMatchObject({ inDays: 33 })
    expect(r.find((x) => x.kind === "flush")).toMatchObject({ inDays: 44 })
  })
})
