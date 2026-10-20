import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { chooseNow, lineState, type LineSpace, type NowSpace } from "./now"
import type { Autonomy } from "./reservoir"
import type { CalItem } from "@/calendar/agenda"
import type { Entry } from "@/model/types"
import { translate } from "@/i18n/core"
import { parseHash, routeHash } from "@/app/nav"
import { fr } from "@/i18n/fr"
import { en } from "@/i18n/en"
import { de } from "@/i18n/de"
import { mixAmounts, mixFromDraft, nextMixSpray, validMixes } from "./spray"
import { nextIpw } from "./ipw"
import { parseNum } from "./formulas"
import { deadlines } from "@/calendar/deadlines"
import { deadlineTitle } from "@/calendar/labels"
import { FLOWER_ID, thomasGrow } from "@/data/thomas-grow"
import type { Spray, SprayMix } from "@/model/grow"
import { buildWeeks, CULTURE_METRICS, metricLines, mondayOf, offValues, weekLabel, weekVerdict } from "./weeks"
import { addDays } from "./stage"
import type { Cycle, GrowEvent, Mix } from "@/model/types"
import { CURVES, curvesWithData, indexEntries, isOff, lastTarget, segments, typicalStep, VIEW_IDS, VIEWS, type Point } from "./series"

const root = path.resolve(import.meta.dirname, "../..")
const read = (f: string) => fs.readFileSync(path.join(root, f), "utf8")
const walk = (dir: string): string[] =>
  fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : /\.(tsx?|css)$/.test(e.name) && !/\.test\./.test(e.name) ? [`${dir}/${e.name}`] : []))
const sources = walk("src")

