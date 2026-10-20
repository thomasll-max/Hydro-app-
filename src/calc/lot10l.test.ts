import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { STEP_SOON_DAYS, stepDue, waterDay } from "./space-page"
import { buildProgram, nextIndex, type ProgramRow } from "./program"
import { addDays } from "./stage"
import { fr } from "@/i18n/fr"
import { en } from "@/i18n/en"
import { de } from "@/i18n/de"
import { bandCell, bandKeys, topTags } from "./entry-day"
import { blankEntry, derive, entryHasContent, resumeFrom } from "@/model/entry"
import type { Entry } from "@/model/types"

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
  it("ordre fixe : en-tête, état, relevés, arrosage, réservoir, à faire ; plus de résumé « Bonjour » (les sources : l'ⓘ des relevés, lot 13)", () => {
    const order = ["id=\"space-head\"", "<StateBlock", "<Readings", "<WaterToday", "<Reservoir", "<Todo"].map((x) => page.indexOf(x))
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

describe("lot 10l2a — saisie du jour : la bande des résultats (calculs purs)", () => {
  it("les résultats qui ont un sens pour l'espace : dryback (ou capteur), runoff, VPD, DLI", () => {
    expect(bandKeys({ irrigation: true, climate: true, light: true }, "weight")).toEqual(["dryback", "runoffPct", "vpd", "dli"])
    expect(bandKeys({ irrigation: true, climate: true }, "acinfinity")).toEqual(["drybackSensor", "runoffPct", "vpd"])
    expect(bandKeys({ climate: true }, "weight")).toEqual(["vpd"]) // un séchoir
    expect(bandKeys({}, "weight")).toEqual([])
  })
  it("calcul en direct, « — » tant qu'une valeur manque, couleur selon les cibles du jour", () => {
    const tg = { dryback: { lo: 25, hi: 50, src: "athena" }, runoffPct: { lo: 8, hi: 16, src: "athena" }, vpd: { lo: 0.8, hi: 1.2, src: "common" } } as never
    const blank = { schemaVersion: 2, id: "x", date: "2026-02-08", spaceId: "f", createdAt: "x", updatedAt: "x" } as Entry
    // Seul le pot du matin est tapé : pas de dryback.
    expect(bandCell("dryback", derive({ ...blank, weightMorningKg: 8.2 }), tg)).toEqual({})
    const live = derive({ ...blank, weightMorningKg: 8.17, weightPeakKg: 13.11, volumePerPotMl: 3500, runoffMl: 700, tempDay: 25.4, rh: 59 })
    expect(bandCell("dryback", live, tg)).toEqual({ value: 37.7, status: "ok" })
    expect(bandCell("runoffPct", live, tg)).toEqual({ value: 20, status: "warn" })
    expect(bandCell("vpd", live, tg).value).toBeGreaterThan(0)
    // Le dryback capteur a sa propre échelle : jamais de couleur contre les cibles Athena.
    expect(bandCell("drybackSensor", derive({ ...blank, sensorPeakPct: 50, sensorMorningPct: 40 }), tg)).toEqual({ value: 20 })
    expect(bandCell("dli", live, null)).toEqual({})
  })
  it("valeurs de la veille : en fantôme seulement ; rien d'enregistré sans les taper ou les reprendre", () => {
    const prev = { schemaVersion: 2, id: "p", date: "2026-02-07", spaceId: "f", createdAt: "x", updatedAt: "x", tempDay: 25.4, rh: 59, runoffMl: 382 } as Entry
    const fresh = blankEntry("2026-02-08", { spaceId: "f" }, prev)
    // Une saisie neuve ne reprend pas les mesures d'hier : rien à enregistrer tant que rien n'est tapé ou repris.
    expect(fresh.tempDay).toBeUndefined()
    expect(entryHasContent(fresh, fresh)).toBe(false)
    // « Reprendre hier » : seulement les champs à l'écran encore vides.
    expect(resumeFrom({ tempDay: "", rh: "61" }, prev, ["tempDay", "rh"], (v) => String(v).replace(".", ","))).toEqual({ values: { tempDay: "25,4", rh: "61" }, filled: ["tempDay"] })
    const form = read("src/components/hydro/form.tsx")
    expect(form).toMatch(/placeholder=\{ghost \?\? placeholder\}/)
    expect(form).toMatch(/if \(!ghost \|\| value\) return[\s\S]{0,80}onChange\(ghost\)/)
  })
})

describe("lot 10l2a — saisie du jour : la feuille", () => {
  const sheet = read("src/screens/entry-sheet.tsx")
  it("en-tête : « Saisie · Floraison », une ligne date · heure « modifier » · « tout l'espace ▾ », menu « ⋯ »", () => {
    expect(fr.entry.titleFor).toBe("Saisie · {space}")
    expect(sheet).toMatch(/id="e-when"/)
    expect(sheet).toMatch(/id="e-scope"/)
    expect(sheet).toMatch(/id="e-menu"/)
    // Date, heure, espace et plante ne sont plus dans la vue principale.
    expect(sheet).toMatch(/\{whenOpen && \(/)
    expect(sheet).toMatch(/\{scopeOpen && \(/)
  })
  it("bande des résultats collée sous l'en-tête et annoncée ; « Reprendre hier » ; un seul bouton plein en bas", () => {
    expect(sheet).toMatch(/id="e-band"\s+aria-live="polite"\s+className="sticky top-0/)
    expect(sheet).toMatch(/id="e-resume"/)
    expect(sheet).not.toMatch(/resumeHint/)
    const footer = sheet.slice(sheet.indexOf("footer={"), sheet.indexOf("footer={") + 300)
    expect(footer.match(/<Button/g)?.length).toBe(1)
    expect(footer).not.toMatch(/AlarmClockPlus|Trash2/)
  })
  it("ordre des champs : Arrosage, Runoff, Climat, puis la ligne repliée « Plante, réservoir, réglages »", () => {
    const at = (x: string) => sheet.indexOf(x)
    expect(at('id="e-sec-water"')).toBeLessThan(at('id="e-sec-runoff"'))
    expect(at('id="e-sec-runoff"')).toBeLessThan(at('id="e-sec-climate"'))
    expect(at('id="e-sec-climate"')).toBeLessThan(at('id="e-more"'))
    expect(at('id="e-more"')).toBeLessThan(at('nf("heightCm"'))
    expect(fr.entry.more).toBe("Plante, réservoir, réglages")
  })
})

describe("lot 10l2b — « Ce que tu as vu ou fait » et saisie rapide", () => {
  it("les 4 plus utilisées d'après l'historique ; sans historique, l'ordre habituel ; à égalité, l'ordre habituel", () => {
    const order = ["a", "b", "c", "d", "e", "f"] as const
    expect(topTags(order, [])).toEqual(["a", "b", "c", "d"])
    expect(topTags(order, [["f"], ["f", "e"], ["e"], ["f"]])).toEqual(["f", "e", "a", "b"])
    // Égalité : l'ordre habituel départage ; une puce comptée une fois par saisie.
    expect(topTags(order, [["d", "c"], ["c", "d"], ["b", "b", "b"]])).toEqual(["c", "d", "b", "a"])
    expect(topTags(order, [["e"]], 2)).toEqual(["e", "a"])
  })
  const sheet = read("src/screens/entry-sheet.tsx")
  it("observations puis actions, « +N » pour les autres, la gravité réglable ; puis une seule ligne note / photo", () => {
    expect(sheet).toMatch(/id="e-sec-seen" title=\{t\("entry\.seen"\)\}/)
    expect(sheet.indexOf('id="e-obs"')).toBeLessThan(sheet.indexOf('id="e-acts"'))
    expect(sheet).toMatch(/id="e-obs-more"/)
    expect(sheet).toMatch(/id="e-acts-more"/)
    expect(sheet).toMatch(/level=\{cur\?\.severity\}/)
    expect(sheet).toMatch(/id="e-note-open"/)
    expect(sheet.indexOf('id="e-acts"')).toBeLessThan(sheet.indexOf('id="e-note-open"'))
    expect(fr.entry.seen).toBe("Ce que tu as vu ou fait")
    expect(fr.entry.notePhoto).toBe("Une note, une photo…")
  })
  it("la saisie rapide garde son fonctionnement, au même style : date derrière « modifier », valeurs d'hier en fantôme", () => {
    const quick = read("src/screens/quick-sheet.tsx")
    expect(quick).toMatch(/id="q-when"/)
    expect(quick).toMatch(/\{whenOpen && <TextField id="q-date"/)
    expect(quick).toMatch(/ghost=\{ghost\("tempDay"\)\}/)
    expect(quick).not.toMatch(/placeholder=\{ph\(/)
    expect(quick).toMatch(/onFull\(s\.id, date, v\[s\.id\] \?\? \{\}\)/)
  })
})
