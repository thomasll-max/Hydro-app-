import { describe, expect, it } from "vitest"
import { parseHash, planNav, routeHash } from "@/app/nav"
import { journalOrder, liveFilter, NO_FILTER, resumeFrom } from "@/model/entry"
import { chartCycle, chartRows, defaultCurves, periodRange, pieceKeys, seriesStats, splitGaps } from "./series"
import { formatInput } from "@/i18n/core"
import type { Entry } from "@/model/types"
import type { Reminder } from "@/model/grow"
import { upcoming } from "@/calendar/agenda"
import { thomasGrow } from "@/data/thomas-grow"
import { changedDigestDocs, digestKey, type Digest } from "./digest"

describe("lot 10d — routes", () => {
  it("#tools/irrigation, anciens liens #irrigation et #guide, Aujourd'hui sans hash", () => {
    expect(parseHash("#tools/irrigation")).toEqual({ tab: "tools", tool: "irrigation" })
    expect(parseHash("#irrigation")).toEqual({ tab: "tools", tool: "irrigation" })
    expect(parseHash("#guide")).toEqual({ tab: "tools", tool: "reperes" })
    expect(parseHash("#tools/nope")).toEqual({ tab: "tools" })
    expect(parseHash("#journal")).toEqual({ tab: "journal" })
    expect(parseHash("")).toEqual({ tab: "today" })
    expect(parseHash("#whatever")).toEqual({ tab: "today" })
    expect(routeHash({ tab: "today" })).toBe("")
    expect(routeHash({ tab: "tools", tool: "data" })).toBe("#tools/data")
    expect(routeHash({ tab: "charts" })).toBe("#charts")
  })
})

describe("lot 10d — historique : le retour revient en arrière au lieu de quitter l'app", () => {
  const today = { tab: "today" } as const
  const tools = { tab: "tools" } as const
  const irrigation = { tab: "tools", tool: "irrigation" } as const
  const journal = { tab: "journal" } as const
  it("depuis Aujourd'hui, un onglet ajoute une étape ; entre onglets, l'étape est remplacée", () => {
    expect(planNav(today, journal, { depth: 0 })).toEqual({ kind: "push", hash: "#journal" })
    expect(planNav(journal, { tab: "charts" }, { depth: 1, prev: "" })).toEqual({ kind: "replace", hash: "#charts" })
    expect(planNav(journal, today, { depth: 1, prev: "" })).toEqual({ kind: "back" })
    expect(planNav(journal, journal, { depth: 1, prev: "" })).toBeNull()
  })
  it("un outil ajoute une étape ; « Outils » (ou retoucher l'onglet) revient à la liste", () => {
    expect(planNav(tools, irrigation, { depth: 1, prev: "" })).toEqual({ kind: "push", hash: "#tools/irrigation" })
    expect(planNav(irrigation, tools, { depth: 2, prev: "#tools" })).toEqual({ kind: "back" })
    // Opened from a link: the list is a new step, the link stays one step back.
    expect(planNav(irrigation, tools, { depth: 0 })).toEqual({ kind: "push", hash: "#tools" })
  })
  it("quitter un outil pour un autre onglet : retour à la liste, puis changement d'onglet", () => {
    expect(planNav(irrigation, journal, { depth: 2, prev: "#tools" })).toEqual({ kind: "back", then: journal })
    // Back on the list (depth 1): the tab replaces it, back then leads to Today.
    expect(planNav(tools, journal, { depth: 1, prev: "" })).toEqual({ kind: "replace", hash: "#journal" })
  })
})

describe("lot 10d — saisie", () => {
  const show = (v?: number) => formatInput("fr", v)
  const prev = { tempDay: 24.5, rh: 60, runoffMl: 300, ecRunoff: 3.1 } as Partial<Entry> as Entry
  it("« Reprendre hier » remplit les champs vides affichés, garde ce qui est tapé", () => {
    const r = resumeFrom({ tempDay: "", rh: "55" }, prev, ["tempDay", "rh", "runoffMl"], show)
    expect(r.values).toEqual({ tempDay: "24,5", rh: "55", runoffMl: "300" })
    expect(r.filled).toEqual(["tempDay", "runoffMl"])
    // ecRunoff is not on screen: never filled behind the user's back.
    expect("ecRunoff" in r.values).toBe(false)
    expect(resumeFrom({}, undefined, ["tempDay"], show).filled).toEqual([])
  })
  it("format des champs : virgule en français, rien quand c'est inconnu", () => {
    expect(formatInput("fr", 2.4)).toBe("2,4")
    expect(formatInput("en", 2.4)).toBe("2.4")
    expect(formatInput("fr", undefined)).toBe("")
    expect(formatInput("fr", Number.NaN)).toBe("")
  })
})

describe("lot 10d — journal", () => {
  const e = (id: string, date: string, plantId?: string) => ({ id, date, spaceId: "s1", plantId }) as unknown as Entry
  it("un filtre resté sur une valeur absente revient à « Tout »", () => {
    const f = { plant: "P3" as const, tag: "claws", stage: "bulk", space: "old" }
    expect(liveFilter(f, { spaces: ["s1", "s2"], tags: ["yellowing"], stages: ["veg"], plants: false })).toEqual(NO_FILTER)
    expect(liveFilter({ ...f, space: "s2", tag: "yellowing" }, { spaces: ["s1", "s2"], tags: ["yellowing"], stages: ["bulk"], plants: true })).toEqual({ ...f, space: "s2", tag: "yellowing" })
  })
  it("dans une journée, la saisie de l'espace avant celles des plantes", () => {
    const list = [e("a", "2026-10-18"), e("b", "2026-10-19", "P2"), e("c", "2026-10-19"), e("d", "2026-10-19", "P1")].sort(journalOrder)
    expect(list.map((x) => x.id)).toEqual(["c", "d", "b", "a"])
  })
})

