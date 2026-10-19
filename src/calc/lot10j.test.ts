import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { buildDailyDigest, dryingCycle } from "./digest"
import { COLUMN_ID, FLOWER_ID, thomasGrow } from "@/data/thomas-grow"
import { newSpace } from "@/model/grow-ops"
import { stageEmoji } from "@/app/labels"
import { translate } from "@/i18n/core"
import type { Entry } from "@/model/types"

const root = path.resolve(import.meta.dirname, "../..")
const read = (f: string) => fs.readFileSync(path.join(root, f), "utf8")

const NOW = "2026-10-18T06:00:00.000Z"
const s = thomasGrow(NOW, "2026-06-01")
const cycle = { ...s.cycles[0], spaceId: FLOWER_ID, germinationDate: "2026-07-01", vegDate: "2026-07-15", flipDate: "2026-08-24", flowerWeeks: 9 }
const entry = (date: string, extra: Partial<Entry> = {}): Entry =>
  ({ schemaVersion: 2, id: `${date}_${FLOWER_ID}`, date, time: "08:10", spaceId: FLOWER_ID, cycleId: cycle.id, createdAt: "x", updatedAt: "x", ...extra }) as Entry
const data = (entries: Entry[] = [], more: Partial<{ spaces: typeof s.spaces; cycles: (typeof cycle)[] }> = {}) => ({
  grow: s.grow,
  spaces: more.spaces ?? s.spaces,
  cycles: more.cycles ?? [cycle],
  entries,
  mixes: [],
  events: [],
  equipment: s.equipment,
  assignments: s.assignments,
  customProducts: s.customProducts,
  reminders: [],
})
const rowsOf = (d: ReturnType<typeof data>, id = FLOWER_ID, lang: "fr" | "en" | "de" = "fr") =>
  buildDailyDigest(d, "2026-10-19", lang, "2026-10-19", { rows: true }).spaces.find((x) => x.spaceId === id)!.lines

describe("lot 10j1 — résumé du matin en lignes", () => {
  it("une ligne par idée : dessin, texte court, valeur à droite ; le texte de la tâche du matin ne change pas", () => {
    const d = data([entry("2026-10-18", { tempDay: 25.4, rh: 59, vpd: 0.96 })])
    const lines = rowsOf(d)
    const climate = lines.find((l) => l.kind === "climate")!.row!
    expect(climate).toEqual({ icon: "thermometer", text: "25,4 °C · 59 %", value: "VPD 0,96" })
    const water = lines.find((l) => l.kind === "watering")!.row!
    expect(water.icon).toBe("droplet")
    expect(water.text).toMatch(/^\d+ doses dès \d\d:\d\d$/)
    expect(water.value ?? water.note).toMatch(/L\/pot$|donnée manquante/)
    // The morning task still gets the same text, in every language.
    for (const l of ["fr", "en", "de"] as const) expect(buildDailyDigest(d, "2026-10-19", l, "2026-10-19", { rows: true }).text).toBe(buildDailyDigest(d, "2026-10-19", l).text)
  })

  it("dernière saisie récente : dans l'en-tête, pas de ligne ; ancienne ou absente : une ligne dont seule la valeur est « à surveiller »", () => {
    expect(rowsOf(data([entry("2026-10-18")])).find((l) => l.kind === "lastEntry")!.row).toBeUndefined()
    const old = rowsOf(data([entry("2026-10-12")])).find((l) => l.kind === "lastEntry")!
    expect(old.warn).toBe(true)
    expect(old.row).toEqual({ icon: "notebook", text: "Dernière saisie", value: "12/10" })
    expect(rowsOf(data()).find((l) => l.kind === "lastEntry")!.row).toEqual({ icon: "notebook", text: "Dernière saisie", value: "aucune" })
    expect(translate("fr", "row.sub", { n: 3, when: translate("fr", "row.yesterday") })).toBe("3 espaces · dernière saisie hier")
    expect(translate("en", "row.sub", { n: 1, when: "yesterday" })).toBe("1 space · last entry yesterday")
  })

  it("un espace vide = une ligne discrète ; le dessin suit le stade", () => {
    const col = rowsOf(data(), COLUMN_ID)
    expect(col).toHaveLength(1)
    expect(col[0].row).toEqual({ icon: "pottedPlant", text: "Vide, pas de cycle en cours", muted: true })
    expect(rowsOf(data())[0].row).toEqual({ icon: "blossom", text: "Cycle 1", note: "Floraison S9 · finition" })
    expect(["notStarted", "seedling", "veg", "bulk", "flush", "harvested"].map((k) => stageEmoji(k as never))).toEqual(["sprout", "sprout", "herb", "blossom", "blossom", "scissors"])
  })

  it("séchage : ✂️, le jour sur la durée prévue en valeur", () => {
    const dry = newSpace({ id: "sechage", name: "Séchage", template: "drying", order: 2, color: "violet", now: NOW })
    const harvested = { ...cycle, id: "c-dry", name: "Cycle 0", spaceId: "sechage", harvestDate: "2026-10-15", plannedDryingDays: 10 }
    const d = data([], { spaces: [...s.spaces, dry], cycles: [cycle, harvested] })
    expect(dryingCycle(dry, d.cycles, "2026-10-19")?.id).toBe("c-dry")
    expect(rowsOf(d, "sechage")[0].row).toEqual({ icon: "scissors", text: "Cycle 0 · séchage", value: "J5/10" })
  })

  it("réservoir : la durée en valeur, la source en note ; donnée manquante dite comme telle", () => {
    const mix = { schemaVersion: 2, id: "m1", date: "2026-10-17", spaceId: FLOWER_ID, cycleId: cycle.id, volumeL: 40, createdAt: "x", updatedAt: "x" }
    const d = { ...data([entry("2026-10-18", { reservoirL: 12 })]), mixes: [mix] } as unknown as ReturnType<typeof data>
    const res = rowsOf(d).filter((l) => l.kind === "reservoir")
    for (const l of res) {
      expect(l.row!.icon).toBe("bucket")
      expect(l.row!.text).toBe("Réservoir")
      expect(l.row!.value).toMatch(/^≈ \d+ j$|^donnée manquante$/)
    }
  })
})

