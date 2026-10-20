// Dicter sans IA (lot 11b): the versions without Claude (Netlify, local) read the simple forms with rules — « EC 2,8 »,
// « pH 5,9 », « runoff 380 mL », « température 25 », « humidité 60 », « poids matin 4,2 » — in French, English and
// German, digits or words (« deux virgule huit », « cinq neuf » for a pH). Everything else goes to the note, with the
// words said. Never a silent guess: a value without the word or the unit that decides, outside its range, or a number
// not understood (« EC deux huit ») is a doubt. The sheet always opens filled; nothing is saved without Thomas.
import type { Lang } from "@/i18n/types"
import { PLANT_IDS, type PlantId } from "@/model/types"
import { VOICE_RANGE, voiceKeys, type VoiceDoubt, type VoiceKey, type VoiceResult, type VoiceSpace } from "@/calc/voice"

type Tok = { kind: "num" | "word" | "sym" | "sep"; raw: string; f: string; start: number; end: number; n?: number }

/** Lower case, no accents, ß → ss: « Höhe » and « hohe », « entrée » and « entree » read the same. */
export const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")

function tokenize(text: string, lang: Lang): Tok[] {
  const out: Tok[] = []
  for (const m of text.matchAll(/\d+(?:[.,]\d+)?|[\p{L}µ]+|[%°/]|[,;.!?:=\n]/gu)) {
    const raw = m[0]
    const start = m.index ?? 0
    const end = start + raw.length
    if (/^\d/.test(raw)) {
      // « 1,200 » is a thousand in English; elsewhere the comma is the decimal sign.
      const n = lang === "en" && /^\d{1,3},\d{3}$/.test(raw) ? Number(raw.replace(",", "")) : Number(raw.replace(",", "."))
      out.push({ kind: "num", raw, f: raw, start, end, n })
    } else if (/^[,;.!?\n]$/.test(raw)) out.push({ kind: "sep", raw, f: raw, start, end })
    else if (/^[%°/:=]$/.test(raw)) out.push({ kind: "sym", raw, f: raw, start, end })
    else out.push({ kind: "word", raw, f: fold(raw), start, end })
  }
  return out
}

// ---------------------------------------------------------------- numbers said in words (FR, EN, DE)

const UNITS: Record<string, number> = {
  zero: 0, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
  two: 2, three: 3, four: 4, five: 5, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  null: 0, eins: 1, zwei: 2, drei: 3, vier: 4, funf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwolf: 12, dreizehn: 13, vierzehn: 14, funfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19,
}
/** « un », « one », « ein » are also articles: a number only before a decimal word (« un virgule huit »). */
const ONE = new Set(["un", "une", "one", "ein", "eine"])
const TENS: Record<string, number> = {
  vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  zwanzig: 20, dreissig: 30, vierzig: 40, funfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90,
}
const HUNDRED = new Set(["cent", "cents", "hundred", "hundert"])
const DECIMAL = new Set(["virgule", "point", "comma", "komma", "punkt"])
const DE_COMPOUND = /^(ein|zwei|drei|vier|funf|sechs|sieben|acht|neun)und(zwanzig|dreissig|vierzig|funfzig|sechzig|siebzig|achtzig|neunzig)$/

type Num = { v: number; end: number; pair?: [number, number] }

const unit = (t: Tok | undefined, one = false): number | undefined =>
  t?.kind === "word" ? (UNITS[t.f] ?? (one && ONE.has(t.f) ? 1 : undefined)) : t?.kind === "num" && Number.isInteger(t.n) && t.raw.length <= 2 ? t.n : undefined

