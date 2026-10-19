import { describe, expect, it } from "vitest"
import ICAL from "ical.js"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { formatInTimeZone } from "date-fns-tz"
import { formatRRule, occurrences, parseRRule, seriesDates, snoozeOne, toggleDone } from "./rrule"
import { deadlines, deadlineState, autoStateId } from "./deadlines"
import { calendarItems, upcoming, autoState } from "./agenda"
import { buildIcs, deadlineUid, fold, reminderUid, vtimezone } from "./ics"
import { deadlineTitle } from "./labels"
import { buildDailyDigest } from "@/calc/digest"
import { thomasGrow, FLOWER_ID, COLUMN_ID } from "@/data/thomas-grow"
import { zipStore } from "@/lib/zip"
import type { Reminder } from "@/model/grow"
import type { Cycle } from "@/model/types"

const NOW = "2026-10-18T06:00:00.000Z"
const TZ = "Europe/Oslo"
const rem = (p: Partial<Reminder> & { id: string; start: string }): Reminder => ({ schemaVersion: 2, title: "Vérifier le pH", createdAt: NOW, ...p })

function grow(cycle: Partial<Cycle> = {}) {
  const s = thomasGrow(NOW, "2026-10-18")
  s.cycles[0] = { ...s.cycles[0], ...cycle }
  return { grow: s.grow, spaces: s.spaces, cycles: s.cycles, entries: [], mixes: [], equipment: s.equipment, assignments: s.assignments, customProducts: s.customProducts, reminders: [] as Reminder[] }
}

describe("lot 3 — recurrence", () => {
  it("every 3 days, 5 times, across the end of daylight saving time: always 08:00 local", () => {
    const r = rem({ id: "r1", start: "2026-10-20T08:00", rrule: "FREQ=DAILY;INTERVAL=3;COUNT=5" })
    const occ = occurrences(r, "2026-10-01", "2026-12-31", TZ)
    expect(occ.map((o) => o.date)).toEqual(["2026-10-20", "2026-10-23", "2026-10-26", "2026-10-29", "2026-11-01"])
    expect(occ.map((o) => formatInTimeZone(o.at, TZ, "HH:mm"))).toEqual(Array(5).fill("08:00"))
    // Oslo leaves summer time on 25/10/2026: 06:00 UTC before, 07:00 UTC after.
    expect(occ.map((o) => o.at.toISOString().slice(11, 16))).toEqual(["06:00", "06:00", "07:00", "07:00", "07:00"])
  })

  it("weekly on chosen days, until a date; monthly skips a missing 31st", () => {
    expect(seriesDates("2026-10-19", "FREQ=WEEKLY;BYDAY=MO,TH;UNTIL=20261102", "2026-12-31")).toEqual(["2026-10-19", "2026-10-22", "2026-10-26", "2026-10-29", "2026-11-02"])
    expect(seriesDates("2026-08-31", "FREQ=MONTHLY;COUNT=3", "2027-12-31")).toEqual(["2026-08-31", "2026-10-31", "2026-12-31"])
    expect(formatRRule(parseRRule("FREQ=DAILY;INTERVAL=3;COUNT=5"))).toBe("FREQ=DAILY;INTERVAL=3;COUNT=5")
    expect(() => parseRRule("FREQ=HOURLY")).toThrow()
  })

  it("Fait and Reporter act on one occurrence only", () => {
    let r = rem({ id: "r2", start: "2026-10-20T08:00", rrule: "FREQ=DAILY;COUNT=3" })
    r = toggleDone(r, "2026-10-20")
    const [first, second] = occurrences(r, "2026-10-20", "2026-10-30", TZ)
    r = snoozeOne(r, second)
    const occ = occurrences(r, "2026-10-20", "2026-10-30", TZ)
    expect(first.done).toBe(true)
    expect(occ.map((o) => [o.key, o.date, o.done, o.snoozed])).toEqual([
      ["2026-10-20", "2026-10-20", true, false],
      ["2026-10-21", "2026-10-22", false, true],
      ["2026-10-22", "2026-10-22", false, false],
    ])
  })
})

