// "Bonjour" card (spec §4ter): buildDailyDigest(data, date, locale) — pure, no AI, no server.
// v1 (lot 2b): per space, the latest climate, today's planned watering, the last entry, the reservoir autonomy.
// Later batches add reminders (3), nutrition (4)…  The Claude version stores the result in digest/latest.
import type { Equipment, EquipmentAssignment, Grow, Site, Space } from "@/model/grow"
import type { Cycle, Entry, IsoDate, Mix } from "@/model/types"
import type { Lang } from "@/i18n/types"
import { formatDayMonth, formatNumber, translate } from "@/i18n/core"
import { groupBySite } from "@/model/grow-ops"
import { buildProgram, PHOTOPERIOD, programTotals, steerStage } from "./program"
import { addDays, daysBetween, stageOn } from "./stage"
import { spaceContext } from "./space-context"
import { calendarItems, growTimeZone } from "@/calendar/agenda"
import { itemTitle } from "@/calendar/labels"
import type { CustomProduct, Reminder } from "@/model/grow"

export const DIGEST_SCHEMA = 3
/** Days prepared ahead (today included), so the morning task has a digest even if the app was not opened. */
export const DIGEST_DAYS = 7

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
export type Digest = {
  schemaVersion: number
  date: IsoDate
  locale: Lang
  title: string
  spaces: DigestSpace[]
  /** Reminders of the day not tied to a space. */
  general: DigestLine[]
  text: string
  /** Day the app computed it (the journal as it was then). */
  computedOn?: IsoDate
  /** The text in both languages (the morning task sends French, whatever the language of the phone that computed it). */
  texts?: Record<Lang, string>
}

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

/** Today's digest and the next days', computed from today's data (reminders and deadlines are exact; measurements are the latest known). */
export function digestWeek(data: DigestData, today: IsoDate, locale: Lang, days = DIGEST_DAYS): Digest[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i)
    const d = buildDailyDigest(data, date, locale)
    const other = buildDailyDigest(data, date, locale === "fr" ? "en" : "fr")
    return { ...d, computedOn: today, texts: { [locale]: d.text, [other.locale]: other.text } as Record<Lang, string> }
  })
}

/** Document ids for a week of digests: digest/latest (today) and digest/{date}. Older dated ones are removed after 7 days. */
export function digestDocs(week: Digest[]): [string, Digest][] {
  return [["digest/latest", week[0]] as [string, Digest], ...week.map((d) => [`digest/${d.date}`, d] as [string, Digest])]
}
export const staleDigestIds = (ids: string[], today: IsoDate) => ids.filter((id) => /^\d{4}-\d{2}-\d{2}$/.test(id) && id < addDays(today, -DIGEST_DAYS))

/**
 * What the morning task sends (spec §12): the digest of the day, else the latest one. "stale" when it was computed on an
 * earlier day (the app has not been opened since): reminders and deadlines are still right, the measurements are older.
 */
export function morningText(docs: Record<string, Partial<Digest>>, today: IsoDate, locale: Lang): { text: string; stale: boolean; found: boolean } {
  const d = docs[today] ?? (docs.latest?.date === today ? docs.latest : undefined)
  const body = d?.texts?.[locale] ?? d?.text
  if (!d || !body) return { text: translate(locale, "digest.none"), stale: true, found: false }
  const stale = !!d.computedOn && d.computedOn < today
  const note = stale ? `\n\n${translate(locale, "digest.staleNote", { date: formatDayMonth(locale, new Date(`${d.computedOn}T12:00:00`)) })}` : ""
  return { text: body + note, stale, found: true }
}
