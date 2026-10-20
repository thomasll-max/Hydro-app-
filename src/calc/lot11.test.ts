import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { mergeVoice, readVoiceReply, VOICE_RANGE, voiceCount, voiceKeys, voicePrompt, type VoiceSpace } from "./voice"
import { OBS_TAGS, ACTION_TAGS, type Entry, type ObsTag, type ActionTag } from "@/model/types"
import { validDoc } from "@/model/validate"
import { parseSettings } from "@/lib/settings"
import { fr } from "@/i18n/fr"
import { en } from "@/i18n/en"
import { de } from "@/i18n/de"

const root = path.resolve(import.meta.dirname, "../..")
const read = (f: string) => fs.readFileSync(path.join(root, f), "utf8")

const flo: VoiceSpace = { id: "floraison", name: "Floraison", modules: { climate: true, irrigation: true, nutrition: true, light: true }, method: "weight", reservoir: true, plants: [] }
const col: VoiceSpace = { id: "colonne", name: "Colonne", modules: { climate: true, irrigation: true, nutrition: true, plants: true }, method: "acinfinity", reservoir: false, plants: ["P1", "P2"] }
const dry: VoiceSpace = { id: "sechage", name: "Séchage", modules: { climate: true }, method: "none", reservoir: false, plants: [] }
const ctx = { open: flo, spaces: [flo, col, dry] }
const labels = <T extends string>(list: readonly T[]) => Object.fromEntries(list.map((x) => [x, `«${x}»`])) as Record<T, string>
const reply = (o: unknown) => readVoiceReply(JSON.stringify(o), ctx)

