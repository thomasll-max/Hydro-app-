import { describe, expect, it } from "vitest"
import { derive, drybackMethodOf } from "@/model/entry"
import { MODULE_FIELDS, newSpace, visibleEntry } from "@/model/grow-ops"
import { CURVE_DEFS } from "@/calc/series"
import { oneCorrection, pills } from "@/calc/advice"
import { dayTargets } from "@/calc/targets"
import { entriesCsv } from "@/lib/backup"
import type { Entry } from "@/model/types"

const base: Entry = { schemaVersion: 1, id: "2026-10-18_floraison", date: "2026-10-18", spaceId: "floraison", createdAt: "", updatedAt: "" }
const tg = dayTargets("bulk", { mode: "auto", substrate: "coco", flowerWeek: 5, cycleNumber: 2 })!

describe("dryback : méthode de mesure par espace", () => {
  it("par défaut un espace mesure à la pesée ; le réglage est gardé par espace", () => {
    const s = newSpace({ id: "f", name: "Floraison", template: "flower", order: 0, now: "" })
    expect(drybackMethodOf(s)).toBe("weight")
    expect(drybackMethodOf(null)).toBe("weight")
    expect(drybackMethodOf({ ...s, irrigation: { drybackMethod: "acinfinity" } })).toBe("acinfinity")
    expect(drybackMethodOf({ ...s, irrigation: { drybackMethod: "none" } })).toBe("none")
  })

  it("capteur : (pic − matin) ÷ pic, dans un champ à part du dryback pesée", () => {
    const d = derive({ ...base, sensorPeakPct: 40, sensorMorningPct: 30 })
    expect(d.drybackSensor).toBe(25)
    expect(d.dryback).toBeUndefined()
    const both = derive({ ...base, weightPeakKg: 10, weightMorningKg: 6.5, sensorPeakPct: 42, sensorMorningPct: 21 })
    expect(both.dryback).toBe(35)
    expect(both.drybackSensor).toBe(50)
    expect(derive({ ...base, sensorPeakPct: 0, sensorMorningPct: 0 }).drybackSensor).toBeUndefined()
    expect(derive({ ...base, sensorPeakPct: 40 }).drybackSensor).toBeUndefined()
  })

  it("les cibles Athena ne jugent que la pesée : pas de pastille ni de correction pour un dryback capteur", () => {
    const sensorOnly = derive({ ...base, sensorPeakPct: 40, sensorMorningPct: 10 }) // 75 %, far above 30–40 %
    expect(pills(sensorOnly, tg).dryback).toBeUndefined()
    expect(oneCorrection(sensorOnly, tg, "auto")?.metric).not.toBe("dryback")
    const weighed = derive({ ...base, weightPeakKg: 10, weightMorningKg: 2.5 }) // 75 % by weighing
    expect(pills(weighed, tg).dryback).toBe("bad")
  })

  it("courbe séparée, sans zone cible ; la courbe pesée garde la sienne", () => {
    expect(CURVE_DEFS.drybackSensor.target).toBeUndefined()
    expect(CURVE_DEFS.drybackSensor.value?.({ ...base, drybackSensor: 25, dryback: 35 }, {})).toBe(25)
    expect(CURVE_DEFS.dryback.target).toBe("dryback")
    expect(CURVE_DEFS.dryback.value?.({ ...base, drybackSensor: 25 }, {})).toBeNull()
  })

  it("les champs capteur appartiennent au module Arrosage et partent dans le CSV avec la méthode", () => {
    expect(MODULE_FIELDS.irrigation).toEqual(expect.arrayContaining(["sensorPeakPct", "sensorMorningPct", "drybackSensor"]))
    const space = newSpace({ id: "f", name: "F", template: "flower", order: 0, now: "" })
    const hidden = visibleEntry({ ...base, sensorPeakPct: 40, drybackSensor: 25 }, { modules: { ...space.modules, irrigation: false } })
    expect(hidden.sensorPeakPct).toBeUndefined()
    const csv = entriesCsv([{ ...base, sensorPeakPct: 40, sensorMorningPct: 30, drybackSensor: 25, drybackMethod: "acinfinity" }], () => "Floraison")
    const [head, row] = csv.split("\n")
    const col = (name: string) => row.split(";")[head.split(";").indexOf(name)]
    expect([col("sensorPeakPct"), col("sensorMorningPct"), col("drybackSensor"), col("drybackMethod")]).toEqual(["40", "30", "25", "acinfinity"])
  })
})
