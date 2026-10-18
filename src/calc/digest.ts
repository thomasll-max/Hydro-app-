// "Bonjour" card (spec §4ter): buildDailyDigest(data, date, locale) — pure, no AI, no server.
// v1 (lot 2b): per space, the latest climate, today's planned watering, the last entry, the reservoir autonomy.
// Later batches add reminders (3), nutrition (4)…  The Claude version stores the result in digest/latest.
import type { Equipment, EquipmentAssignment, Grow, Site, Space } from "@/model/grow"
import type { Cycle, Entry, IsoDate, Mix } from "@/model/types"
import type { Lang } from "@/i18n/types"
import { formatDayMonth, formatNumber, translate } from "@/i18n/core"
import { groupBySite } from "@/model/grow-ops"
import { buildProgram, PHOTOPERIOD, programTotals, steerStage } from "./program"
import { daysBetween, stageOn } from "./stage"
import { spaceContext } from "./space-context"
import { calendarItems, growTimeZone } from "@/calendar/agenda"
import { itemTitle } from "@/calendar/labels"
import type { CustomProduct, Reminder } from "@/model/grow"

export const DIGEST_SCHEMA = 2

export type DigestData = {
  grow?: (Pick<Grow, "name"> & Partial<Pick<Grow, "nutrition" | "timeZone">>) | null
  spaces: Space[]
  sites?: Site[]
  cycles: Cycle[]
  entries: Entry[]
  mixes: Mix[]
  equipment: Equipment[]
  assignments: EquipmentAssignment[]
  /** Lot 3: reminders (and the state of automatic deadlines), products used by deadlines. */
  reminders?: Reminder[]
  customProducts?: CustomProduct[]
}

export type DigestLine = { kind: "climate" | "watering" | "lastEntry" | "reservoir" | "stage" | "reminder" | "deadline"; text: string; warn?: boolean }
export type DigestSpace = { spaceId: string; name: string; lines: DigestLine[] }
export type Digest = { schemaVersion: number; date: IsoDate; locale: Lang; title: string; spaces: DigestSpace[]; /** Reminders of the day not tied to a space. */ general: DigestLine[]; text: string }

export { spaceContext }

export function buildDailyDigest(data: DigestData, date: IsoDate, locale: Lang): Digest {
  const t = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) => translate(locale, k, v)
  const n = (v: number, d = 0) => formatNumber(locale, v, d)
  const dm = (iso: IsoDate) => formatDayMonth(locale, new Date(`${iso}T12:00:00`))
  const ordered = groupBySite(data.spaces, data.sites ?? []).flatMap((g) => g.spaces)

  // Lot 3: reminders and deadlines due today, from the calendar.
  const due = calendarItems(data, date, date, date, growTimeZone(data)).filter((i) => !i.done)
  const dueLine = (i: (typeof due)[number]): DigestLine =>
    i.type === "reminder"
      ? { kind: "reminder", text: t("digest.reminder", { title: itemTitle(locale, i), time: i.time }), warn: false }
      : { kind: "deadline", text: t("digest.deadline", { title: itemTitle(locale, i) }), warn: true }

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
    for (const i of due) if (i.spaceId === space.id) lines.push(dueLine(i))
    return { spaceId: space.id, name: space.name, lines }
  })
  const general = due.filter((i) => !i.spaceId || !ordered.some((s) => s.id === i.spaceId)).map(dueLine)

  const title = t("digest.title", { date: dm(date) })
  const text = [
    title,
    ...(general.length ? [`${t("digest.general")}\n${general.map((l) => `• ${l.text}`).join("\n")}`] : []),
    ...spaces.map((s) => `${s.name}\n${s.lines.map((l) => `• ${l.text}`).join("\n")}`),
  ].join("\n\n")
  return { schemaVersion: DIGEST_SCHEMA, date, locale, title, spaces, general, text }
}
