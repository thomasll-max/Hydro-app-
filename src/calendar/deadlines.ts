// Automatic deadlines (spec §4ter). Each one appears when the tool that computes it is delivered:
// lot 3 has the cycle dates (12/12, Fade, rinçage, récolte), the reservoir autonomy (bidon à refaire),
// propagation and drying ends, Great White at the transfer, and the pump flow check (> 60 days).
// Lot 4 adds the concentrate running low (jerrycan stocks); lot 5 the next IPW spray of a running protocol.
import type { ConcentrateStock, CustomProduct, Equipment, Reminder, Spray } from "@/model/grow"
import type { IsoDate } from "@/model/types"
import { equipmentAt } from "@/equipment/calc"
import { spaceNutrition } from "@/model/grow-ops"
import { addDays, fadeStart, flushStart, plannedHarvest } from "@/calc/stage"
import { spaceContext } from "@/calc/space-context"
import type { DigestData } from "@/calc/digest"
import { openStocks, stockStatus } from "@/calc/concentrate"
import { getCatalog, isOwnLine } from "@/data/nutrients"
import { ipwLastDay, nextIpw } from "@/calc/ipw"
import { nextMixSpray, validMixes } from "@/calc/spray"

export const DEADLINE_KINDS = ["flip", "fade", "flush", "harvest", "tank", "propagationEnd", "greatWhite", "dryingEnd", "flowCheck", "concentrateLow", "ipw", "spray"] as const
export type DeadlineKind = (typeof DEADLINE_KINDS)[number]
export type DeadlineSource = "athena" | "user" | "estimate" | "label" | "spec"

/** Flow to be measured again after this many days (spec §4quater). */
export const FLOW_CHECK_DAYS = 60
/** A move older than this no longer brings the Great White reminder (it goes on the roots at the move). */
export const GREAT_WHITE_DAYS = 14

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
  /** Already done according to the data (lot 10b): the tank of the phase or the event is recorded. Shown as done. */
  doneBy?: "event" | "mix"
}

/** Days before the planned date from which a tank or an event counts for that deadline (tank made a little early). */
const EARLY_DAYS = 3

export type CalendarData = DigestData & { reminders?: Reminder[]; customProducts?: CustomProduct[]; concentrateStocks?: ConcentrateStock[]; sprays?: Spray[] }

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
    const evs = (data.events ?? []).filter((e) => e.cycleId === c.id)
    const tanks = data.mixes.filter((m) => m.cycleId === c.id || m.spaceIds?.includes(space.id))
    /** Fade / flush done: their event, or a tank of that phase made from a few days before the planned date. */
    const doneBy = (type: "fade" | "flush", from: IsoDate, isTank: (m: (typeof tanks)[number]) => boolean): Pick<Deadline, "doneBy"> => {
      const early = addDays(from, -EARLY_DAYS)
      if (evs.some((e) => e.type === type && e.date >= early)) return { doneBy: "event" }
      if (tanks.some((m) => m.date >= early && isTank(m))) return { doneBy: "mix" }
      return {}
    }
    if (!c.harvestDate) {
      if (!c.flipDate && c.plannedFlipDate) out.push({ key: `flip_${c.id}`, kind: "flip", date: c.plannedFlipDate, ...base, vars, source: "user" })
      const nut = spaceNutrition(data.grow?.nutrition ? { nutrition: data.grow.nutrition } : null, space)
      const fade = fadeStart(c)
      if (fade && nut.addons.includes("fade"))
        out.push({ key: `fade_${c.id}`, kind: "fade", date: fade, ...base, vars: { ...vars, week: 8 }, source: "athena", ...doneBy("fade", fade, (m) => !!m.items?.some((i) => i.id === "fade" && i.qty)) })
      // Next IPW spray of the running protocol, only while allowed (until flowering S3) and if IPW is switched on.
      if (nut.addons.includes("ipw")) {
        const next = nextIpw(data.sprays ?? [], space.id, ipwLastDay(c.flipDate))
        if (next) out.push({ key: `ipw_${space.id}_${next.date}`, kind: "ipw", date: next.date, ...base, vars: { ...vars, space: space.name }, source: "athena" })
      }
      // « Mon mélange » (lot 10k2b): its next spray, from the last one in this space and the frequency the user gave.
      for (const mix of validMixes(data.grow?.sprayMixes)) {
        const next = nextMixSpray(data.sprays ?? [], mix, space.id)
        if (next) out.push({ key: `spray_${mix.id}_${space.id}_${next}`, kind: "spray", date: next, ...base, vars: { ...vars, space: space.name, mix: mix.name }, source: "user" })
      }
      const flush = flushStart(c)
      // Flush (plain water + Cleanse, EC < 0.1) is Athena's program: not for another brand (lot 10e).
      if (flush && !isOwnLine(nut.line)) out.push({ key: `flush_${c.id}`, kind: "flush", date: flush, ...base, vars, source: "athena", ...doneBy("flush", flush, (m) => m.kind === "flush" || m.phase === "flush") })
      const harvest = plannedHarvest(c)
      if (harvest) out.push({ key: `harvest_${c.id}`, kind: "harvest", date: harvest, ...base, vars, source: "user" })
      const moved = !!c.transferDate || (c.transfers ?? []).some((t) => !t.partial)
      // A transfer is a move made on the day (lot 10b, decision of Thomas): it brings the Great White reminder, done
      // when the transfer (or a repotting) recorded the product. Only for a recent move: one application per move.
      const lastMove = (c.transfers ?? []).filter((t) => !t.partial).sort((a, b) => a.date.localeCompare(b.date)).at(-1)
      if (lastMove && lastMove.date >= addDays(today, -GREAT_WHITE_DAYS)) {
        for (const p of data.customProducts ?? []) {
          if (p.application !== "roots" || p.onEvent !== "transfer" || p.inactive) continue
          const applied = evs.some((e) => (e.type === "transfer" || e.type === "transplant") && e.date >= lastMove.date && e.products?.some((x) => x.productId === p.id))
          out.push({ key: `greatWhite_${c.id}_${p.id}_${lastMove.date}`, kind: "greatWhite", date: lastMove.date, ...base, productId: p.id, vars: { ...vars, product: p.name }, source: "label", ...(applied ? { doneBy: "event" as const } : {}) })
        }
      }
      // Old cycles (before lot 10b) with a planned transfer date that has not happened yet.
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
        // Without a tank, the deadline follows the last level typed: "Fait" closes this one, not every later one.
        const level = ctx.entries.find((e) => !e.plantId && e.reservoirL != null)?.date ?? today
        out.push({
          key: `tank_${space.id}_${mix?.id ?? `level-${level}`}`,
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
    // Dated the day a new bag is needed (estimated), not the day the jerrycan went low: never born overdue (lot 10b).
    // An estimate is never "late": past the estimated day it stays due today until a new jerrycan is made (the next
    // tank that needs this product may come later than the usual gap, e.g. Bloom during veg).
    const needed = s.neededBy ?? s.lowSince
    const date = needed < today ? today : needed
    out.push({ key: `concentrateLow_${st.id}`, kind: "concentrateLow", date, productId: st.productId, vars: { product: name, litres: s.leftL }, source: "estimate" })
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
  return { done: !!st?.done?.length || !!d.doneBy, date: moved ? moved.slice(0, 10) : d.date, snoozed: !!moved }
}
