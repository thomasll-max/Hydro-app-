// Data model. Every stored document carries schemaVersion.
// Paths (spec §11): cycles/{cycleId}, cycles/{cycleId}/plants/{plantId},
// cycles/{cycleId}/entries/{YYYY-MM-DD} or {YYYY-MM-DD}_{plantId},
// cycles/{cycleId}/events/{id}, cycles/{cycleId}/mixes/{id}, settings/main.

export const SCHEMA = { cycle: 2, plant: 1, entry: 1, event: 1, mix: 2 } as const

export type IsoDate = string // "2026-10-18"
export type Substrate = "coco" | "soil" | "mix7030"
export type WaterMode = "auto" | "manual"
export type PlantId = "P1" | "P2" | "P3" | "P4"
export const PLANT_IDS: PlantId[] = ["P1", "P2", "P3", "P4"]

export type Cycle = {
  schemaVersion: number
  id: string
  name: string
  cultivars: string[]
  germinationDate?: IsoDate
  transferDate?: IsoDate // into the RAIN
  flipDate?: IsoDate // 12/12 — flowering is counted from here
  plannedFlipDate?: IsoDate // reminder only
  flowerWeeks: number // planned flowering length (Athena program: 9)
  harvestDate?: IsoDate
  substrate: Substrate
  waterMode: WaterMode
  potVolumeL: number
  potCount: number
  flowMlPerMin?: number // measured, per pot
  lights: string
  lightsOn: string // "06:00"
  // daily irrigation schedule (auto mode). Lot 3 adds the steering tool on top.
  shotPct: number // % of pot volume per P1 shot
  p1Shots: number
  p1IntervalMin: number
  p0DelayMin: number
  p2Shots?: number // v1 only; P2 now follows the stage (irrigation tool)
  leafOffsetC: number
  establishing?: boolean // roots not yet at the pot edges: small doses near the stem
  nutrientLine?: string // e.g. "athena-pro"
  tapEc?: number // tap water EC, measured once
  sensor?: { phase?: "veg" | "gen" | "bulk" | "ripe"; base?: number; peak?: number; p2Pct?: number } // VPD: leaf temperature = air + offset (default −2)
  harvest?: Harvest
  createdAt: string
  updatedAt: string
}

export type Harvest = {
  wetG?: number
  dryG?: number
  watts?: number
  dryingDays?: number
  dryingNotes?: string
  curingStart?: IsoDate
  jarRh?: number
  tasting?: string
}

export type Plant = {
  schemaVersion: number
  id: PlantId
  cultivar: string
  phenotype?: string
  notes?: string
  updatedAt: string
}

export type Severity = 1 | 2 | 3
export const OBS_TAGS = ["yellowing", "burntTips", "claws", "droopy", "spots", "smell", "pests", "other"] as const
export type ObsTag = (typeof OBS_TAGS)[number]
export const ACTION_TAGS = ["lst", "defoliation", "lollipop", "transplant", "photoperiod", "newMix", "flush", "cleaning"] as const
export type ActionTag = (typeof ACTION_TAGS)[number]

/** Targets of the day, stored with each entry so charts keep the target that applied then. */
export type Range = { lo: number; hi: number }
export type TargetsSnapshot = {
  stage: StageKey
  dryback?: Range
  runoffPct?: Range
  ecIn?: Range
  ecRunoff?: Range
  phIn?: Range
  phRunoff?: Range
  ppfd?: Range
  dli?: Range
  vpd?: Range
}

export type Entry = {
  schemaVersion: number
  id: string // "2026-10-18" or "2026-10-18_P2"
  date: IsoDate
  plantId?: PlantId // absent = whole room
  time?: string // "07:42"
  // climate
  tempDay?: number
  tempNight?: number
  rh?: number
  leafOffsetC?: number
  vpd?: number // computed
  // irrigation
  weightMorningKg?: number
  weightPeakKg?: number
  dryback?: number // computed, %
  volumePerPotMl?: number
  shots?: number
  runoffMl?: number
  runoffPct?: number // computed (or from sensor)
  sensorPct?: number // AC Infinity soil sensor reading, if used
  // solution / runoff
  ecIn?: number
  phIn?: number
  mixId?: string
  ecRunoff?: number
  phRunoff?: number
  // light
  lightPct?: number
  lightHeightCm?: number
  ppfd?: number
  photoperiodH?: number
  dli?: number // computed
  // plant
  heightCm?: number
  observations?: { tag: ObsTag; severity: Severity }[]
  actions?: ActionTag[]
  photos?: string[] // asset ids
  note?: string
  targets?: TargetsSnapshot
  createdAt: string
  updatedAt: string
}

export const EVENT_TYPES = ["flip", "transplant", "fade", "flush", "harvest", "other"] as const
export type EventType = (typeof EVENT_TYPES)[number]
export type GrowEvent = {
  schemaVersion: number
  id: string
  date: IsoDate
  type: EventType
  note?: string
  createdAt: string
}

export type Mix = {
  schemaVersion: number
  id: string
  date: IsoDate
  volumeL: number
  ec?: number
  ph?: number
  recipe?: string // free text (v1)
  line?: string // nutrient line id
  kind?: "seedling" | "veg" | "flower" | "finish" | "flush"
  ecTarget?: number // fertiliser EC aimed for
  ecExpected?: number // with tap water
  phTarget?: Range
  balanceMlPer10L?: number
  items?: { id: string; name?: string; qty: number | null; unit: string }[]
  note?: string
  createdAt: string
}

export type StageKey = "seedling" | "veg" | "stretch" | "bulk" | "finish" | "flush" | "harvested"
