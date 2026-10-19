// "Bonjour" card (spec §4ter): buildDailyDigest(data, date, locale) — pure, no AI, no server.
// v1 (lot 2b): per space, the latest climate, today's planned watering, the last entry, the reservoir autonomy.
// Later batches add reminders (3), nutrition (4)…  The Claude version stores the result in digest/latest.
import { isOwnLine } from "@/data/nutrients"
import type { Equipment, EquipmentAssignment, Grow, Site, Space } from "@/model/grow"
import type { Cycle, Entry, GrowEvent, IsoDate, Mix } from "@/model/types"
import type { Lang } from "@/i18n/types"
import { formatDayMonth, formatNumber, translate } from "@/i18n/core"
import { groupBySite, spaceNutrition } from "@/model/grow-ops"
import { buildProgram, PHOTOPERIOD, programTotals, steerStage } from "./program"
import { addDays, daysBetween, stageOn } from "./stage"
import { spaceContext } from "./space-context"
import { calendarItems, growTimeZone } from "@/calendar/agenda"
import { itemTitle } from "@/calendar/labels"
import { stageShort } from "@/app/labels"
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
  /** Lot 10b: events (a Fade or flush event, a transfer with Great White) close their deadline. */
  events?: GrowEvent[]
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

export function buildDailyDigest(data: DigestData, date: IsoDate, locale: Lang, today: IsoDate = date): Digest {
  const t = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) => translate(locale, k, v)
  const n = (v: number, d = 0) => formatNumber(locale, v, d)
  const dm = (iso: IsoDate) => formatDayMonth(locale, new Date(`${iso}T12:00:00`))
  const ordered = groupBySite(data.spaces, data.sites ?? []).flatMap((g) => g.spaces)
  /** Days after the day the app computed it (the next days of digestWeek): estimates count down from today. */
  const ahead = Math.max(0, daysBetween(today, date))

  // Lot 3: reminders and deadlines due that day, from the calendar. Deadlines are computed on the real day (lot 10b):
  // a tank to remake shows on its own day, not always "in N days" from each future morning.
  const due = calendarItems(data, date, date, today, growTimeZone(data)).filter((i) => !i.done)
  const dueLine = (i: (typeof due)[number]): DigestLine =>
    i.type === "reminder"
      ? { kind: "reminder", text: t("digest.reminder", { title: itemTitle(locale, i), time: i.time }), warn: false }
      : { kind: "deadline", text: t("digest.deadline", { title: itemTitle(locale, i) }), warn: true }

  const spaces: DigestSpace[] = ordered.map((space) => {
    const ctx = spaceContext(space, data, date)
    const lines: DigestLine[] = []
    const { cycle, last, autonomy } = ctx
    const mine = due.filter((i) => i.spaceId === space.id).map(dueLine)
    const s = cycle ? stageOn(cycle, date) : null

    // Drying space: the cycle drying here, its day out of the planned days (lot 10b).
    const drying = space.modules.drying
      ? data.cycles.filter((c) => c.spaceId === space.id && c.harvestDate && c.harvestDate <= date && !c.harvest?.curingStart && !c.archived).sort((a, b) => (a.harvestDate! < b.harvestDate! ? 1 : -1))[0]
      : undefined
    if (!cycle && !drying) {
      // Nothing growing here: one line, then what is due (lot 10b: no "no measure / no entry / reservoir" repeated).
      return { spaceId: space.id, name: space.name, lines: [{ kind: "stage", text: t("digest.empty") }, ...mine] }
    }
    if (cycle && s) lines.push({ kind: "stage", text: t("digest.stage", { cycle: cycle.name, stage: stageShort(t, s) }) })
    if (drying) {
      const day = daysBetween(drying.harvestDate!, date) + 1
      lines.push({ kind: "stage", text: drying.plannedDryingDays ? t("digest.drying", { cycle: drying.name, day, total: drying.plannedDryingDays }) : t("digest.dryingNoPlan", { cycle: drying.name, day }) })
    }

    // Climate: only once something was ever measured here (a new space says "no entry yet" once, below).
    if (space.modules.climate && last) {
      const recent = daysBetween(last.date, date) <= 1 ? last : undefined
      if (recent && (recent.tempDay != null || recent.rh != null)) {
        const parts = [recent.tempDay != null ? `${n(recent.tempDay, 1)} °C` : null, recent.rh != null ? `${n(recent.rh)} %` : null, recent.vpd != null ? `VPD ${n(recent.vpd, 2)} kPa` : null].filter(Boolean)
        lines.push({ kind: "climate", text: t("digest.climate", { v: parts.join(" · ") }) })
      } else lines.push({ kind: "climate", text: t("digest.climateNone") })
    }

    if (space.modules.irrigation && cycle && s && s.key !== "notStarted") {
      // Automatic only where a pump is (when the grow lists its pumps): a cycle in a propagation space is hand-watered.
      const pumps = data.equipment.some((e) => e.type === "pump")
      const auto = cycle.waterMode === "auto" && (!pumps || ctx.here.some((e) => e.type === "pump"))
      const ss = steerStage(s.key, cycle.establishing)
      // Another brand: its own flush instructions, never Athena's EC < 0.1 (lot 10e).
      const own = isOwnLine(spaceNutrition(data.grow?.nutrition ? { nutrition: data.grow.nutrition } : null, space).line)
      if (s.key === "flush") lines.push({ kind: "watering", text: t(own ? "digest.wateringFlushOwn" : auto ? "digest.wateringFlushAuto" : "digest.wateringFlushManual") })
      else if (!ss) lines.push({ kind: "watering", text: t(auto ? "digest.wateringSeedlingAuto" : "digest.wateringHand") })
      else if (ss === "inst") {
        const small = buildProgram(cycle, ss).find((r) => r.kind === "inst")?.ml
        lines.push({ kind: "watering", text: small ? t("digest.wateringInst", { ml: n(small) }) : t("digest.wateringInstNoVol") })
      } else if (!auto) lines.push({ kind: "watering", text: t("digest.wateringManual", { time: cycle.lightsOn }) })
      else {
        const rows = buildProgram(cycle, ss, last?.photoperiodH ?? PHOTOPERIOD[ss])
        const shots = rows.filter((r) => r.kind === "shot" && !r.optional).length
        const first = rows.find((r) => r.kind === "shot")?.time ?? "—"
        const { fixed } = programTotals(rows)
        lines.push({ kind: "watering", text: fixed ? t("digest.wateringAuto", { shots, litres: n(fixed / 1000, 1), first }) : t("digest.wateringAutoNoVol", { shots, first }) })
      }
    }

    lines.push({
      kind: "lastEntry",
      text: last ? t("digest.lastEntry", { when: last.date === date ? (last.time ? t("digest.todayAt", { time: last.time }) : t("digest.today")) : t("digest.on", { date: dm(last.date) }) }) : t("digest.noEntry"),
      warn: !last || daysBetween(last.date, date) > 1,
    })

    if (autonomy && cycle) {
      if (autonomy.days.ok) {
        const d = Math.max(0, Math.floor(autonomy.days.value) - ahead)
        lines.push({
          kind: "reservoir",
          text: t(autonomy.source === "reading" ? "digest.reservoir" : "digest.reservoirEst", { days: n(d), litres: n(autonomy.left.ok ? autonomy.left.value : 0) }),
          warn: d <= 1 || autonomy.tooOld,
        })
      } else lines.push({ kind: "reservoir", text: t("digest.reservoirMissing"), warn: true })
      if (autonomy.tooOld) lines.push({ kind: "reservoir", text: t("digest.tooOld", { days: n(autonomy.mixAgeDays ?? 0) }), warn: true })
    }
    lines.push(...mine)
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
    const d = buildDailyDigest(data, date, locale, today)
    const other = buildDailyDigest(data, date, locale === "fr" ? "en" : "fr", today)
    return { ...d, computedOn: today, texts: { [locale]: d.text, [other.locale]: other.text } as Record<Lang, string> }
  })
}

