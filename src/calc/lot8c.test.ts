import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { startChecklist, startProgress } from "@/calc/getting-started"
import { COLUMN_ID, FLOWER_ID, thomasGrow } from "@/data/thomas-grow"
import { draftDocs, emptyDraft } from "@/lib/onboarding"
import type { Equipment, EquipmentAssignment, Space } from "@/model/grow"
import type { Cycle } from "@/model/types"

const NOW = "2026-10-18T06:00:00.000Z"
const TODAY = "2026-10-18"
const seed = thomasGrow(NOW, TODAY)
const base = { spaces: seed.spaces, cycles: seed.cycles, equipment: seed.equipment, assignments: seed.assignments, mixes: [], entries: [], today: TODAY }
const byId = (items: ReturnType<typeof startChecklist>) => Object.fromEntries(items.map((i) => [i.id, i]))

describe("lot 8c — premiers pas : ce qu'il faut rentrer", () => {
  it("grow de Thomas : lampes OK, il manque les pots de la Colonne, les dates du cycle et le débit", () => {
    const items = startChecklist(base)
    expect(items.map((i) => i.id)).toEqual(["lamp", "pots", "cycle", "flow", "mix", "entry"])
    const m = byId(items)
    expect(m.lamp.done).toBe(true) // EVO4 300 W × 2.8, S16 42 W × 3.14
    expect(m.pots).toMatchObject({ done: false, spaceId: COLUMN_ID })
    expect(m.cycle).toMatchObject({ done: false, cycleId: "cycle-1" })
    expect(m.flow).toMatchObject({ done: false, spaceId: COLUMN_ID })
    expect(startProgress(items)).toMatchObject({ done: 1, total: 6, next: { id: "pots" } })
  })

  it("la sauvegarde n'est demandée que dans la version locale", () => {
    expect(byId(startChecklist({ ...base, lastBackup: null })).backup.done).toBe(false)
    expect(byId(startChecklist({ ...base, lastBackup: "2026-10-17" })).backup.done).toBe(true)
  })

  it("une lampe compte dès ses watts réels (lot 10b) ; sans watts, ni PPF ni efficacité, elle manque", () => {
    const docs = draftDocs({ ...emptyDraft("Tente"), name: "G", spaces: [{ ...emptyDraft("Tente").spaces[0], gear: { lampW: 240 } }] }, { now: NOW, today: TODAY, id: (p) => `${p}1`, names: { lamp: "Lampe", pots: (v) => `Pots ${v} L`, tank: (l) => `R ${l}`, extractor: "E" } })
    const pick = <T,>(c: string) => docs.filter(([p]) => p.startsWith(`${c}/`)).map(([, d]) => d as unknown as T)
    const p = { ...base, spaces: pick<Space>("spaces"), equipment: pick<Equipment>("equipment"), assignments: pick<EquipmentAssignment>("equipmentAssignments"), cycles: [] }
    expect(byId(startChecklist(p)).lamp.done).toBe(true)
    const noWatts = p.equipment.map((e) => ({ ...e, lamp: {} }))
    expect(byId(startChecklist({ ...p, equipment: noWatts })).lamp.done).toBe(false)
    const withEff = p.equipment.map((e) => ({ ...e, lamp: { ...e.lamp, efficacy: 2.7 } }))
    expect(byId(startChecklist({ ...p, equipment: withEff })).lamp.done).toBe(true)
    const withPpf = p.equipment.map((e) => ({ ...e, lamp: { ppf: 650 } }))
    expect(byId(startChecklist({ ...p, equipment: withPpf })).lamp.done).toBe(true)
  })

  it("pas de débit demandé en arrosage manuel, pas de lampe sans le module Lumière", () => {
    const manual = seed.cycles.map((c): Cycle => ({ ...c, waterMode: "manual" }))
    expect(byId(startChecklist({ ...base, cycles: manual })).flow).toBeUndefined()
    const noLight = seed.spaces.map((s) => ({ ...s, modules: { ...s.modules, light: false } }))
    expect(byId(startChecklist({ ...base, spaces: noLight })).lamp).toBeUndefined()
  })

  it("se coche avec les données : date de germination, débit mesuré, pots, bidon, saisie", () => {
    const cycles = seed.cycles.map((c): Cycle => ({ ...c, germinationDate: "2026-10-10", spaceId: FLOWER_ID }))
    const equipment = seed.equipment.map((e) => (e.id === "rain" ? { ...e, pump: { ...e.pump, flowMlPerMin: 1200 } } : e))
    const items = startChecklist({ ...base, cycles, equipment, mixes: [{ id: "m1" }], entries: [{ id: "e1" }] })
    const m = byId(items)
    expect([m.cycle.done, m.flow.done, m.mix.done, m.entry.done]).toEqual([true, true, true, true])
    // Lot 10b: the Colonne is watered by hand (no pump, no automatic cycle there): no pots asked.
    expect(m.pots.done).toBe(true)
  })
})

describe("lot 8c — textes", () => {
  it("chaque étape et chaque rubrique a son texte en français et en anglais", () => {
    const root = path.resolve(import.meta.dirname, "../..")
    for (const lang of ["fr", "en"]) {
      const src = fs.readFileSync(path.join(root, `src/i18n/${lang}.ts`), "utf8")
      const block = src.slice(src.indexOf("  start: {"))
      for (const id of ["lamp", "pots", "cycle", "flow", "mix", "entry", "backup"]) expect(block).toMatch(new RegExp(`\\n      ${id}: "`))
      for (const h of ["day", "tank", "water", "calendar", "charts", "settings", "numbers"]) expect(block).toMatch(new RegExp(`\\n      ${h}: "`))
    }
  })
})
