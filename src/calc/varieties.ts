// Fiche variété (lot 12c): the varieties are the strings the app already has (`Cycle.cultivars`, `Plant.cultivar`),
// grouped without case or extra spaces; a spelling is never renamed silently (« Fusionner » asks). Only what Thomas
// lived through: the cycles where it grew, its dry weight per plant, its real flowering length. No breeder value.
// Pure and tested (calc/lot12c.test.ts).
import type { Cycle, IsoDate, Plant, PlantId } from "@/model/types"
import { PLANT_IDS } from "@/model/types"
import { daysBetween } from "./stage"

/** The same variety however it was typed: « Blue Zushi », « blue  zushi » → « blue zushi ». */
export const varietyKey = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim()

export type Variety = {
  key: string
  /** The spelling shown: the one used most (then the first met). */
  name: string
  /** Every spelling used, the most used first: more than one = « Fusionner ». */
  spellings: { name: string; n: number }[]
  cycleIds: string[]
}

/** Every variety of the grow, from the cycles and the plants, sorted by name. */
export function varieties(cycles: Cycle[], plants: Plant[]): Variety[] {
  const by = new Map<string, { spell: Map<string, number>; cycles: Set<string> }>()
  const add = (raw: string | undefined, cycleId?: string) => {
    const name = raw?.replace(/\s+/g, " ").trim()
    if (!name) return
    const key = varietyKey(name)
    const v = by.get(key) ?? { spell: new Map(), cycles: new Set() }
    v.spell.set(raw!.trim(), (v.spell.get(raw!.trim()) ?? 0) + 1)
    if (cycleId) v.cycles.add(cycleId)
    by.set(key, v)
  }
  for (const c of cycles) for (const x of c.cultivars) add(x, c.id)
  for (const p of plants) add(p.cultivar, cycles.some((c) => c.id === p.cycleId) ? p.cycleId : undefined)
  return [...by]
    .map(([key, v]) => {
      const spellings = [...v.spell].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n)
      return { key, name: spellings[0].name, spellings, cycleIds: [...v.cycles] }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export type VarietyCycle = {
  cycle: Cycle
  /** Plants of this variety in the cycle (their `cultivar`), or every pot when the cycle grew this variety alone. */
  plants: PlantId[]
  /** Dry weight of those plants, as typed per plant (lot 12a). */
  dryPlants: { id: PlantId; g: number }[]
  /** Per plant: the mean of the plants' weights, else the cycle's dry weight ÷ its pots when it grew this variety alone. */
  gPerPlant?: number
  gPerPlantSrc?: "plants" | "cycle"
  flowerDays?: number
  harvestDate?: IsoDate
}

const potsOf = (c: Cycle): PlantId[] => PLANT_IDS.slice(0, Math.max(1, Math.min(PLANT_IDS.length, c.potCount ?? PLANT_IDS.length)))

/** The cycles where a variety grew, the most recent first, with what can be said of its yield there. */
export function varietyCycles(key: string, cycles: Cycle[], plants: Plant[]): VarietyCycle[] {
  const out: VarietyCycle[] = []
  for (const c of cycles) {
    const named = c.cultivars.filter((x) => varietyKey(x) === key)
    const mine = plants.filter((p) => p.cycleId === c.id && varietyKey(p.cultivar ?? "") === key).map((p) => p.label)
    if (!named.length && !mine.length) continue
    const alone = c.cultivars.length > 0 && c.cultivars.every((x) => varietyKey(x) === key) && !plants.some((p) => p.cycleId === c.id && p.cultivar?.trim() && varietyKey(p.cultivar) !== key)
    const ids = mine.length ? [...new Set(mine)].sort() : alone ? potsOf(c) : []
    const h = c.harvest ?? {}
    const dryPlants = ids.filter((id) => typeof h.dryByPlant?.[id] === "number").map((id) => ({ id, g: h.dryByPlant![id]! }))
    let gPerPlant: number | undefined
    let gPerPlantSrc: VarietyCycle["gPerPlantSrc"]
    if (dryPlants.length) {
      gPerPlant = Math.round((dryPlants.reduce((s, x) => s + x.g, 0) / dryPlants.length) * 10) / 10
      gPerPlantSrc = "plants"
    } else if (alone && typeof h.dryG === "number" && c.potCount) {
      gPerPlant = Math.round((h.dryG / c.potCount) * 10) / 10
      gPerPlantSrc = "cycle"
    }
    out.push({
      cycle: c,
      plants: ids,
      dryPlants,
      ...(gPerPlant != null ? { gPerPlant, gPerPlantSrc } : {}),
      ...(c.flipDate && c.harvestDate ? { flowerDays: daysBetween(c.flipDate, c.harvestDate) } : {}),
      ...(c.harvestDate ? { harvestDate: c.harvestDate } : {}),
    })
  }
  return out.sort((a, b) => (b.cycle.harvestDate ?? b.cycle.germinationDate ?? "").localeCompare(a.cycle.harvestDate ?? a.cycle.germinationDate ?? ""))
}

/**
 * « Fusionner » two spellings (asked, never silent): every cycle and plant written with one of `from` takes `to`.
 * Returns only the documents that change.
 */
export function mergeSpellings(cycles: Cycle[], plants: Plant[], from: string[], to: string): { cycles: Cycle[]; plants: Plant[] } {
  const set = new Set(from.map((x) => x.trim()))
  const cs = cycles
    .filter((c) => c.cultivars.some((x) => set.has(x.trim())))
    .map((c) => ({ ...c, cultivars: [...new Set(c.cultivars.map((x) => (set.has(x.trim()) ? to : x)))] }))
  const ps = plants.filter((p) => set.has((p.cultivar ?? "").trim())).map((p) => ({ ...p, cultivar: to }))
  return { cycles: cs, plants: ps }
}
