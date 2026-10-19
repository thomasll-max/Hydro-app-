import { describe, expect, it } from "vitest"
import { buildDailyDigest, spaceContext } from "./digest"
import { reservoirAutonomy } from "./reservoir"
import { dli, dryback, round, vpd } from "./formulas"
import { thomasGrow, FLOWER_ID, COLUMN_ID } from "@/data/thomas-grow"
import { transferCycle, cycleSpaceAt } from "@/model/grow-ops"
import type { Entry, Mix } from "@/model/types"

const NOW = "2026-10-18T06:00:00.000Z"
const e = (p: Partial<Entry> & { date: string; spaceId: string }): Entry => ({ schemaVersion: 2, id: `${p.date}_${p.spaceId}`, createdAt: NOW, updatedAt: NOW, ...p })

describe("lot 2b — formulas", () => {
  it("dryback 10.0 → 8.5 kg = 15 %", () => expect(round(dryback(10, 8.5), 1)).toBe(15))
  it("VPD 26 °C, 60 %, leaf −2 °C ≈ 0.97 kPa", () => expect(round(vpd(26, 60, -2), 2)).toBe(0.97))
  it("DLI PPFD 600 × 18 h → 38.9", () => expect(round(dli(600, 18), 1)).toBe(38.9))
})

describe("partial transfer", () => {
  it("moves only the chosen plants; the cycle stays in its space, the history keeps both", () => {
    const c = thomasGrow(NOW, "2026-10-18").cycles[0]
    const part = transferCycle(c, FLOWER_ID, "2026-11-10", NOW, { partial: true, plantIds: ["cycle-1_P1", "cycle-1_P2"] })
    expect(part.spaceId).toBe(COLUMN_ID)
    expect(cycleSpaceAt(part, "2026-11-11")).toBe(COLUMN_ID)
    expect(part.transfers).toEqual([{ date: "2026-11-10", from: COLUMN_ID, to: FLOWER_ID, partial: true, plantIds: ["cycle-1_P1", "cycle-1_P2"] }])
    const full = transferCycle(part, FLOWER_ID, "2026-11-12", NOW)
    expect([full.spaceId, full.transfers?.length, cycleSpaceAt(full, "2026-11-12")]).toEqual([FLOWER_ID, 2, FLOWER_ID])
  })
})

describe("reservoir autonomy", () => {
  it("120 L tank, 60 L left at 20 L/day → 3 days (from two readings)", () => {
    const a = reservoirAutonomy({
      entries: [e({ date: "2026-10-17", spaceId: "f", reservoirL: 80 }), e({ date: "2026-10-18", spaceId: "f", reservoirL: 60 })],
      mixes: [{ schemaVersion: 3, id: "m", date: "2026-10-16", volumeL: 100, createdAt: NOW }],
      usableL: 120,
      mode: "dtw",
      today: "2026-10-18",
    })
    expect(a.source).toBe("reading")
    expect(a.days.ok && a.days.value).toBe(3)
  })
  it("estimate from the last tank when no level was typed; missing data otherwise", () => {
    const mix: Mix = { schemaVersion: 3, id: "m", date: "2026-10-16", volumeL: 100, createdAt: NOW }
    const a = reservoirAutonomy({ entries: [e({ date: "2026-10-17", spaceId: "f", volumePerPotMl: 2500 })], mixes: [mix], potCount: 4, mode: "dtw", today: "2026-10-18" })
    expect([a.source, a.left.ok && a.left.value, a.days.ok && a.days.value]).toEqual(["estimate", 90, 9])
    const b = reservoirAutonomy({ entries: [], mixes: [], today: "2026-10-18" })
    expect(b.days.ok).toBe(false)
  })
  it("drain-to-waste solution older than 7 days is flagged", () => {
    const mix: Mix = { schemaVersion: 3, id: "m", date: "2026-10-10", volumeL: 100, createdAt: NOW }
    expect(reservoirAutonomy({ entries: [], mixes: [mix], mode: "dtw", today: "2026-10-18" }).tooOld).toBe(true)
    expect(reservoirAutonomy({ entries: [], mixes: [mix], mode: "recirc", today: "2026-10-18" }).tooOld).toBe(false)
  })
})

describe("buildDailyDigest v1", () => {
  const seed = thomasGrow(NOW, "2026-10-01")
  const cycle = { ...seed.cycles[0], spaceId: FLOWER_ID, germinationDate: "2026-09-01", transferDate: "2026-09-20", flipDate: "2026-10-05", flowMlPerMin: 2000 }
  const data = {
    grow: seed.grow,
    spaces: seed.spaces,
    cycles: [cycle],
    entries: [
      e({ date: "2026-10-17", spaceId: FLOWER_ID, reservoirL: 80 }),
      e({ date: "2026-10-18", spaceId: FLOWER_ID, time: "07:42", tempDay: 26, rh: 60, vpd: 0.97, reservoirL: 60 }),
    ],
    mixes: [{ schemaVersion: 3, id: "m", date: "2026-10-16", volumeL: 100, spaceIds: [FLOWER_ID], createdAt: NOW }],
    equipment: seed.equipment,
    assignments: seed.assignments,
  }
  it("FR: climate, planned watering, last entry, reservoir", () => {
    const d = buildDailyDigest(data, "2026-10-18", "fr")
    expect(d.title).toBe("Bonjour · 18/10")
    const f = d.spaces.find((s) => s.spaceId === FLOWER_ID)!.lines.map((l) => l.text)
    expect(f).toContain("Climat : 26,0 °C · 60 % · VPD 0,97 kPa")
    expect(f.some((x) => /^Arrosage prévu : \d+ doses dès \d\d:\d\d, [\d,]+ L par pot$/.test(x))).toBe(true)
    expect(f).toContain("Dernière saisie : aujourd'hui 07:42")
    expect(f).toContain("Réservoir : ≈ 3 j (60 L)")
    // The Colonne has no cycle: one line says it is empty (lot 10b), nothing invented, nothing repeated.
    const c = d.spaces.find((s) => s.spaceId === COLUMN_ID)!.lines.map((l) => l.text)
    expect(c).toEqual(["Vide : pas de cycle en cours"])
    expect(d.text.startsWith("Bonjour · 18/10\n\nFloraison\n• ")).toBe(true)
  })
  it("EN: same digest in English", () => {
    const d = buildDailyDigest(data, "2026-10-18", "en")
    expect(d.title).toBe("Good morning · Oct 18")
    const f = d.spaces.find((s) => s.spaceId === FLOWER_ID)!.lines.map((l) => l.text)
    expect(f).toContain("Climate: 26.0 °C · 60 % · VPD 0.97 kPa")
    expect(f).toContain("Last entry: today 07:42")
    expect(f).toContain("Reservoir: ≈ 3 d (60 L)")
  })
  it("space context picks the space's reservoir and cycle", () => {
    const ctx = spaceContext(seed.spaces[0], data, "2026-10-18")
    expect([ctx.tank?.id, ctx.cycle?.id, ctx.last?.date]).toEqual(["tank-120", "cycle-1", "2026-10-18"])
  })
})
