// "Bonjour" card (spec §4ter): buildDailyDigest(data, date, locale) — pure, no AI, no server.
// v1 (lot 2b): per space, the latest climate, today's planned watering, the last entry, the reservoir autonomy.
// Later batches add reminders (3), nutrition (4)…  The Claude version stores the result in digest/latest.
import { isOwnLine } from "@/data/nutrients"
import type { Equipment, EquipmentAssignment, Grow, Site, Space } from "@/model/grow"
import type { Cycle, Entry, GrowEvent, IsoDate, Mix } from "@/model/types"
import { LANGS, type Lang, type MessageKey } from "@/i18n/types"
import { formatDayMonth, formatNumber, translate } from "@/i18n/core"
import { groupBySite, spaceNutrition } from "@/model/grow-ops"
import { buildProgram, PHOTOPERIOD, programTotals, steerStage } from "./program"
import { addDays, daysBetween, stageOn } from "./stage"
import { spaceContext } from "./space-context"
import { calendarItems, growTimeZone } from "@/calendar/agenda"
import { itemTitle } from "@/calendar/labels"
import { stageEmoji, stageShort } from "@/app/labels"
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

/** Drawings of the morning summary (lot 10j): names of `src/assets/emoji.ts`. */
export type RowIcon = "sprout" | "herb" | "blossom" | "scissors" | "pottedPlant" | "droplet" | "bucket" | "thermometer" | "bell" | "alarm" | "notebook"
/**
 * One line of the morning summary of Aujourd'hui (lot 10j): a small drawing, a short text (and a quieter note), the value
 * on the right in mono. Only the value takes « à surveiller » (the line's `warn`).
 */
export type DigestRow = { icon: RowIcon; text: string; note?: string; value?: string; muted?: boolean }
export type DigestLine = {
  kind: "climate" | "watering" | "lastEntry" | "reservoir" | "stage" | "reminder" | "deadline"
  text: string
  warn?: boolean
  /** The same line for Aujourd'hui only (`row.*`, lot 10j). None for a recent last entry: the summary's header says it. */
  row?: DigestRow
}
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
  /** The text in every language (the morning task sends French, whatever the language of the phone that computed it). */
  texts?: Record<Lang, string>
}

export { spaceContext }

/** The cycle drying in a drying space on that day (harvested, not yet curing), the latest one. */
export function dryingCycle(space: Space, cycles: Cycle[], date: IsoDate): Cycle | undefined {
  if (!space.modules.drying) return undefined
  return cycles
    .filter((c) => c.spaceId === space.id && c.harvestDate && c.harvestDate <= date && !c.harvest?.curingStart && !c.archived)
    .sort((a, b) => (a.harvestDate! < b.harvestDate! ? 1 : -1))[0]
}

