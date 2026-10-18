import { describe, expect, it } from "vitest"
import { airRenewalSeconds, autonomyDays, cfmToM3h, equipmentAt, freeHeightCm, gramsPerWatt, moveEquipment, ppf, ppfd, shotSeconds, spaceLight, wattsPerM2 } from "./calc"
import { thomasGrow, seedDocs, FLOWER_ID, COLUMN_ID } from "@/data/thomas-grow"
import { duplicateSpace, groupBySite, newSite, newSpace, setModule, transferCycle, cycleSpaceAt, visibleEntry, spaceNutrition, archiveSpace } from "@/model/grow-ops"
import { COLLECTIONS, TEMPLATE_MODULES, type EquipmentAssignment } from "@/model/grow"
import { proReferenceRows } from "@/calc/reperes"
import { dayTargets } from "@/calc/targets"
import { MemoryStore } from "@/store/memory-store"
import type { Entry } from "@/model/types"

const NOW = "2026-10-18T10:00:00.000Z"
const val = (c: { ok: boolean; value?: number }) => (c.ok ? (c as { value: number }).value : NaN)

describe("equipment/calc — spec lot 2a cases", () => {
  it("EVO4 300 W × 2.8 µmol/J (hypothesis) → PPF 840, PPFD ≈ 881 on 90×90 at 0.85, ≈ 370 W/m²", () => {
    const p = ppf({ watts: 300, efficacy: 2.8, efficacyIsHypothesis: true })
    expect(val(p)).toBeCloseTo(840, 6)
    expect(p.ok && p.hypothesis).toBe(true)
    expect(Math.round(val(ppfd(p, { l: 90, w: 90 }, 0.85)))).toBe(881)
    expect(Math.round(val(wattsPerM2(300, { l: 90, w: 90 })))).toBe(370)
  })
  it("S16 42 W × 3.14 → PPF ≈ 132", () => {
    expect(Math.round(val(ppf({ watts: 42, efficacy: 3.14 })))).toBe(132)
  })
  it("15 L pot at 3 % with 2000 mL/min → 450 mL = 13.5 s", () => {
    expect(val(shotSeconds({ potL: 15, pct: 3, flowMlPerMin: 2000 }))).toBeCloseTo(13.5, 6)
    expect(val(shotSeconds({ volumeMl: 450, flowMlPerMin: 2000 }))).toBeCloseTo(13.5, 6)
  })
  it("120 L reservoir, 60 L left at 20 L/day → 3 days", () => {
    expect(val(autonomyDays(60, 20))).toBe(3)
  })
  it("90×90×180 with 400 m³/h at 50 % → air renewed in ≈ 26 s", () => {
    expect(Math.round(val(airRenewalSeconds({ l: 90, w: 90, h: 180 }, 400, 50)))).toBe(26)
  })
  it("205 CFM → ≈ 348 m³/h", () => {
    expect(Math.round(cfmToM3h(205))).toBe(348)
  })
  it("free height and g/W", () => {
    expect(val(freeHeightCm({ spaceH: 180, potH: 30, lampH: 10, minDistanceCm: 30 }))).toBe(110)
    expect(val(gramsPerWatt(300, 300))).toBe(1)
  })
  it("a missing field → 'donnée manquante' (no number)", () => {
    const p = ppf({ watts: 300 })
    expect(p.ok).toBe(false)
    expect(!p.ok && p.missing).toEqual(["efficacy"])
    expect(shotSeconds({ potL: 15, pct: 3 }).ok).toBe(false) // pump flow not measured yet
    expect(airRenewalSeconds({ l: 90, w: 90, h: 180 }, undefined).ok).toBe(false)
    expect(ppfd(p, { l: 90, w: 90 }).ok).toBe(false)
  })
  it("a moved lamp does not change past configurations", () => {
    let n = 0
    const id = () => `a${++n}`
    let list: EquipmentAssignment[] = [{ schemaVersion: 1, id: "a0", equipmentId: "evo4", spaceId: "flower", from: "2026-09-01" }]
    const { close, open } = moveEquipment("evo4", "column", "2026-10-10", list, id)
    list = list.map((a) => (a.id === close!.id ? close! : a)).concat(open)
    expect(equipmentAt("flower", "2026-09-15", list).map((a) => a.equipmentId)).toEqual(["evo4"])
    expect(equipmentAt("flower", "2026-10-10", list)).toEqual([])
    expect(equipmentAt("column", "2026-10-10", list).map((a) => a.equipmentId)).toEqual(["evo4"])
    expect(equipmentAt("column", "2026-10-09", list)).toEqual([])
  })
})