describe("lot 3 — automatic deadlines", () => {
  it("Thomas's grow: pump flow never measured → 'mesurer le débit' today", () => {
    const d = deadlines(grow(), "2026-10-18")
    expect(d.map((x) => [x.kind, x.date])).toEqual([["flowCheck", "2026-10-18"]])
    expect(deadlineTitle("fr", d[0])).toBe("Mesurer le débit · Pompe de pression (arrosage automatique)")
  })

  it("planned transfer Colonne → Floraison gives the end of propagation and Great White on the roots", () => {
    const d = deadlines(grow({ germinationDate: "2026-10-20", plannedTransferDate: "2026-11-10" }), "2026-10-18")
    const gw = d.find((x) => x.kind === "greatWhite")!
    expect([gw.date, gw.spaceId, gw.source, deadlineTitle("fr", gw)]).toEqual(["2026-11-10", COLUMN_ID, "label", "Great White sur les racines au transfert · Cycle 1"])
    expect(d.some((x) => x.kind === "propagationEnd" && x.date === "2026-11-10")).toBe(true)
    // Once transferred, the end of propagation disappears; the move itself brings Great White (lot 10b, decision of
    // Thomas), done when the transfer recorded the product.
    const moved = grow({ plannedTransferDate: "2026-11-10", transfers: [{ date: "2026-11-10", from: COLUMN_ID, to: FLOWER_ID }], spaceId: FLOWER_ID })
    const after = deadlines(moved, "2026-11-11")
    expect(after.some((x) => x.kind === "propagationEnd")).toBe(false)
    expect(deadlineState(after.find((x) => x.kind === "greatWhite")!).done).toBe(false)
    const noted = deadlines({ ...moved, events: [{ schemaVersion: 2, id: "t", date: "2026-11-10", type: "transfer", cycleId: "cycle-1", products: [{ productId: "great-white" }], createdAt: NOW }] }, "2026-11-11")
    expect(deadlineState(noted.find((x) => x.kind === "greatWhite")!).done).toBe(true)
  })

  it("12/12, Fade (S8, add-on on), flush and harvest from the cycle dates", () => {
    const d = deadlines(grow({ spaceId: FLOWER_ID, flipDate: "2026-12-01" }), "2026-12-01")
    const by = Object.fromEntries(d.map((x) => [x.kind, x.date]))
    expect([by.fade, by.flush, by.harvest]).toEqual(["2027-01-19", "2027-01-30", "2027-02-02"])
    const planned = deadlines(grow({ spaceId: FLOWER_ID, plannedFlipDate: "2026-11-20" }), "2026-11-01")
    expect(planned.find((x) => x.kind === "flip")?.date).toBe("2026-11-20")
  })

  it("tank to remake from the reservoir autonomy (120 L, 60 L left, 20 L/day → in 3 days)", () => {
    const g = grow({ spaceId: FLOWER_ID })
    const e = (date: string, reservoirL: number) => ({ schemaVersion: 2, id: `${date}_${FLOWER_ID}`, date, spaceId: FLOWER_ID, reservoirL, createdAt: NOW, updatedAt: NOW })
    const data = { ...g, entries: [e("2026-10-17", 80), e("2026-10-18", 60)], mixes: [{ schemaVersion: 3, id: "m1", date: "2026-10-16", volumeL: 100, spaceIds: [FLOWER_ID], createdAt: NOW }] }
    const tank = deadlines(data, "2026-10-18").find((x) => x.kind === "tank")!
    expect([tank.date, tank.key, deadlineTitle("fr", tank)]).toEqual(["2026-10-21", `tank_${FLOWER_ID}_m1`, "Refaire le bidon (≈ 100 L) · Floraison"])
  })

  it("state: done hides it from 'À venir', postponed moves it", () => {
    const data = grow()
    const [flow] = deadlines(data, "2026-10-18")
    const st = { ...autoState(flow.key, NOW), snoozed: { [flow.date]: "2026-10-19T09:00" } }
    expect(deadlineState(flow, [st]).date).toBe("2026-10-19")
    expect(upcoming({ ...data, reminders: [st] }, "2026-10-18").map((i) => i.date)).toEqual(["2026-10-19"])
    const done = { ...st, done: [flow.date] }
    expect(autoStateId(flow.key)).toBe(done.id)
    expect(upcoming({ ...data, reminders: [done] }, "2026-10-18")).toEqual([])
  })

  it("a deleted space hides its deadlines; items are sorted by date then time", () => {
    const data = { ...grow(), reminders: [rem({ id: "b", start: "2026-10-18T19:00" }), rem({ id: "a", start: "2026-10-18T07:30", spaceId: FLOWER_ID })] }
    expect(calendarItems(data, "2026-10-18", "2026-10-18", "2026-10-18").map((i) => i.time ?? "all-day")).toEqual(["all-day", "07:30", "19:00"])
  })
})

