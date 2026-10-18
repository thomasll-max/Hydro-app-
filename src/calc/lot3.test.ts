import { describe, expect, it } from "vitest"
import { expectedEc, gramsPer10L, mixRecipe, suggestedVolume, type MixInput } from "./nutrients"
import { bagLitres } from "./concentrate"
import { ATHENA_PRO } from "@/data/nutrients"

// Lot 2a/3 API kept for these tests: kind → Pro phase, items with their role.
type Kind = "seedling" | "veg" | "flower" | "finish" | "flush"
const PHASE: Record<Kind, string> = { seedling: "clone", veg: "veg", flower: "flower", finish: "finish", flush: "flush" }
const ROLE: Record<string, string> = { proGrow: "base", proBloom: "base", proCore: "core" }
function recipe(_line: unknown, r: { kind: Kind; volumeL: number; ec: number; concentrate?: number; balanceMlPer10L?: number }) {
  const input: MixInput = { phaseId: PHASE[r.kind], volumeL: r.volumeL, ec: r.ec, concentrate: r.concentrate, balanceMlPer10L: r.balanceMlPer10L }
  return mixRecipe("athena-pro", input).items.map((i) => ({ ...i, role: ROLE[i.id] ?? i.id, estimate: !!i.estimate }))
}
const dosePer10L = (_line: unknown, ec: number) => gramsPer10L(ATHENA_PRO, ec)
import { buildProgram, isPrecision, programTotals, sensorPlan, steerStage } from "./program"
import type { Cycle } from "@/model/types"

describe("cas de test obligatoires — dosage (spec §10)", () => {
  it("EC 2,0 → Bloom 12,9 g + Core 7,7 g pour 10 L", () => {
    const r = recipe(ATHENA_PRO, { kind: "flower", volumeL: 10, ec: 2.0 })
    expect(r.find((i) => i.id === "proBloom")?.qty).toBe(12.9)
    expect(r.find((i) => i.id === "proCore")?.qty).toBe(7.7)
  })
  it("EC 3,0 → Grow ou Bloom 20,3 g + Core 12,2 g pour 10 L", () => {
    const veg = recipe(ATHENA_PRO, { kind: "veg", volumeL: 10, ec: 3.0 })
    expect(veg.find((i) => i.id === "proGrow")?.qty).toBe(20.3)
    expect(veg.find((i) => i.id === "proCore")?.qty).toBe(12.2)
    const flo = recipe(ATHENA_PRO, { kind: "flower", volumeL: 10, ec: 3.0 })
    expect(flo.find((i) => i.id === "proBloom")?.qty).toBe(20.3)
  })
})

describe("nutrition", () => {
  it("interpole entre deux lignes du tableau", () => {
    const d = dosePer10L(ATHENA_PRO, 2.2)
    expect(d.base).toBeCloseTo(12.9 + 0.4 * (16.5 - 12.9))
    expect(d.core).toBeCloseTo(7.7 + 0.4 * (9.9 - 7.7))
  })
  it("reste dans les bornes du tableau", () => {
    expect(dosePer10L(ATHENA_PRO, 9).base).toBe(28.1)
    expect(dosePer10L(ATHENA_PRO, 0.1).base).toBe(2.8)
  })
  it("ordre de mélange : eau → Balance → Grow/Bloom → Core → Cleanse", () => {
    expect(recipe(ATHENA_PRO, { kind: "veg", volumeL: 30, ec: 2.4 }).map((i) => i.id)).toEqual(["water", "balance", "proGrow", "proCore", "cleanse"])
  })
  it("finition : Fade remplace Core ; 51 mL / 10 L à EC 3,0, estimation ailleurs", () => {
    const at3 = recipe(ATHENA_PRO, { kind: "finish", volumeL: 10, ec: 3 })
    expect(at3.map((i) => i.id)).toEqual(["water", "balance", "proBloom", "fade", "cleanse"])
    expect(at3.find((i) => i.id === "fade")).toMatchObject({ qty: 51, estimate: false })
    expect(recipe(ATHENA_PRO, { kind: "finish", volumeL: 10, ec: 2.4 }).find((i) => i.id === "fade")?.estimate).toBe(true)
  })
  it("rinçage : eau osmosée + Cleanse 26 mL / 10 L, sans engrais", () => {
    const r = recipe(ATHENA_PRO, { kind: "flush", volumeL: 20, ec: 0 })
    expect(r.map((i) => i.id)).toEqual(["roWater", "cleanse"])
    expect(r[1].qty).toBe(52)
  })
  it("Balance connu : mis en premier avec la bonne quantité", () => {
    expect(recipe(ATHENA_PRO, { kind: "veg", volumeL: 40, ec: 2, balanceMlPer10L: 1.5 })[1]).toMatchObject({ id: "balance", qty: 6 })
  })
  it("EC attendue au testeur = engrais + eau du robinet", () => expect(expectedEc(2.4, 0.05)).toBe(2.45))
  it("taille de bidon ≈ 6 jours de consommation, plafonnée au bac", () => {
    expect(suggestedVolume(10.8)).toBe(65)
    expect(suggestedVolume(30)).toBe(120)
  })
})