describe("modular grow", () => {
  it("Thomas's grow: 2 spaces, gear, cycle 1 in the Colonne", () => {
    const s = thomasGrow(NOW, "2026-10-18")
    expect(s.spaces.map((x) => [x.name, x.dimensionsCm])).toEqual([
      ["Floraison", { l: 90, w: 90, h: 180 }],
      ["Colonne", { l: 30, w: 90, h: 180 }],
    ])
    expect(s.cycles[0].spaceId).toBe(COLUMN_ID)
    expect(s.grow.nutrition).toEqual({ line: "athena-pro", addons: ["fade", "cleanse", "balance"], dosing: "conc226" })
    const flower = spaceLight(s.spaces[0], "2026-10-18", s.equipment, s.assignments)!
    expect(Math.round(val(flower.ppf))).toBe(840)
    expect(Math.round(val(flower.ppfd))).toBe(881)
    const col = spaceLight(s.spaces[1], "2026-10-18", s.equipment, s.assignments)!
    expect(Math.round(val(col.ppf))).toBe(132)
    // Pump flow is unknown: shot duration must say so instead of guessing.
    const pump = s.equipment.find((e) => e.type === "pump")!
    expect(shotSeconds({ potL: 15, pct: 3, flowMlPerMin: pump.pump?.flowMlPerMin }).ok).toBe(false)
    // Every seeded doc carries schemaVersion and lands on a declared collection.
    for (const [path, doc] of seedDocs(s)) {
      expect(doc.schemaVersion).toBeTypeOf("number")
      expect(COLLECTIONS).toContain(path.split("/")[0])
    }
    expect(seedDocs(s).at(-1)![0]).toBe("grow/main")
    // Add-ons: Fade, Cleanse, Balance on; IPW off (not bought yet); no CaMg / PK (Pro Line).
    expect(s.grow.nutrition.addons).toEqual(["fade", "cleanse", "balance"])
    // Own products: Proper in the tank, Great White once on the roots at the transfer; no dose until typed from the label.
    const proper = s.customProducts.find((p) => p.id === "proper")!
    const gw = s.customProducts.find((p) => p.id === "great-white")!
    expect([proper.application, gw.application, gw.onEvent]).toEqual(["tank", "roots", "transfer"])
    for (const p of s.customProducts) {
      expect(p.dosePer10L ?? p.dosePerPlant).toBeUndefined()
      expect([p.source, p.verified]).toEqual(["label", false])
    }
  })
  it("a friend's grow: 3 rooms + 2 greenhouses", () => {
    const sites = [newSite("r1", "Room 1", 0), newSite("r2", "Room 2", 1), newSite("r3", "Room 3", 2), newSite("g", "Serres", 3)]
    const spaces = [
      newSpace({ id: "a", name: "Tente A", template: "flower", order: 0, now: NOW, siteId: "r1", dimensionsCm: { l: 120, w: 120, h: 200 } }),
      newSpace({ id: "b", name: "Mères", template: "mother", order: 1, now: NOW, siteId: "r1" }),
      newSpace({ id: "c", name: "Boutures", template: "propagation", order: 2, now: NOW, siteId: "r2" }),
      newSpace({ id: "d", name: "Séchoir", template: "drying", order: 3, now: NOW, siteId: "r3" }),
      newSpace({ id: "e", name: "Serre 1", template: "custom", order: 4, now: NOW, siteId: "g" }),
      newSpace({ id: "f", name: "Serre 2", template: "custom", order: 5, now: NOW, siteId: "g" }),
    ]
    const groups = groupBySite(spaces, sites)
    expect(groups.map((g) => [g.site?.name, g.spaces.length])).toEqual([
      ["Room 1", 2],
      ["Room 2", 1],
      ["Room 3", 1],
      ["Serres", 2],
    ])
    expect(spaces[3].modules).toMatchObject({ climate: true, drying: true, irrigation: false, plants: false })
    expect(Object.values(spaces[4].modules).every((v) => !v)).toBe(true)
    // Colours cycle through the 8 accessible tokens.
    expect(new Set(spaces.map((s) => s.color)).size).toBe(6)
    // Archived spaces leave the list, not the data.
    const archived = archiveSpace(spaces[5], true, NOW)
    expect(groupBySite([...spaces.slice(0, 5), archived], sites).at(-1)!.spaces.map((s) => s.id)).toEqual(["e"])
  })
  it("templates match the spec", () => {
    expect(TEMPLATE_MODULES.flower).toEqual(["climate", "light", "irrigation", "nutrition", "plants"])
    expect(TEMPLATE_MODULES.propagation).toEqual(["climate", "light", "propagation"])
    expect(TEMPLATE_MODULES.mother).toEqual(["climate", "light", "irrigation", "nutrition"])
    expect(TEMPLATE_MODULES.drying).toEqual(["climate", "drying"])
  })
  it("a module turned off then on keeps its data", async () => {
    const db = new MemoryStore()
    let sp = newSpace({ id: "a", name: "A", template: "flower", order: 0, now: NOW })
    const e: Entry = { schemaVersion: 2, id: "2026-10-18_a", date: "2026-10-18", spaceId: "a", ecIn: 2.2, phIn: 6, tempDay: 26, createdAt: NOW, updatedAt: NOW }
    await db.set(`entries/${e.id}`, e)
    sp = setModule(sp, "nutrition", false, NOW)
    expect(visibleEntry(e, sp)).not.toHaveProperty("ecIn")
    expect(visibleEntry(e, sp).tempDay).toBe(26)
    expect((await db.get(`entries/${e.id}`))?.ecIn).toBe(2.2)
    sp = setModule(sp, "nutrition", true, NOW)
    expect(visibleEntry((await db.get(`entries/${e.id}`)) as Entry, sp).ecIn).toBe(2.2)
  })
  it("duplicating a space copies its current equipment", () => {
    const s = thomasGrow(NOW, "2026-10-01")
    let n = 0
    const d = duplicateSpace(s.spaces[0], { id: "flower2", name: "Floraison 2", order: 2, now: NOW, date: "2026-10-18" }, s.assignments, () => `d${++n}`)
    expect(d.space.dimensionsCm).toEqual({ l: 90, w: 90, h: 180 })
    expect(d.space.modules).toEqual(s.spaces[0].modules)
    expect(d.assignments.map((a) => a.equipmentId).sort()).toEqual(equipmentAt(FLOWER_ID, "2026-10-18", s.assignments).map((a) => a.equipmentId).sort())
    expect(d.assignments.every((a) => a.spaceId === "flower2" && a.from === "2026-10-18")).toBe(true)
  })
  it("a cycle lives in one space; transfers are historized (full and partial)", () => {
    const c = thomasGrow(NOW, "2026-10-18").cycles[0]
    const moved = transferCycle(c, FLOWER_ID, "2026-11-10", NOW)
    expect(moved.spaceId).toBe(FLOWER_ID)
    expect(cycleSpaceAt(moved, "2026-11-01")).toBe(COLUMN_ID)
    expect(cycleSpaceAt(moved, "2026-11-10")).toBe(FLOWER_ID)
    const part = transferCycle(c, FLOWER_ID, "2026-11-10", NOW, { partial: true, plantIds: ["cycle-1_P1"] })
    expect(part.spaceId).toBe(COLUMN_ID)
    expect(part.transfers?.[0]).toMatchObject({ partial: true, plantIds: ["cycle-1_P1"] })
  })
  it("space nutrition overrides the grow's", () => {
    const g = thomasGrow(NOW, "2026-10-18").grow
    expect(spaceNutrition(g, { nutrition: { dosing: "powder" } })).toEqual({ line: "athena-pro", addons: ["fade", "cleanse", "balance"], dosing: "powder" })
  })
})

describe("Repères", () => {
  it("Pro Line: EC 2.0 → 12.9 g / 57 mL and 7.7 g / 34 mL (226 g/L)", () => {
    const r = proReferenceRows(226).find((x) => x.ec === 2.0)!
    expect(r).toEqual({ ec: 2.0, baseG: 12.9, coreG: 7.7, baseMl: 57, coreMl: 34 })
  })
  it("manual Pro Line, flowering S1 dryback → 30–40 %", () => {
    const t = dayTargets("stretch", { mode: "manual", substrate: "coco", flowerWeek: 1 })!
    expect([t.dryback?.lo, t.dryback?.hi]).toEqual([30, 40])
    const t2 = dayTargets("stretch", { mode: "manual", substrate: "coco", flowerWeek: 2 })!
    expect([t2.dryback?.lo, t2.dryback?.hi]).toEqual([50, 60])
  })
})