/** A whole number said in words, 0 to 999 (« vingt-cinq », « soixante et onze », « quatre-vingt-dix », « twenty five », « fünfundzwanzig »). */
function cardinal(ts: Tok[], i: number, one = false): Num | null {
  const t = ts[i]
  if (!t || t.kind !== "word") return null
  const de = DE_COMPOUND.exec(t.f)
  if (de) return { v: (UNITS[de[1] === "ein" ? "eins" : de[1]] ?? 0) + TENS[de[2]], end: i + 1 }
  const f = (k: number) => (ts[k]?.kind === "word" ? ts[k].f : "")
  // « cent vingt », « deux cents », « one hundred twenty »
  const hundreds = (mult: number, at: number): Num => {
    const rest = cardinal(ts, at)
    return rest && rest.v < 100 ? { v: mult * 100 + rest.v, end: rest.end } : { v: mult * 100, end: at }
  }
  if (HUNDRED.has(t.f)) return hundreds(1, i + 1)
  let v: number
  let j = i + 1
  if (t.f === "quatre" && (f(j) === "vingt" || f(j) === "vingts")) {
    v = 80
    j++
  } else if (TENS[t.f] != null) v = TENS[t.f]
  else if (UNITS[t.f] != null || (one && ONE.has(t.f))) {
    v = UNITS[t.f] ?? 1
    if (HUNDRED.has(f(j))) return hundreds(v, j + 1)
    // « dix-sept », « dix huit »
    if (v === 10 && ["sept", "huit", "neuf"].includes(f(j))) return { v: 10 + UNITS[f(j)], end: j + 1 }
    return { v, end: j }
  } else return null
  if (v >= 20) {
    // « vingt et un », « soixante et onze », « soixante-dix », « quatre-vingt-dix-neuf », « twenty five »
    if ((f(j) === "et" || f(j) === "and") && (f(j + 1) === "un" || f(j + 1) === "une" || f(j + 1) === "onze")) return { v: v + (f(j + 1) === "onze" ? 11 : 1), end: j + 2 }
    const u = UNITS[f(j)]
    if (u != null && u > 0 && (u < 10 || ((v === 60 || v === 80) && u < 20))) {
      if (u === 10 && ["sept", "huit", "neuf"].includes(f(j + 1))) return { v: v + 10 + UNITS[f(j + 1)], end: j + 2 }
      return { v: v + u, end: j + 1 }
    }
  }
  return { v, end: j }
}

/**
 * The number at `i` (digits or words). Two single digits in a row (« cinq neuf », « 5 9 ») come back as a pair: a pH,
 * and only a pH, reads it as 5,9; any other field turns it into a doubt (« EC deux huit » is 2,8 or 28).
 */
function number(ts: Tok[], i: number): Num | null {
  const t = ts[i]
  if (!t) return null
  let n: Num | null
  if (t.kind === "num") n = { v: t.n ?? 0, end: i + 1 }
  else n = cardinal(ts, i, DECIMAL.has(ts[i + 1]?.f ?? ""))
  if (!n) return null
  const next = ts[n.end]
  if (next?.kind === "word" && DECIMAL.has(next.f) && Number.isInteger(n.v)) {
    // « deux virgule huit », « un virgule zéro cinq », « five point nine »
    let digits = ""
    let k = n.end + 1
    for (let d = unit(ts[k]); d != null && d < 10; d = unit(ts[k])) {
      digits += String(d)
      k++
    }
    if (!digits) {
      const c = cardinal(ts, k)
      if (c) {
        digits = String(c.v)
        k = c.end
      }
    }
    if (digits) return { v: Number(`${n.v}.${digits}`), end: k }
  }
  // « vingt-cinq et demi », « twenty five and a half »
  const f = (k: number) => (ts[k]?.kind === "word" ? ts[k].f : "")
  if (f(n.end) === "et" && (f(n.end + 1) === "demi" || f(n.end + 1) === "demie")) return { v: n.v + 0.5, end: n.end + 2 }
  if (f(n.end) === "and" && f(n.end + 1) === "a" && f(n.end + 2) === "half") return { v: n.v + 0.5, end: n.end + 3 }
  if (f(n.end) === "einhalb") return { v: n.v + 0.5, end: n.end + 1 }
  // Two single digits in a row, nothing between them.
  const a = t.kind === "num" ? (t.raw.length === 1 ? t.n : undefined) : n.end === i + 1 ? unit(t) : undefined
  const b = unit(ts[n.end])
  if (a != null && a < 10 && b != null && b < 10 && (ts[n.end].kind === "num") === (t.kind === "num")) return { v: a, end: n.end + 1, pair: [a, b] }
  return n
}

// ---------------------------------------------------------------- what the words mean

/** What a label points at: a field, or a measure whose field depends on the context (EC, pH, poids, capteur). */
type Target = VoiceKey | "ec" | "ph" | "weight" | "sensor" | "peak" | "runoff" | "computed"
type Label = { words: string[]; to: Target }

const L = (to: Target, ...phrases: string[]): Label[] => phrases.map((p) => ({ words: p.split(" "), to }))

