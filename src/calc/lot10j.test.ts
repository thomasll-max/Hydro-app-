import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { buildDailyDigest, dryingCycle } from "./digest"
import { FLOWER_ID, thomasGrow } from "@/data/thomas-grow"
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
describe("lot 10j1 — dessins des stades et séchage (le résumé en lignes est parti au lot 10k1)", () => {
  it("le dessin suit le stade", () => {
    expect(["notStarted", "seedling", "veg", "bulk", "flush", "harvested"].map((k) => stageEmoji(k as never))).toEqual(["sprout", "sprout", "herb", "blossom", "blossom", "scissors"])
  })

  it("séchage : le cycle qui sèche dans l'espace de séchage, le jour sur la durée prévue", () => {
    const dry = newSpace({ id: "sechage", name: "Séchage", template: "drying", order: 2, color: "violet", now: NOW })
    const harvested = { ...cycle, id: "c-dry", name: "Cycle 0", spaceId: "sechage", harvestDate: "2026-10-15", plannedDryingDays: 10 }
    const d = data([], { spaces: [...s.spaces, dry], cycles: [cycle, harvested] })
    expect(dryingCycle(dry, d.cycles, "2026-10-19")?.id).toBe("c-dry")
    const lines = buildDailyDigest(d, "2026-10-19", "fr").spaces.find((x) => x.spaceId === "sechage")!.lines
    expect(lines[0].text).toMatch(/Cycle 0/)
    expect(translate("fr", "calm.drying", { cycle: "Cycle 0", day: 5, total: 10 })).toBe("Cycle 0 · J5/10")
  })

  it("le texte de la tâche du matin ne dépend plus d'Aujourd'hui", () => {
    const d = data([entry("2026-10-18", { tempDay: 25.4, rh: 59, vpd: 0.96 })])
    const text = buildDailyDigest(d, "2026-10-19", "fr").text
    expect(text).toMatch(/25,4 °C · 59 % · VPD 0,96 kPa/)
    expect(read("src/calc/digest.ts")).not.toMatch(/DigestRow|rows\?:/)
  })
})

describe("lot 10j1 — Aujourd'hui : carré teinté, dessins", () => {
  it("le carré teinté à 22 %", () => {
    expect(read("src/components/hydro/space-pill.tsx")).toMatch(/color-mix\(in oklab, \$\{spaceColor\(color\)\} 22%, transparent\)/)
    expect(read("src/components/ui/card.tsx")).toMatch(/rounded-\[14px\] border border-line bg-surface/)
  })
  it("les dessins restent décoratifs (alt vide) et existent dans le jeu généré", () => {
    expect(read("src/components/hydro/emoji.tsx")).toMatch(/alt=""/)
    const gen = read("scripts/gen-emoji.mjs")
    for (const n of ["sprout", "herb", "blossom", "scissors", "pottedPlant", "warning", "notebook", "alarm", "moon", "sun", "droplet", "testTube", "leaf"]) expect(gen, n).toMatch(new RegExp(`\\n  ${n}: "`))
  })
  it("pilules d'état dans les trois langues", () => {
    for (const k of ["veg", "flower", "drying", "empty"]) for (const l of ["fr", "en", "de"] as const) expect(translate(l, `pill.${k}` as never)).not.toMatch(/^pill\./)
    expect(translate("fr", "pill.veg")).toBe("Végé")
    expect(translate("fr", "pill.drying")).toBe("Séchage")
  })
})

describe("lot 10j2 — autres écrans", () => {
  it("Journal : les filtres dans une feuille derrière « Filtres », les actifs en une ligne avec « Effacer »", () => {
    const j = read("src/screens/journal.tsx")
    const sheet = j.slice(j.indexOf("<Sheet"), j.indexOf("</Sheet>"))
    expect((sheet.match(/<FilterRow/g) ?? []).length).toBe(4)
    expect(j.slice(j.indexOf("</Sheet>"))).not.toMatch(/<FilterRow/)
    expect(j).toMatch(/id="journal-filters"/)
    expect(j).toMatch(/id="journal-filter-summary"/)
    expect(translate("fr", "journal.filtersShow", { n: 1 })).toBe("Voir 1 saisie")
    expect(translate("fr", "journal.filtersShow", { n: 12 })).toBe("Voir 12 saisies")
    expect(translate("de", "journal.filtersShow", { n: 12 })).toBe("12 Einträge anzeigen")
    expect(translate("fr", "journal.clear")).toBe("Effacer")
  })
  it("titres sans dessin depuis le lot 10k (règle « calme » 3) : ni Journal, ni graphiques, ni Réglages", () => {
    for (const f of ["src/screens/journal.tsx", "src/screens/charts.tsx", "src/screens/tools/settings.tsx", "src/screens/tools.tsx", "src/screens/calendar-parts.tsx"]) expect(read(f), f).not.toMatch(/<Label[^>]*(emoji|mark)/)
    expect(read("src/components/hydro/primitives.tsx")).toMatch(/export function Label\(\{ children, className \}/)
  })
})
