import { describe, expect, it } from "vitest"
import { dayTargets, manualRow } from "./targets"
import { spaceIrrigation, withPots } from "@/equipment/calc"
import { thomasGrow, COLUMN_ID, FLOWER_ID } from "@/data/thomas-grow"
import { ATHENA_BLENDED, ATHENA_PRO } from "@/data/nutrients"
import type { Equipment } from "@/model/grow"

const NOW = "2026-10-18T06:00:00.000Z"
const TODAY = "2026-10-18"

describe("lot 4b — arrosage manuel par gamme", () => {
  it("manuel Blended en végé → EC du runoff 3,5–4,5 (p. 60), solution 2,1", () => {
    const t = dayTargets("veg", { mode: "manual", substrate: "coco", line: "athena-blended" })!
    expect(t.ecRunoff).toMatchObject({ lo: 3.5, hi: 4.5, src: "athena", page: 60 })
    expect(t.dryback).toMatchObject({ lo: 30, hi: 40 })
    expect(t.ecIn).toMatchObject({ lo: 2.1, hi: 2.1 })
  })
  it("manuel Pro en végé → EC du runoff 4–5 (p. 41) : les gammes ne se mélangent pas", () => {
    const t = dayTargets("veg", { mode: "manual", substrate: "coco", line: "athena-pro" })!
    expect(t.ecRunoff).toMatchObject({ lo: 4, hi: 5, page: 41 })
  })
  it("manuel Blended semaine par semaine : S4 runoff 4–5, S7 3–4 (EC 1,7), S8 2,5–3 dryback 50–60", () => {
    expect(dayTargets("stretch", { mode: "manual", substrate: "coco", flowerWeek: 4, line: "athena-blended" })!.ecRunoff).toMatchObject({ lo: 4, hi: 5 })
    const s7 = dayTargets("bulk", { mode: "manual", substrate: "coco", flowerWeek: 7, line: "athena-blended" })!
    expect(s7.ecRunoff).toMatchObject({ lo: 3, hi: 4 })
    expect(s7.ecIn).toMatchObject({ lo: 1.7, hi: 1.7 })
    expect(dayTargets("finish", { mode: "manual", substrate: "coco", flowerWeek: 8, line: "athena-blended" })!.dryback).toMatchObject({ lo: 50, hi: 60 })
  })
  it("pH en floraison, arrosage manuel, coco : 5,9–6,3 (p. 41) ; Fade 6,0–6,4", () => {
    expect(dayTargets("stretch", { mode: "manual", substrate: "coco", flowerWeek: 2 })!.phIn).toMatchObject({ lo: 5.9, hi: 6.3, page: 41 })
    expect(dayTargets("finish", { mode: "manual", substrate: "coco", flowerWeek: 8 })!.phIn).toMatchObject({ lo: 6.0, hi: 6.4 })
  })
  it("chaque gamme a sa ligne pour chaque semaine", () => {
    for (const cat of [ATHENA_PRO, ATHENA_BLENDED]) for (let w = 1; w <= 9; w++) expect(manualRow(cat, "stretch", w)).not.toBeNull()
    expect(manualRow(ATHENA_BLENDED, "flush")!.ecRunoff).toEqual([0, 1.5])
  })
})

describe("lot 4b — pots et débit tirés de l'équipement", () => {
  const seed = thomasGrow(NOW, TODAY)
  it("Floraison : pots de 15 L × 4 ; débit de la pompe jamais mesuré → donnée manquante", () => {
    const eq = spaceIrrigation(FLOWER_ID, TODAY, seed.equipment, seed.assignments)
    expect(eq.potL).toEqual({ ok: true, value: 15 })
    expect(eq.potCount).toBe(4)
    expect(eq.flow).toEqual({ ok: false, missing: ["flowMlPerMin"] })
  })
  it("Colonne : ni pots ni pompe → les deux manquent, rien d'inventé", () => {
    const eq = spaceIrrigation(COLUMN_ID, TODAY, seed.equipment, seed.assignments)
    expect(eq.potL.ok).toBe(false)
    expect(eq.flow.ok).toBe(false)
    expect(eq.potCount).toBeUndefined()
  })
  it("débit mesuré saisi dans l'équipement → repris tel quel", () => {
    const equipment: Equipment[] = seed.equipment.map((e) => (e.id === "rain" ? { ...e, pump: { ...e.pump, flowMlPerMin: 1800, flowMeasuredAt: TODAY } } : e))
    expect(spaceIrrigation(FLOWER_ID, TODAY, equipment, seed.assignments).flow).toEqual({ ok: true, value: 1800 })
  })
  it("volume du pot modifiable : 15 L → 11 L sur le contenant de l'espace, le reste est gardé", () => {
    const pots = seed.equipment.find((e) => e.id === "pots-15")!
    const next = withPots(pots, { volumeL: 11, count: 4, id: "x", now: NOW, name: "Pots 11 L" })
    expect(next).toMatchObject({ id: "pots-15", name: "Pots 11 L", container: { volumeL: 11, count: 4, substrate: "coco" }, quantity: 4 })
    const equipment = seed.equipment.map((e) => (e.id === next.id ? next : e))
    expect(spaceIrrigation(FLOWER_ID, TODAY, equipment, seed.assignments).potL).toEqual({ ok: true, value: 11 })
  })
  it("pas de contenant dans l'espace : les pots saisis créent un équipement", () => {
    const made = withPots(undefined, { volumeL: 3, count: 2, substrate: "coco", id: "eq-new", now: NOW, name: "Pots 3 L" })
    expect(made).toMatchObject({ id: "eq-new", type: "container", source: "user", container: { volumeL: 3, count: 2, substrate: "coco" } })
    const assignments = [...seed.assignments, { schemaVersion: 1, id: "a-new", equipmentId: "eq-new", spaceId: COLUMN_ID, from: TODAY }]
    expect(spaceIrrigation(COLUMN_ID, TODAY, [...seed.equipment, made], assignments)).toMatchObject({ potL: { ok: true, value: 3 }, potCount: 2 })
  })
})
