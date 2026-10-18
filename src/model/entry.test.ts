import { describe, expect, it } from "vitest"
import { blankEntry, derive, entryId, previousEntry } from "./entry"
import type { Cycle, Entry } from "./types"
import { MemoryStore } from "@/store/memory-store"

const cycle = { leafOffsetC: -2, waterMode: "auto", p1Shots: 6, p2Shots: 0 } as Cycle
const base: Entry = { schemaVersion: 1, id: "2026-10-18", date: "2026-10-18", createdAt: "", updatedAt: "" }

describe("saisie", () => {
  it("identifiants : chambre entière ou plante", () => {
    expect(entryId("2026-10-18")).toBe("2026-10-18")
    expect(entryId("2026-10-18", "P2")).toBe("2026-10-18_P2")
  })
  it("calcule VPD, dryback, % de runoff et DLI", () => {
    const d = derive({ ...base, tempDay: 26, rh: 60, weightPeakKg: 10, weightMorningKg: 8.5, volumePerPotMl: 450, runoffMl: 27, ppfd: 600, photoperiodH: 18 })
    expect(d).toMatchObject({ vpd: 0.97, dryback: 15, runoffPct: 6, dli: 38.9 })
  })
  it("% du capteur de sol si pas de mesure de runoff", () => {
    expect(derive({ ...base, sensorPct: 4 }).runoffPct).toBe(4)
  })
  it("reprend les réglages de la veille, pas les mesures", () => {
    const prev = { ...base, date: "2026-10-17", ecIn: 2.2, phIn: 5.9, ppfd: 850, tempDay: 26, ecRunoff: 7.1 }
    const e = blankEntry("2026-10-18", cycle, prev)
    expect(e).toMatchObject({ ecIn: 2.2, phIn: 5.9, ppfd: 850, shots: 6, leafOffsetC: -2 })
    expect(e.tempDay).toBeUndefined()
    expect(e.ecRunoff).toBeUndefined()
    expect(e.schemaVersion).toBe(1)
  })
  it("trouve la saisie précédente du même périmètre", () => {
    const list = [{ ...base, date: "2026-10-16" }, { ...base, date: "2026-10-17", plantId: "P1" as const }, { ...base, date: "2026-10-17" }]
    expect(previousEntry(list, "2026-10-18")?.date).toBe("2026-10-17")
    expect(previousEntry(list, "2026-10-18", "P1")?.plantId).toBe("P1")
  })
})

describe("stockage (adaptateur mémoire, même contrat que l'artefact et le local)", () => {
  it("écrit, relit, liste, notifie et supprime", async () => {
    const s = new MemoryStore()
    const seen: number[] = []
    s.watchCollection("cycles/c1/entries", (d) => seen.push(Object.keys(d).length))
    await s.set("cycles/c1/entries/2026-10-18", { date: "2026-10-18", ecIn: 2.2, gone: undefined })
    expect(await s.get("cycles/c1/entries/2026-10-18")).toEqual({ date: "2026-10-18", ecIn: 2.2 })
    expect(Object.keys(await s.list("cycles/c1/entries"))).toEqual(["2026-10-18"])
    await s.delete("cycles/c1/entries/2026-10-18")
    expect(await s.get("cycles/c1/entries/2026-10-18")).toBeNull()
    await new Promise((r) => setTimeout(r))
    expect(seen).toContain(1)
    expect(seen.at(-1)).toBe(0)
  })
})

describe("historique filtrable", async () => {
  const { filterEntries } = await import("./entry")
  const mk = (id: string, extra: Partial<Entry>): Entry => ({ ...base, id, ...extra })
  const list = [
    mk("a", { targets: { stage: "stretch" }, observations: [{ tag: "yellowing", severity: 2 }] }),
    mk("b", { plantId: "P2", targets: { stage: "stretch" }, actions: ["lst"] }),
    mk("c", { targets: { stage: "veg" } }),
  ]
  it("par plante, tag et stade", () => {
    expect(filterEntries(list, { plant: "P2", tag: "all", stage: "all" }).map((e) => e.id)).toEqual(["b"])
    expect(filterEntries(list, { plant: "room", tag: "all", stage: "all" }).map((e) => e.id)).toEqual(["a", "c"])
    expect(filterEntries(list, { plant: "all", tag: "lst", stage: "all" }).map((e) => e.id)).toEqual(["b"])
    expect(filterEntries(list, { plant: "all", tag: "yellowing", stage: "stretch" }).map((e) => e.id)).toEqual(["a"])
    expect(filterEntries(list, { plant: "all", tag: "all", stage: "veg" }).map((e) => e.id)).toEqual(["c"])
  })
})
