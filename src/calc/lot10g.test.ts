import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { mixDatesIn, withDates } from "@/calc/series"
import type { Mix } from "@/model/types"

const root = path.resolve(import.meta.dirname, "../..")
const read = (f: string) => fs.readFileSync(path.join(root, f), "utf8")
const mix = (id: string, date: string, o: Partial<Mix> = {}) => ({ schemaVersion: 4, id, date, volumeL: 50, items: [], ...o }) as unknown as Mix

describe("lot 10g — la goutte comme motif", () => {
  it("marques d'arrosage : dates des bidons des espaces ou cycles affichés, sans doublon, dans la période", () => {
    const mixes = [
      mix("a", "2026-10-14", { spaceIds: ["flo"] }),
      mix("b", "2026-10-14", { spaceIds: ["flo", "col"] }),
      mix("c", "2026-10-16", { cycleId: "c5" }),
      mix("d", "2026-10-17", { spaceIds: ["col"] }),
      mix("e", "2026-10-01", { spaceIds: ["flo"] }),
    ]
    const r = { from: "2026-10-13", to: "2026-10-19" }
    expect(mixDatesIn(mixes, ["flo"], r)).toEqual(["2026-10-14"])
    expect(mixDatesIn(mixes, ["flo"], r, ["c5"])).toEqual(["2026-10-14", "2026-10-16"])
    expect(mixDatesIn(mixes, ["flo", "col"], r)).toEqual(["2026-10-14", "2026-10-17"])
  })

  it("un jour de bidon sans mesure prend une ligne vide sur l'axe, triée", () => {
    const rows = [{ date: "2026-10-13", "s:flo": 4 }, { date: "2026-10-15", "s:flo": 4.2 }]
    expect(withDates(rows, ["2026-10-14", "2026-10-15"]).map((r) => r.date)).toEqual(["2026-10-13", "2026-10-14", "2026-10-15"])
    expect(withDates(rows, [])).toBe(rows)
  })

  it("chargement : la goutte se remplit, et reste pleine et fixe si les animations sont réduites", () => {
    const css = read("src/index.css")
    expect(css).toMatch(/@keyframes drop-fill/)
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*animation-iteration-count: 1 !important/)
    expect(read("src/components/hydro/wordmark.tsx")).toMatch(/motion-reduce:not-sr-only/)
  })

  it("écran de démarrage : fond #0d1310 (lot 10h) dans le manifeste et la balise theme-color", () => {
    const m = JSON.parse(read("pwa/manifest.webmanifest"))
    expect([m.background_color, m.theme_color]).toEqual(["#0d1310", "#0d1310"])
    expect(read("vite.config.ts")).toContain('<meta name="theme-color" content="#0d1310" />')
    expect(read("src/App.tsx")).toMatch(/TARGET === "local" && !ready && !needsSetup\) return <Splash/)
  })
})
