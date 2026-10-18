// "Bonjour" card (spec §4ter): buildDailyDigest(data, date, locale) — pure, no AI, no server.
// v1 (lot 2b): per space, the latest climate, today's planned watering, the last entry, the reservoir autonomy.
// Later batches add reminders (3), nutrition (4)…  The Claude version stores the result in digest/latest.
import type { Equipment, EquipmentAssignment, Grow, Site, Space } from "@/model/grow"
import type { Cycle, Entry, IsoDate, Mix } from "@/model/types"
import type { Lang } from "@/i18n/types"
import { formatDayMonth, formatNumber, translate } from "@/i18n/core"
import { equipmentAt } from "@/equipment/calc"
import { groupBySite } from "@/model/grow-ops"
import { buildProgram, PHOTOPERIOD, programTotals, steerStage } from "./program"
import { daysBetween, stageOn } from "./stage"
import { reservoirAutonomy, type Autonomy } from "./reservoir"

export const DIGEST_SCHEMA = 1

export type DigestData = {
  grow?: Pick<Grow, "name"> | null
  spaces: Space[]
  sites?: Site[]
  cycles: Cycle[]
  entries: Entry[]
  mixes: Mix[]
  equipment: Equipment[]
  assignments: EquipmentAssignment[]
}

export type DigestLine = { kind: "climate" | "watering" | "lastEntry" | "reservoir" | "stage"; text: string; warn?: boolean }
export type DigestSpace = { spaceId: string; name: string; lines: DigestLine[] }
export type Digest = { schemaVersion: number; date: IsoDate; locale: Lang; title: string; spaces: DigestSpace[]; text: string }

/** Everything Today and the digest need about one space, at a date. */
export function spaceContext(space: Space, data: Omit<DigestData, "spaces" | "grow" | "sites">, date: IsoDate) {
  const cycle = data.cycles.find((c) => c.spaceId === space.id && !c.harvestDate && !c.archived) ?? null
  const entries = data.entries.filter((e) => e.spaceId === space.id && e.date <= date).sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1))
  const mixes = data.mixes.filter((m) => m.spaceIds?.includes(space.id) || (!!cycle && m.cycleId === cycle.id))
  const here = equipmentAt(space.id, date, data.assignments).map((a) => data.equipment.find((e) => e.id === a.equipmentId)).filter((e): e is Equipment => !!e)
  const tank = here.find((e) => e.type === "reservoir" && e.reservoir?.kind !== "runoff")
  const pots = here.find((e) => e.type === "container")
  const potCount = cycle?.potCount ?? pots?.container?.count ?? pots?.quantity
  const autonomy: Autonomy | null = tank ? reservoirAutonomy({ entries, mixes, potCount, usableL: tank.reservoir?.usableL, mode: tank.reservoir?.mode, today: date }) : null
  const last = entries.find((e) => !e.plantId)
  return { cycle, entries, mixes, tank, autonomy, last, here }
}

export function buildDailyDigest(data: DigestData, date: IsoDate, locale: Lang): Digest {
  const t = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) => translate(locale, k, v)
  const n = (v: number, d = 0) => formatNumber(locale, v, d)
  const dm = (iso: IsoDate) => formatDayMonth(locale, new Date(`${iso}T12:00:00`))
  const ordered = groupBySite(data.spaces, data.sites ?? []).flatMap((g) => g.spaces)

  const spaces: DigestSpace[] = ordered.map((space) => {
    const ctx = spaceContext(space, data, date)
    const lines: DigestLine[] = []
    const { cycle, last, autonomy } = ctx

    if (cycle) {
      const s = stageOn(cycle, date)
      lines.push({ kind: "stage", text: t("digest.stage", { cycle: cycle.name, stage: t(`stage.${s.key}`) }) })
    }

    if (space.modules.climate) {
      const recent = last && daysBetween(last.date, date) <= 1 ? last : undefined
      if (recent && (recent.tempDay != null || recent.rh != null)) {
        const parts = [recent.tempDay != null ? `${n(recent.tempDay, 1)} °C` : null, recent.rh != null ? `${n(recent.rh)} %` : null, recent.vpd != null ? `VPD ${n(recent.vpd, 2)} kPa` : null].filter(Boolean)
        lines.push({ kind: "climate", text: t("digest.climate", { v: parts.join(" · ") }) })
      } else lines.push({ kind: "climate", text: t("digest.climateNone") })
    }

    if (space.modules.irrigation && cycle) {
      const s = stageOn(cycle, date)
      const ss = steerStage(s.key, cycle.establishing)
      if (!ss) lines.push({ kind: "watering", text: t("digest.wateringHand") })
      else if (cycle.waterMode === "manual") lines.push({ kind: "watering", text: t("digest.wateringManual", { time: cycle.lightsOn }) })
      else {
        const rows = buildProgram(cycle, ss, last?.photoperiodH ?? PHOTOPERIOD[ss])
        const shots = rows.filter((r) => r.kind === "shot" && !r.optional).length
        const { fixed } = programTotals(rows)
        lines.push({ kind: "watering", text: t("digest.wateringAuto", { shots, litres: n(fixed / 1000, 1), first: rows.find((r) => r.kind === "shot")?.time ?? "—" }) })
      }
    }

    lines.push({
      kind: "lastEntry",
      text: last ? t("digest.lastEntry", { when: last.date === date ? (last.time ? t("digest.todayAt", { time: last.time }) : t("digest.today")) : t("digest.on", { date: dm(last.date) }) }) : t("digest.noEntry"),
      warn: !last || daysBetween(last.date, date) > 1,
    })

    if (autonomy) {
      if (autonomy.days.ok) {
        const d = Math.floor(autonomy.days.value)
        lines.push({
          kind: "reservoir",
          text: t(autonomy.source === "reading" ? "digest.reservoir" : "digest.reservoirEst", { days: n(d), litres: n(autonomy.left.ok ? autonomy.left.value : 0) }),
          warn: d <= 1 || autonomy.tooOld,
        })
      } else lines.push({ kind: "reservoir", text: t("digest.reservoirMissing"), warn: true })
      if (autonomy.tooOld) lines.push({ kind: "reservoir", text: t("digest.tooOld", { days: n(autonomy.mixAgeDays ?? 0) }), warn: true })
    }
    return { spaceId: space.id, name: space.name, lines }
  })

  const title = t("digest.title", { date: dm(date) })
  const text = [title, ...spaces.map((s) => `${s.name}\n${s.lines.map((l) => `• ${l.text}`).join("\n")}`)].join("\n\n")
  return { schemaVersion: DIGEST_SCHEMA, date, locale, title, spaces, text }
}
