// Data model. Every stored document carries schemaVersion.
// Flat paths (spec §12): cycles/{id}, plants/{id}, entries/{YYYY-MM-DD}_{spaceId}[_{target}], events/{id}, mixes/{id}…
// The grow, sites, spaces and equipment live in ./grow.ts.
import type { Transfer } from "./grow"

export const SCHEMA = { cycle: 4, plant: 2, entry: 2, event: 2, mix: 4 } as const

export type IsoDate = string // "2026-10-18"
export type Substrate = "coco" | "soil" | "mix7030"
/** How the dryback is measured in a space: weighing (Athena's targets apply), a soil sensor, or not at all. */
export const DRYBACK_METHODS = ["weight", "acinfinity", "sensor", "none"] as const
export type DrybackMethod = (typeof DRYBACK_METHODS)[number]
export type WaterMode = "auto" | "manual"
export type PlantId = "P1" | "P2" | "P3" | "P4"
export const PLANT_IDS: PlantId[] = ["P1", "P2", "P3", "P4"]

export type Cycle = {
  schemaVersion: number
  id: string
  name: string
  /** Space the cycle is in now (one at a time). Transfers keep the history. */
  spaceId?: string
  transfers?: Transfer[]
  archived?: boolean
  cultivars: string[]
  /** Start of the cycle: germination (or cutting). */
  germinationDate?: IsoDate
  /** "Passer en végé" (lot 10b): the day the vegetative stage starts, in any space. */
  vegDate?: IsoDate
  /** Old cycles (before lot 10b): moved into the flowering space, read as the start of veg when vegDate is absent. */
  transferDate?: IsoDate
  flipDate?: IsoDate // 12/12 — flowering is counted from here
  plannedFlipDate?: IsoDate // reminder only
  /** Old field (before lot 10b, no longer offered): planned end of propagation. A transfer is now just a move. */
  plannedTransferDate?: IsoDate
  /** Planned drying length after the harvest, in days (end-of-drying reminder). */
  plannedDryingDays?: number
  flowerWeeks: number // planned flowering length (Athena program: 9)
  harvestDate?: IsoDate
  substrate: Substrate
  waterMode: WaterMode
  /** Pots of the cycle: from the space's equipment or typed; absent = "donnée manquante" (never guessed). */
  potVolumeL?: number
  potCount?: number
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
  /** « Photo de la semaine » (lot 12b): the photo chosen for a week of the strip, by « {P1|all}/{monday} ». */
  weekPhotos?: Record<string, string>
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
  /** Dry weight per plant (lot 12a, optional). Their sum never replaces `dryG` once typed: a gap shows as is. */
  dryByPlant?: Partial<Record<PlantId, number>>
  /** Free note of the cycle's review (lot 12a). */
  reviewNote?: string
}

export type Plant = {
  schemaVersion: number
  id: string // "{cycleId}_P1"
  label: PlantId
  cycleId: string
  groupId?: string
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
  id: string // "2026-10-18_{spaceId}" or "2026-10-18_{spaceId}_P2"
  date: IsoDate
  spaceId: string
  cycleId?: string
  groupId?: string
  plantId?: PlantId // absent = whole space
  reservoirL?: number // litres left in the reservoir (optional)
  // propagation
  sownCount?: number
  germinatedCount?: number
  domeOn?: boolean
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
  /** Computed from the weights, % — the only dryback compared with Athena's targets. */
  dryback?: number
  volumePerPotMl?: number
  shots?: number
  runoffMl?: number
  runoffPct?: number // computed from runoffMl and volumePerPotMl
  /** Old single soil-sensor reading (before the dryback methods); kept, no longer offered for new entries. */
  sensorPct?: number
  /** Soil sensor, moisture %: at the peak (after the last shot) and in the morning (before the first). */
  sensorPeakPct?: number
  sensorMorningPct?: number
  /** Computed (peak − morning) ÷ peak on the sensor's own scale, %. Never compared with Athena's weighing targets. */
  drybackSensor?: number
  /** Method of the space when the entry was saved (none = absent), and the sensor's name for "sensor". */
  drybackMethod?: Exclude<DrybackMethod, "none">
  sensorName?: string
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
  /** Tags of each photo (lot 12b): the observation tags, and free tags (« trichomes », « racines »…). */
  photoTags?: Record<string, { obs?: ObsTag[]; free?: string[] }>
  note?: string
  /** Filled by a dictation (lot 11): `source` says so, `dictation` keeps the words, apart from the note. */
  source?: "voice"
  dictation?: string
  targets?: TargetsSnapshot
  /**
   * Values out of their plausible range (lot 15b), taken out for the computations and kept here. Only in memory
   * (calc/plausible `trusted`): never stored, `stored` puts them back.
   */
  doubtful?: Partial<Record<string, number>>
  createdAt: string
  updatedAt: string
}

export const EVENT_TYPES = ["veg", "flip", "transplant", "fade", "flush", "harvest", "transfer", "equipment", "other"] as const
export type EventType = (typeof EVENT_TYPES)[number]
export type GrowEvent = {
  schemaVersion: number
  id: string
  date: IsoDate
  type: EventType
  cycleId?: string
  spaceId?: string
  equipmentId?: string
  /** One-off products used at this event (e.g. mycorrhizae on the roots at a transfer). Dose only as typed from the label. */
  products?: { productId: string; qty?: number; unit?: string }[]
  note?: string
  createdAt: string
}

export type Mix = {
  schemaVersion: number
  id: string
  date: IsoDate
  cycleId?: string
  /** One tank can feed several spaces. */
  spaceIds?: string[]
  volumeL: number
  ec?: number // measured
  /** pH measured after adjusting (pH « après »). */
  ph?: number
  /** pH measured before any Balance. */
  phBefore?: number
  /** Balance poured while titrating this tank (mL, on top of the known amount poured first). */
  balanceAddedMl?: number
  recipe?: string // free text (v1)
  line?: string // nutrient line id
  /** Program phase of the line (catalog id: "veg", "finish", "fl5"…). */
  phase?: string
  kind?: "seedling" | "veg" | "flower" | "finish" | "flush"
  ecTarget?: number // fertiliser EC aimed for
  ecExpected?: number // with tap water
  phTarget?: Range
  balanceMlPer10L?: number
  /** concentrate = strength (g/L) when dosed from a concentrate jerrycan (stock tracking). */
  /** per10L = the dose chosen in a published range, per 10 L as typed (before any EC scaling, lot 10c). */
  items?: { id: string; name?: string; qty: number | null; unit: string; concentrate?: number; range?: [number, number]; per10L?: number }[]
  note?: string
  createdAt: string
}

export type StageKey = "seedling" | "veg" | "stretch" | "bulk" | "finish" | "flush" | "harvested"