/** Document ids for a week of digests: digest/latest (today) and digest/{date}. Older dated ones are removed after 7 days. */
export function digestDocs(week: Digest[]): [string, Digest][] {
  return [["digest/latest", week[0]] as [string, Digest], ...week.map((d) => [`digest/${d.date}`, d] as [string, Digest])]
}
/** What a written digest doc says (its date and texts): a doc is written again only when this changes. */
export const digestKey = (d: Digest) => [d.date, d.text, ...Object.values(d.texts ?? {})].join("\u0000")
/** Docs of a week whose content changed since they were last written (`written`: path → digestKey), lot 10d. */
export function changedDigestDocs(week: Digest[], written: ReadonlyMap<string, string>): [string, Digest][] {
  return digestDocs(week).filter(([p, d]) => written.get(p) !== digestKey(d))
}
export const staleDigestIds = (ids: string[], today: IsoDate) => ids.filter((id) => /^\d{4}-\d{2}-\d{2}$/.test(id) && id < addDays(today, -DIGEST_DAYS))

/**
 * What the morning task sends (spec §12): the digest of the day, else the latest one. "stale" when it was computed on an
 * earlier day (the app has not been opened since): reminders and deadlines are still right, the measurements are older.
 */
export function morningText(docs: Record<string, Partial<Digest>>, today: IsoDate, locale: Lang): { text: string; stale: boolean; found: boolean } {
  // The day's digest; else (app not opened for more than a week) the most recent one, flagged as old (lot 10b).
  const before = Object.entries(docs)
    .filter(([k, x]) => k !== "latest" && /^\d{4}-\d{2}-\d{2}$/.test(k) && k <= today && (x?.texts?.[locale] ?? x?.text))
    .sort(([a], [b]) => (a < b ? 1 : -1))[0]?.[1]
  const d = docs[today] ?? (docs.latest?.date === today ? docs.latest : undefined) ?? before ?? docs.latest
  const body = d?.texts?.[locale] ?? d?.text
  if (!d || !body) return { text: translate(locale, "digest.none"), stale: true, found: false }
  const stale = (!!d.computedOn && d.computedOn < today) || (!!d.date && d.date < today)
  const day = (iso: string) => formatDayMonth(locale, new Date(`${iso}T12:00:00`))
  // An older day's digest (fallback): its reminders are those of that day, so it says so plainly.
  const note = d.date && d.date < today ? `\n\n${translate(locale, "digest.oldNote", { date: day(d.date) })}` : stale ? `\n\n${translate(locale, "digest.staleNote", { date: day(d.computedOn!) })}` : ""
  return { text: body + note, stale, found: true }
}