describe("lot 10j1 — Aujourd'hui : cadres par espace, dessins, ordre", () => {
  const today = read("src/screens/today-spaces.tsx")
  it("un cadre par espace, un seul niveau, pas de liseré ; le carré teinté à 22 %", () => {
    expect(today).toMatch(/<Card framed className="gap-3">/)
    expect(today).not.toMatch(/border-l-/)
    expect(read("src/components/hydro/space-pill.tsx")).toMatch(/color-mix\(in oklab, \$\{spaceColor\(color\)\} 22%, transparent\)/)
    expect(read("src/components/ui/card.tsx")).toMatch(/rounded-\[14px\] border border-line bg-surface/)
  })
  it("ordre de « Tous » : Bonjour, À faire, Espaces ; plus de titre « Tous les espaces »", () => {
    const all = today.slice(today.indexOf("export function AllToday"), today.indexOf("export function spaceState"))
    expect(all.indexOf("<BonjourCard")).toBeLessThan(all.indexOf("<UpcomingCard"))
    expect(all.indexOf("<UpcomingCard")).toBeLessThan(all.indexOf("<SpaceCard"))
    expect(all).not.toMatch(/ScreenHero|allTitle/)
    expect(read("src/screens/today.tsx")).toMatch(/<WeekStrip \/>\n\s*<GuideLine \/>/)
  })
  it("les dessins reviennent comme repères (alt vide), les titres d'Aujourd'hui en portent un", () => {
    expect(read("src/components/hydro/emoji.tsx")).toMatch(/alt=""/)
    expect(read("src/components/hydro/primitives.tsx")).toMatch(/if \(!mark \|\| !emoji\) return title/)
    expect(read("src/screens/calendar-parts.tsx")).toMatch(/<Label emoji="bell" mark>/)
    expect(today).toMatch(/<Label emoji="pottedPlant" mark>/)
    // Every drawing used by the summary and the cards exists in the generated set.
    const gen = read("scripts/gen-emoji.mjs")
    for (const n of ["sprout", "herb", "blossom", "scissors", "pottedPlant", "droplet", "bucket", "thermometer", "bell", "alarm", "notebook", "sweat", "testTube", "chart"]) expect(gen, n).toMatch(new RegExp(`\\n  ${n}: "`))
  })
  it("Premiers pas et la sauvegarde : une seule ligne fine", () => {
    expect(translate("fr", "start.line", { done: 6, total: 7, what: "ta première sauvegarde" })).toBe("Premiers pas 6/7 : ta première sauvegarde")
    expect(read("src/screens/guide-line.tsx")).toMatch(/backupRem\.cta/)
    expect(fs.existsSync(path.join(root, "src/screens/tools/start.tsx")) && read("src/screens/tools/start.tsx")).not.toMatch(/export function StartCard/)
  })
  it("pilules d'état dans les trois langues", () => {
    for (const k of ["veg", "flower", "drying", "empty"]) for (const l of ["fr", "en", "de"] as const) expect(translate(l, `pill.${k}` as never)).not.toMatch(/^pill\./)
    expect(translate("fr", "pill.veg")).toBe("Végé")
    expect(translate("fr", "pill.drying")).toBe("Séchage")
  })
})
