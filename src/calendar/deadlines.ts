// Automatic deadlines (spec §4ter). Each one appears when the tool that computes it is delivered:
// lot 3 has the cycle dates (12/12, Fade, rinçage, récolte), the reservoir autonomy (bidon à refaire),
// propagation and drying ends, Great White at the transfer, and the pump flow check (> 60 days).
// Lot 4 adds the concentrate running low (jerrycan stocks); IPW comes with lot 5.
import type { ConcentrateStock, CustomProduct, Equipment, Reminder } from "@/model/grow"
import type { IsoDate } from "@/model/types"
import { equipmentAt } from "@/equipment/calc"
import { spaceNutrition } from "@/model/grow-ops"
import { addDays, fadeStart, flushStart, plannedHarvest } from "@/calc/stage"
import { spaceContext } from "@/calc/space-context"
import type { DigestData } from "@/calc/digest"
import { openStocks, stockStatus } from "@/calc/concentrate"
import { getCatalog } from "@/data/nutrients"

export const DEADLINE_KINDS = ["flip", "fade", "flush", "harvest", "tank", "propagationEnd", "greatWhite", "dryingEnd", "flowCheck", "concentrateLow"] as const
export type DeadlineKind = (typeof DEADLINE_KINDS)[number]
export type DeadlineSource = "athena" | "user" | "estimate" | "label" | "spec"

/** Flow to be measured again after this many days (spec §4quater). */
export const FLOW_CHECK_DAYS = 60

export type Deadline = {
  /** Stable id: same deadline, same key (used for state and for the .ics UID). */
  key: string
  kind: DeadlineKind
  date: IsoDate
  spaceId?: string
  cycleId?: string
  equipmentId?: string
  productId?: string
  vars: Record<string, string | number>
  source: DeadlineSource
}

export type CalendarData = DigestData & { reminders?: Reminder[]; customProducts?: CustomProduct[]; concentrateStocks?: ConcentrateStock[] }

export function deadlines(data: CalendarData, today: IsoDate): Deadline[] {
  const out: Deadline[] = []
  const live = data.spaces.filter((s) => !s.archived)
  const spaceOf = (id?: string) => live.find((s) => s.id === id)

  for (const c of data.cycles) {
    if (c.archived) continue
    const space = spaceOf(c.spaceId)
    if (!space) continue
    const base = { cycleId: c.id, spaceId: space.id }
    const vars = { cycle: c.name }
    if (!c.harvestDate) {
      if (!c.flipDate && c.plannedFlipDate) out.push({ key: `flip_${c.id}`, kind: "flip", date: c.plannedFlipDate, ...base, vars, source: "user" })
      const nut = spaceNutrition(data.grow?.nutrition ? { nutrition: data.grow.nutrition } : null, space)
      const fade = fadeStart(c)
      if (fade && nut.addons.includes("fade")) out.push({ key: `fade_${c.id}`, kind: "fade", date: fade, ...base, vars: { ...vars, week: 8 }, source: "athena" })
      const flush = flushStart(c)
      if (flush) out.push({ key: `flush_${c.id}`, kind: "flush", date: flush, ...base, vars, source: "athena" })
      const harvest = plannedHarvest(c)
      if (harvest) out.push({ key: `harvest_${c.id}`, kind: "harvest", date: harvest, ...base, vars, source: "user" })
      const moved = !!c.transferDate || (c.transfers ?? []).some((t) => !t.partial)
      if (c.plannedTransferDate && !moved) {
        out.push({ key: `propagationEnd_${c.id}`, kind: "propagationEnd", date: c.plannedTransferDate, ...base, vars, source: "user" })
        for (const p of data.customProducts ?? []) {
          if (p.application === "roots" && p.onEvent === "transfer")
            out.push({ key: `greatWhite_${c.id}_${p.id}`, kind: "greatWhite", date: c.plannedTransferDate, ...base, productId: p.id, vars: { ...vars, product: p.name }, source: "label" })
        }
      }
    } else if (c.plannedDryingDays && !c.harvest?.curingStart) {
      out.push({ key: `dryingEnd_${c.id}`, kind: "dryingEnd", date: addDays(c.harvestDate, c.plannedDryingDays), ...base, vars, source: "user" })
    }
  }

  for (const space of live) {
    // Tank to remake, from the reservoir autonomy (same calculation as Today).
    if (space.modules.nutrition || space.modules.irrigation) {
      const ctx = spaceContext(space, data, today)
      const a = ctx.autonomy
      if (a?.days.ok) {
        const mix = [...ctx.mixes].sort((x, y) => (x.date < y.date ? 1 : -1))[0]
        const litres = mix?.volumeL ?? ctx.tank?.reservoir?.usableL
        out.push({
          key: `tank_${space.id}_${mix?.id ?? "level"}`,
          kind: "tank",
          date: addDays(today, Math.max(0, Math.floor(a.days.value))),
          spaceId: space.id,
          vars: { space: space.name, litres: litres ?? "" },
          source: "estimate",
        })
      }
    }
    // Pump flow: never measured, or measured more than 60 days ago.
    if (space.modules.irrigation) {
      const pumps = equipmentAt(space.id, today, data.assignments)
        .map((a) => data.equipment.find((e) => e.id === a.equipmentId))
        .filter((e): e is Equipment => !!e && e.type === "pump")
      for (const p of pumps) {
        const at = p.pump?.flowMeasuredAt
        const known = p.pump?.flowMlPerMin != null && !!at
        out.push({
          key: `flowCheck_${p.id}_${known ? at : "none"}`,
          kind: "flowCheck",
          date: known ? addDays(at!, FLOW_CHECK_DAYS) : today,
          spaceId: space.id,
          equipmentId: p.id,
          vars: { pump: p.name, days: FLOW_CHECK_DAYS },
          source: "spec",
        })
      }
    }
  }
  // Concentrate jerrycan running low: fewer than 2 tanks like the last one left (estimate), dated at that tank.
  const stocks = data.concentrateStocks ?? []
  for (const st of openStocks(stocks)) {
    const s = stockStatus(st, stocks, data.mixes)
    if (!s.low || !s.lowSince) continue
    const name = getCatalog(st.line).products.find((p) => p.id === st.productId)?.name ?? st.productId
    out.push({ key: `concentrateLow_${st.id}`, kind: "concentrateLow", date: s.lowSince, productId: st.productId, vars: { product: name, litres: s.leftL }, source: "estimate" })
  }
  // A pump shared by two spaces gives one deadline.
  const seen = new Set<string>()
  return out.filter((d) => (seen.has(d.key) ? false : (seen.add(d.key), true))).sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key))
}

/** Document id holding the state ("Fait", "Reporter") of an automatic deadline. */
export const autoStateId = (key: string) => `auto_${key}`

export type DeadlineState = { done: boolean; date: IsoDate; snoozed: boolean }

/** Applies the stored state: done, or moved to another day. */
export function deadlineState(d: Deadline, reminders: Reminder[] = []): DeadlineState {
  const st = reminders.find((r) => r.id === autoStateId(d.key))
  const moved = st?.snoozed?.[d.date]
  return { done: !!st?.done?.length, date: moved ? moved.slice(0, 10) : d.date, snoozed: !!moved }
}
