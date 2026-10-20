// Assistant de premier lancement (lot 8b, version locale) : a draft filled step by step, turned into documents at the
// end. Nothing is guessed: an equipment field left empty creates nothing. A cycle needs its name and start date; its pots
// are optional (lot 15a, as in the cycle sheet: « donnée manquante » where they are used).
import { GROW_SCHEMA, modulesFor, SPACE_COLORS, type SpaceColor, type DimensionsCm, type Equipment, type EquipmentAssignment, type ModuleId, type NutritionSettings, type Space, type TemplateId } from "@/model/grow"
import { freeColor, newGrow, newSpace } from "@/model/grow-ops"
import { withPots } from "@/equipment/calc"
import { SCHEMA, type Cycle, type IsoDate, type Substrate, type WaterMode } from "@/model/types"

export const ONBOARDING_KEY = "hydro.onboarding"

/** Steps after the welcome screen, in the order of the spec (§ assistant). */
export const STEPS = ["name", "spaces", "equipment", "modules", "nutrition", "cycle", "digest"] as const
export type Step = (typeof STEPS)[number]

/** Quick equipment of a space: only what is typed becomes an item. */
export type DraftGear = { lampName?: string; lampW?: number; potL?: number; potN?: number; tankL?: number; extName?: string; extM3h?: number }

export type DraftSpace = {
  key: string
  name: string
  template: TemplateId
  dims: Partial<DimensionsCm>
  modules: Record<ModuleId, boolean>
  gear: DraftGear
  /** Chosen when the space is added and kept (lot 10e): removing another space never changes it. */
  color?: SpaceColor
}

export type DraftCycle = {
  name: string
  spaceKey: string
  cultivars: string
  germinationDate?: IsoDate
  substrate: Substrate
  waterMode: WaterMode
  potL?: number
  potN?: number
  lightsOn: string
}

export type Draft = {
  name: string
  spaces: DraftSpace[]
  nutrition: NutritionSettings
  /** null = no cycle yet (it can be created later from the Journal or Réglages). */
  cycle: DraftCycle | null
  digestTime: string
}

/** Friends start with the Pro Line, no add-on ticked, concentrate at 226 g/L (Athena's recommended strength, p. 37). */
export const ONBOARDING_NUTRITION: NutritionSettings = { line: "athena-pro", addons: [], dosing: "conc226" }

export function draftSpace(key: string, name: string, template: TemplateId = "flower", color: SpaceColor = SPACE_COLORS[0]): DraftSpace {
  return { key, name, template, dims: {}, modules: modulesFor(template), gear: {}, color }
}

export function emptyDraft(spaceName: string): Draft {
  return { name: "", spaces: [draftSpace("s1", spaceName)], nutrition: ONBOARDING_NUTRITION, cycle: null, digestTime: "07:00" }
}

/** Changing the template resets the modules to the template's (the modules step comes after). */
export function setTemplate(s: DraftSpace, template: TemplateId): DraftSpace {
  return { ...s, template, modules: modulesFor(template) }
}

/** Same template, dimensions, modules and equipment (spec: "un espace se duplique avec son équipement"). */
export function duplicateDraftSpace(d: Draft, key: string, newKey: string, name: (src: string) => string): Draft {
  const i = d.spaces.findIndex((s) => s.key === key)
  if (i < 0) return d
  const src = d.spaces[i]
  const copy: DraftSpace = { ...src, key: newKey, name: name(src.name), dims: { ...src.dims }, modules: { ...src.modules }, gear: { ...src.gear }, color: freeColor(d.spaces.map((s) => s.color)) }
  return { ...d, spaces: [...d.spaces.slice(0, i + 1), copy, ...d.spaces.slice(i + 1)] }
}

/** Equipment step (lot 10e): this space's equipment copied to the other spaces, no new space created. */
export function copyGearToOthers(d: Draft, key: string): Draft {
  const src = d.spaces.find((s) => s.key === key)
  if (!src) return d
  return { ...d, spaces: d.spaces.map((s) => (s.key === key ? s : { ...s, gear: { ...src.gear } })) }
}

export function removeDraftSpace(d: Draft, key: string): Draft {
  if (d.spaces.length <= 1) return d
  const spaces = d.spaces.filter((s) => s.key !== key)
  const cycle = d.cycle && d.cycle.spaceKey === key ? { ...d.cycle, spaceKey: spaces[0].key } : d.cycle
  return { ...d, spaces, cycle }
}

