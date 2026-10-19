import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { chooseNow, lineState, type LineSpace, type NowSpace } from "./now"
import type { Autonomy } from "./reservoir"
import type { CalItem } from "@/calendar/agenda"
import type { Entry } from "@/model/types"
import { translate } from "@/i18n/core"
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
    expect(today).toMatch(/<DigestKeeper \/>\n\s*<GuideLine \/>\n\s*\{selection\.kind === "space" \? <SpaceToday space=\{selection\.space\} Culture=\{CultureToday\} \/> : <CalmToday \/>\}/)
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