/** Labels, folded, FR / EN / DE mixed (a word of another language changes nothing). The longest match wins. */
const LABELS: Label[] = [
  ...L("ecRunoff", "ec runoff", "ec du runoff", "ec de runoff", "ec drain", "ec du drain", "ec de drainage", "ec sortie", "ec de sortie", "runoff ec", "drain ec", "ec of runoff", "ec of the runoff", "ec ablauf", "ablauf ec", "ec im ablauf", "ec drainwasser", "l ec du runoff", "l ec runoff"),
  ...L("phRunoff", "ph runoff", "ph du runoff", "ph de runoff", "ph drain", "ph du drain", "ph de drainage", "ph sortie", "ph de sortie", "runoff ph", "drain ph", "ph of runoff", "ph of the runoff", "ph ablauf", "ablauf ph", "ph im ablauf", "ph drainwasser", "le ph du runoff", "le ph runoff"),
  ...L("ecIn", "ec entree", "ec d entree", "ec en entree", "ec solution", "ec de la solution", "ec du bidon", "ec bidon", "ec du reservoir", "ec reservoir", "ec in", "ec input", "input ec", "feed ec", "ec feed", "ec of the feed", "ec tank", "ec of the tank", "ec eingang", "eingang ec", "eingangs ec", "ec losung", "ec der losung", "ec nahrlosung", "ec der nahrlosung", "ec im tank", "ec zulauf", "zulauf ec", "l ec d entree", "l ec de la solution"),
  ...L("phIn", "ph entree", "ph d entree", "ph en entree", "ph solution", "ph de la solution", "ph du bidon", "ph bidon", "ph du reservoir", "ph reservoir", "ph in", "ph input", "input ph", "feed ph", "ph feed", "ph of the feed", "ph tank", "ph of the tank", "ph eingang", "eingang ph", "eingangs ph", "ph losung", "ph der losung", "ph nahrlosung", "ph der nahrlosung", "ph im tank", "ph zulauf", "zulauf ph", "le ph d entree", "le ph de la solution"),
  ...L("ec", "ec", "l ec"),
  ...L("ph", "ph", "le ph"),
  ...L("tempDay", "temperature", "la temperature", "temperature jour", "temperature de jour", "temperature du jour", "temp", "temp jour", "day temperature", "day temp", "temperature day", "temperatur", "tagestemperatur", "temperatur tag", "temperatur am tag", "temperatur tagsuber"),
  ...L("tempNight", "temperature nuit", "temperature de nuit", "temperature la nuit", "la temperature de nuit", "temp nuit", "night temperature", "night temp", "temperature night", "temperature at night", "nachttemperatur", "temperatur nacht", "temperatur nachts", "temperatur in der nacht"),
  ...L("rh", "humidite", "l humidite", "humidite relative", "humidite de l air", "hr", "humidity", "relative humidity", "rh", "luftfeuchtigkeit", "luftfeuchte", "relative luftfeuchtigkeit", "feuchtigkeit", "rf"),
  ...L("weightMorningKg", "poids matin", "poids du matin", "poids le matin", "poids ce matin", "poids au matin", "poids du pot matin", "poids du pot le matin", "pot matin", "pot le matin", "morning weight", "weight morning", "weight this morning", "pot weight morning", "pot morning", "gewicht morgens", "gewicht am morgen", "morgengewicht", "topfgewicht morgens", "topf morgens"),
  ...L("weightPeakKg", "poids pic", "poids au pic", "poids du pic", "poids max", "poids maximum", "pot pic", "poids apres arrosage", "poids apres la derniere dose", "peak weight", "weight peak", "weight at peak", "max weight", "pot peak", "gewicht spitze", "spitzengewicht", "hochstgewicht", "maximalgewicht", "gewicht nach dem giessen", "topf hochststand", "topf spitze"),
  ...L("weight", "poids", "le poids", "poids du pot", "weight", "pot weight", "gewicht", "topfgewicht"),
  ...L("sensorMorningPct", "capteur matin", "capteur le matin", "capteur ce matin", "sonde matin", "humidite capteur matin", "sensor morning", "morning sensor", "sensor am morgen", "sensor morgens"),
  ...L("sensorPeakPct", "capteur pic", "capteur au pic", "sonde pic", "humidite capteur pic", "sensor peak", "peak sensor", "sensor spitze", "sensor hochststand"),
  ...L("sensor", "capteur", "le capteur", "sonde", "humidite du substrat", "humidite capteur", "sensor", "substrate moisture", "bodenfeuchte", "substratfeuchte"),
  ...L("peak", "pic", "au pic", "peak", "at peak", "spitze", "hochststand", "am hochststand"),
  ...L("runoff", "runoff", "le runoff", "runoff du pot", "pot runoff", "runoff des topfs", "runoff des topfes", "drain", "drainage", "volume de runoff", "runoff volume", "ablauf", "ablaufmenge", "drainwasser", "runoff menge"),
  ...L("volumePerPotMl", "volume", "volume par pot", "volume donne", "volume per pot", "volume per plant", "volumen", "volumen pro topf", "menge pro topf", "giessmenge"),
  ...L("shots", "doses", "nombre de doses", "shots", "number of shots", "gaben", "anzahl gaben", "anzahl der gaben"),
  ...L("heightCm", "hauteur", "la hauteur", "hauteur plante", "hauteur de la plante", "taille", "height", "plant height", "hohe", "pflanzenhohe", "hohe der pflanze"),
  ...L("lightHeightCm", "hauteur lampe", "hauteur de la lampe", "distance lampe", "lamp height", "light height", "lampenhohe", "lampenabstand", "abstand lampe"),
  ...L("lightPct", "lampe", "la lampe", "puissance", "puissance lampe", "puissance de la lampe", "light", "lamp", "light power", "dimmer", "licht", "leistung", "dimmung"),
  ...L("ppfd", "ppfd"),
  ...L("photoperiodH", "photoperiode", "photoperiod", "lichtdauer"),
  ...L("reservoirL", "reservoir", "le reservoir", "reste reservoir", "reste du reservoir", "reste du bidon", "reste dans le reservoir", "left in the reservoir", "left in the tank", "rest im tank", "tank", "reservoir level", "tank level", "tankinhalt", "tank rest", "behalter"),
  ...L("sownCount", "semis", "graines semees", "seeds sown", "sown", "gesat", "samen"),
  ...L("germinatedCount", "levees", "levee", "germees", "germinated", "sprouted", "gekeimt", "aufgegangen"),
  ...L("computed", "vpd", "dli", "dryback", "le vpd", "le dli", "le dryback"),
].sort((a, b) => b.words.length - a.words.length)

