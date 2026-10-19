// Everything Today, the digest and the calendar need about one space at a date (split out of digest.ts
// so the calendar can use it without an import cycle).
import type { Equipment, EquipmentAssignment, Space } from "@/model/grow"
import type { Cycle, Entry, IsoDate, Mix } from "@/model/types"
import { equipmentAt } from "@/equipment/calc"
import { reservoirAutonomy, type Autonomy } from "./reservoir"
import { cycleOfSpace } from "@/model/grow-ops"

type Data = { cycles: Cycle[]; entries: Entry[]; mixes: Mix[]; equipment: Equipment[]; assignments: EquipmentAssignment[] }

/** Everything Today and the digest need about one space, at a date. */
export function spaceContext(space: Space, data: Data, date: IsoDate, preferId?: string | null) {
  const cycle = cycleOfSpace(data.cycles, space.id, preferId)
  const entries = data.entries.filter((e) => e.spaceId === space.id && e.date <= date).sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1))
  // Tanks of this space only: a tank made for the cycle's previous space (Colonne) does not feed this one (lot 10b).
  const mixes = data.mixes.filter((m) => (m.spaceIds?.length ? m.spaceIds.includes(space.id) : !!cycle && m.cycleId === cycle.id))
  const here = equipmentAt(space.id, date, data.assignments).map((a) => data.equipment.find((e) => e.id === a.equipmentId)).filter((e): e is Equipment => !!e)
  const tank = here.find((e) => e.type === "reservoir" && e.reservoir?.kind !== "runoff")
  const pots = here.find((e) => e.type === "container")
  const potCount = cycle?.potCount ?? pots?.container?.count ?? pots?.quantity
  const autonomy: Autonomy | null = tank ? reservoirAutonomy({ entries, mixes, potCount, usableL: tank.reservoir?.usableL, mode: tank.reservoir?.mode, today: date }) : null
  const last = entries.find((e) => !e.plantId)
  return { cycle, entries, mixes, tank, autonomy, last, here }
}