const c = {
  waterMode: "auto", substrate: "coco", lightsOn: "06:00", potVolumeL: 15, shotPct: 3, p1Shots: 5, p1IntervalMin: 20, p0DelayMin: 90, flowMlPerMin: 2000,
} as Cycle

describe("programme d'arrosage", () => {
  it("précision seulement en coco avec la pompe", () => {
    expect(isPrecision(c)).toBe(true)
    expect(isPrecision({ ...c, substrate: "soil" })).toBe(false)
    expect(isPrecision({ ...c, waterMode: "manual" })).toBe(false)
  })
  it("stretch : P0 1 h 30, 5 doses P1 de 450 mL (14 s), 2 doses P2 en option, P3", () => {
    const p = buildProgram(c, "str")
    const p1 = p.filter((r) => r.phase === "P1")
    expect(p1).toHaveLength(5)
    expect(p1[0]).toMatchObject({ time: "07:30", ml: 450, seconds: 14 })
    expect(p.filter((r) => r.phase === "P2").every((r) => r.optional)).toBe(true)
    expect(p.some((r) => r.phase === "P3")).toBe(true)
    expect(p.at(-1)).toMatchObject({ kind: "lightsOff", time: "18:00" })
  })
  it("prise de masse : doses P2 toutes les 75 min jusqu'à +9 h 30", () => {
    const p2 = buildProgram(c, "mas").filter((r) => r.phase === "P2")
    expect(p2.length).toBeGreaterThan(2)
    expect(p2.at(-1)!.minutes).toBeLessThanOrEqual(6 * 60 + 570)
  })
  it("manuel : passages à partir de +30 min, sans durée de pompe", () => {
    const p = buildProgram({ ...c, waterMode: "manual" }, "veg")
    expect(p.filter((r) => r.kind === "manual")[0]).toMatchObject({ time: "06:30", seconds: undefined })
  })
  it("installation : 2 petites doses près de la tige", () => {
    const p = buildProgram(c, "inst").filter((r) => r.kind === "inst")
    expect(p).toHaveLength(2)
    expect(p[0].ml).toBe(200)
  })
  it("totaux par pot", () => {
    const t = programTotals(buildProgram(c, "str"))
    expect(t.fixed).toBe(5 * 450)
    expect(t.optional).toBe(2 * 450)
  })
  it("stade du cycle → stade du pilotage", () => {
    expect(steerStage("veg", true)).toBe("inst")
    expect(steerStage("stretch")).toBe("str")
    expect(steerStage("seedling")).toBeNull()
  })
})

describe("mode capteur (Bonorum)", () => {
  it("génératif : déclencheur à la base ; végétatif : pic − 2", () => {
    expect(sensorPlan(c, "gen", 48, 53, 1.5).trigger).toBe(48)
    expect(sensorPlan(c, "veg", 48, 53, 1.5).trigger).toBe(51)
  })
  it("durée par la formule (pas le tableau en secondes) : 225 mL à 2 L/min = 6,75 s", () => {
    const s = sensorPlan(c, "gen", 48, 53, 1.5)
    expect(s.p2Ml).toBe(225)
    expect(s.p2Seconds).toBeCloseTo(6.75)
    expect(s.p1Ml).toBe(450)
  })
  it("signale une dose de moins de 3 s", () => {
    expect(sensorPlan({ ...c, flowMlPerMin: 6000 }, "gen", 48, 53, 1).tooShort).toBe(true)
  })
})

describe("concentrés (Handbook p. 23, 26, 37)", () => {
  const ml = (c: number, ec: number, vol = 10, kind: "flower" | "veg" = "flower") => {
    const r = recipe(ATHENA_PRO, { kind, volumeL: vol, ec, concentrate: c })
    return [r.find((i) => i.role === "base")!.qty, r.find((i) => i.role === "core")!.qty]
  }
  it("EC 2,0 → 57 + 34 mL à 226 g/L ; 114 + 69 à 113 ; 46 + 27 à 282", () => {
    expect(ml(226, 2)).toEqual([57, 34])
    expect(ml(113, 2)).toEqual([114, 69])
    expect(ml(282, 2)).toEqual([46, 27])
  })
  it("EC 3,0, bac de 100 L → 900 + 540 mL à 226 g/L", () => expect(ml(226, 3, 100, "veg")).toEqual([900, 540]))
  it("garde l'équivalent en poudre", () => {
    const r = recipe(ATHENA_PRO, { kind: "flower", volumeL: 10, ec: 2, concentrate: 226 })
    expect(r.find((i) => i.id === "proBloom")).toMatchObject({ unit: "mL", grams: 12.9, concentrate: 226, estimate: false })
  })
  it("hors du tableau (EC 0,5) : conversion marquée estimation", () => {
    expect(recipe(ATHENA_PRO, { kind: "flower", volumeL: 10, ec: 0.5, concentrate: 226 }).find((i) => i.role === "base")?.estimate).toBe(true)
  })
  it("sac de 0,9 kg → 4,0 L à 226 g/L ; 11,3 kg → 50 L", () => {
    expect(bagLitres(0.9, 226)).toBe(4)
    expect(bagLitres(11.3, 226)).toBe(50)
  })
})