describe("lot 11a — dictée : les champs et la consigne", () => {
  it("les champs de la saisie de l'espace : méthode de dryback, nutrition, plantes, réservoir ; jamais un champ calculé", () => {
    expect(voiceKeys(flo)).toEqual(["tempDay", "tempNight", "rh", "weightMorningKg", "weightPeakKg", "runoffMl", "ecRunoff", "phRunoff", "volumePerPotMl", "shots", "ecIn", "phIn", "reservoirL", "lightPct", "lightHeightCm", "ppfd", "photoperiodH"])
    expect(voiceKeys(col)).toContain("sensorMorningPct")
    expect(voiceKeys(col)).not.toContain("weightMorningKg")
    expect(voiceKeys(col)).toContain("heightCm")
    expect(voiceKeys(dry)).toEqual(["tempDay", "tempNight", "rh"])
    for (const s of [flo, col, dry]) for (const k of ["vpd", "dli", "dryback", "drybackSensor", "runoffPct"]) expect(voiceKeys(s) as string[]).not.toContain(k)
  })
  const text = "Floraison, EC runoff quatre deux, pH cinq neuf, runoff 380 millilitres, un peu de jaunissement"
  const prompt = voicePrompt({ text, date: "2026-02-08", open: flo, spaces: [flo, col, dry], obsLabels: labels(OBS_TAGS), actionLabels: labels(ACTION_TAGS) })
  it("la consigne : JSON seulement, les règles, chaque champ avec son unité et sa plage, les espaces, la dictée", () => {
    expect(prompt).toMatch(/UNIQUEMENT par un objet JSON/)
    expect(prompt).toMatch(/Ne remplis que ce que le cultivateur a dit/)
    expect(prompt).toMatch(/VPD, le DLI, le dryback et le pourcentage de runoff sont calculés par l'app/)
    expect(prompt).toMatch(/« cinq neuf » pour un pH = 5\.9/)
    expect(prompt).toMatch(/- "ecRunoff" : EC du runoff, en mS\/cm \(plausible de 0 à 15\)/)
    expect(prompt).toMatch(/- "phRunoff" : pH du runoff \(plausible de 3 à 9\)/)
    expect(prompt).toMatch(/« Colonne » \(id "colonne"\)/)
    expect(prompt).toMatch(/"yellowing" = «yellowing»/)
    expect(prompt.endsWith(text)).toBe(true)
    expect(prompt).not.toMatch(/"heightCm"/) // pas de plantes suivies dans Floraison
  })
  it("aucune valeur inventée : les seuls nombres sont les plages, la date, les exemples fixes des règles et ceux de la dictée", () => {
    const allowed = new Set<string>(["2026", "02", "08", "1", "2", "3", "4", "5", "6", "7", "8", "2.8", "2,8", "5,9", "5.9", "25.5"])
    for (const r of Object.values(VOICE_RANGE)) allowed.add(String(r.min)).add(String(r.max))
    for (const n of text.match(/\d+(?:[.,]\d+)?/g) ?? []) allowed.add(n)
    const numbers = prompt.match(/\d+(?:[.,]\d+)?/g) ?? []
    expect(numbers.filter((n) => !allowed.has(n))).toEqual([])
    // Rien des saisies passées : la consigne ne reçoit que l'espace, ses champs et la dictée.
    expect(voicePrompt.length).toBe(1)
  })
})

describe("lot 11a — dictée : lecture stricte de la réponse", () => {
  it("le JSON (même entre ```), les nombres à virgule, les champs inconnus ou calculés ignorés", () => {
    const r = readVoiceReply('Voici :\n```json\n{"espace": null, "valeurs": {"ecRunoff": 4.2, "phRunoff": "5,9", "runoffMl": 380, "vpd": 1.1, "dryback": 38, "foo": 1}, "observations": [{"tag": "yellowing", "gravite": 1}], "actions": [], "bidon": null, "note": "", "doutes": []}\n```', ctx)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.result).toEqual({ spaceId: "floraison", values: { ecRunoff: 4.2, phRunoff: 5.9, runoffMl: 380 }, observations: [{ tag: "yellowing", severity: 1 }], actions: [], doubts: [] })
    expect(voiceCount(r.result)).toBe(4)
  })
  it("une valeur hors plage n'est jamais gardée : elle devient un doute (« pH 59 »)", () => {
    const r = reply({ valeurs: { phRunoff: 59, tempDay: 25.4, rh: 120, ecIn: "deux huit" } })
    if (!r.ok) throw new Error()
    expect(r.result.values).toEqual({ tempDay: 25.4 })
    expect(r.result.doubts).toEqual([
      { field: "phRunoff", heard: "59", code: "range", min: 3, max: 9 },
      { field: "rh", heard: "120", code: "range", min: 10, max: 100 },
      { field: "ecIn", heard: "deux huit", code: "number" },
    ])
  })
  it("l'espace et la plante nommés ; un espace ou une plante inconnus sont des doutes, l'espace ouvert reste", () => {
    const named = reply({ espace: "colonne", plante: "P2", valeurs: { sensorPeakPct: 48, weightPeakKg: 13 } })
    if (!named.ok) throw new Error()
    expect(named.result.spaceId).toBe("colonne")
    expect(named.result.plantId).toBe("P2")
    // Les champs sont ceux de l'espace nommé : pas de pesée dans Colonne (capteur).
    expect(named.result.values).toEqual({ sensorPeakPct: 48 })
    const unknown = reply({ espace: "serre", plante: "P7", valeurs: { tempDay: 24 } })
    if (!unknown.ok) throw new Error()
    expect(unknown.result.spaceId).toBe("floraison")
    expect(unknown.result.plantId).toBeUndefined()
    expect(unknown.result.doubts).toEqual([
      { field: "espace", heard: "serre", code: "space" },
      { field: "plante", heard: "P7", code: "plant" },
    ])
  })
  it("étiquettes : seulement celles qui existent, gravité 1 à 3 ; le bidon seulement avec la nutrition ; les doutes de Claude gardés", () => {
    const r = reply({
      observations: [{ tag: "yellowing", gravite: 2 }, { tag: "mildiou", gravite: 3 }, { tag: "claws" }, { tag: "yellowing", gravite: 3 }],
      actions: ["lst", "arrosage", "lst"],
      bidon: { volumeL: 40, ec: 2.9, ph: 58 },
      note: "  feuilles du bas un peu molles  ",
      doutes: [{ champ: "tempNight", entendu: "dix-huit ou vingt-huit", raison: "mal compris" }],
    })
    if (!r.ok) throw new Error()
    expect(r.result.observations).toEqual([
      { tag: "yellowing", severity: 2 },
      { tag: "claws", severity: 1 },
    ])
    expect(r.result.actions).toEqual(["lst"])
    expect(r.result.mix).toEqual({ volumeL: 40, ec: 2.9 })
    expect(r.result.note).toBe("feuilles du bas un peu molles")
    expect(r.result.doubts).toEqual([
      { field: "tempNight", heard: "dix-huit ou vingt-huit", why: "mal compris" },
      { field: "bidon.ph", heard: "58", code: "range", min: 3, max: 9 },
    ])
    const noNut = readVoiceReply(JSON.stringify({ espace: "sechage", bidon: { volumeL: 40 } }), ctx)
    if (!noNut.ok) throw new Error()
    expect(noNut.result.mix).toBeUndefined()
  })
  it("réponse illisible : rien n'est lu", () => {
    expect(readVoiceReply("Je n'ai pas compris.", ctx).ok).toBe(false)
    expect(readVoiceReply("{pas du json}", ctx).ok).toBe(false)
    expect(readVoiceReply("[1, 2]", ctx).ok).toBe(false)
  })
})

