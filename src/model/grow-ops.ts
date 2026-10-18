// Pure operations on the modular grow: create, duplicate, archive, modules, transfers, visibility.
import type { Equipment, EquipmentAssignment, Grow, ModuleId, NutritionSettings, Site, Space, SpaceColor, TemplateId } from "./grow"
import { GROW_SCHEMA, SPACE_COLORS, modulesFor } from "./grow"
import type { Cycle, Entry, IsoDate } from "./types"

export const DEFAULT_NUTRITION: NutritionSettings = { line: "athena-pro", addons: ["fade", "cleanse", "balance"], dosing: "conc226" }

export function newGrow(name: string, now: string, nutrition: NutritionSettings = DEFAULT_NUTRITION): Grow {
  return { schemaVersion: GROW_SCHEMA.grow, id: "main", name, digestTime: "07:00", nutrition, createdAt: now, updatedAt: now }
}

export function newSite(id: string, name: string, order: number): Site {
  return { schemaVersion: GROW_SCHEMA.site, id, name, order }
}

export function newSpace(p: { id: string; name: string; template: TemplateId; order: number; now: string; color?: SpaceColor; siteId?: string; dimensionsCm?: Space["dimensionsCm"] }): Space {
  return {
    schemaVersion: GROW_SCHEMA.space,
    id: p.id,
    name: p.name,
    template: p.template,
    color: p.color ?? SPACE_COLORS[p.order % SPACE_COLORS.length],
    order: p.order,
    ...(p.siteId ? { siteId: p.siteId } : {}),
    ...(p.dimensionsCm ? { dimensionsCm: p.dimensionsCm } : {}),
    modules: modulesFor(p.template),
    createdAt: p.now,
    updatedAt: p.now,
  }
}

/** Effective nutrition settings of a space (its own override, else the grow's). */
export function spaceNutrition(grow: Pick<Grow, "nutrition"> | null | undefined, space?: Pick<Space, "nutrition">): NutritionSettings {
  const base = grow?.nutrition ?? DEFAULT_NUTRITION
  return { ...base, ...(space?.nutrition ?? {}) }
}

/** Turning a module off only flips the switch; data stays where it is. */
export function setModule(space: Space, module: ModuleId, on: boolean, now: string): Space {
  return { ...space, modules: { ...space.modules, [module]: on }, updatedAt: now }
}

/** Fields of a daily entry owned by each module. Hidden (not deleted) when the module is off. */
export const MODULE_FIELDS: Partial<Record<ModuleId, (keyof Entry)[]>> = {
  climate: ["tempDay", "tempNight", "rh", "leafOffsetC", "vpd"],
  irrigation: ["weightMorningKg", "weightPeakKg", "dryback", "volumePerPotMl", "shots", "runoffMl", "runoffPct", "sensorPct", "ecRunoff", "phRunoff"],
  nutrition: ["ecIn", "phIn", "mixId"],
  light: ["lightPct", "lightHeightCm", "ppfd", "photoperiodH", "dli"],
  plants: ["heightCm"],
}

export function visibleEntry(entry: Entry, space: Pick<Space, "modules">): Partial<Entry> {
  const hidden = new Set<string>()
  for (const [m, fields] of Object.entries(MODULE_FIELDS)) if (!space.modules[m as ModuleId]) fields!.forEach((f) => hidden.add(f))
  return Object.fromEntries(Object.entries(entry).filter(([k]) => !hidden.has(k))) as Partial<Entry>
}

/** Duplicate a space with its current equipment (new open assignments from `date`). */
export function duplicateSpace(
  space: Space,
  p: { id: string; name: string; order: number; now: string; date: IsoDate },
  assignments: EquipmentAssignment[],
  newId: () => string,
): { space: Space; assignments: EquipmentAssignment[] } {
  const copy: Space = { ...space, id: p.id, name: p.name, order: p.order, color: SPACE_COLORS[p.order % SPACE_COLORS.length], archived: undefined, createdAt: p.now, updatedAt: p.now }
  delete copy.archived
  const current = assignments.filter((a) => a.spaceId === space.id && !a.to)
  return {
    space: copy,
    assignments: current.map((a) => ({ schemaVersion: GROW_SCHEMA.assignment, id: newId(), equipmentId: a.equipmentId, spaceId: p.id, from: p.date, ...(a.quantity ? { quantity: a.quantity } : {}) })),
  }
}

export function archiveSpace(space: Space, archived: boolean, now: string): Space {
  const s = { ...space, updatedAt: now }
  if (archived) s.archived = true
  else delete s.archived
  return s
}

/** Spaces grouped by site (spaces without a site come last, under null). */
export function groupBySite(spaces: Space[], sites: Site[], includeArchived = false) {
  const live = spaces.filter((s) => includeArchived || !s.archived).sort((a, b) => a.order - b.order)
  const out: { site: Site | null; spaces: Space[] }[] = []
  for (const site of [...sites].filter((s) => !s.archived).sort((a, b) => a.order - b.order)) {
    const here = live.filter((s) => s.siteId === site.id)
    if (here.length) out.push({ site, spaces: here })
  }
  const loose = live.filter((s) => !s.siteId || !sites.some((x) => x.id === s.siteId && !x.archived))
  if (loose.length) out.push({ site: null, spaces: loose })
  return out
}

// ---------- Cycles in spaces ----------
/** A cycle is in one space at a time; moving it records a transfer. */
export function transferCycle(cycle: Cycle, to: string, date: IsoDate, now: string, opts: { partial?: boolean; plantIds?: string[]; note?: string } = {}): Cycle {
  const t = { date, from: cycle.spaceId, to, ...(opts.partial ? { partial: true, plantIds: opts.plantIds ?? [] } : {}), ...(opts.note ? { note: opts.note } : {}) }
  return { ...cycle, ...(opts.partial ? {} : { spaceId: to }), transfers: [...(cycle.transfers ?? []), t], updatedAt: now }
}

/** Space of a cycle at a date, replaying full transfers. */
export function cycleSpaceAt(cycle: Cycle, date: IsoDate): string | undefined {
  const full = (cycle.transfers ?? []).filter((t) => !t.partial).sort((a, b) => a.date.localeCompare(b.date))
  let space = full.length ? (full[0].from ?? cycle.spaceId) : cycle.spaceId
  for (const t of full) if (t.date <= date) space = t.to
  return space
}

export function activeCyclesIn(spaceId: string, cycles: Cycle[]): Cycle[] {
  return cycles.filter((c) => !c.archived && !c.harvestDate && c.spaceId === spaceId)
}

export function lampWatts(e: Equipment): number | undefined {
  return e.lamp?.watts
}
