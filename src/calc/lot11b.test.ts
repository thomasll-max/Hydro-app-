// Lot 11b: the same dictation without Claude (Netlify, local version), read by rules in French, English and German.
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { fold, parseVoice } from "@/calc/voice-rules"
import type { VoiceSpace } from "@/calc/voice"
import type { Lang } from "@/i18n/types"
import { fr } from "@/i18n/fr"
import { en } from "@/i18n/en"
import { de } from "@/i18n/de"

const flower: VoiceSpace = {
  id: "floraison",
  name: "Floraison",
  modules: { climate: true, irrigation: true, nutrition: true, light: true, plants: true },
  method: "weight",
  reservoir: true,
  plants: ["P1", "P2", "P3", "P4"],
}
const column: VoiceSpace = { id: "colonne", name: "Colonne", modules: { climate: true, irrigation: true }, method: "acinfinity", reservoir: false, plants: [] }
const spaces = [flower, column]

type Case = [text: string, values: Record<string, number>, doubts?: string[], note?: string]
const run = (lang: Lang, [text, values, doubts = [], note]: Case) => {
  const r = parseVoice(text, { open: flower, spaces, lang })
  expect(r.values, text).toEqual(values)
  expect(
    r.doubts.map((d) => `${d.field}:${d.code}`),
    text,
  ).toEqual(doubts)
  if (note !== undefined) expect(r.note ?? "", text).toBe(note)
  expect(r.spaceId).toBe("floraison")
}

const FR: Case[] = [
  ["EC 2,8", { ecIn: 2.8 }, ["ecIn:which"], ""],
  ["pH 5,9", { phIn: 5.9 }, ["phIn:which"], ""],
  ["EC runoff 4,2, pH 5,9, runoff 380 millilitres, un peu de jaunissement", { ecRunoff: 4.2, phRunoff: 5.9, runoffMl: 380 }, [], "un peu de jaunissement"],
  ["température 25", { tempDay: 25 }],
  ["humidité 60", { rh: 60 }],
  ["poids matin 4,2", { weightMorningKg: 4.2 }],
  // Pièges
  ["runoff 15 %", {}, ["runoff %:computed"], "runoff 15 %"],
  ["pH 59", {}, ["phIn:range"], ""],
  ["EC deux huit", {}, ["ecIn:number"], ""],
  ["runoff 15", {}, ["runoffMl:unit"], ""],
  ["température 25 %", {}, ["tempDay:unit"], ""],
  ["EC 25", {}, ["ecIn:range"], ""],
  ["humidité un peu haute", {}, [], "humidité un peu haute"],
  ["VPD 1,2 ce matin", {}, ["vpd:computed"], "VPD 1,2 ce matin"],
  // En toutes lettres
  ["EC deux virgule huit", { ecIn: 2.8 }, ["ecIn:which"]],
  ["pH du runoff cinq neuf", { phRunoff: 5.9 }, []],
  ["pH 5 9", { phIn: 5.9 }, ["phIn:which"]],
  ["température vingt-cinq et demi, humidité soixante-cinq pour cent", { tempDay: 25.5, rh: 65 }, [], ""],
  ["humidité quatre-vingt-deux", { rh: 82 }],
  // Unités, contexte
  ["poids matin 4200 grammes", { weightMorningKg: 4.2 }],
  ["poids pic 5,1 kg", { weightPeakKg: 5.1 }],
  ["poids 4,2", { weightMorningKg: 4.2 }, ["weightMorningKg:which"]],
  ["poids matin 4,2 et pic 5,3", { weightMorningKg: 4.2, weightPeakKg: 5.3 }, [], ""],
  ["température nuit 19 degrés", { tempNight: 19 }],
  ["EC d'entrée 3,0 et pH d'entrée 5,8", { ecIn: 3, phIn: 5.8 }, [], ""],
  ["runoff 380 ml, EC 4,2, pH 6", { runoffMl: 380, ecRunoff: 4.2, phRunoff: 6 }, [], ""],
  ["EC 2,8, pH 5,9", { ecIn: 2.8, phIn: 5.9 }, ["ecIn:which", "phIn:which"], ""],
  ["6 doses de 250 ml", { shots: 6 }, [], "250 ml"],
  ["hauteur 45 cm", { heightCm: 45 }],
  ["hauteur de la lampe 40 cm, lampe à 80 %", { lightHeightCm: 40, lightPct: 80 }, [], ""],
  ["réservoir 80 litres", { reservoirL: 80 }],
  ["EC du runoff à 4,5 mS/cm", { ecRunoff: 4.5 }, [], ""],
  ["il fait beau, la colonne est propre", {}, ["espace:otherSpace"], "il fait beau, la colonne est propre"],
]

const EN: Case[] = [
  ["runoff EC 4.2, runoff pH 5.9, runoff 380 ml", { ecRunoff: 4.2, phRunoff: 5.9, runoffMl: 380 }, [], ""],
  ["EC 2.8", { ecIn: 2.8 }, ["ecIn:which"]],
  ["temperature 25", { tempDay: 25 }],
  ["humidity 60", { rh: 60 }],
  ["morning weight 4.2", { weightMorningKg: 4.2 }],
  ["runoff 15 %", {}, ["runoff %:computed"], "runoff 15 %"],
  ["pH 59", {}, ["phIn:range"]],
  ["EC two point eight", { ecIn: 2.8 }, ["ecIn:which"]],
  ["pH five nine", { phIn: 5.9 }, ["phIn:which"]],
  ["EC two eight", {}, ["ecIn:number"]],
  ["night temp 19 degrees, RH 55 percent", { tempNight: 19, rh: 55 }, [], ""],
  ["runoff 1,200 ml", { runoffMl: 1200 }],
  ["peak weight 5.1 kg and a little yellowing", { weightPeakKg: 5.1 }, [], "a little yellowing"],
  ["humidity twenty five", { rh: 25 }],
  // The names of the fields in the app
  ["pot morning 8.2, pot peak 13.2, left in the reservoir 60 liters", { weightMorningKg: 8.2, weightPeakKg: 13.2, reservoirL: 60 }, [], ""],
]

