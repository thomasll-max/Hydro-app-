import { describe, expect, it } from "vitest"
import { buildSeries, chartRows, CURVES, downsample, eventsIn, indexEntries, MAX_POINTS, normalize, periodRange, type Point } from "./series"
import { addDays } from "./stage"
import type { Entry, GrowEvent, Mix } from "@/model/types"

const NOW = "2026-10-18T06:00:00.000Z"
const entry = (spaceId: string, date: string, p: Partial<Entry> = {}): Entry => ({ schemaVersion: 2, id: `${date}_${spaceId}`, date, spaceId, createdAt: NOW, updatedAt: NOW, ...p })

describe("lot 6 — séries des graphiques", () => {
  it("période : 7 j, 30 j (aujourd'hui compris), cycle depuis la germination", () => {
    expect(periodRange("7", "2026-10-18")).toEqual({ from: "2026-10-12", to: "2026-10-18" })
    expect(periodRange("30", "2026-10-18").from).toBe("2026-09-19")
    expect(periodRange("cycle", "2026-10-18", [{ germinationDate: "2026-08-01", createdAt: NOW }, { germinationDate: "2026-09-01", createdAt: NOW }]).from).toBe("2026-08-01")
  })
  it("une courbe : valeurs de l'espace, sans les saisies par plante, avec la cible enregistrée ce jour-là", () => {
    const byspace = indexEntries([
      entry("a", "2026-10-10", { dryback: 30, targets: { stage: "veg", dryback: { lo: 25, hi: 50 } } }),
      entry("a", "2026-10-12", { dryback: 42, targets: { stage: "stretch", dryback: { lo: 40, hi: 50 } } }),
      { ...entry("a", "2026-10-12", { dryback: 99 }), id: "p", plantId: "P1" },
      entry("b", "2026-10-12", { dryback: 10 }),
    ])
    const s = buildSeries("dryback", "a", { from: "2026-10-01", to: "2026-10-18" }, { byspace, mixes: [] })
    expect(s.points).toEqual([
      { date: "2026-10-10", v: 30, lo: 25, hi: 50 },
      { date: "2026-10-12", v: 42, lo: 40, hi: 50 },
    ])
  })
  it("Balance : depuis les bidons de l'espace (mL pour 10 L)", () => {
    const mixes: Mix[] = [{ schemaVersion: 4, id: "m", date: "2026-10-12", volumeL: 100, spaceIds: ["a"], balanceAddedMl: 30, createdAt: NOW }]
    expect(buildSeries("balance", "a", { from: "2026-10-01", to: "2026-10-18" }, { byspace: new Map(), mixes }).points).toEqual([{ date: "2026-10-12", v: 3 }])
  })
  it("comparaison : une colonne par espace, la bande cible du premier", () => {
    const rows = chartRows([
      { spaceId: "a", curve: "ecRunoff", points: [{ date: "2026-10-12", v: 4, lo: 3, hi: 5 }] },
      { spaceId: "b", curve: "ecRunoff", points: [{ date: "2026-10-12", v: 6 }, { date: "2026-10-13", v: 6.5 }] },
    ])
    expect(rows).toEqual([
      { date: "2026-10-12", "s:a": 4, "s:b": 6, band: [3, 5] },
      { date: "2026-10-13", "s:b": 6.5 },
    ])
  })
  it("superposition : chaque courbe ramenée à 0–100 de sa propre plage", () => {
    const n = normalize([{ spaceId: "a", curve: "phIn", points: [{ date: "d1", v: 5.8 }, { date: "d2", v: 6.2 }] }])
    expect(n[0]).toMatchObject({ min: 5.8, max: 6.2 })
    expect(n[0].series.points.map((p) => p.v)).toEqual([0, 100])
  })
  it("événements de la période pour les espaces affichés", () => {
    const evs: GrowEvent[] = [
      { schemaVersion: 2, id: "1", date: "2026-10-02", type: "flip", spaceId: "a", createdAt: NOW },
      { schemaVersion: 2, id: "2", date: "2026-10-02", type: "flip", spaceId: "z", createdAt: NOW },
      { schemaVersion: 2, id: "3", date: "2026-09-01", type: "transfer", spaceId: "a", createdAt: NOW },
    ]
    expect(eventsIn(evs, ["a"], { from: "2026-10-01", to: "2026-10-18" }).map((e) => e.id)).toEqual(["1"])
  })
  it("au-delà de 120 points, les jours sont moyennés par paquets (valeur et cible)", () => {
    const pts: Point[] = Array.from({ length: 720 }, (_, i) => ({ date: addDays("2025-01-01", i), v: i % 2 ? 10 : 20, lo: 5, hi: 15 }))
    const d = downsample(pts)
    expect(d.length).toBeLessThanOrEqual(MAX_POINTS)
    expect(d[0]).toEqual({ date: "2025-01-01", v: 15, lo: 5, hi: 15 })
  })
})

describe("lot 6 — 20 espaces sur 2 ans restent fluides", () => {
  it("14 600 saisies : index + toutes les courbes de 4 espaces sur 2 ans en moins de 250 ms, ≤ 120 points par courbe", () => {
    const spaces = Array.from({ length: 20 }, (_, i) => `sp${i}`)
    const entries: Entry[] = []
    for (const s of spaces)
      for (let d = 0; d < 730; d++)
        entries.push(
          entry(s, addDays("2024-10-19", d), {
            dryback: 30 + (d % 20),
            ecIn: 2.2,
            ecRunoff: 4 + (d % 10) / 10,
            phIn: 6,
            phRunoff: 6.1,
            volumePerPotMl: 1500,
            runoffPct: 12,
            tempDay: 25,
            rh: 60,
            vpd: 1.1,
            ppfd: 700,
            dli: 40,
            heightCm: d / 5,
            reservoirL: 80,
            targets: { stage: "bulk", dryback: { lo: 30, hi: 40 }, ecRunoff: { lo: 3.5, hi: 6 }, phIn: { lo: 5.8, hi: 6.2 }, vpd: { lo: 1, hi: 1.5 } },
          }),
        )
    expect(entries.length).toBe(14_600)
    const t0 = performance.now()
    const byspace = indexEntries(entries)
    const range = { from: "2024-10-19", to: "2026-10-18" }
    let points = 0
    for (const s of spaces.slice(0, 4))
      for (const c of CURVES) {
        const ser = buildSeries(c, s, range, { byspace, mixes: [], potCount: 4 })
        expect(ser.points.length).toBeLessThanOrEqual(MAX_POINTS)
        points += ser.points.length
      }
    const ms = performance.now() - t0
    expect(points).toBeGreaterThan(0)
    expect(ms).toBeLessThan(250)
  })
})