/** A count said after its number: « 6 doses », « 12 graines », « 10 levées ». */
const AFTER: Record<string, VoiceKey> = { doses: "shots", shots: "shots", gaben: "shots", arrosages: "shots", graines: "sownCount", seeds: "sownCount", samen: "sownCount", levees: "germinatedCount", germinated: "germinatedCount", gekeimt: "germinatedCount" }

/** Words allowed between a label and its number: « pH du runoff à 5,9 », « EC: 2,8 », « humidity is about 60 ». */
const FILLER = new Set(["de", "du", "des", "d", "la", "le", "les", "l", "a", "au", "est", "etait", "fait", "environ", "vers", "of", "the", "is", "was", "at", "about", "around", "approx", "approximately", "ist", "war", "bei", "von", "der", "die", "das", "circa", "ca", "ungefahr", "etwa", ":", "="])

const RUNOFF_CTX = new Set(["runoff", "drain", "drainage", "ablauf", "drainwasser", "sortie", "ecoulement"])
const IN_CTX = new Set(["entree", "solution", "bidon", "reservoir", "tank", "feed", "input", "eingang", "eingangs", "zulauf", "losung", "nahrlosung", "melange", "mix"])
const MORNING_CTX = new Set(["matin", "morning", "morgens", "morgen"])
const PEAK_CTX = new Set(["pic", "peak", "spitze", "hochststand", "apres", "after", "nach"])

