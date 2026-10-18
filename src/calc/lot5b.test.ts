import { describe, expect, it } from "vitest"
import { cellLevel, dimmerFor, dliOf, mapStats, ppfdFor, spaceFreeHeight, spaceLightAt, spaceSchema } from "./light"
import { leafVpd, rhForVpd, rhRangeForVpd, spaceAir, vpdStatus } from "./climate"
import { thomasGrow, COLUMN_ID, FLOWER_ID } from "@/data/thomas-grow"
import type { Equipment } from "@/model/grow"

const NOW = "2026-10-18T06:00:00.000Z"
const TODAY = "2026-10-18"
const seed = thomasGrow(NOW, TODAY)
const flower = seed.spaces.find((s) => s.id === FLOWER_ID)!
const column = seed.spaces.find((s) => s.id === COLUMN_ID)!

describe("lot 5 — schéma proportionnel", () => {
  it("Floraison 90 × 90 → carré ; Colonne 30 × 90 → 1 : 3, à la même échelle", () => {
    const f = spaceSchema(flower.dimensionsCm, [])!
    expect(f.width).toBe(f.height)
    const c = spaceSchema({ l: 30, w: 90 }, [])!
    expect(c.height / c.width).toBeCloseTo(3)
    expect(c.scale).toBeCloseTo(300 / 90)
  })
  it("grille 3 × 3 : 9 cases égales qui couvrent l'espace", () => {
    const s = spaceSchema({ l: 120, w: 90 }, [])!
    expect(s.cells).toHaveLength(9)
    for (const c of s.cells) {
      expect(c.w).toBeCloseTo(s.width / 3)
      expect(c.h).toBeCloseTo(s.height / 3)
    }
    expect(s.width / s.height).toBeCloseTo(120 / 90)
  })
  it("lampe à l'échelle (60 × 60 cm dans 90 × 90 → 2/3 du côté) ; sans dimensions : listée, pas dessinée", () => {
    const s = spaceSchema({ l: 90, w: 90 }, [
      { id: "a", name: "A", l: 60, w: 60 },
      { id: "b", name: "B" },
    ])!
    expect(s.lamps[0].rect!.w / s.width).toBeCloseTo(2 / 3)
    expect(s.lamps[1].rect).toBeNull()
  })
  it("dimensions de l'espace manquantes → pas de schéma inventé", () => expect(spaceSchema({ l: 90 }, [])).toBeNull())
})

describe("lot 5 — lumière", () => {
  it("DLI = PPFD × h × 0,0036 et calcul inverse", () => {
    expect(dliOf(600, 18)).toBe(38.9)
    expect(ppfdFor(40, 12)).toBe(926)
    expect(dimmerFor(463, 926)).toBe(50)
    expect(dimmerFor(2000, 926)).toBe(100)
  })
  it("EVO4 300 W × 2,8 µmol/J (hypothèse) sur 0,81 m² : estimation marquée hypothèse, gradation appliquée", () => {
    const { now, full } = spaceLightAt(flower, TODAY, seed.equipment, seed.assignments, { evo4: 50 })
    expect(full!.ppf).toMatchObject({ ok: true, value: 840, hypothesis: true })
    expect(now!.ppf).toMatchObject({ ok: true, value: 420 })
    expect(full!.ppfd.ok && Math.round(full!.ppfd.value)).toBe(Math.round((840 * 0.85) / 0.81))
  })
  it("hauteur libre : donnée manquante tant que pot et lampe n'ont pas leurs dimensions", () => {
    const h = spaceFreeHeight(flower, TODAY, seed.equipment, seed.assignments)
    expect(h.ok).toBe(false)
    if (!h.ok) expect(h.missing).toEqual(expect.arrayContaining(["potH", "lampH", "minDistanceCm"]))
    const eq: Equipment[] = seed.equipment.map((e) =>
      e.id === "evo4" ? { ...e, lamp: { ...e.lamp, dimensionsCm: { h: 5 }, minHeightCm: 30 } } : e.id === "pots-15" ? { ...e, container: { ...e.container, heightCm: 30 } } : e,
    )
    expect(spaceFreeHeight(flower, TODAY, eq, seed.assignments)).toEqual({ ok: true, value: 115 })
  })
  it("carte 3 × 3 : moyenne, min, max, uniformité ; niveau par rapport à la cible", () => {
    expect(mapStats([500, 600, 700, null, 600, null, null, null, null])).toMatchObject({ mean: 600, min: 500, max: 700, uniformity: 0.83, measured: 4 })
    expect(mapStats([])).toBeNull()
    expect(cellLevel(550, { lo: 600, hi: 900 })).toBe("low")
    expect(cellLevel(950, { lo: 600, hi: 900 })).toBe("high")
  })
})

describe("lot 5 — climat et air", () => {
  it("VPD feuille et humidité visée (aller-retour)", () => {
    const v = leafVpd(25, 60, -2)
    expect(v.leafC).toBe(23)
    expect(v.vpd).toBeCloseTo(0.91, 2)
    expect(rhForVpd(v.vpd, 25, -2)).toBe(60)
    const r = rhRangeForVpd({ lo: 1.0, hi: 1.5 }, 26, -2)!
    expect(r.lo).toBeLessThan(r.hi)
    expect(vpdStatus(1.2, { lo: 1.0, hi: 1.5 })).toBe("ok")
  })
  it("renouvellement d'air : débit du Cloudline S6 non saisi → donnée manquante ; saisi → calculé", () => {
    const a = spaceAir(flower, TODAY, seed.equipment, seed.assignments)!
    expect(a.seconds.ok).toBe(false)
    const eq = seed.equipment.map((e) => (e.id === "cloudline-s6" ? { ...e, extractor: { ...e.extractor, m3h: 400, speedPct: 50 } } : e))
    const b = spaceAir(flower, TODAY, eq, seed.assignments)!
    // 0.9 × 0.9 × 1.8 = 1.458 m³ at 200 m³/h → 26 s
    expect(b.seconds.ok && Math.round(b.seconds.value)).toBe(26)
    expect(b.status).toBe("fast")
    expect(spaceAir(column, TODAY, seed.equipment, seed.assignments)).toBeNull()
  })
})
