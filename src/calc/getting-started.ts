// Premiers pas (lot 8c, demande de Thomas) : what to enter first, ticked from the data itself. An item only appears
// when it applies (no lamp asked for a space without the light module, no pump flow for manual watering).
import type { Equipment, EquipmentAssignment, Space } from "@/model/grow"
import type { Cycle, Entry, IsoDate, Mix } from "@/model/types"
import { equipmentAt, ppf, spaceIrrigation } from "@/equipment/calc"

export const START_STEPS = ["lamp", "pots", "cycle", "flow", "mix", "entry", "backup"] as const
export type StartStep = (typeof START_STEPS)[number]
export type StartItem = { id: StartStep; done: boolean; /** First space still missing it. */ spaceId?: string; cycleId?: string }

export const START_HIDDEN_KEY = "hydro.startHidden"

export function startChecklist(p: {
  spaces: Space[]
  cycles: Cycle[]
  equipment: Equipment[]
  assignments: EquipmentAssignment[]
  mixes: Pick<Mix, "id">[]
  entries: Pick<Entry, "id">[]
  today: IsoDate
  /** null = never backed up; undefined = not asked (Claude version: the data is not only on the phone). */
  lastBackup?: IsoDate | null
}): StartItem[] {
  const live = p.spaces.filter((s) => !s.archived)
  const out: StartItem[] = []
  const firstMissing = (list: Space[], ok: (s: Space) => boolean) => list.find((s) => !ok(s))?.id

  const lit = live.filter((s) => s.modules.light)
  if (lit.length) {
    const hasLamp = (s: Space) =>
      equipmentAt(s.id, p.today, p.assignments).some((a) => {
        const e = p.equipment.find((x) => x.id === a.equipmentId)
        // Same rule as the light estimate: published PPF, else real watts × efficacy.
        return e?.type === "lamp" && ppf(e.lamp).ok
      })
    const missing = firstMissing(lit, hasLamp)
    out.push({ id: "lamp", done: !missing, spaceId: missing })
  }

  const watered = live.filter((s) => s.modules.irrigation)
  if (watered.length) {
    const hasPots = (s: Space) => {
      const irr = spaceIrrigation(s.id, p.today, p.equipment, p.assignments)
      return irr.potL.ok && !!irr.potCount
    }
    const missing = firstMissing(watered, hasPots)
    out.push({ id: "pots", done: !missing, spaceId: missing })
  }

  const running = p.cycles.filter((c) => !c.archived && !c.harvestDate)
  const dated = running.find((c) => c.germinationDate || c.flipDate)
  out.push({ id: "cycle", done: !!dated, cycleId: (dated ?? running[0])?.id, spaceId: (dated ?? running[0])?.spaceId })

  // Pump flow: only for automatic watering (the length of one shot comes from it).
  const auto = running.filter((c) => c.waterMode === "auto" && live.some((s) => s.id === c.spaceId && s.modules.irrigation))
  if (auto.length) {
    const noFlow = auto.find((c) => !spaceIrrigation(c.spaceId!, p.today, p.equipment, p.assignments).flow.ok)
    out.push({ id: "flow", done: !noFlow, spaceId: noFlow?.spaceId })
  }

  if (live.some((s) => s.modules.nutrition)) out.push({ id: "mix", done: p.mixes.length > 0 })
  out.push({ id: "entry", done: p.entries.length > 0 })
  if (p.lastBackup !== undefined) out.push({ id: "backup", done: p.lastBackup != null })
  return out
}

export function startProgress(items: StartItem[]): { done: number; total: number; next?: StartItem } {
  return { done: items.filter((i) => i.done).length, total: items.length, next: items.find((i) => !i.done) }
}

export function startHidden(): boolean {
  try {
    return localStorage.getItem(START_HIDDEN_KEY) === "1"
  } catch {
    return false
  }
}
export function setStartHidden(hidden: boolean): void {
  try {
    if (hidden) localStorage.setItem(START_HIDDEN_KEY, "1")
    else localStorage.removeItem(START_HIDDEN_KEY)
  } catch {
    /* storage blocked: the card comes back next time */
  }
}