// Units after a number, folded. `as` converts to the field's unit; « per » marks a percentage.
type UnitHit = { kind: "pct" | "ml" | "cl" | "l" | "kg" | "g" | "cm" | "m" | "deg" | "ms" | "us" | "ppm" | "h" | "umol"; end: number; raw: string }
const UNIT_WORDS: Record<string, UnitHit["kind"]> = {
  pourcent: "pct", pourcents: "pct", percent: "pct", prozent: "pct",
  ml: "ml", millilitre: "ml", millilitres: "ml", milliliter: "ml", milliliters: "ml",
  cl: "cl", centilitre: "cl", centilitres: "cl",
  l: "l", litre: "l", litres: "l", liter: "l", liters: "l",
  kg: "kg", kilo: "kg", kilos: "kg", kilogramme: "kg", kilogrammes: "kg", kilogram: "kg", kilograms: "kg", kilogramm: "kg",
  g: "g", gramme: "g", grammes: "g", gram: "g", grams: "g", gramm: "g",
  cm: "cm", centimetre: "cm", centimetres: "cm", centimeter: "cm", centimeters: "cm", zentimeter: "cm",
  m: "m", metre: "m", metres: "m", meter: "m", meters: "m",
  degre: "deg", degres: "deg", degree: "deg", degrees: "deg", grad: "deg",
  ms: "ms", millisiemens: "ms", us: "us", µs: "us", microsiemens: "us", ppm: "ppm",
  h: "h", heure: "h", heures: "h", hour: "h", hours: "h", stunde: "h", stunden: "h",
  µmol: "umol", umol: "umol", micromoles: "umol",
}