describe("lot 3 — .ics export", () => {
  const reminders = [
    rem({ id: "rem-ph", start: "2026-10-20T08:00", rrule: "FREQ=DAILY;INTERVAL=3;COUNT=5", alarmMin: 15, note: "Bidon, runoff; et pot témoin", snoozed: { "2026-10-23": "2026-10-24T08:00" } }),
    rem({ id: "rem-once", title: "Commander du coco", start: "2026-11-02T18:30" }),
  ]
  const data = { ...grow({ plannedTransferDate: "2026-11-10" }), reminders }
  const make = (rs = reminders, now = new Date(NOW)) =>
    buildIcs({
      reminders: rs,
      deadlines: deadlines(data, "2026-10-18").map((d) => ({ deadline: d, title: deadlineTitle("fr", d), date: d.date })),
      tz: TZ,
      now,
      calName: "Hydro",
      alarmText: (t) => `Rappel Hydro : ${t}`,
    })

  it("parses with a real iCalendar parser; RRULE, VALARM and the DST-proof time zone survive", () => {
    const ics = make()
    const comp = new ICAL.Component(ICAL.parse(ics))
    ICAL.TimezoneService.register(comp.getFirstSubcomponent("vtimezone")!)
    const events = comp.getAllSubcomponents("vevent")
    // 2 reminders + 1 moved occurrence + 3 deadlines (flow, end of propagation, Great White).
    expect(events.length).toBe(6)
    const series = events.find((e) => e.getFirstPropertyValue("uid") === "rem-ph@hydro.app" && !e.hasProperty("recurrence-id"))!
    const ev = new ICAL.Event(series)
    expect(ev.summary).toBe("Vérifier le pH")
    expect(ev.description).toBe("Bidon, runoff; et pot témoin")
    const it5: string[] = []
    const iter = ev.iterator()
    for (let n = iter.next(); n; n = iter.next()) it5.push(n.toJSDate().toISOString().slice(0, 16))
    expect(it5).toEqual(["2026-10-20T06:00", "2026-10-23T06:00", "2026-10-26T07:00", "2026-10-29T07:00", "2026-11-01T07:00"])
    const alarm = series.getAllSubcomponents("valarm")
    expect(alarm[0].getFirstPropertyValue("trigger")?.toString()).toBe("-PT15M")
    const moved = events.find((e) => e.hasProperty("recurrence-id"))!
    expect(String(moved.getFirstPropertyValue("dtstart"))).toBe("2026-10-24T08:00:00")
    expect(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true)
  })

  it("UIDs are stable (same data, other day and other order → same UIDs) and unique", () => {
    const uids = (s: string) => [...s.matchAll(/^UID:(.+)$/gm)].map((m) => m[1].trim())
    const a = uids(make())
    const b = uids(make([...reminders].reverse(), new Date("2026-10-25T12:00:00Z")))
    expect(b).toEqual(a)
    expect(new Set(a.filter((u, i) => a.indexOf(u) === i)).size).toBe(5) // the moved occurrence reuses its series UID
    expect(a).toContain(reminderUid({ id: "rem-ph" }))
    expect(a).toContain(deadlineUid({ key: "greatWhite_cycle-1_great-white" }))
  })

  it("VTIMEZONE of Oslo: last Sunday of March / October", () => {
    const v = vtimezone(TZ, 2026).join("\n")
    expect(v).toContain("RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU")
    expect(v).toContain("RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU")
    expect(v).toContain("TZOFFSETFROM:+0100\nTZOFFSETTO:+0200")
    expect(vtimezone("Asia/Bangkok", 2026).join("\n")).toContain("TZOFFSETTO:+0700")
  })

  it("long lines are folded at 75 octets without cutting a character", () => {
    const f = fold(`SUMMARY:${"é".repeat(60)}`)
    expect(f.split("\r\n ").join("")).toBe(`SUMMARY:${"é".repeat(60)}`)
  })

  it("the .zip (artifact download) holds hydro.ics intact", () => {
    const ics = make()
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hydro-zip-"))
    fs.writeFileSync(path.join(dir, "hydro.zip"), zipStore([{ name: "hydro.ics", data: ics }]))
    const out = execFileSync("python3", ["-I", "-c", "import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;sys.stdout.write(z.read('hydro.ics').decode())", path.join(dir, "hydro.zip")]).toString()
    expect(out).toBe(ics)
  })
})

describe("lot 3 — Bonjour with today's reminders", () => {
  it("FR and EN: a reminder of the day and the deadline of the day", () => {
    const data = { ...grow(), reminders: [rem({ id: "r", start: "2026-10-18T19:00", spaceId: FLOWER_ID }), rem({ id: "g", title: "Commander du coco", start: "2026-10-18T10:00" })] }
    const fr = buildDailyDigest(data, "2026-10-18", "fr")
    const flower = fr.spaces.find((s) => s.spaceId === FLOWER_ID)!
    expect(flower.lines.filter((l) => l.kind === "reminder" || l.kind === "deadline").map((l) => l.text)).toEqual([
      "À faire : Mesurer le débit · Pompe de pression (arrosage automatique)",
      "Rappel : Vérifier le pH à 19:00",
    ])
    expect(fr.general.map((l) => l.text)).toEqual(["Rappel : Commander du coco à 10:00"])
    expect(fr.text).toContain("Tout le grow\n• Rappel : Commander du coco à 10:00")
    const en = buildDailyDigest(data, "2026-10-18", "en")
    expect(en.spaces.find((s) => s.spaceId === FLOWER_ID)!.lines.some((l) => l.text === "To do: Measure the flow · Pompe de pression (arrosage automatique)")).toBe(true)
    expect(en.general[0].text).toBe("Reminder: Commander du coco at 10:00")
  })
})