describe("lot 11a — dictée : fusion avec la saisie du jour et trace", () => {
  const base: Entry = {
    schemaVersion: 2,
    id: "2026-02-08_floraison",
    date: "2026-02-08",
    spaceId: "floraison",
    tempDay: 24,
    rh: 60,
    ecRunoff: 3.8,
    observations: [{ tag: "claws", severity: 1 }],
    actions: ["defoliation"],
    note: "Matin calme.",
    createdAt: "x",
    updatedAt: "x",
  }
  it("les champs dictés remplacent, les autres restent ; étiquettes fusionnées ; note ajoutée ; source « voice » et mots à part", () => {
    const copy = structuredClone(base)
    const out = mergeVoice(base, { spaceId: "floraison", values: { ecRunoff: 4.2, phRunoff: 5.9 }, observations: [{ tag: "claws", severity: 2 }, { tag: "yellowing" as ObsTag, severity: 1 }], actions: ["lst" as ActionTag, "defoliation"], note: "Un peu de jaunissement.", doubts: [] }, "EC runoff 4,2, pH 5,9")
    expect(out).toMatchObject({ tempDay: 24, rh: 60, ecRunoff: 4.2, phRunoff: 5.9, source: "voice", dictation: "EC runoff 4,2, pH 5,9" })
    expect(out.observations).toEqual([{ tag: "claws", severity: 2 }, { tag: "yellowing", severity: 1 }])
    expect(out.actions).toEqual(["defoliation", "lst"])
    expect(out.note).toBe("Matin calme.\nUn peu de jaunissement.")
    // « Annuler » remet la saisie d'avant : elle n'a pas été touchée.
    expect(base).toEqual(copy)
    // Une seconde dictée s'ajoute à la première.
    expect(mergeVoice(out, { spaceId: "floraison", values: { rh: 58 }, observations: [], actions: [], doubts: [] }, "HR 58").dictation).toBe("EC runoff 4,2, pH 5,9\nHR 58")
  })
  it("la trace se lit et se valide ; le réglage « Relire avant d'enregistrer » est désactivé par défaut", () => {
    expect(validDoc("entries", { ...base, source: "voice", dictation: "EC 4,2" })).toBe(true)
    expect(validDoc("entries", { ...base, dictation: 42 })).toBe(false)
    expect(parseSettings({}).voiceReview).toBeUndefined()
    expect(parseSettings({ voiceReview: true }).voiceReview).toBe(true)
    expect(parseSettings({ voiceReview: "oui" }).voiceReview).toBeUndefined()
  })
})

describe("lot 11a — dictée : la feuille", () => {
  const sheet = read("src/screens/entry-sheet.tsx")
  it("« Dicter » à côté de « Reprendre hier », seulement avec Claude ; le panneau : texte, micro du navigateur ou clavier, relire, remplir", () => {
    expect(sheet).toMatch(/\{sample && \(\s*<Button[^>]*id="e-dictate"/)
    const panel = read("src/screens/voice-panel.tsx")
    expect(panel).toMatch(/id="e-voice-text"/)
    expect(panel).toMatch(/speech\.available \?/)
    expect(panel).toMatch(/id="e-voice-nomic"/)
    expect(panel).toMatch(/id="e-voice-review"/)
    expect(panel).toMatch(/id="e-voice-fill"/)
    expect(read("src/lib/speech.ts")).toMatch(/SpeechRecognition \?\? w\.webkitSpeechRecognition/)
    expect(read("src/lib/speech.ts")).toMatch(/fr: "fr-FR", en: "en-US", de: "de-DE"/)
  })
  it("sans doute : enregistré tout de suite, « Annuler » 10 secondes remet la saisie exactement ; sinon la feuille pré-remplie", () => {
    expect(sheet).toMatch(/if \(!r\.doubts\.length && !settings\.voiceReview && !typedHere\) await saveVoice\(r, text, target\)\s*else prefillVoice\(r, text\)/)
    expect(sheet).toMatch(/duration: 10_000/)
    expect(sheet).toMatch(/\(before \? restoreEntry\(before\) : deleteEntry\(id\)\)/)
    expect(read("src/app/grow-context.tsx")).toMatch(/restoreEntry: async \(e\) => need\(\)\.set\(`entries\/\$\{e\.id\}`, e\)/)
    expect(sheet).toMatch(/doubt=\{doubtText\(doubts\.find\(\(d\) => d\.field === k\)\)\}/)
  })
  it("textes dans les trois langues", () => {
    for (const l of [fr, en, de]) for (const k of ["dictate", "title", "fill", "noMic", "review", "done", "undone", "unreadable", "doubts", "heard", "dictated"] as const) expect(l.voice[k].length).toBeGreaterThan(2)
    expect(fr.voice.done).toBe("Journal rempli : {n} {n|valeur|valeurs}")
  })
})