describe("lot 10k1a — typographie droite", () => {
  it("Geologica pour les titres et les chiffres (jetons « titre » et « chiffres »), Figtree pour le texte", () => {
    const css = read("src/index.css")
    expect(css).toMatch(/--font-title: "Geologica"/)
    expect(css).toMatch(/--font-number: "Geologica"/)
    expect(css).toMatch(/--font-sans: "Figtree"/)
    expect(css).toMatch(/\.display \{\n\s+font-family: var\(--font-title\);\n\s+font-weight: 700;\n\s+letter-spacing: -0\.02em;/)
    expect(css).toMatch(/\.font-num,\n\s+\.tabular \{\n\s+font-family: var\(--font-number\);\n\s+font-variant-numeric: tabular-nums;/)
    expect(read("index.html")).toMatch(/family=Geologica:wght@500;600;700/)
    for (const w of [500, 600, 700]) expect(read("src/fonts-local.css")).toContain(`geologica-latin-${w}-normal.woff2`)
  })

  it("plus de JetBrains Mono du tout", () => {
    for (const f of ["index.html", "src/index.css", "src/fonts-local.css", "package.json", "scripts/fonts.py"]) expect(read(f), f).not.toMatch(/JetBrains|jetbrains/)
    for (const f of sources.filter((x) => x.endsWith(".tsx") || x.endsWith(".ts"))) expect(read(f), f).not.toMatch(/\bfont-mono\b/)
  })

  it("Fraunces seulement dans le logo « hydro. » (et l'écran de démarrage, qui l'affiche)", () => {
    const users = sources.filter((f) => /font-display|logo-font|Fraunces/.test(read(f)))
    expect(users.sort()).toEqual(["src/components/hydro/wordmark.tsx", "src/fonts-local.css", "src/index.css"])
    expect(read("src/components/hydro/wordmark.tsx")).toMatch(/logo-font inline-flex/)
  })

  it("une seule façon d'écrire une valeur : chiffres à chasse fixe, unité plus petite après une espace fine insécable", () => {
    const v = read("src/components/hydro/value.tsx")
    expect(v).toContain(`export const NNBSP = "\\u202f"`)
    expect(v).toMatch(/font-num font-semibold/)
    expect(v).toMatch(/text-\[1\.875rem\] leading-none tracking-\[-0\.02em\]/)
    expect(v).toMatch(/font-medium text-fg-3", size === "sm" \? "text-\[0\.85em\]" : "text-\[0\.5em\]"/)
    expect(read("src/components/hydro/reading.tsx")).toMatch(/<Value size=\{compact \? "md" : "lg"\}/)
  })
})

describe("lot 10k1b — Aujourd'hui calme : « Maintenant » et l'état d'un espace (calculs purs)", () => {
  const TODAY = "2026-02-08"
  const tg = { stage: "veg", ecRunoff: { lo: 2, hi: 4 }, phRunoff: { lo: 5.8, hi: 6.2 }, dryback: { lo: 10, hi: 30 } } as const
  const e = (date: string, extra: Partial<Entry> = {}): Entry =>
    ({ schemaVersion: 2, id: `${date}_s`, date, time: "07:24", spaceId: "s", createdAt: "x", updatedAt: "x", targets: tg, ...extra }) as unknown as Entry
  const space = (id: string, last?: Entry, more: Partial<NowSpace> = {}): NowSpace => ({ spaceId: id, active: true, logs: true, lightsOn: "06:00", waterMode: "auto", last, ...more })
  const deadline = (id: string, date: string, extra: Partial<CalItem> = {}) =>
    ({ type: "deadline", id, date, spaceId: "a", done: false, snoozed: false, overdue: date < TODAY, deadline: { key: id, kind: "flip", date, vars: {}, source: "athena" }, ...extra }) as unknown as CalItem
  const reminder = (id: string, date: string, time = "09:00") =>
    ({ type: "reminder", id, date, time, spaceId: "a", done: false, snoozed: false, overdue: false }) as unknown as CalItem

  it("priorité : une alerte du jour, puis la saisie pas faite (après l'allumage), puis une échéance, sinon « Tout est à jour »", () => {
    const off = e("2026-02-07", { ecRunoff: 6.5 })
    const items = [deadline("flip", TODAY)]
    expect(chooseNow([space("a", off)], items, TODAY, 8 * 60).now).toMatchObject({ kind: "alert", spaceId: "a", advice: { metric: "ecRunoff", status: "bad" } })
    // Within the target: the entry of the day, once the lights are on.
    expect(chooseNow([space("a", e("2026-02-07", { ecRunoff: 3 }))], items, TODAY, 8 * 60).now).toEqual({ kind: "entry", spaceId: "a", last: { date: "2026-02-07", time: "07:24" } })
    expect(chooseNow([space("a", e("2026-02-07", { ecRunoff: 3 }))], items, TODAY, 5 * 60).now).toMatchObject({ kind: "deadline", item: { id: "flip" } })
    expect(chooseNow([space("a", e(TODAY, { ecRunoff: 3 }))], items, TODAY, 8 * 60).now).toMatchObject({ kind: "deadline", item: { id: "flip" } })
    expect(chooseNow([space("a", e(TODAY, { ecRunoff: 3 }))], [], TODAY, 8 * 60).now).toEqual({ kind: "ok" })
    // Never an entry asked where nothing grows, nor where nothing is measured.
    expect(chooseNow([space("a", undefined, { active: false }), space("b", undefined, { logs: false })], [], TODAY, 8 * 60).now).toEqual({ kind: "ok" })
  })

  it("alertes : « à corriger » avant « à surveiller », seulement d'une saisie d'hier ou d'aujourd'hui, jamais sans cible enregistrée", () => {
    const warn = space("a", e(TODAY, { ecRunoff: 4.5 }))
    const bad = space("b", e(TODAY, { phRunoff: 7.2 }))
    expect(chooseNow([warn, bad], [], TODAY, 8 * 60).now).toMatchObject({ kind: "alert", spaceId: "b", advice: { status: "bad" } })
    expect(chooseNow([warn], [], TODAY, 8 * 60).now).toMatchObject({ kind: "alert", spaceId: "a", advice: { status: "warn" } })
    expect(chooseNow([space("a", e("2026-02-05", { ecRunoff: 6.5 }), { active: false })], [], TODAY, 8 * 60).now).toEqual({ kind: "ok" })
    expect(chooseNow([space("a", e(TODAY, { ecRunoff: 6.5, targets: undefined }))], [], TODAY, 8 * 60).now).toEqual({ kind: "ok" })
  })

  it("échéances : la plus ancienne d'abord (en retard comprise) ; « Ensuite » = la prochaine échéance, sinon le prochain rappel", () => {
    const items = [deadline("tank", TODAY), deadline("late", "2026-02-06"), reminder("drip", "2026-02-09"), deadline("fade", "2026-02-12"), deadline("old", "2026-02-01", { done: true })]
    const r = chooseNow([], items, TODAY, 8 * 60)
    expect(r.now).toMatchObject({ kind: "deadline", item: { id: "late" } })
    expect(r.next?.id).toBe("tank")
    expect(chooseNow([], [reminder("drip", "2026-02-09"), deadline("fade", "2026-02-12")], TODAY, 8 * 60).next?.id).toBe("fade")
    expect(chooseNow([], [reminder("drip", "2026-02-09")], TODAY, 8 * 60).next?.id).toBe("drip")
    expect(chooseNow([], [], TODAY, 8 * 60).next).toBeUndefined()
  })

  it("état d'une ligne d'espace : un seul, dans l'ordre (pas commencé, vide, pas de saisie, hors cible, en retard, bidon, climat, dans la cible)", () => {
    const L = (s: Partial<LineSpace>) => lineState({ active: true, drying: false, ...s }, TODAY)
    const autonomy = (days: number, tooOld = false, mixAgeDays = 3) => ({ left: { ok: true, value: 20 }, perDay: { ok: true, value: 10 }, days: { ok: true, value: days }, source: "estimate", tooOld, mixAgeDays }) as Autonomy
    expect(L({ stage: "notStarted", active: false })).toEqual({ kind: "notStarted", tone: "none" })
    expect(L({ active: false })).toEqual({ kind: "empty", tone: "none" })
    expect(L({})).toEqual({ kind: "noEntry", tone: "none" })
    expect(L({ last: e(TODAY, { phRunoff: 7.2 }) })).toEqual({ kind: "off", tone: "bad", metric: "phRunoff" })
    expect(L({ last: e(TODAY, { ecRunoff: 4.5 }) })).toEqual({ kind: "off", tone: "warn", metric: "ecRunoff" })
    expect(L({ last: e("2026-02-05", { ecRunoff: 6.5 }) })).toEqual({ kind: "late", tone: "warn", days: 3 })
    expect(L({ last: e(TODAY), autonomy: autonomy(1.6) })).toEqual({ kind: "tank", tone: "warn", days: 1, old: false })
    expect(L({ last: e(TODAY), autonomy: autonomy(5, true, 9) })).toEqual({ kind: "tank", tone: "warn", days: 9, old: true })
    expect(L({ last: e(TODAY), autonomy: autonomy(5) })).toEqual({ kind: "ok", tone: "ok" })
    // A drying room shows its climate, never an Athena target.
    expect(L({ drying: true, last: e(TODAY, { tempDay: 19, rh: 61, ecRunoff: 9 }) })).toEqual({ kind: "climate", tone: "ok", temp: 19, rh: 61 })
  })

  it("textes : titre, « Maintenant », états courts, bandeau Premiers pas, dans les trois langues", () => {
    expect(translate("fr", "row.hello", { name: "Thomas" })).toBe("Bonjour Thomas.")
    expect(translate("fr", "calm.startTitle", { done: 6, total: 7 })).toBe("Premiers pas · 6/7")
    expect(translate("fr", "calm.startNext", { what: "ta première sauvegarde" })).toBe("Prochaine étape : ta première sauvegarde")
    expect(translate("fr", "calm.entryTitle")).toBe("La saisie du jour n'est pas encore faite")
    expect(translate("fr", "calm.lastAt", { when: translate("fr", "calm.yesterdayAt", { time: "07:24" }) })).toBe("dernière saisie hier à 07:24")
    expect(translate("fr", "calm.tank", { n: 2 })).toBe("bidon ≈ 2 j")
    expect(translate("fr", "calm.more", { n: 2 })).toBe("+ 2 autres")
    expect(translate("de", "calm.more", { n: 1 })).toBe("+ 1 weiteres")
    const keys = Object.keys((fr as { calm: object }).calm)
    for (const l of [en, de]) expect(Object.keys((l as unknown as { calm: object }).calm)).toEqual(keys)
  })
})

describe("lot 10k1b — Aujourd'hui calme : l'écran", () => {
  const calm = read("src/screens/today-calm.tsx")
  it("un seul point d'entrée : « Bonjour », « Maintenant » (le seul cadre, le seul bouton plein), À faire, Espaces", () => {
    const body = calm.slice(calm.indexOf("export function CalmToday"), calm.indexOf("/** « Maintenant »"))
    expect(body.indexOf('id="hello"')).toBeLessThan(body.indexOf("<NowBlock"))
    expect(body.indexOf("<NowBlock")).toBeLessThan(body.indexOf("<Todo"))
    expect(body.indexOf("<Todo")).toBeLessThan(body.indexOf("<Spaces"))
    expect((calm.match(/<Button\b/g) ?? []).length).toBe(1)
    expect((calm.match(/rounded-\[18px\] border/g) ?? []).length).toBe(1)
    expect(calm).toMatch(/gap-9/) // 36 px between the sections
  })
  it("À faire : 3 au plus (la sauvegarde en compte une), « + N autres · Tout le calendrier → », rien de « Maintenant » en double", () => {
    expect(calm).toMatch(/const max = backupRow \? 2 : 3/)
    expect(calm).toMatch(/i\.id !== next\?\.id && !\(now\.kind === "deadline" && now\.item\.id === i\.id\)/)
    expect(calm).toMatch(/id="all-calendar"/)
  })
  it("une ligne de 64 px par espace, qui ouvre l'espace ; plus de cartes à 4 relevés ni de résumé « Bonjour »", () => {
    expect(calm).toMatch(/onClick=\{\(\) => setSpace\(s\.id\)\} data-space-line=\{s\.id\}[^>]*min-h-16/)
    const spaces = read("src/screens/today-spaces.tsx")
    expect(spaces).not.toMatch(/BonjourCard|SpaceCard|SummaryRow/)
    expect(spaces).toMatch(/export function DigestKeeper/)
  })
  it("bande de la semaine retirée ; Premiers pas en bandeau fermable, sans la sauvegarde", () => {
    expect(fs.existsSync(path.join(root, "src/screens/week-strip.tsx"))).toBe(false)
    const today = read("src/screens/today.tsx")
    expect(today).not.toMatch(/WeekStrip/)
    // Since lot 10l1 a space's tab is its page (space-page.tsx).
    expect(today).toMatch(/<DigestKeeper \/>\n\s*<GuideLine \/>\n\s*\{selection\.kind === "space" \? <SpacePage key=\{selection\.space\.id\} space=\{selection\.space\} \/> : <CalmToday \/>\}/)
    const guide = read("src/screens/guide-line.tsx")
    expect(guide).toMatch(/role="progressbar"/)
    expect(guide).toMatch(/bg-leaf/)
    expect(guide).not.toMatch(/useBackupDue|backupRem/)
  })
  it("petits dessins : plus dans les titres de section ni les libellés de relevés", () => {
    expect(read("src/components/hydro/reading.tsx")).not.toMatch(/Emoji/)
    expect(read("src/components/hydro/primitives.tsx")).toMatch(/export function Label\(\{ children, className \}/)
  })
})

describe("lot 10k2a — Outils en trois groupes", () => {
  const tools = read("src/screens/tools.tsx")
  const ids = (g: string) => [...tools.matchAll(new RegExp(`\\{ id: "(\\w+)"[^}]*group: "${g}"`, "g"))].map((m) => m[1])
  it("Chaque jour, Régler la pièce, Mon installation ; Premiers pas et Réglages hors de la liste, leurs routes gardées", () => {
    expect(ids("daily")).toEqual(["nutrition", "irrigation", "ph", "calendar", "ask"])
    expect(ids("room")).toEqual(["light", "climate", "ipw"])
    expect(ids("setup")).toEqual(["equipment", "reperes", "data"])
    expect(tools).toMatch(/\{ id: "start", emoji: "sprout", title: "tools\.start", desc: "tools\.startD" \}/)
    expect(tools).toMatch(/\{ id: "settings", emoji: "gear", title: "tools\.settings", desc: "tools\.settingsD" \}/)
    expect(read("src/app/nav.ts")).toMatch(/TOOL_IDS = \["start",[^\]]*"settings"\]/)
    expect(read("src/components/hydro/top-bar.tsx")).toMatch(/id="menu-start"/)
  })
  it("icônes au trait colorées par sujet, lignes de 54 px, plus de « Calculs testés »", () => {
    for (const id of ["nutrition", "irrigation", "ph"]) expect(tools).toMatch(new RegExp(`id: "${id}"[^}]*tone: "water"`))
    for (const id of ["light", "climate", "ipw"]) expect(tools).toMatch(new RegExp(`id: "${id}"[^}]*tone: "leaf"`))
    for (const id of ["calendar", "equipment", "reperes", "data"]) expect(tools).toMatch(new RegExp(`id: "${id}"[^}]*tone: "neutral"`))
    expect(tools).toMatch(/min-h-\[54px\]/)
    expect(tools).not.toMatch(/tools\.subtitle/)
    for (const l of [fr, en, de]) expect((l as unknown as { tools: Record<string, string> }).tools.subtitle).toBeUndefined()
  })
  it("des mots simples (planche « Les menus »)", () => {
    const T = (k: string) => translate("fr", `tools.${k}` as never)
    expect([T("nutrition"), T("nutritionD"), T("irrigation"), T("irrigationD"), T("ph"), T("phD"), T("calendar"), T("calendarD")]).toEqual(["Nutrition", "La recette du bidon", "Arrosage", "Doses et horaires du jour", "pH", "Combien de Balance verser", "Calendrier", "Rappels et échéances"])
    expect([T("light"), T("lightD"), T("climate"), T("climateD")]).toEqual(["Lumière", "Intensité et hauteur de lampe", "Climat", "Température, humidité, VPD"])
    expect([T("equipment"), T("equipmentD"), T("reperes"), T("reperesD"), T("data"), T("dataD")]).toEqual(["Équipement", "Lampes, réservoirs, pompes", "Repères Athena", "Les tableaux du Handbook", "Sauvegarde", "Exporter, importer"])
    expect([T("gDaily"), T("gRoom"), T("gSetup"), T("foot")]).toEqual(["Chaque jour", "Régler la pièce", "Mon installation", "Premiers pas et Réglages : dans l'engrenage en haut."])
    for (const l of ["en", "de"] as const) for (const k of ["gDaily", "gRoom", "gSetup", "foot"]) expect(translate(l, `tools.${k}` as never)).not.toMatch(/^tools\./)
  })
})

describe("lot 10k2b — Pulvérisation générique : « Mon mélange »", () => {
  const mix: SprayMix = { id: "mix-1", name: "Spray maison", items: [{ name: "Silice", dose: 0.5, unit: "mL" }, { name: "Prêle", unit: "g" }], everyDays: 5 }
  const spray = (date: string, extra: Partial<Spray> = {}): Spray => ({ schemaVersion: 1, id: `s-${date}`, date, spaceIds: ["flo"], product: "mix", mixId: "mix-1", litres: 2, ...extra })
  it("aucune dose proposée : les doses saisies × les litres, rien quand la dose n'est pas saisie", () => {
    expect(mixAmounts(mix, 2)).toEqual([{ name: "Silice", unit: "mL", amount: 1 }, { name: "Prêle", unit: "g" }])
    expect(mixAmounts(mix, 0)).toEqual([{ name: "Silice", unit: "mL" }, { name: "Prêle", unit: "g" }])
    expect(mixAmounts({ items: [{ name: "X", dose: 1.25, unit: "mL" }] }, 3)).toEqual([{ name: "X", unit: "mL", amount: 3.8 }])
    const src = read("src/screens/tools/spray.tsx") + read("src/calc/spray.ts")
    expect(src).not.toMatch(/data\/nutrients|IPW\.|ipwMlPerL|dosePer10L|labelDose/)
  })
  it("prochaine pulvérisation : la dernière de ce mélange dans l'espace + sa fréquence ; sans fréquence ni première fois, rien", () => {
    expect(nextMixSpray([spray("2026-02-01"), spray("2026-02-04")], mix, "flo")).toBe("2026-02-09")
    expect(nextMixSpray([spray("2026-02-04")], { ...mix, everyDays: undefined }, "flo")).toBeNull()
    expect(nextMixSpray([], mix, "flo")).toBeNull()
    expect(nextMixSpray([spray("2026-02-04", { spaceIds: ["col"] })], mix, "flo")).toBeNull()
    // IPW sprays never count for a mix (and a mix never for IPW: product "ipw" stays IPW's).
    expect(nextMixSpray([spray("2026-02-04", { product: "ipw", mixId: undefined })], mix, "flo")).toBeNull()
    expect(nextIpw([spray("2026-02-04", { mixId: "mix-1" })], "flo")).toBeNull()
  })
  it("formulaire : nom obligatoire, lignes vides retirées, dose et fréquence lues telles que saisies, checklist à toi", () => {
    const d = { name: "  Stack  ", items: [{ name: "Silice", dose: "0,5", unit: "mL" as const }, { name: " ", dose: "3", unit: "mL" as const }, { name: "Prêle", dose: "", unit: "g" as const, productId: "p1" }], every: "4,6", checklist: "Lampes éteintes\n\n Secouer ", note: " " }
    expect(mixFromDraft("m", d, parseNum)).toEqual({ id: "m", name: "Stack", items: [{ name: "Silice", unit: "mL", dose: 0.5 }, { name: "Prêle", unit: "g", productId: "p1" }], everyDays: 5, checklist: ["Lampes éteintes", "Secouer"] })
    expect(mixFromDraft("m", { ...d, name: " " }, parseNum)).toBeNull()
    expect(validMixes([mix, { id: 3 }, null, { id: "x", name: "Y", items: "no" }])).toEqual([mix])
    expect(validMixes(undefined)).toEqual([])
  })
  it("le calendrier : « Pulvérisation Spray maison · Floraison », source « tes données » ; l'IPW garde ses identifiants", () => {
    const s = thomasGrow("2026-10-18T06:00:00.000Z", "2026-06-01")
    const cycle = { ...s.cycles[0], spaceId: FLOWER_ID, germinationDate: "2026-07-01", vegDate: "2026-07-15", flipDate: "2026-08-24", flowerWeeks: 9 }
    const data = { grow: { ...s.grow, sprayMixes: [mix] }, spaces: s.spaces, cycles: [cycle], entries: [], mixes: [], events: [], equipment: s.equipment, assignments: s.assignments, sprays: [spray("2026-10-17", { spaceIds: [FLOWER_ID] })] }
    const dl = deadlines(data, "2026-10-19").find((d) => d.kind === "spray")!
    expect(dl).toMatchObject({ key: `spray_mix-1_${FLOWER_ID}_2026-10-22`, date: "2026-10-22", source: "user", spaceId: FLOWER_ID })
    expect(deadlineTitle("fr", dl)).toBe("Pulvérisation Spray maison · Floraison")
    for (const l of ["en", "de"] as const) expect(deadlineTitle(l, dl)).toMatch(/Spray maison · Floraison$/)
    expect(read("src/calc/ipw.ts")).toMatch(/s\.product === "ipw"/)
    expect(read("src/screens/tools/ipw.tsx")).toMatch(/product: "ipw",/)
    expect(read("src/app/nav.ts")).toMatch(/"ipw"/)
    expect(translate("fr", "tools.ipw")).toBe("Pulvérisation")
    expect(translate("fr", "tools.ipwD")).toBe("IPW Athena ou ton propre mélange")
    expect(translate("fr", "spray.mine")).toBe("perso, non vérifié")
  })
})

describe("lot 10k3a — le « + » ouvre une petite feuille", () => {
  it("Saisie du jour, Saisie rapide (plusieurs espaces), Nouveau bidon, Événement ; sans espace, le cycle d'abord", () => {
    const app = read("src/App.tsx")
    expect(app).toMatch(/if \(!spaces\.length\) ed\.openCycle\(\)\n\s*else setAdding\(true\)/)
    expect(app).toMatch(/<AddSheet open=\{adding\} onOpenChange=\{setAdding\} \/>/)
    const add = read("src/screens/add-sheet.tsx")
    expect([...add.matchAll(/\{ id: "(\w+)"/g)].map((m) => m[1])).toEqual(["entry", "quick", "mix", "event"])
    expect(add).toMatch(/spaces\.length > 1 \? \[\{ id: "quick"/)
    expect(read("src/components/hydro/tab-bar.tsx")).toMatch(/id="tab-plus"/)
    expect(translate("fr", "fab.label")).toBe("Ajouter")
    expect([translate("fr", "add.entry"), translate("fr", "add.quick"), translate("fr", "add.mix"), translate("fr", "add.event")]).toEqual(["Saisie du jour", "Saisie rapide", "Nouveau bidon", "Événement"])
  })
  it("les trois gros boutons du haut du Journal disparaissent", () => {
    const j = read("src/screens/journal.tsx")
    expect(j).not.toMatch(/openQuick|ed\.openEvent\(\)|ed\.openMix\(\)/)
  })
})

describe("lot 10k3b — Journal par semaines (calculs purs)", () => {
  const cyc = { id: "c2", name: "Cycle 2", germinationDate: "2025-12-30", vegDate: "2026-01-06", flipDate: "2026-02-11", flowerWeeks: 9 } as unknown as Cycle
  const tg = { stage: "veg", dryback: { lo: 25, hi: 50 }, ecRunoff: { lo: 3, hi: 5 }, phRunoff: { lo: 5.8, hi: 6.2 } }
  const en = (date: string, extra: Partial<Entry> = {}): Entry => ({ schemaVersion: 2, id: `${date}_flo`, date, spaceId: "flo", cycleId: "c2", createdAt: "x", updatedAt: "x", targets: tg, dryback: 35, ecRunoff: 4, ...extra }) as unknown as Entry
  it("semaines du lundi au dimanche ; nom de la semaine = stade de son jeudi, dans le cycle", () => {
    expect(mondayOf("2026-02-08")).toBe("2026-02-02")
    expect(mondayOf("2026-02-02")).toBe("2026-02-02")
    expect(weekLabel(cyc, "2026-02-02")).toEqual({ kind: "veg", week: 6 })
    expect(weekLabel(cyc, "2026-02-09")).toEqual({ kind: "flower", week: 1 })
    expect(weekLabel(cyc, "2025-12-29")).toEqual({ kind: "seedling", week: 1 })
    expect(weekLabel({ ...cyc, germinationDate: "2026-01-03" } as Cycle, "2025-12-29")).toEqual({ kind: "seedling", week: 1 })
    expect(weekLabel({ ...cyc, harvestDate: "2026-04-15" } as Cycle, "2026-04-20")).toEqual({ kind: "drying", week: 2 })
    expect(weekLabel(cyc, "2025-12-15")).toEqual({ kind: "before", week: 0 })
  })
  it("hors cible : seulement d'après les cibles enregistrées dans la saisie", () => {
    expect(offValues(en("2026-02-05", { phRunoff: 4.8 }))).toEqual([{ metric: "phRunoff", status: "bad", value: 4.8, lo: 5.8, hi: 6.2 }])
    expect(offValues(en("2026-02-05", { phRunoff: 4.8, targets: undefined }))).toEqual([])
  })
  it("une semaine : bande des 7 jours, jours qui comptent, jours sans souci, résumé", () => {
    const entries = [en("2026-02-03"), en("2026-02-04", { observations: [{ tag: "yellowing", severity: 1 }] as never }), en("2026-02-05", { phRunoff: 4.8 }), en("2026-02-06", { actions: ["lst"] as never }), en("2026-02-07", { dryback: 38, ecRunoff: 4.3 }), en("2026-01-28")]
    const mixes = [{ schemaVersion: 2, id: "m1", date: "2026-02-03", volumeL: 40, spaceIds: ["flo"], cycleId: "c2", createdAt: "x", updatedAt: "x" }] as unknown as Mix[]
    const events = [{ schemaVersion: 2, id: "e1", date: "2026-02-03", type: "transplant", cycleId: "c2", spaceId: "flo", createdAt: "x" }] as unknown as GrowEvent[]
    const weeks = buildWeeks({ entries, mixes, events, cycles: [cyc], today: "2026-02-08", perSpace: false, cycle: cyc })
    expect(weeks.map((w) => w.monday)).toEqual(["2026-02-02", "2026-01-26"])
    const w = weeks[0]
    expect(w.current).toBe(true)
    expect(w.label).toEqual({ kind: "veg", week: 6 })
    expect(w.days.map((d) => d.state)).toEqual(["none", "ok", "ok", "warn", "ok", "ok", "none"])
    expect(w.days.map((d) => d.dot)).toEqual([false, true, false, false, true, false, false])
    expect(w.days[6].today).toBe(true)
    expect(w.rows.map((r) => [r.date, r.kind])).toEqual([["2026-02-06", "action"], ["2026-02-05", "warn"], ["2026-02-04", "obs"], ["2026-02-03", "mix"]])
    expect(w.quiet.map((d) => d.date)).toEqual(["2026-02-07"])
    expect([w.offDays, w.incidents]).toEqual([1, 1])
    expect(w.ranges).toEqual({ dryback: [35, 38], ecRunoff: [4, 4.3] })
    // A future day of a past… no: a later day of the current week is « future ».
    expect(buildWeeks({ entries, mixes: [], events: [], cycles: [cyc], today: "2026-02-05", perSpace: false, cycle: cyc })[0].days.map((d) => d.state).slice(3)).toEqual(["warn", "future", "future", "future"])
  })
  it("« Tous » : une carte par semaine et par espace ; la semaine en cours du cycle même sans saisie", () => {
    const both = [en("2026-02-03"), { ...en("2026-02-03"), id: "x", spaceId: "col" }]
    const weeks = buildWeeks({ entries: both, mixes: [], events: [], cycles: [cyc], today: "2026-02-08", perSpace: true })
    expect(weeks.map((w) => w.key)).toEqual(["col_2026-02-02", "flo_2026-02-02"])
    expect(weeks[0].label).toEqual({ kind: "veg", week: 6 })
    const empty = buildWeeks({ entries: [en("2026-01-28")], mixes: [], events: [], cycles: [cyc], today: "2026-02-08", perSpace: false, cycle: cyc })
    expect(empty.map((w) => [w.monday, w.entries.length])).toEqual([["2026-02-02", 0], ["2026-01-26", 1]])
  })
  it("rapide avec une année de saisies (la simulation en a plus de 189)", () => {
    const many = Array.from({ length: 400 }, (_, i) => en(addDays("2025-02-01", i)))
    const t0 = performance.now()
    const weeks = buildWeeks({ entries: many, mixes: [], events: [], cycles: [cyc], today: "2026-03-08", perSpace: false })
    expect(weeks.length).toBeGreaterThan(55)
    expect(performance.now() - t0).toBeLessThan(250)
  })
})

describe("lot 10k3b — Journal par semaines : l'écran", () => {
  const j = read("src/screens/journal.tsx")
  const wk = read("src/screens/journal-weeks.tsx")
  it("une ligne : cycle, loupe, filtres ; puis une carte par semaine ; plus de tiroirs Événements · Bidons · Récolte", () => {
    expect(j).toMatch(/id="journal-cycles"/)
    expect(j).toMatch(/id="journal-search-btn"/)
    expect(j).toMatch(/id="journal-filters"/)
    expect(j).toMatch(/<WeekCard/)
    expect(j).not.toMatch(/Accordion|journal\.events|journal\.mixes|journal\.harvest/)
    expect(j).toMatch(/buildWeeks\(/)
    // The weeks are computed once per change of the journal.
    expect(j).toMatch(/const weeks = useMemo\(/)
  })
  it("bande des 7 jours, icône de type de 28 px, « + N jours sans souci »", () => {
    expect(wk).toMatch(/grid grid-cols-7/)
    expect(wk).toMatch(/border-\[1\.5px\] border-water/)
    expect(wk).toMatch(/bg-leaf\/20/)
    expect(wk).toMatch(/bg-warn\/30/)
    expect(wk).toMatch(/border border-dashed/)
    expect(wk).toMatch(/size-7 shrink-0 place-items-center rounded-\[8px\]/)
    expect(translate("fr", "jw.quiet", { n: 2 })).toBe("+ 2 jours sans souci")
    expect(translate("fr", "jw.veg", { n: 6 })).toBe("Végé S6")
    expect(translate("en", "jw.flower", { n: 3 })).toBe("Flower W3")
    expect(translate("de", "jw.quote", { text: "x" })).toBe("„x“")
  })
})

describe("lot 10k3c — page d'une semaine (calculs purs)", () => {
  const tg = { stage: "veg", dryback: { lo: 25, hi: 50 }, phRunoff: { lo: 5.8, hi: 6.2 }, vpd: { lo: 0.8, hi: 1.2 } }
  const en = (date: string, extra: Partial<Entry> = {}): Entry => ({ schemaVersion: 2, id: `${date}_flo`, date, spaceId: "flo", createdAt: "x", updatedAt: "x", targets: tg, ...extra }) as unknown as Entry
  const week = [en("2026-02-03", { dryback: 37, phRunoff: 6.0, vpd: 0.95 }), en("2026-02-04", { dryback: 33, phRunoff: 6.1, vpd: 1.0 }), en("2026-02-05", { dryback: 32, phRunoff: 4.8, vpd: 1.02 }), en("2026-02-06", { dryback: 33, phRunoff: 6.1, vpd: 0.99 })]
  const prev = [en("2026-01-27", { dryback: 41, phRunoff: 6.0, vpd: 1.4 }), en("2026-01-29", { dryback: 41, phRunoff: 6.0, vpd: 1.44 })]
  it("moyenne, semaine d'avant, jours dans la cible, sens par rapport à la cible", () => {
    const lines = metricLines(week, prev, CULTURE_METRICS)
    expect(lines.map((l) => l.metric)).toEqual(["dryback", "phRunoff", "vpd"])
    const [dry, ph, vpd] = lines
    expect([dry.avg, dry.prevAvg, dry.inTarget, dry.measured, dry.trend]).toEqual([33.75, 41, 4, 4, "in"])
    expect([ph.inTarget, ph.measured, ph.points.find((p) => p.date === "2026-02-05")?.status]).toEqual([3, 4, "bad"])
    expect(ph.target).toEqual({ lo: 5.8, hi: 6.2 })
    expect([vpd.trend, Math.round(vpd.prevAvg! * 100) / 100]).toEqual(["in", 1.42])
    // Without a recorded target (sensor dryback, T°, HR): no status, no « jours dans la cible ».
    const sensor = metricLines([en("2026-02-03", { drybackSensor: 12 })], [], CULTURE_METRICS)[0]
    expect([sensor.metric, sensor.target, sensor.measured, sensor.points[0].status]).toEqual(["drybackSensor", undefined, 0, undefined])
  })
  it("verdict : « Bonne direction » quand tout est dans la cible ou s'en rapproche ; ce qui est hors cible, avec la date ; ce qui est revenu", () => {
    const v = weekVerdict(metricLines(week, prev, CULTURE_METRICS), true)
    expect(v.good).toBe(false) // the 4,8 of 05/02 takes the pH average out of the target (5,75, it was 6,0): « farther »
    expect(v.offs).toEqual([{ metric: "phRunoff", dates: ["2026-02-05"] }])
    expect(v.back.map((b) => b.metric)).toEqual(["vpd"])
    const fine = weekVerdict(metricLines(week.map((e) => ({ ...e, phRunoff: 6.0 })), prev, CULTURE_METRICS), true)
    expect([fine.good, fine.allIn, fine.first]).toEqual([true, true, false])
    // Coming closer counts as a good direction.
    const closer = weekVerdict(metricLines([en("2026-02-03", { dryback: 55 })], [en("2026-01-27", { dryback: 62 })], CULTURE_METRICS), true)
    expect([closer.good, closer.allIn]).toEqual([true, false])
    const away = weekVerdict(metricLines([en("2026-02-03", { dryback: 62 })], [en("2026-01-27", { dryback: 55 })], CULTURE_METRICS), true)
    expect([away.good, away.away.map((a) => a.metric)]).toEqual([false, ["dryback"]])
    expect(weekVerdict(metricLines(week, [], CULTURE_METRICS), false).first).toBe(true)
  })
})

describe("lot 10k3c — page d'une semaine : l'écran", () => {
  it("route #journal/<espace>/<lundi>[/<jour>] ; ouverte par « Voir la semaine → », le résumé ou un jour de la bande", () => {
    expect(parseHash("#journal/floraison/2026-02-02")).toEqual({ tab: "journal", week: "floraison/2026-02-02" })
    expect(parseHash("#journal/floraison/2026-02-02/2026-02-06")).toEqual({ tab: "journal", week: "floraison/2026-02-02", day: "2026-02-06" })
    expect(routeHash({ tab: "journal", week: "floraison/2026-02-02", day: "2026-02-06" })).toBe("#journal/floraison/2026-02-02/2026-02-06")
    expect(parseHash("#journal/floraison")).toEqual({ tab: "journal" })
    const wk = read("src/screens/journal-weeks.tsx")
    expect(wk).toMatch(/navigate\(\{ tab: "journal", week: `\$\{sid\}\/\$\{w\.monday\}`/)
    expect(wk).toMatch(/data-see-week/)
  })
  it("verdict, une ligne par valeur clé (mini-courbe sur la bande de cible), puis une carte par jour qui ouvre la saisie", () => {
    const p = read("src/screens/journal-week.tsx")
    expect(p).toMatch(/id="week-verdict"/)
    expect(p).toMatch(/<MiniWeek line=\{l\} monday=\{monday\} \/>/)
    expect(p).toMatch(/strokeDasharray=\{gap \? "2 3" : undefined\}/) // a day without a value: dotted link, straight segments
    expect(p).toMatch(/onOpen=\{\(e\) => ed\.openEntry\(\{ date: d, spaceId/)
    expect(p).toMatch(/shownDays = allDays \? roomDays : roomDays\.slice\(0, 3\)/)
    expect(translate("fr", "wp.good")).toBe("Bonne direction.")
    expect(translate("fr", "wp.back1", { metric: "VPD", prev: "1,42" })).toBe("VPD : de retour dans la cible (1,42 la semaine d'avant).")
    for (const l of ["en", "de"] as const) expect(Object.keys((l === "en" ? en : de).wp)).toEqual(Object.keys(fr.wp))
  })
})

describe("lot 10k4 — Graphiques (calculs purs)", () => {
  const pts = (dates: string[], v = 30, tg?: [number, number]): Point[] => dates.map((date) => (tg ? { date, v, lo: tg[0], hi: tg[1] } : { date, v }))
  it("vues toutes prêtes : Arrosage, Solution, Climat, Lumière, Plante ; chaque courbe existe", () => {
    expect(VIEW_IDS).toEqual(["watering", "solution", "climate", "light", "plant"])
    expect(VIEWS.watering).toEqual(["dryback", "drybackSensor", "runoffPct", "ecRunoff"])
    expect(VIEWS.solution).toEqual(["ecIn", "phIn", "phRunoff", "balance"])
    expect(VIEWS.climate).toEqual(["temp", "rh", "vpd"])
    expect(VIEWS.light).toEqual(["ppfd", "dli"])
    expect(VIEWS.plant).toEqual(["height", "germination"])
    for (const v of VIEW_IDS) for (const c of VIEWS[v]) expect(CURVES).toContain(c)
  })
  it("segments droits : un jour sans mesure relié en pointillé, la ligne s'arrête après plus de 7 jours", () => {
    const daily = segments(pts(["2026-01-26", "2026-01-27", "2026-01-28", "2026-01-29", "2026-01-30", "2026-01-31", "2026-02-01", "2026-02-03", "2026-02-04"]))
    expect(daily.solid.map((p) => p.length)).toEqual([7, 2])
    expect(daily.dotted.map(([a, b]) => `${a.date}>${b.date}`)).toEqual(["2026-02-01>2026-02-03"])
    const gap = segments(pts(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-12", "2026-01-13"]))
    expect(gap.dotted).toEqual([])
    expect(gap.solid.map((p) => p.length)).toEqual([3, 2])
    // A spacing of 2 days (or a bucket once downsampled) is the normal step: solid.
    expect(typicalStep(pts(["2026-01-01", "2026-01-03", "2026-01-05", "2026-01-07"]))).toBe(2)
    expect(segments(pts(["2026-01-01", "2026-01-03", "2026-01-05", "2026-01-07"])).dotted).toEqual([])
    // A value per tank holds until the next one: never dotted.
    expect(segments(pts(["2026-01-01", "2026-01-11", "2026-01-30"]), 7, Infinity)).toEqual({ solid: [pts(["2026-01-01", "2026-01-11", "2026-01-30"])], dotted: [] })
  })
  it("hors cible d'après la cible enregistrée ; cible du dernier point qui en a une", () => {
    expect(isOff({ date: "2026-01-01", v: 56, lo: 25, hi: 50 })).toBe(true)
    expect(isOff({ date: "2026-01-01", v: 38, lo: 25, hi: 50 })).toBe(false)
    expect(isOff({ date: "2026-01-01", v: 99 })).toBe(false)
    expect(lastTarget([...pts(["2026-01-01"], 30, [40, 50]), ...pts(["2026-01-02"], 30)])).toEqual({ lo: 40, hi: 50 })
    expect(lastTarget(pts(["2026-01-01"]))).toBeNull()
  })
  it("une vue sans aucune donnée est masquée : courbes mesurées au moins une fois, quelle que soit la période", () => {
    const e = (date: string, x: Partial<Entry>): Entry => ({ schemaVersion: 2, id: `${date}_a`, date, spaceId: "a", createdAt: "x", updatedAt: "x", ...x }) as Entry
    const byspace = indexEntries([e("2025-01-01", { dryback: 33 }), e("2026-01-02", { tempDay: 24 })])
    const mixes = [{ id: "m", date: "2026-01-01", volumeL: 10, spaceIds: ["a"], products: [], balanceMl: 5 }] as unknown as Mix[]
    const has = curvesWithData(CURVES, ["a"], { byspace, mixes: [] })
    expect(has).toEqual(["dryback", "temp"])
    expect(curvesWithData(VIEWS.light, ["a"], { byspace, mixes })).toEqual([])
    expect(curvesWithData(["dryback"], ["b"], { byspace, mixes })).toEqual([])
  })
})

describe("lot 10k4 — Graphiques : l'écran", () => {
  const charts = read("src/screens/charts.tsx")
  const line = read("src/screens/line-chart.tsx")
  it("onglets de vues, période en une ligne avec « Comparer… », « Choisir mes courbes » en bas ; plus de pilules ni de liste d'événements", () => {
    expect(charts).toMatch(/id="ch-views"/)
    expect(charts).toMatch(/id="ch-compare"/)
    expect(charts).toMatch(/id="ch-choose"/)
    expect(charts).not.toMatch(/eventsIn|charts\.events|charts\.foot|charts\.gapNote|charts\.subtitle/)
    expect(charts).not.toMatch(/type="monotone"/)
  })
  it("chaque graphique : segments droits, pointillé pour un jour sans mesure, bidons en trait vertical, points hors cible en « à surveiller »", () => {
    expect(line).toMatch(/<polyline/)
    expect(line).toMatch(/data-dotted/)
    expect(line).toMatch(/data-tank/)
    expect(line).toMatch(/var\(--warn\)/)
    expect(line).not.toMatch(/monotone|curveBasis|cubic/i)
  })
  it("la légende tient en une ligne, dans les trois langues", () => {
    for (const l of [fr, en, de]) for (const k of ["legendOff", "legendBand", "legendTank", "legendGap", "compare", "choose"] as const) expect(l.charts[k].length).toBeGreaterThan(2)
    expect(fr.charts.views).toEqual({ watering: "Arrosage", solution: "Solution", climate: "Climat", light: "Lumière", plant: "Plante", custom: "Perso" })
  })
})