/** A cycle started in the wizard takes the pots typed for its space, and starts today unless changed (as the sheet). */
export function startCycle(d: Draft, name: string, spaceKey?: string, today?: IsoDate): DraftCycle {
  const sp = d.spaces.find((s) => s.key === spaceKey) ?? d.spaces.find((s) => s.template === "flower" || s.template === "veg") ?? d.spaces[0]
  return { name, spaceKey: sp.key, cultivars: "", ...(today ? { germinationDate: today } : {}), substrate: "coco", waterMode: "auto", potL: sp.gear.potL, potN: sp.gear.potN, lightsOn: "06:00" }
}

export type Issue = "name" | "noSpace" | "spaceName" | "dims" | "gear" | "cycleName" | "cycleStart" | "cyclePots" | "time"

const positive = (v: number | undefined) => v == null || (Number.isFinite(v) && v > 0)
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** What blocks "Suivant" on a step (empty = the step can be left). */
export function stepIssues(d: Draft, step: Step): Issue[] {
  const out: Issue[] = []
  if (step === "name" && !d.name.trim()) out.push("name")
  if (step === "spaces") {
    if (!d.spaces.length) out.push("noSpace")
    if (d.spaces.some((s) => !s.name.trim())) out.push("spaceName")
    if (d.spaces.some((s) => !positive(s.dims.l) || !positive(s.dims.w) || !positive(s.dims.h))) out.push("dims")
  }
  if (step === "equipment") {
    const g = d.spaces.map((s) => s.gear)
    if (g.some((x) => ![x.lampW, x.potL, x.potN, x.tankL, x.extM3h].every(positive))) out.push("gear")
  }
  if (step === "cycle" && d.cycle) {
    if (!d.cycle.name.trim()) out.push("cycleName")
    if (!d.cycle.germinationDate) out.push("cycleStart")
    if (!positive(d.cycle.potL) || !positive(d.cycle.potN)) out.push("cyclePots")
    if (!TIME.test(d.cycle.lightsOn)) out.push("time")
  }
  if (step === "digest" && !TIME.test(d.digestTime)) out.push("time")
  return out
}

const GEAR_FIELDS: [keyof DraftGear, string][] = [["lampW", "lampw"], ["potL", "potl"], ["potN", "potn"], ["tankL", "tank"], ["extM3h", "extm"]]

/** The field an issue is about (lot 15a: its message goes under it, the page scrolls to it); none for « no space ». */
export function issueField(d: Draft, step: Step, issue: Issue): string | undefined {
  const i = (bad: (s: DraftSpace) => boolean) => d.spaces.findIndex(bad)
  switch (issue) {
    case "name":
      return "onb-name"
    case "spaceName":
      return `onb-sp-name-${i((s) => !s.name.trim())}`
    case "dims": {
      const n = i((s) => !positive(s.dims.l) || !positive(s.dims.w) || !positive(s.dims.h))
      const dims = d.spaces[n]?.dims ?? {}
      return `onb-${(["l", "w", "h"] as const).find((k) => !positive(dims[k])) ?? "l"}-${n}`
    }
    case "gear": {
      const n = i((s) => !GEAR_FIELDS.every(([k]) => positive(s.gear[k] as number | undefined)))
      const g = d.spaces[n]?.gear ?? {}
      return `onb-${GEAR_FIELDS.find(([k]) => !positive(g[k] as number | undefined))?.[1] ?? "lampw"}-${n}`
    }
    case "cycleName":
      return "onb-c-name"
    case "cycleStart":
      return "onb-c-germ"
    case "cyclePots":
      return positive(d.cycle?.potL) ? "onb-c-potn" : "onb-c-potl"
    case "time":
      return step === "digest" ? "onb-digest" : "onb-c-on"
    default:
      return undefined
  }
}

export function draftIssues(d: Draft): Issue[] {
  return STEPS.flatMap((s) => stepIssues(d, s))
}

/** Item names, from the UI language. */
export type GearNames = { lamp: string; pots: (v: number) => string; tank: (l: number) => string; extractor: string }

type Doc = Record<string, unknown>

/**
 * The whole draft as [path, doc] pairs, in write order: spaces, equipment, assignments, cycle, then grow/main last
 * (its presence ends the wizard, as for the Claude version's seed).
 */