function unitAt(ts: Tok[], i: number, text: string): UnitHit | null {
  const t = ts[i]
  if (!t) return null
  if (t.raw === "%") return { kind: "pct", end: i + 1, raw: "%" }
  if (t.raw === "°") return { kind: "deg", end: ts[i + 1]?.f === "c" && ts[i + 1].start === t.end ? i + 2 : i + 1, raw: "°" }
  if (t.kind !== "word") return null
  // « l'humidité », « d'entrée »: a letter before an apostrophe is not a unit.
  if (/['’]/.test(text[t.end] ?? "")) return null
  if ((t.f === "pour" && ts[i + 1]?.f === "cent") || (t.f === "per" && ts[i + 1]?.f === "cent")) return { kind: "pct", end: i + 2, raw: `${t.raw} ${ts[i + 1].raw}` }
  const k = UNIT_WORDS[t.f]
  if (!k) return null
  // « mS/cm », « µmol/m²/s »: the rest of the unit goes with it.
  let end = i + 1
  while (ts[end]?.raw === "/" && ts[end + 1]?.kind === "word" && ts[end + 1].start === ts[end].end) end += 2
  return { kind: k, end, raw: text.slice(t.start, ts[end - 1].end) }
}

/** The value in the field's unit, or why not: a unit that does not fit, or no unit where it decides. */
function convert(key: VoiceKey, v: number, u: UnitHit | null): { v: number } | { code: "unit" } {
  const k = u?.kind
  const ok = (x: number) => ({ v: Math.round(x * 1000) / 1000 })
  switch (key) {
    case "tempDay":
    case "tempNight":
      return !k || k === "deg" ? ok(v) : { code: "unit" }
    case "rh":
    case "sensorMorningPct":
    case "sensorPeakPct":
    case "lightPct":
      return !k || k === "pct" ? ok(v) : { code: "unit" }
    case "weightMorningKg":
    case "weightPeakKg":
      return !k || k === "kg" ? ok(v) : k === "g" ? ok(v / 1000) : { code: "unit" }
    case "runoffMl":
    case "volumePerPotMl":
      // Without a unit, a small number could be litres, millilitres or a percentage: a doubt.
      return k === "ml" ? ok(v) : k === "cl" ? ok(v * 10) : k === "l" ? ok(v * 1000) : !k && v > 100 ? ok(v) : { code: "unit" }
    case "ecRunoff":
    case "ecIn":
      return !k || k === "ms" ? ok(v) : k === "us" ? ok(v / 1000) : { code: "unit" }
    case "phRunoff":
    case "phIn":
      return !k ? ok(v) : { code: "unit" }
    case "heightCm":
    case "lightHeightCm":
      return !k || k === "cm" ? ok(v) : k === "m" ? ok(v * 100) : { code: "unit" }
    case "reservoirL":
      return !k || k === "l" ? ok(v) : k === "ml" ? ok(v / 1000) : { code: "unit" }
    case "ppfd":
      return !k || k === "umol" ? ok(v) : { code: "unit" }
    case "photoperiodH":
      return !k || k === "h" ? ok(v) : { code: "unit" }
    default:
      return !k ? ok(v) : { code: "unit" }
  }
}

const EDGE = new Set(["et", "and", "und", "puis", "then", "dann", "alors", "so", "also", "dans", "in", "im", "la", "le", "les", "l", "de", "du", "des", "d", "the", "der", "die", "das", "au", "pour", "for", "fur", "avec", "with", "mit"])

/**
 * The rules' reading of a dictation (lot 11b), in the same shape as Claude's (`VoiceResult`), for the same pre-filled
 * sheet. `open` is the space on screen; it stays (another space named is a doubt).
 */
export function parseVoice(text: string, ctx: { open: VoiceSpace; spaces: VoiceSpace[]; lang: Lang }): VoiceResult {
  const ts = tokenize(text, ctx.lang)
  const used: [number, number][] = []
  const doubts: VoiceDoubt[] = []
  const take = (a: number, b: number) => used.push([ts[a].start, ts[b - 1].end])
  const words = (a: number, b: number) => text.slice(ts[a].start, ts[b - 1].end)
  const at = (i: number, w: string[]) => w.every((x, k) => ts[i + k]?.kind === "word" && ts[i + k].f === x)

  // Another space named aloud: the rules do not move the entry (a name can be a word of the note), they say it.
  const space = ctx.open
  const others = ctx.spaces.filter((s) => {
    const w = fold(s.name).split(/[^\p{L}\d]+/u).filter(Boolean)
    return s.id !== space.id && w.length > 0 && ts.some((_, i) => at(i, w))
  })
  if (others.length) doubts.push({ field: "espace", heard: others.map((s) => s.name).join(", "), code: "otherSpace" })

  // The plant: « P2 », « plante 2 », « plant 2 », « Pflanze 2 ».
  const plants = new Set<PlantId>()
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i]
    const n = ts[i + 1]
    const p = t.f === "p" && n?.kind === "num" && n.start === t.end ? n : ["plante", "plant", "pflanze"].includes(t.f) && n?.kind === "num" ? n : null
    if (!p) continue
    // The plant's name stays in the note (« un LST sur P1 »).
    const id = `P${p.raw}` as PlantId
    if (PLANT_IDS.includes(id)) plants.add(id)
  }
  let plantId: PlantId | undefined
  const asked = [...plants]
  if (asked.length === 1 && space.plants.includes(asked[0])) plantId = asked[0]
  else if (asked.length) doubts.push({ field: "plante", heard: asked.join(", "), code: "plant" })

  const keys = new Set<VoiceKey>(voiceKeys(space))
  const values: Partial<Record<VoiceKey, number>> = {}
  // What the last words said: runoff or solution, morning or peak. `guess` when it came from a doubt: what follows is a
  // doubt too (« EC 2,8, pH 5,9 » said without « runoff » or « entrée »).
  let side: { v: "runoff" | "in"; guess?: boolean } | null = null
  let moment: { v: "morning" | "peak"; guess?: boolean } | null = null

  const put = (key: VoiceKey, n: Num, u: UnitHit | null, heard: string, which?: boolean) => {
    if (!keys.has(key)) return false
    const r = VOICE_RANGE[key]
    let v = n.v
    // « pH cinq neuf » = 5,9; anything else in two digits is not understood.
    if (n.pair && key !== "phRunoff" && key !== "phIn") doubts.push({ field: key, heard, code: "number" })
    else {
      if (n.pair) v = n.pair[0] + n.pair[1] / 10
      const c = convert(key, v, u)
      if ("code" in c) doubts.push({ field: key, heard, code: "unit" })
      else if (c.v < r.min || c.v > r.max || (r.integer && !Number.isInteger(c.v))) doubts.push({ field: key, heard, code: "range", min: r.min, max: r.max })
      else {
        values[key] = c.v
        if (which) doubts.push({ field: key, heard, code: "which" })
      }
    }
    return true
  }

  for (let i = 0; i < ts.length; i++) {
    const t = ts[i]
    if (t.kind === "sep" && t.raw !== ",") {
      side = null
      moment = null
      continue
    }
    if (t.kind === "word") {
      if (RUNOFF_CTX.has(t.f)) side = { v: "runoff" }
      else if (IN_CTX.has(t.f)) side = { v: "in" }
      if (MORNING_CTX.has(t.f)) moment = { v: "morning" }
      else if (PEAK_CTX.has(t.f)) moment = { v: "peak" }
    }
    // A count before its word: « 6 doses ».
    if (t.kind === "num" && ts[i + 1]?.kind === "word" && AFTER[ts[i + 1].f]) {
      const key = AFTER[ts[i + 1].f]
      if (put(key, { v: t.n ?? 0, end: i + 1 }, null, words(i, i + 2))) take(i, i + 2)
      i++
      continue
    }
    const label = LABELS.find((l) => at(i, l.words))
    if (!label) continue
    let j = i + label.words.length
    while (ts[j] && (ts[j].kind === "word" || ts[j].kind === "sym") && FILLER.has(ts[j].f) && !(ts[j].kind === "word" && unit(ts[j]) != null)) j++
    const n = number(ts, j)
    if (!n) continue
    const u = unitAt(ts, n.end, text)
    let end = u ? u.end : n.end
    // « photopériode 12/12 », « 18/6 »: the hours of light.
    if (ts[end]?.raw === "/" && ts[end + 1]?.kind === "num") end += 2
    const heard = words(i, end)
    let key: VoiceKey | null = null
    let which = false
    switch (label.to) {
      case "computed":
        // VPD, DLI, dryback: the app computes them. The words stay in the note.
        doubts.push({ field: label.words.at(-1), heard, code: "computed" })
        i = end - 1
        continue
      case "runoff":
        if (u?.kind === "pct") {
          // « runoff 15 % »: the app computes it from the pot's runoff and the volume. The words stay in the note.
          doubts.push({ field: "runoff %", heard, code: "computed" })
          i = end - 1
          continue
        }
        key = "runoffMl"
        break
      case "ec":
      case "ph": {
        // Said without « runoff » or « entrée »: the solution (as Claude is told), marked to check.
        const s = side?.v ?? (keys.has(label.to === "ec" ? "ecIn" : "phIn") ? "in" : "runoff")
        key = label.to === "ec" ? (s === "in" ? "ecIn" : "ecRunoff") : s === "in" ? "phIn" : "phRunoff"
        which = !side || !!side.guess
        break
      }
      case "weight":
      case "sensor":
      case "peak": {
        const m = label.to === "peak" ? "peak" : (moment?.v ?? "morning")
        const weight = label.to === "weight" || (label.to === "peak" && keys.has("weightPeakKg"))
        key = m === "peak" ? (weight ? "weightPeakKg" : "sensorPeakPct") : weight ? "weightMorningKg" : "sensorMorningPct"
        which = label.to !== "peak" && (!moment || !!moment.guess)
        break
      }
      default:
        key = label.to
    }
    if (key === "runoffMl" || key === "ecRunoff" || key === "phRunoff") side = { v: "runoff", guess: which }
    if (key === "ecIn" || key === "phIn") side = { v: "in", guess: which }
    if (key === "weightMorningKg" || key === "sensorMorningPct") moment = { v: "morning", guess: which }
    if (key === "weightPeakKg" || key === "sensorPeakPct") moment = { v: "peak", guess: which }
    if (key && put(key, n, u, heard, which)) {
      take(i, end)
      i = end - 1
    }
  }

  // The note: what is left, in the words said. Only next to a piece taken, the little words left over go (« et », « de »).
  const kept: string[] = []
  let from = 0
  const rest: string[] = []
  for (const [a, b] of used.sort((x, y) => x[0] - y[0])) {
    if (a >= from) rest.push(text.slice(from, a))
    from = Math.max(from, b)
  }
  rest.push(text.slice(from))
  rest.forEach((chunk, c) => {
    const pieces = chunk.split(/[;!?\n]|[.,](?!\d)|(?<!\d)[.,]/)
    pieces.forEach((piece, k) => {
      const w = piece.trim().split(/\s+/).filter(Boolean)
      if (c > 0 && k === 0) {
        while (w.length && (EDGE.has(fold(w[0])) || /^[ldLD]['’]$/.test(w[0]))) w.shift()
      }
      if (c < rest.length - 1 && k === pieces.length - 1) while (w.length && EDGE.has(fold(w[w.length - 1]))) w.pop()
      const s = w.join(" ")
      if (/[\p{L}\d]/u.test(s)) kept.push(s)
    })
  })
  const note = kept.join(", ").slice(0, 2000)
  return { spaceId: space.id, ...(plantId ? { plantId } : {}), values, observations: [], actions: [], ...(note ? { note } : {}), doubts }
}