const DE: Case[] = [
  ["EC Ablauf 4,2, pH Ablauf 5,9", { ecRunoff: 4.2, phRunoff: 5.9 }, [], ""],
  ["EC 2,8", { ecIn: 2.8 }, ["ecIn:which"]],
  ["Temperatur 25 Grad", { tempDay: 25 }],
  ["Luftfeuchtigkeit 60 Prozent", { rh: 60 }],
  ["Gewicht morgens 4,2", { weightMorningKg: 4.2 }],
  ["Runoff 15 %", {}, ["runoff %:computed"], "Runoff 15 %"],
  ["pH 59", {}, ["phIn:range"]],
  ["EC zwei Komma acht", { ecIn: 2.8 }, ["ecIn:which"]],
  ["Temperatur fünfundzwanzig", { tempDay: 25 }],
  ["EC zwei acht", {}, ["ecIn:number"]],
  ["Nachttemperatur 19, Höhe 45 cm", { tempNight: 19, heightCm: 45 }, [], ""],
  ["Drain 380 ml, etwas Vergilbung", { runoffMl: 380 }, [], "etwas Vergilbung"],
  ["Spitzengewicht 5,1 kg", { weightPeakKg: 5.1 }],
  // Die Namen der Felder in der App
  ["EC Zulauf 3,0, pH 5,8, Topf Höchststand 13,2", { ecIn: 3, phIn: 5.8, weightPeakKg: 13.2 }, [], ""],
]

describe("lot 11b — dictée sans IA, analyseur à règles", () => {
  it("lit au moins 20 phrases en français, pièges compris", () => {
    expect(FR.length).toBeGreaterThanOrEqual(20)
    for (const c of FR) run("fr", c)
  })
  it("lit au moins 10 phrases en anglais", () => {
    expect(EN.length).toBeGreaterThanOrEqual(10)
    for (const c of EN) run("en", c)
  })
  it("lit au moins 10 phrases en allemand", () => {
    expect(DE.length).toBeGreaterThanOrEqual(10)
    for (const c of DE) run("de", c)
  })

  it("ne remplit que les champs de l'espace ouvert ; le reste va dans la note", () => {
    // La Colonne suit au capteur : un poids n'a pas de champ, il reste dans la note ; un capteur en a un.
    const r = parseVoice("poids matin 4,2, capteur matin 45 %", { open: column, spaces, lang: "fr" })
    expect(r.values).toEqual({ sensorMorningPct: 45 })
    expect(r.note).toBe("poids matin 4,2")
    // Pas de nutrition dans la Colonne : une EC sans précision va au runoff, à vérifier.
    expect(parseVoice("EC 4,2", { open: column, spaces, lang: "fr" }).values).toEqual({ ecRunoff: 4.2 })
  })

  it("plante nommée, plante inconnue, autre espace : jamais deviné", () => {
    const r = parseVoice("P2 un peu de griffes", { open: flower, spaces, lang: "fr" })
    expect(r.plantId).toBe("P2")
    expect(r.note).toBe("P2 un peu de griffes")
    expect(parseVoice("P2 et P3, EC 2", { open: flower, spaces, lang: "fr" }).doubts[0]).toMatchObject({ field: "plante", code: "plant" })
    expect(parseVoice("P1 EC 2", { open: column, spaces, lang: "fr" }).plantId).toBeUndefined()
    const s = parseVoice("dans la colonne EC 4", { open: flower, spaces, lang: "fr" })
    expect(s.spaceId).toBe("floraison")
    expect(s.doubts[0]).toMatchObject({ field: "espace", heard: "Colonne", code: "otherSpace" })
  })

  it("garde les mots dits dans la note, sans valeur inventée", () => {
    const text = "EC runoff 4,2. Les feuilles du bas jaunissent un peu, j'ai fait un LST sur P1"
    const r = parseVoice(text, { open: flower, spaces, lang: "fr" })
    expect(r.values).toEqual({ ecRunoff: 4.2 })
    expect(r.note).toBe("Les feuilles du bas jaunissent un peu, j'ai fait un LST sur P1")
    expect(r.plantId).toBe("P1")
    // Aucune valeur sans nombre dit : un texte sans chiffre ne remplit rien.
    expect(parseVoice("tout va bien, rien à signaler", { open: flower, spaces, lang: "fr" }).values).toEqual({})
    expect(fold("Höhe Entrée")).toBe("hohe entree")
  })

  it("la feuille s'ouvre toujours remplie sans IA, jamais d'enregistrement direct", () => {
    const sheet = readFileSync("src/screens/entry-sheet.tsx", "utf8")
    expect(sheet).toContain("parseVoice(")
    // Sans Claude, la dictée passe par prefillVoice, jamais par saveVoice.
    const rules = sheet.slice(sheet.indexOf("const fillByRules"), sheet.indexOf("const fillFromVoice"))
    expect(rules).toContain("prefillVoice(")
    expect(rules).not.toContain("saveVoice(")
  })

  it("textes en trois langues", () => {
    for (const d of [fr, en, de]) for (const k of ["hintRules", "codeUnit", "codeWhich", "codeComputed", "codeOtherSpace"] as const) expect(d.voice[k]).toBeTruthy()
  })
})
