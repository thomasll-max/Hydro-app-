// Thomas's grow, prefilled in the Claude version (spec §1). Only what the spec states; unknown specs stay empty
// and show "donnée manquante". The EVO4 efficacy (2.8 µmol/J) is an explicit, editable hypothesis.
import type { Equipment, EquipmentAssignment, Grow, Space } from "@/model/grow"
import { GROW_SCHEMA } from "@/model/grow"
import { newGrow, newSpace } from "@/model/grow-ops"
import { SCHEMA, type Cycle } from "@/model/types"

export const FLOWER_ID = "floraison"
export const COLUMN_ID = "colonne"

type Seed = { grow: Grow; spaces: Space[]; equipment: Equipment[]; assignments: EquipmentAssignment[]; cycles: Cycle[] }

export function thomasGrow(now: string, today: string): Seed {
  const grow = newGrow("Grow de Thomas", now, { line: "athena-pro", addons: ["fade", "cleanse", "balance"], dosing: "conc226" })
  const flower = newSpace({ id: FLOWER_ID, name: "Floraison", template: "flower", order: 0, color: "emerald", now, dimensionsCm: { l: 90, w: 90, h: 180 } })
  const column = newSpace({ id: COLUMN_ID, name: "Colonne", template: "veg", order: 1, color: "sky", now, dimensionsCm: { l: 30, w: 90, h: 180 } })
  // Propagation and veg first, drying later: the propagation module is on as well.
  column.modules.propagation = true

  const eq = (id: string, type: Equipment["type"], name: string, extra: Partial<Equipment> = {}): Equipment => ({
    schemaVersion: GROW_SCHEMA.equipment,
    id,
    type,
    name,
    createdAt: now,
    updatedAt: now,
    ...extra,
  })
  const equipment: Equipment[] = [
    eq("tent-743d", "other", "CloudLab 743D", { brand: "AC Infinity", model: "CloudLab 743D", notes: "120 × 90 × 180 cm, deux espaces" }),
    eq("evo4", "lamp", "IONFRAME EVO4 300 W", {
      brand: "AC Infinity",
      model: "IONFRAME EVO4",
      source: "hypothesis",
      lamp: { type: "LED", watts: 300, efficacy: 2.8, efficacyIsHypothesis: true, dimmable: "10" },
      notes: "Pas de PPF publié pour la lampe complète : 3,14 µmol/J est donné par diode, « 1819 PPFD » sans distance. 2,8 µmol/J = hypothèse à corriger.",
    }),
    eq("s16", "lamp", "IONBEAM S16", {
      brand: "AC Infinity",
      model: "IONBEAM S16",
      source: "maker",
      lamp: { type: "LED", watts: 42, efficacy: 3.14, spectrum: "LM301H EVO" },
      notes: "4 barres (2 + 2), 42 W au total.",
    }),
    eq("tank-120", "reservoir", "Réservoir 120 L", { reservoir: { usableL: 120, mode: "dtw" }, notes: "Drain-to-waste, 5 à 7 jours de solution." }),
    eq("runoff-can", "reservoir", "Bidon de runoff", { reservoir: { kind: "runoff" }, notes: "Externe, 20 à 25 L." }),
    eq("rain", "pump", "Pompe de pression (arrosage automatique)", { pump: { control: "Control Plug" }, notes: "Débit à mesurer. Pompe de drain toujours alimentée." }),
    eq("pots-15", "container", "Pots 15 L", { quantity: 4, container: { volumeL: 15, count: 4, substrate: "coco" }, notes: "100 % coco UGro Rhiza." }),
    eq("cloudline-s6", "extractor", "Cloudline S6", { brand: "AC Infinity", model: "Cloudline S6", extractor: { carbonFilter: true }, notes: "Filtre à charbon 150 mm." }),
    eq("cloudray-s6", "fan", "Cloudray S6", { brand: "AC Infinity", model: "Cloudray S6" }),
    eq("hydrone-5", "dehumidifier", "HYDRONE 5", { notes: "Placé hors de la tente." }),
    eq("controller", "sensor", "Controller AI+", {
      brand: "AC Infinity",
      model: "Controller AI+",
      notes: "Écran dans la floraison, sonde 1 dans la colonne, port 2 pour le futur capteur de sol, capteur CO2/lumière.",
    }),
  ]

  // Where each item sits today. The tent and the controller span both spaces; the dehumidifier is outside (stock).
  const placed: [string, string | null][] = [
    ["tent-743d", FLOWER_ID],
    ["tent-743d", COLUMN_ID],
    ["evo4", FLOWER_ID],
    ["s16", COLUMN_ID],
    ["tank-120", FLOWER_ID],
    ["runoff-can", FLOWER_ID],
    ["rain", FLOWER_ID],
    ["pots-15", FLOWER_ID],
    ["cloudline-s6", FLOWER_ID],
    ["cloudray-s6", FLOWER_ID],
    ["hydrone-5", null],
    ["controller", FLOWER_ID],
    ["controller", COLUMN_ID],
  ]
  const assignments: EquipmentAssignment[] = placed.map(([equipmentId, spaceId], i) => ({
    schemaVersion: GROW_SCHEMA.assignment,
    id: `seed-${i + 1}`,
    equipmentId,
    spaceId,
    from: today,
  }))

  const cycle: Cycle = {
    schemaVersion: SCHEMA.cycle,
    id: "cycle-1",
    name: "Cycle 1",
    spaceId: COLUMN_ID, // germination in the Colonne, then transfer to Floraison
    transfers: [],
    cultivars: ["Cherry Limeade"],
    flowerWeeks: 9,
    substrate: "coco",
    waterMode: "auto",
    potVolumeL: 15,
    potCount: 4,
    lights: "IONFRAME EVO4 300 W · IONBEAM S16",
    lightsOn: "06:00",
    shotPct: 3,
    p1Shots: 5,
    p1IntervalMin: 20,
    p0DelayMin: 90,
    nutrientLine: "athena-pro",
    leafOffsetC: -2,
    createdAt: now,
    updatedAt: now,
  }
  return { grow, spaces: [flower, column], equipment, assignments, cycles: [cycle] }
}

/** Seed as [path, doc] pairs, in write order (grow/main last: its presence means "seeded"). */
export function seedDocs(s: Seed): [string, Record<string, unknown>][] {
  return [
    ...s.spaces.map((x) => [`spaces/${x.id}`, x] as [string, Record<string, unknown>]),
    ...s.equipment.map((x) => [`equipment/${x.id}`, x] as [string, Record<string, unknown>]),
    ...s.assignments.map((x) => [`equipmentAssignments/${x.id}`, x] as [string, Record<string, unknown>]),
    ...s.cycles.map((x) => [`cycles/${x.id}`, x] as [string, Record<string, unknown>]),
    ["grow/main", s.grow],
  ]
}