export function buildDailyDigest(data: DigestData, date: IsoDate, locale: Lang, today: IsoDate = date, opts: { rows?: boolean } = {}): Digest {
  const t = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) => translate(locale, k, v)
  /** `row` of a line (Aujourd'hui asks for it; the digest docs of the morning task never carry it). */
  const R = (make: () => DigestRow): Pick<DigestLine, "row"> => (opts.rows ? { row: make() } : {})
  const r = (key: string, v?: Record<string, string | number>) => t(`row.${key}` as MessageKey, v)
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
      ? { kind: "reminder", text: t("digest.reminder", { title: itemTitle(locale, i), time: i.time }), warn: false, ...R(() => ({ icon: "bell", text: itemTitle(locale, i), value: i.time })) }
      : { kind: "deadline", text: t("digest.deadline", { title: itemTitle(locale, i) }), warn: true, ...R(() => ({ icon: "alarm", text: itemTitle(locale, i), value: r("today") })) }

  const spaces: DigestSpace[] = ordered.map((space) => {
    const ctx = spaceContext(space, data, date)
    const lines: DigestLine[] = []
    const { cycle, last, autonomy } = ctx
    const mine = due.filter((i) => i.spaceId === space.id).map(dueLine)
    const s = cycle ? stageOn(cycle, date) : null

    // Drying space: the cycle drying here, its day out of the planned days (lot 10b).
    const drying = dryingCycle(space, data.cycles, date)
    if (!cycle && !drying) {
      // Nothing growing here: one line, then what is due (lot 10b: no "no measure / no entry / reservoir" repeated).
      return { spaceId: space.id, name: space.name, lines: [{ kind: "stage", text: t("digest.empty"), ...R(() => ({ icon: "pottedPlant", text: r("empty"), muted: true })) }, ...mine] }
    }
    if (cycle && s)
      lines.push({
        kind: "stage",
        text: t("digest.stage", { cycle: cycle.name, stage: stageShort(t, s, locale) }),
        ...R(() => ({
          icon: stageEmoji(s.key),
          text: s.key === "notStarted" ? r("stageNotStarted", { cycle: cycle.name }) : s.key === "harvested" ? r("stageHarvested", { cycle: cycle.name }) : cycle.name,
          note: s.key === "notStarted" || s.key === "harvested" ? undefined : stageShort(t, s, locale),
        })),
      })
    if (drying) {
      const day = daysBetween(drying.harvestDate!, date) + 1
      const v = { cycle: drying.name, day, total: drying.plannedDryingDays ?? 0 }
      lines.push({
        kind: "stage",
        text: drying.plannedDryingDays ? t("digest.drying", v) : t("digest.dryingNoPlan", v),
        ...R(() => ({ icon: "scissors", text: r("drying", v), value: r(drying.plannedDryingDays ? "dryingDay" : "dryingDayNoPlan", v) })),
      })
    }

    // Climate: only once something was ever measured here (a new space says "no entry yet" once, below).
    if (space.modules.climate && last) {
      const recent = daysBetween(last.date, date) <= 1 ? last : undefined
      if (recent && (recent.tempDay != null || recent.rh != null)) {
        const parts = [recent.tempDay != null ? `${n(recent.tempDay, 1)} °C` : null, recent.rh != null ? `${n(recent.rh)} %` : null, recent.vpd != null ? `VPD ${n(recent.vpd, 2)} kPa` : null].filter(Boolean)
        const air = parts.slice(0, 2).filter((p) => p && !p.startsWith("VPD"))
        lines.push({
          kind: "climate",
          text: t("digest.climate", { v: parts.join(" · ") }),
          ...R(() => ({ icon: "thermometer", text: air.length ? air.join(" · ") : r("climate"), value: recent.vpd != null ? `VPD ${n(recent.vpd, 2)}` : undefined })),
        })
      } else lines.push({ kind: "climate", text: t("digest.climateNone"), ...R(() => ({ icon: "thermometer", text: r("climateNone") })) })
    }

    if (space.modules.irrigation && cycle && s && s.key !== "notStarted") {
      // Automatic only where a pump is (when the grow lists its pumps): a cycle in a propagation space is hand-watered.
      const pumps = data.equipment.some((e) => e.type === "pump")
      const auto = cycle.waterMode === "auto" && (!pumps || ctx.here.some((e) => e.type === "pump"))
      const ss = steerStage(s.key, cycle.establishing)
      // Another brand: its own flush instructions, never Athena's EC < 0.1 (lot 10e).
      const own = isOwnLine(spaceNutrition(data.grow?.nutrition ? { nutrition: data.grow.nutrition } : null, space).line)
      const W = (key: string, v: Record<string, string | number> | undefined, row: Omit<DigestRow, "icon">): DigestLine => ({
        kind: "watering",
        text: t(`digest.${key}` as MessageKey, v),
        ...R(() => ({ icon: "droplet", ...row })),
      })
      const flushEc = `EC < ${n(0.1, 1)}`
      if (s.key === "flush")
        lines.push(
          own
            ? W("wateringFlushOwn", undefined, { text: r("wateringFlushOwn") })
            : W(auto ? "wateringFlushAuto" : "wateringFlushManual", undefined, { text: r("wateringFlush"), note: auto ? r("wateringFlushAutoNote") : undefined, value: flushEc }),
        )
      else if (!ss) lines.push(auto ? W("wateringSeedlingAuto", undefined, { text: r("wateringSeedlingAuto"), note: r("wateringSeedlingAutoNote") }) : W("wateringHand", undefined, { text: r("wateringHand") }))
      else if (ss === "inst") {
        const small = buildProgram(cycle, ss).find((x) => x.kind === "inst")?.ml
        lines.push(
          small
            ? W("wateringInst", { ml: n(small) }, { text: r("wateringInst"), note: r("wateringInstNote"), value: `${n(small)} mL` })
            : W("wateringInstNoVol", undefined, { text: r("wateringInst"), note: r("wateringInstNote") }),
        )
      } else if (!auto) lines.push(W("wateringManual", { time: cycle.lightsOn }, { text: r("wateringManual"), value: cycle.lightsOn }))
      else {
        const rows = buildProgram(cycle, ss, last?.photoperiodH ?? PHOTOPERIOD[ss])
        const shots = rows.filter((x) => x.kind === "shot" && !x.optional).length
        const first = rows.find((x) => x.kind === "shot")?.time ?? "—"
        const { fixed } = programTotals(rows)
        lines.push(
          fixed
            ? W("wateringAuto", { shots, litres: n(fixed / 1000, 1), first }, { text: r("wateringAuto", { shots, first }), value: r("perPot", { litres: n(fixed / 1000, 1) }) })
            : W("wateringAutoNoVol", { shots, first }, { text: r("wateringAuto", { shots, first }), note: r("wateringNoVol") }),
        )
      }
    }

    const when = last ? (last.date === date ? (last.time ? t("digest.todayAt", { time: last.time }) : t("digest.today")) : t("digest.on", { date: dm(last.date) })) : ""
    const oldEntry = !last || daysBetween(last.date, date) > 1
    lines.push({
      kind: "lastEntry",
      text: last ? t("digest.lastEntry", { when }) : t("digest.noEntry"),
      warn: oldEntry,
      // A recent entry is in the summary's header (« dernière saisie hier »): a line only when it is old or missing.
      ...(oldEntry ? R(() => ({ icon: "notebook", text: r("lastEntry"), value: last ? dm(last.date) : r("noEntry") })) : {}),
    })

    if (autonomy && cycle) {
      if (autonomy.days.ok) {
        const d = Math.max(0, Math.floor(autonomy.days.value) - ahead)
        const key = autonomy.source === "reading" ? "reservoir" : "reservoirEst"
        const v = { days: n(d), litres: n(autonomy.left.ok ? autonomy.left.value : 0) }
        lines.push({
          kind: "reservoir",
          text: t(`digest.${key}`, v),
          warn: d <= 1 || autonomy.tooOld,
          ...R(() => ({ icon: "bucket", text: r("reservoir"), note: r(key === "reservoir" ? "reservoirLitres" : "reservoirEst", v), value: r("reservoirDays", v) })),
        })
      } else
        lines.push({
          kind: "reservoir",
          text: t("digest.reservoirMissing"),
          warn: true,
          ...R(() => ({ icon: "bucket", text: r("reservoir"), note: r("reservoirMissing"), value: r("missing") })),
        })
      if (autonomy.tooOld) {
        const v = { days: n(autonomy.mixAgeDays ?? 0) }
        lines.push({ kind: "reservoir", text: t("digest.tooOld", v), warn: true, ...R(() => ({ icon: "bucket", text: r("tooOld"), note: r("tooOldNote"), value: r("tooOldDays", v) })) })
      }
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
    // Every language (the morning task of Thomas keeps sending the French one, lot 10i adds German).
    const texts = Object.fromEntries(LANGS.map((l) => [l, l === locale ? d.text : buildDailyDigest(data, date, l, today).text])) as Record<Lang, string>
    return { ...d, computedOn: today, texts }
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
