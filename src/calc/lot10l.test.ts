import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { STEP_SOON_DAYS, stepDue, waterDay } from "./space-page"
import { buildProgram, nextIndex, type ProgramRow } from "./program"
import { addDays } from "./stage"
import { fr } from "@/i18n/fr"
import { en } from "@/i18n/en"
import { de } from "@/i18n/de"

const root = path.resolve(import.meta.dirname, "../..")
const read = (f: string) => fs.readFileSync(path.join(root, f), "utf8")

describe("lot 10l1 — page d'un espace (calculs purs)", () => {
  const today = "2026-02-08"
  const base = { germinationDate: "2025-12-20", flowerWeeks: 9 }
  it("l'étape du cycle : proposée avec son délai quand elle est proche, absente sinon", () => {
    // 12/12 prévu dans 2 jours (la planche) ; prévu dans 10 jours : pas de bouton ; jamais prévu : à portée de main.
    expect(stepDue({ ...base, vegDate: "2026-01-02", plannedFlipDate: "2026-02-10" }, today)).toEqual({ step: "flip", days: 2 })
    expect(stepDue({ ...base, vegDate: "2026-01-02", plannedFlipDate: addDays(today, STEP_SOON_DAYS + 3) }, today)).toBeNull()
    expect(stepDue({ ...base, vegDate: "2026-01-02" }, today)).toEqual({ step: "flip", days: null })
    expect(stepDue({ ...base, vegDate: "2026-01-02", plannedFlipDate: "2026-02-05" }, today)).toEqual({ step: "flip", days: -3 })
    // Végé : pas de date prévue.
    expect(stepDue(base, today)).toEqual({ step: "veg", days: null })
    // Récolte : 12/12 + semaines prévues ; loin → rien ; dans la dernière semaine → « dans N j ».
    expect(stepDue({ ...base, vegDate: "2026-01-02", flipDate: "2026-01-20" }, today)).toBeNull()
    expect(stepDue({ ...base, vegDate: "2025-12-01", flipDate: "2025-12-10" }, today)).toEqual({ step: "harvest", days: 3 })
    // Récolté, archivé, pas commencé : rien.
    expect(stepDue({ ...base, flipDate: "2025-12-10", harvestDate: "2026-02-01" }, today)).toBeNull()
    expect(stepDue({ ...base, germinationDate: "2026-03-01" }, today)).toBeNull()
  })
  const row = (minutes: number, phase: ProgramRow["phase"], kind: ProgramRow["kind"], n?: number, total?: number): ProgramRow => ({ time: "", minutes, phase, kind, n, total, ml: kind === "shot" ? 450 : undefined })
  const day: ProgramRow[] = [
    row(360, "P0", "lightsOn"),
    ...[1, 2, 3, 4, 5].map((n) => row(420 + n * 15, "P1", "shot", n, 5)),
    ...[1, 2, 3, 4].map((n) => row(600 + n * 80, "P2", "shot", n, 4)),
    row(921, "P3", "last"),
    row(1440, "OFF", "lightsOff"),
  ]
  it("l'arrosage du jour en deux lignes : ce qui est fait, la prochaine dose", () => {
    // 11:20, comme la planche : P1 fini, la prochaine est P2 1/4.
    const at = waterDay(day, nextIndex(day, 11 * 60 + 15))
    expect(at.done).toEqual({ phase: "P1", n: 5, total: 5 })
    expect(at.next).toMatchObject({ phase: "P2", n: 1, total: 4, ml: 450 })
    expect(at.over).toBe(false)
    // Avant l'allumage : rien de fait, la première dose ensuite.
    const early = waterDay(day, nextIndex(day, 5 * 60))
    expect(early.done).toBeUndefined()
    expect(early.next).toMatchObject({ phase: "P1", n: 1 })
    // Au milieu de P2.
    expect(waterDay(day, nextIndex(day, 13 * 60)).done).toEqual({ phase: "P2", n: 2, total: 4 })
    // Après la dernière dose : plus d'arrosage ; journée finie (−1) aussi.
    expect(waterDay(day, nextIndex(day, 16 * 60))).toEqual({ done: { phase: "P2", n: 4, total: 4 }, over: true })
    expect(waterDay(day, -1).over).toBe(true)
    // Pas de dose du tout (semis) : rien à dire.
    expect(waterDay([row(360, "P0", "lightsOn"), row(1440, "OFF", "lightsOff")], 0)).toEqual({ over: false })
  })
  it("avec un vrai programme (coco, automatique, floraison)", () => {
    const rows = buildProgram({ waterMode: "auto", substrate: "coco", lightsOn: "06:00", potVolumeL: 11, shotPct: 4, p1Shots: 5, p1IntervalMin: 15, p0DelayMin: 60, flowMlPerMin: 900 }, "mas")
    const w = waterDay(rows, nextIndex(rows, 7 * 60 + 40))
    expect(w.done?.phase).toBe("P1")
    expect(w.next).toBeDefined()
  })
})

describe("lot 10l1 — page d'un espace : l'écran", () => {
  const page = read("src/screens/space-page.tsx")
  it("ordre fixe : en-tête, état, relevés, arrosage, réservoir, à faire, sources ; plus de résumé « Bonjour »", () => {
    const order = ["id=\"space-head\"", "<StateBlock", "<Readings", "<WaterToday", "<Reservoir", "<Todo", "<Sources"].map((x) => page.indexOf(x))
    expect(order.every((i) => i > 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(page).not.toMatch(/Bonjour|hello|ScreenHero/)
    expect(read("src/screens/today.tsx")).not.toMatch(/CultureToday|SpaceToday/)
  })
  it("en-tête : carré de 48, nom, cycle et variété, stade en pilule « plante »", () => {
    expect(page).toMatch(/<SpaceTile color=\{space\.color\} emoji=\{emoji\} size=\{48\} \/>/)
    expect(page).toMatch(/max-\[259px\]:hidden/)
    expect(page).toMatch(/id="space-stage"[^>]*text-leaf-ink/)
  })
  it("un seul cadre (l'état) ; le bouton d'étape à contour, sans texte de conséquence ; quatre relevés puis une ligne", () => {
    expect(page.match(/rounded-\[16px\] border border-line bg-surface/g)?.length).toBe(2) // état, ou « pas de cycle »
    expect(page).toMatch(/id=\{`step-\$\{due\.step\}`\}[\s\S]*border-line-strong/)
    expect(page).not.toMatch(/step\.(vegNext|flipNext|harvestNext)/)
    expect(fr.step).not.toHaveProperty("flipNext")
    expect((page.match(/<Reading label=/g) ?? []).length).toBeGreaterThanOrEqual(5)
    expect(page).toMatch(/id="readings-also"/)
  })
  it("textes dans les trois langues", () => {
    for (const l of [fr, en, de]) for (const k of ["allGood", "nothing", "charts", "program", "todo", "waterDone", "waterNext"] as const) expect(l.sp[k].length).toBeGreaterThan(2)
    expect(fr.sp.waterDone).toBe("{phase} · {n}/{total} doses faites")
  })
})