export function draftDocs(d: Draft, p: { now: string; today: IsoDate; id: (prefix: string) => string; names: GearNames; timeZone?: string }): [string, Doc][] {
  const out: [string, Doc][] = []
  const spaceId = new Map<string, string>()
  const equipment: Equipment[] = []
  const assignments: EquipmentAssignment[] = []
  const lampsIn = new Map<string, string[]>()

  d.spaces.forEach((ds, order) => {
    const id = p.id("sp")
    spaceId.set(ds.key, id)
    const dims = Object.fromEntries(Object.entries(ds.dims).filter(([, v]) => v != null && v > 0)) as Partial<DimensionsCm>
    const space: Space = {
      ...newSpace({ id, name: ds.name.trim(), template: ds.template, order, now: p.now, color: ds.color ?? SPACE_COLORS[order % SPACE_COLORS.length], ...(Object.keys(dims).length ? { dimensionsCm: dims } : {}) }),
      modules: { ...ds.modules },
    }
    out.push([`spaces/${id}`, space])

    const g = ds.gear
    const place = (e: Equipment, quantity?: number) => {
      equipment.push(e)
      assignments.push({ schemaVersion: GROW_SCHEMA.assignment, id: p.id("as"), equipmentId: e.id, spaceId: id, from: p.today, ...(quantity ? { quantity } : {}) })
    }
    const item = (type: Equipment["type"], name: string, extra: Partial<Equipment>): Equipment => ({ schemaVersion: GROW_SCHEMA.equipment, id: p.id("eq-"), type, name, source: "user", createdAt: p.now, updatedAt: p.now, ...extra })
    if (g.lampName?.trim() || g.lampW) {
      const name = g.lampName?.trim() || p.names.lamp
      place(item("lamp", name, { lamp: { ...(g.lampW ? { watts: g.lampW } : {}) } }))
      lampsIn.set(ds.key, [name])
    }
    // The pots typed for the first cycle are this space's pots when the equipment step left them empty (lot 15c: the
    // watering and Premiers pas read them from the space's equipment).
    const own = d.cycle?.spaceKey === ds.key && !g.potL && d.cycle.potL && d.cycle.potL > 0 ? d.cycle : null
    const potL = own ? own.potL : g.potL
    const potN = own ? own.potN : g.potN
    if (potL) place(withPots(undefined, { volumeL: potL, count: potN ? Math.round(potN) : undefined, id: p.id("eq-"), now: p.now, name: p.names.pots(potL) }), potN ? Math.round(potN) : undefined)
    if (g.tankL) place(item("reservoir", p.names.tank(g.tankL), { reservoir: { usableL: g.tankL } }))
    if (g.extName?.trim() || g.extM3h) place(item("extractor", g.extName?.trim() || p.names.extractor, { extractor: { ...(g.extM3h ? { m3h: g.extM3h } : {}) } }))
  })
  for (const e of equipment) out.push([`equipment/${e.id}`, e])
  for (const a of assignments) out.push([`equipmentAssignments/${a.id}`, a])

  const c = d.cycle
  if (c) {
    const cycle: Cycle = {
      schemaVersion: SCHEMA.cycle,
      id: "cycle-1",
      name: c.name.trim(),
      spaceId: spaceId.get(c.spaceKey),
      transfers: [],
      cultivars: c.cultivars.split(",").map((x) => x.trim()).filter(Boolean),
      ...(c.germinationDate ? { germinationDate: c.germinationDate } : {}),
      flowerWeeks: 9, // Athena program S1–S9
      substrate: c.substrate,
      waterMode: c.waterMode,
      ...(c.potL ? { potVolumeL: c.potL } : {}),
      ...(c.potN ? { potCount: Math.round(c.potN) } : {}),
      lights: (lampsIn.get(c.spaceKey) ?? []).join(" · "),
      lightsOn: c.lightsOn,
      shotPct: 3, // Athena: start at 3 % of the pot
      p1Shots: 5, // same starting plan as the cycle form; adjusted until runoff flows
      p1IntervalMin: 20, // Athena: 15–30 min
      p0DelayMin: 90, // Athena: 1–2 h
      nutrientLine: d.nutrition.line,
      leafOffsetC: -2, // spec default
      createdAt: p.now,
      updatedAt: p.now,
    }
    out.push([`cycles/${cycle.id}`, cycle])
  }

  const grow = { ...newGrow(d.name.trim(), p.now, d.nutrition), digestTime: d.digestTime, ...(p.timeZone ? { timeZone: p.timeZone } : {}) }
  out.push(["grow/main", grow])
  return out
}

/** Draft kept on the device while the wizard is open (a reload does not lose it). */
export function loadDraft(): Draft | null {
  try {
    const raw = JSON.parse(localStorage.getItem(ONBOARDING_KEY) ?? "null") as { draft?: Draft } | null
    const d = raw?.draft
    return d && Array.isArray(d.spaces) && d.spaces.length && d.nutrition ? d : null
  } catch {
    return null
  }
}
export function saveDraft(d: Draft | null, step = 0): void {
  try {
    if (d) localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ draft: d, step }))
    else localStorage.removeItem(ONBOARDING_KEY)
  } catch {
    /* storage blocked: the draft lives in memory only */
  }
}
export function loadStep(): number {
  try {
    const n = (JSON.parse(localStorage.getItem(ONBOARDING_KEY) ?? "null") as { step?: number } | null)?.step
    return typeof n === "number" && n >= 0 && n <= STEPS.length ? n : 0
  } catch {
    return 0
  }
}
