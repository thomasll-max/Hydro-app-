// Modular grow model (spec §4bis, §4quater). One grow → optional sites/rooms → spaces with modules.
// Flat collections, same in both versions: grow/main, sites/{id}, spaces/{id}, cycles/{id}, groups/{id}, plants/{id},
// entries/{YYYY-MM-DD}_{spaceId}[_{target}], events/{id}, mixes/{id}, reminders/{id}, concentrateStocks/{id},
// sprays/{id}, customProducts/{id}, equipment/{id}, equipmentAssignments/{id}, settings/main (+ digest/latest, Claude).
import type { DrybackMethod, IsoDate, Range } from "./types"
import type { AddonId } from "@/data/nutrients/types"

export const GROW_SCHEMA = {
  grow: 1,
  site: 1,
  space: 1,
  group: 1,
  equipment: 1,
  assignment: 1,
  reminder: 2,
  concentrateStock: 2,
  spray: 2,
  customProduct: 2,
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
export type { AddonId }
/**
 * EC and pH aimed for with another brand (lot 7a), by phase, typed by the grower: nothing is ever proposed. EC is one
 * value (lo = hi), pH a range. Absent = no target (the reading shows no zone).
 */
export type OwnPhaseTargets = { ec?: Range; ph?: Range }
export type OwnTargets = { veg?: OwnPhaseTargets; flower?: OwnPhaseTargets }
export type NutritionSettings = { line: string; addons: AddonId[]; dosing: DosingMethod; own?: OwnTargets }

export type Grow = {
  schemaVersion: number
  id: "main"
  name: string
  digestTime: string // "07:00"
  /** First name for « Bonjour Thomas. » on the morning card (lot 10h). Absent: taken from « Grow de … », else « Bonjour. ». */
  ownerName?: string
  /** IANA time zone of the grow (reminders, .ics). Absent = the device's. */
  timeZone?: string
  nutrition: NutritionSettings
  /** « Mon mélange » of Pulvérisation (lot 10k2b): sprays of one's own, as the user describes them. */
  sprayMixes?: SprayMix[]
  createdAt: string
  updatedAt: string
}

/**
 * A spray of one's own (lot 10k2b): a home spray or a stack, described by the user (« perso, non vérifié »). The app
 * proposes no dose: it only multiplies the doses typed here by the litres of the sprayer.
 */
export type SprayMix = {
  id: string
  name: string
  /** Products and their dose per litre of sprayer, as typed (a dose may stay empty). */
  items: SprayMixItem[]
  /** Every N days (optional): the next spray then goes in the calendar. */
  everyDays?: number
  /** The user's own points to check before spraying (none is suggested). */
  checklist?: string[]
  note?: string
}
export type SprayMixItem = { name: string; dose?: number; unit: "mL" | "g"; /** Picked from « Mes produits » (only its name and unit). */ productId?: string }

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

/**
 * 8 space colours, checked for contrast on both themes (tokens --space-<id>). Since lot 10h they are earthy hues with
 * no green; the ids are the ones stored in the data since lot 1, in the same order: emerald = brique, sky = cuivre,
 * violet = ocre, amber = lagune, rose = ardoise, teal = lavande, orange = prune, slate = rose. No migration needed.
 */
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
  /** How the dryback is measured here (absent = weighing) and the name of a sensor other than AC Infinity. */
  irrigation?: { drybackMethod?: DrybackMethod; sensorName?: string }
  /** Photoperiod set for the space (hours of light); absent = by stage (18 h veg, 12 h flower). */
  light?: { photoperiodH?: number }
  /** Last PPFD map measured on a 3 × 3 grid (row by row, from the back left), µmol/m²/s; null = not measured. */
  lightMap?: { date: IsoDate; cells: (number | null)[]; heightCm?: number }
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
export type ContainerSpec = { kind?: string; volumeL?: number; count?: number; substrate?: string; heightCm?: number }
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
/** Personal reminder (lot 3) or the stored state of an automatic deadline (kind "auto"). */
export type Reminder = {
  schemaVersion: number
  id: string
  kind?: "custom" | "auto"
  /** Automatic deadline this doc holds the state of (kind "auto"), e.g. "fade_cycle-1". */
  autoKey?: string
  title: string
  note?: string
  spaceId?: string
  cycleId?: string
  /** Local wall-clock start in the grow's time zone: "2026-10-20T08:00". */
  start: string
  /** Supported subset: FREQ=DAILY|WEEKLY|MONTHLY; INTERVAL; COUNT; UNTIL=YYYYMMDD; BYDAY (weekly). */
  rrule?: string
  /** Alarm, minutes before (VALARM in the .ics). */
  alarmMin?: number
  /** Occurrences marked done, by their original local date. */
  done?: IsoDate[]
  /** Occurrences moved ("Reporter"): original local date → new local start. */
  snoozed?: Record<IsoDate, string>
  createdAt: string
  updatedAt?: string
}
/** A jerrycan of concentrate made from a whole bag (one per product, never mixed). */
export type ConcentrateStock = {
  schemaVersion: number
  id: string
  productId: string
  line: string
  gPerL: number
  litresMade: number
  madeOn: IsoDate
  bagKg?: number
  /** Marked empty (or replaced): no more usage counted, no more deadline. */
  finishedOn?: IsoDate
  note?: string
  createdAt?: string
}
/** A foliar spray (IPW, or « Mon mélange » since lot 10k2b): never in the tank. */
export type Spray = {
  schemaVersion: number
  id: string
  date: IsoDate
  spaceIds: string[]
  cycleId?: string
  /** "ipw" (Athena), or "mix" (a mix of one's own, `mixId`). */
  product: string
  /** IPW: the protocol's dose. Absent for a mix of one's own (its doses are in `mix`). */
  mlPerL?: number
  litres: number
  /** The mix of one's own, as it was on that day (its name and doses can change later). */
  mixId?: string
  mix?: { name: string; items: SprayMixItem[] }
  protocol?: "prevention" | "pressure" | "restoration"
  /** First day of the running protocol (the schedule counts from it). */
  protocolStart?: IsoDate
  /** Checklist ticked before spraying. */
  checked?: string[]
  note?: string
  createdAt?: string
}
export type CustomProduct = {
  schemaVersion: number
  id: string
  name: string
  brand?: string
  /** What it is, as the user describes it (e.g. "terpene booster, humiques/fulviques"). */
  kind?: string
  unit: "mL" | "g"
  /** Where it goes: in the tank (dose per 10 L), by hand in the watering can (lot 7b: never in the tank nor its EC; the
   *  label dose is kept per 10 L like the tank's), or once on the roots at a transplant / transfer. */
  application: "tank" | "hand" | "roots"
  /** Dose per 10 L (tank) or per plant (roots). Empty until typed from the label: never guessed. */
  dosePer10L?: Range
  dosePerPlant?: Range
  /** Label dose as written (amount for a volume), kept for display; dosePer10L is derived from it. `gal`: the label says
   *  « per US gallon » (perL = 3.785, lot 7a). */
  labelDose?: { lo: number; hi: number; perL: number; gal?: boolean }
  /** Place in the mixing order of « Autre marque » (lot 7a): the order of the list once moved. Absent everywhere = order
   *  not given (the recipe says « ordre non précisé »). */
  mixOrder?: number
  /** Weeks of use as written on the label, free text until typed. */
  weeks?: string
  /** Weeks of use in the tank, typed from the label: in veg, and/or flowering weeks from–to. Empty = not typed. */
  use?: { veg?: boolean; flowerFrom?: number; flowerTo?: number }
  /** Switched off: kept, but no longer offered in the tank. */
  inactive?: boolean
  /** Event that triggers a one-off use (roots): a reminder is offered when it happens. */
  onEvent?: "transplant" | "transfer"
  /** Shown as "hors Athena, non vérifié"; the figures come from the product label. */
  verified: false
  source: "label"
  createdAt: string
}