describe("lot 10d — graphiques", () => {
  const today = "2026-10-19"
  it("période « Cycle » : le cycle en cours, jamais un vieux cycle récolté", () => {
    const old = { spaceId: "f", germinationDate: "2025-10-20", createdAt: "2025-10-20T00:00:00Z", harvestDate: "2026-02-10" }
    const cur = { spaceId: "f", germinationDate: "2026-08-01", createdAt: "2026-08-01T00:00:00Z" }
    expect(chartCycle("f", [old, cur], null)).toBe(cur)
    expect(chartCycle("f", [old, { ...cur, harvestDate: "2026-10-10" }], null)?.germinationDate).toBe("2026-08-01")
    expect(periodRange("cycle", today, [cur])).toEqual({ from: "2026-08-01", to: today })
    // Only harvested cycles: from their start to their harvest.
    expect(periodRange("cycle", today, [{ ...cur, harvestDate: "2026-10-10" }])).toEqual({ from: "2026-08-01", to: "2026-10-10" })
    // A running cycle next to a harvested one: the running one sets the window.
    expect(periodRange("cycle", today, [old, cur]).from).toBe("2026-08-01")
  })
  it("période « Tout » : depuis la première valeur", () => {
    expect(periodRange("all", today, [], "2025-11-02")).toEqual({ from: "2025-11-02", to: today })
    expect(periodRange("all", today).from).toBe("2026-09-20")
  })
  it("capteur : « Dryback capteur » par défaut", () => {
    expect(defaultCurves(["weight"])).toEqual(["dryback", "ecRunoff", "phRunoff"])
    expect(defaultCurves(["acinfinity"])).toEqual(["drybackSensor", "ecRunoff", "phRunoff"])
    expect(defaultCurves(["weight", "sensor"])).toEqual(["dryback", "drybackSensor", "ecRunoff", "phRunoff"])
  })
  it("un trou de plus de 7 jours coupe la courbe", () => {
    const pts = [{ date: "2026-08-01", v: 1 }, { date: "2026-08-03", v: 2 }, { date: "2026-09-10", v: 3 }, { date: "2026-09-11", v: 4 }]
    expect(splitGaps(pts).map((x) => x.length)).toEqual([2, 2])
    expect(pieceKeys(pts, "s:a")).toEqual(["s:a", "s:a#1"])
    const rows = chartRows([{ spaceId: "a", curve: "dryback", points: pts }])
    expect(rows.find((r) => r.date === "2026-09-10")).toMatchObject({ "s:a#1": 3 })
    expect(rows.find((r) => r.date === "2026-08-03")).toMatchObject({ "s:a": 2 })
  })
  it("résumé pour les lecteurs d'écran", () => {
    expect(seriesStats([{ date: "2026-10-10", v: 12 }, { date: "2026-10-12", v: 18 }, { date: "2026-10-13", v: 15 }])).toEqual({ n: 3, from: "2026-10-10", to: "2026-10-13", last: 15, min: 12, max: 18 })
    expect(seriesStats([])).toBeNull()
  })
})

describe("lot 10d — rappels", () => {
  const NOW = "2026-10-18T06:00:00.000Z"
  const s = thomasGrow(NOW, "2026-10-18")
  const data = { grow: s.grow, spaces: s.spaces, cycles: s.cycles, entries: [], mixes: [], equipment: s.equipment, assignments: s.assignments, customProducts: s.customProducts }
  const daily: Reminder = { schemaVersion: 2, id: "water", title: "Arroser", start: "2026-10-15T08:00", rrule: "FREQ=DAILY", createdAt: NOW }
  const once: Reminder = { schemaVersion: 2, id: "once", title: "Commander", start: "2026-10-20T09:00", createdAt: NOW }
  it("un rappel quotidien n'apparaît qu'une fois : sa prochaine occurrence, « heure passée » après l'heure", () => {
    const at10 = new Date("2026-10-19T08:00:00Z") // 10:00 in Oslo
    const items = upcoming({ ...data, reminders: [daily, once] }, "2026-10-19", 7, 7, "Europe/Oslo", at10).filter((i) => i.type === "reminder")
    expect(items.map((i) => [i.id.split(":")[0], i.date])).toEqual([["water", "2026-10-19"], ["once", "2026-10-20"]])
    expect(items[0].type === "reminder" && items[0].late).toBe(true)
    const at7 = new Date("2026-10-19T05:00:00Z") // 07:00 in Oslo
    const early = upcoming({ ...data, reminders: [daily] }, "2026-10-19", 7, 7, "Europe/Oslo", at7).filter((i) => i.type === "reminder")
    expect(early.length).toBe(1)
    expect(early[0].type === "reminder" && early[0].late).toBeFalsy()
  })
})

describe("lot 10d — résumé du matin regroupé", () => {
  it("seuls les documents dont le texte a changé sont réécrits", () => {
    const d = (date: string, text: string) => ({ schemaVersion: 1, date, locale: "fr", title: "", spaces: [], general: [], text, texts: { fr: text, en: text } }) as unknown as Digest
    const week = [d("2026-10-19", "a"), d("2026-10-20", "b")]
    const written = new Map(changedDigestDocs(week, new Map()).map(([p, x]) => [p, digestKey(x)]))
    expect([...written.keys()]).toEqual(["digest/latest", "digest/2026-10-19", "digest/2026-10-20"])
    expect(changedDigestDocs(week, written)).toEqual([])
    const next = [d("2026-10-19", "a"), d("2026-10-20", "b2")]
    expect(changedDigestDocs(next, written).map(([p]) => p)).toEqual(["digest/2026-10-20"])
  })
})
