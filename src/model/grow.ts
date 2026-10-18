// Modular grow model (spec §4bis, §4quater). One grow → optional sites/rooms → spaces with modules.
// Flat collections, same in both versions: grow/main, sites/{id}, spaces/{id}, cycles/{id}, groups/{id}, plants/{id},
// entries/{YYYY-MM-DD}_{spaceId}[_{target}], events/{id}, mixes/{id}, reminders/{id}, concentrateStocks/{id},
// sprays/{id}, customProducts/{id}, equipment/{id}, equipmentAssignments/{id}, settings/main (+ digest/latest, Claude).
import type { IsoDate, Range } from "./types"

export const GROW_SCHEMA = {
  grow: 1,
  site: 1,
  space: 1,
  group: 1,
  equipment: 1,
  assignment: 1,
  reminder: 1,
  concentrateStock: 1,
  spray: 1,
  customProduct: 1,
} as const

export const COLLECTIONS = [
  "grow",
  "sites",
  "spaces",
  "cycles",
  "groups",
  "plants",
  "entries",
  "events",
  "mixes",
  "reminders",
  "concentrateStocks",
  "sprays",
  "customProducts",
  "equipment",
  "equipmentAssignments",
  "settings",
  "digest",
] as const
export type CollectionName = (typeof COLLECTIONS)[number]

// ---------- Grow ----------
export type DosingMethod = "powder" | "conc113" | "conc226" | "conc282"
export type AddonId = "fade" | "cleanse" | "balance" | "ipw"
export type NutritionSettings = { line: string; addons: AddonId[]; dosing: DosingMethod }

export type Grow = {
  schemaVersion: number
  id: "main"
  name: string
  digestTime: string // "07:00"
  nutrition: NutritionSettings
  createdAt: string
  updatedAt: string
}

export type Site = { schemaVersion: number; id: string; name: string; order: number; archived?: boolean }

// ---------- Modules (central registry) ----------
export const MODULES = ["climate", "light", "irrigation", "nutrition", "propagation", "drying", "plants"] as const
export type ModuleId = (typeof MODULES)[number]

export const TEMPLATES = ["flower", "veg", "propagation", "mother", "drying", "custom"] as const
export type TemplateId = (typeof TEMPLATES)[number]

export const TEMPLATE_MODULES: Record<TemplateId, ModuleId[]> = {
  flower: ["climate", "light", "irrigation", "nutrition", "plants"],
  veg: ["climate", "light", "irrigation", "nutrition", "plants"],
  propagation: ["climate", "light", "propagation"],
  mother: ["climate", "light", "irrigation", "nutrition"],
  drying: ["climate", "drying"],
  custom: [],
}

/** 8 space colours, checked for contrast on both themes (tokens --space-1 … --space-8). */
export const SPACE_COLORS = ["emerald", "sky", "violet", "amber", "rose", "teal", "orange", "slate"] as const
export type SpaceColor = (typeof SPACE_COLORS)[number]

export type DimensionsCm = { l: number; w: number; h: number }

export type Space = {
  schemaVersion: number
  id: string
  name: string
  template: TemplateId
  color: SpaceColor
  order: number
  siteId?: string
  dimensionsCm?: Partial<DimensionsCm>
  /** Module switches. Turning one off hides its data, never deletes it. */
  modules: Record<ModuleId, boolean>
  /** Overrides of the grow's nutrition settings for this space. */
  nutrition?: Partial<NutritionSettings>
  archived?: boolean
  createdAt: string
  updatedAt: string
}

export function modulesFor(template: TemplateId): Record<ModuleId, boolean> {
  const on = new Set(TEMPLATE_MODULES[template])
  return Object.fromEntries(MODULES.map((m) => [m, on.has(m)])) as Record<ModuleId, boolean>
}

// ---------- Cycles, groups, plants ----------
export type Transfer = { date: IsoDate; from?: string; to: string; partial?: boolean; plantIds?: string[]; note?: string }

export type Group = { schemaVersion: number; id: string; cycleId: string; name: string; spaceId?: string }

// ---------- Equipment (spec §4quater) ----------
export const EQUIPMENT_TYPES = ["lamp", "reservoir", "pump", "container", "extractor", "fan", "dehumidifier", "humidifier", "heater", "ac", "sensor", "other"] as const
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number]

export type LampSpec = {
  type?: string // LED, HPS…
  watts?: number // real W
  efficacy?: number // µmol/J
  efficacyIsHypothesis?: boolean
  ppf?: number // µmol/s (if published)
  coverageCm?: { l?: number; w?: number }
  dimensionsCm?: { l?: number; w?: number; h?: number }
  dimmable?: string // "10 levels"
  spectrum?: string
  minHeightCm?: number
  dimmerPct?: number // current setting
}
export type ReservoirSpec = { usableL?: number; totalL?: number; kind?: string; mode?: "dtw" | "recirc"; heater?: boolean; chiller?: boolean; airstone?: boolean; lid?: boolean }
export type PumpSpec = { flowMlPerMin?: number; flowMeasuredAt?: IsoDate; outlets?: number; control?: string }
export type ContainerSpec = { kind?: string; volumeL?: number; count?: number; substrate?: string }
export type ExtractorSpec = { m3h?: number; cfm?: number; diameterMm?: number; carbonFilter?: boolean; speedPct?: number }
export type CapacitySpec = { capacity?: string }

export type Equipment = {
  schemaVersion: number
  id: string
  type: EquipmentType
  name: string // only required field
  brand?: string
  model?: string
  quantity?: number
  /** "Mes lampes" library entry: a reusable model, not a physical item. */
  library?: boolean
  /** Source of the numbers: maker's data typed by the user, measured, or an explicit hypothesis. */
  source?: "maker" | "measured" | "hypothesis" | "user"
  lamp?: LampSpec
  reservoir?: ReservoirSpec
  pump?: PumpSpec
  container?: ContainerSpec
  extractor?: ExtractorSpec
  capacity?: CapacitySpec
  notes?: string
  createdAt: string
  updatedAt: string
}

/** Assignment history: a period during which an item sits in a space (or in stock when spaceId is null). */
export type EquipmentAssignment = {
  schemaVersion: number
  id: string
  equipmentId: string
  spaceId: string | null
  from: IsoDate
  to?: IsoDate // exclusive; open = current
  quantity?: number
}

// ---------- Declared now, screens later ----------
export type Reminder = {
  schemaVersion: number
  id: string
  title: string
  spaceId?: string
  cycleId?: string
  start: string // ISO datetime with offset
  rrule?: string
  done?: IsoDate[]
  snoozedTo?: string
  createdAt: string
}
export type ConcentrateStock = {
  schemaVersion: number
  id: string
  productId: string
  line: string
  gPerL: number
  litresMade: number
  madeOn: IsoDate
  bagKg?: number
}
export type Spray = {
  schemaVersion: number
  id: string
  date: IsoDate
  spaceIds: string[]
  product: string
  mlPerL: number
  litres: number
  protocol?: "prevention" | "pressure" | "restoration"
}
export type CustomProduct = {
  schemaVersion: number
  id: string
  name: string
  brand?: string
  unit: "mL" | "g"
  dosePer10L?: Range
  stages?: string[]
  /** Shown as "hors Athena, non vérifié". */
  verified: false
  createdAt: string
}
