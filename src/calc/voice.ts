// Dicter le journal à Claude (lot 11, demande de Thomas : « lâcher toutes les infos à Claude en lisant mes résultats »).
// Pure, tested: the fields Claude may fill for a space (with units and plausible ranges), the prompt (only what the app
// knows about the fields, never a value), the strict reading of Claude's JSON (unknown fields ignored, a value out of its
// range never kept but turned into a doubt), and the merge into the day's entry.
import { ACTION_TAGS, OBS_TAGS, PLANT_IDS, type ActionTag, type DrybackMethod, type Entry, type IsoDate, type ObsTag, type PlantId, type Severity } from "@/model/types"

/** Entry fields a dictation can fill. The computed ones (VPD, DLI, dryback, % runoff) are never among them. */
export const VOICE_KEYS = [
  "tempDay",
  "tempNight",
  "rh",
  "weightMorningKg",
  "weightPeakKg",
  "sensorMorningPct",
  "sensorPeakPct",
  "runoffMl",
  "ecRunoff",
  "phRunoff",
  "volumePerPotMl",
  "shots",
  "ecIn",
  "phIn",
  "heightCm",
  "reservoirL",
  "sownCount",
  "germinatedCount",
  "lightPct",
  "lightHeightCm",
  "ppfd",
  "photoperiodH",
] as const
export type VoiceKey = (typeof VOICE_KEYS)[number]

/**
 * Plausible ranges (lot 11): a value outside is never saved and becomes a doubt. EC runoff goes higher than the solution
 * (Athena's runoff targets reach 10 in a generative steer).
 */
export const VOICE_RANGE: Record<VoiceKey, { min: number; max: number; unit: string; what: string; integer?: boolean }> = {
  tempDay: { min: 5, max: 40, unit: "°C", what: "température de l'air le jour" },
  tempNight: { min: 5, max: 40, unit: "°C", what: "température de l'air la nuit" },
  rh: { min: 10, max: 100, unit: "%", what: "humidité relative de l'air" },
  weightMorningKg: { min: 0, max: 50, unit: "kg", what: "poids du pot témoin le matin, avant la première dose" },
  weightPeakKg: { min: 0, max: 50, unit: "kg", what: "poids du pot témoin au pic, après la dernière dose" },
  sensorMorningPct: { min: 0, max: 100, unit: "%", what: "humidité du capteur de sol le matin" },
  sensorPeakPct: { min: 0, max: 100, unit: "%", what: "humidité du capteur de sol au pic" },
  runoffMl: { min: 0, max: 5000, unit: "mL", what: "runoff recueilli sous le pot témoin", integer: true },
  ecRunoff: { min: 0, max: 15, unit: "mS/cm", what: "EC du runoff" },
  phRunoff: { min: 3, max: 9, unit: "", what: "pH du runoff" },
  volumePerPotMl: { min: 0, max: 20000, unit: "mL", what: "volume donné par pot dans la journée", integer: true },
  shots: { min: 0, max: 50, unit: "", what: "nombre de doses", integer: true },
  ecIn: { min: 0, max: 6, unit: "mS/cm", what: "EC de la solution donnée (entrée)" },
  phIn: { min: 3, max: 9, unit: "", what: "pH de la solution donnée (entrée)" },
  heightCm: { min: 0, max: 400, unit: "cm", what: "hauteur de la plante" },
  reservoirL: { min: 0, max: 5000, unit: "L", what: "litres qui restent dans le réservoir" },
  sownCount: { min: 0, max: 1000, unit: "", what: "graines ou boutures mises", integer: true },
  germinatedCount: { min: 0, max: 1000, unit: "", what: "levées ou enracinées", integer: true },
  lightPct: { min: 0, max: 100, unit: "%", what: "puissance de la lampe", integer: true },
  lightHeightCm: { min: 0, max: 300, unit: "cm", what: "hauteur entre la lampe et la canopée", integer: true },
  ppfd: { min: 0, max: 2500, unit: "µmol/m²/s", what: "PPFD mesuré", integer: true },
  photoperiodH: { min: 0, max: 24, unit: "h", what: "photopériode" },
}
/** A tank said aloud (« bidon de 40 L, EC 2,9, pH 5,8 »). */
export const MIX_RANGE = { volumeL: { min: 1, max: 2000 }, ec: { min: 0, max: 6 }, ph: { min: 3, max: 9 } } as const

export type VoiceSpace = {
  id: string
  name: string
  modules: { climate?: boolean; irrigation?: boolean; nutrition?: boolean; light?: boolean; plants?: boolean; propagation?: boolean }
  method: DrybackMethod
  reservoir: boolean
  /** Plants of the running cycle (P1…), when the space follows plants. */
  plants: PlantId[]
}

/** The fields of the day's entry of a space, as the entry sheet shows them (dryback method, nutrition, plants…). */
export function voiceKeys(s: VoiceSpace): VoiceKey[] {
  const m = s.modules
  const sensor = s.method === "acinfinity" || s.method === "sensor"
  const keys: VoiceKey[] = []
  if (m.climate) keys.push("tempDay", "tempNight", "rh")
  if (m.irrigation) {
    if (s.method === "weight") keys.push("weightMorningKg", "weightPeakKg")
    if (sensor) keys.push("sensorMorningPct", "sensorPeakPct")
    keys.push("runoffMl", "ecRunoff", "phRunoff", "volumePerPotMl", "shots")
  }
  if (m.nutrition) keys.push("ecIn", "phIn")
  if (m.plants) keys.push("heightCm")
  if (s.reservoir) keys.push("reservoirL")
  if (m.propagation) keys.push("sownCount", "germinatedCount")
  if (m.light) keys.push("lightPct", "lightHeightCm", "ppfd", "photoperiodH")
  return keys
}

/** A doubt: Claude's (its own words in `why`) or the app's (`code`: unknown space or plant, not a number, out of range). */
export type VoiceDoubt = { field?: string; heard?: string; why?: string; code?: "space" | "plant" | "number" | "range"; min?: number; max?: number }
export type VoiceResult = {
  spaceId: string
  plantId?: PlantId
  values: Partial<Record<VoiceKey, number>>
  observations: { tag: ObsTag; severity: Severity }[]
  actions: ActionTag[]
  mix?: { volumeL?: number; ec?: number; ph?: number }
  note?: string
  doubts: VoiceDoubt[]
}

/** How many things a dictation filled (« Journal rempli : 7 valeurs »): values, tags, the note, the tank's values. */
export const voiceCount = (r: Pick<VoiceResult, "values" | "observations" | "actions" | "note" | "mix">) =>
  Object.keys(r.values).length + r.observations.length + r.actions.length + (r.note ? 1 : 0) + Object.keys(r.mix ?? {}).length

/**
 * The prompt (memoryless call, like « Demander à Claude »): the rules, the fields of the open space with their units and
 * ranges, the spaces, the tags, the fixed JSON schema, then the dictated text. Nothing measured is in it: Claude only
 * has Thomas's words to take numbers from.
 */
export function voicePrompt(p: {
  text: string
  date: IsoDate
  open: VoiceSpace
  spaces: { id: string; name: string }[]
  obsLabels: Record<ObsTag, string>
  actionLabels: Record<ActionTag, string>
}): string {
  const keys = voiceKeys(p.open)
  const field = (k: VoiceKey) => {
    const r = VOICE_RANGE[k]
    return `- "${k}" : ${r.what}${r.unit ? `, en ${r.unit}` : ""} (plausible de ${r.min} à ${r.max}${r.integer ? ", nombre entier" : ""})`
  }
  return [
    "Tu remplis le journal de culture d'un cultivateur à partir de ce qu'il a dicté en lisant ses mesures. Réponds UNIQUEMENT par un objet JSON, sans texte autour, selon le schéma plus bas.",
    "RÈGLES",
    "1. Ne remplis que ce que le cultivateur a dit. Ne déduis rien, ne calcule rien, ne complète rien. Une valeur qu'il n'a pas dite reste absente.",
    "2. Le VPD, le DLI, le dryback et le pourcentage de runoff sont calculés par l'app : ne les mets jamais dans « valeurs ». S'il les dit, recopie ses mots dans « note ».",
    "3. Nombres à la française : « deux virgule huit » = 2.8, « 5,9 » = 5.9, « cinq neuf » pour un pH = 5.9, « vingt-cinq et demi » = 25.5. Écris les nombres JSON avec un point.",
    "4. Si un espace ou une plante (P1, P2…) est nommé, utilise-le. Sinon l'espace ouvert. En cas de doute, ne choisis pas : mets null et explique-le dans « doutes ».",
    "5. Observations et actions : seulement les étiquettes de la liste. Ce qui n'y entre pas va dans « note ».",
    "6. Tout ce qui n'entre dans aucun champ va dans « note », avec les mots du cultivateur.",
    "7. « bidon » seulement s'il parle clairement d'un bidon ou d'un mélange qu'il vient de préparer (volume, EC, pH du bidon). Sinon, une EC ou un pH de la solution vont dans ecIn / phIn.",
    "8. « doutes » liste ce qui est ambigu : un mot mal compris, une unité absente, une valeur qui sort de la plage plausible. Pour chaque doute : le champ concerné, les mots entendus, la raison en quelques mots, dans la langue de la dictée. Une valeur douteuse ne va pas dans « valeurs ».",
    "",
    `DATE DU JOUR : ${p.date}`,
    `ESPACE OUVERT : « ${p.open.name} » (id "${p.open.id}")`,
    `ESPACES : ${p.spaces.map((s) => `« ${s.name} » (id "${s.id}")`).join(", ")}`,
    p.open.plants.length ? `PLANTES DE L'ESPACE OUVERT : ${p.open.plants.join(", ")}` : "PLANTES : aucune suivie à part (toute la saisie vaut pour l'espace).",
    "",
    "CHAMPS DE LA SAISIE (clé : ce que c'est)",
    ...(keys.length ? keys.map(field) : ["- aucun champ mesuré pour cet espace : tout va dans « note »."]),
    "",
    `ÉTIQUETTES D'OBSERVATION (gravité 1 à 3) : ${OBS_TAGS.map((t) => `"${t}" = ${p.obsLabels[t]}`).join(", ")}`,
    `ÉTIQUETTES D'ACTION : ${ACTION_TAGS.map((t) => `"${t}" = ${p.actionLabels[t]}`).join(", ")}`,
    "",
    "SCHÉMA",
    '{"espace": "<id ou null>", "plante": "<P1… ou null>", "valeurs": {"<clé>": <nombre>}, "observations": [{"tag": "<étiquette>", "gravite": <1|2|3>}], "actions": ["<étiquette>"], "bidon": {"volumeL": <nombre>, "ec": <nombre>, "ph": <nombre>} ou null, "note": "<texte ou vide>", "doutes": [{"champ": "<clé, espace ou plante>", "entendu": "<mots entendus>", "raison": "<pourquoi>"}]}',
    "",
    "DICTÉE",
    p.text.trim(),
  ].join("\n")
}

/** A number from Claude's JSON: a JSON number, or a written one with a comma (« 5,9 »). */
function toNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (typeof v === "string" && /^\s*-?\d+(?:[.,]\d+)?\s*$/.test(v)) return Number(v.replace(",", "."))
  return null
}
const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "")

/**
 * Claude's answer read strictly (lot 11). The JSON object is taken from the text (code fences allowed); keys not in the
 * space's fields, unknown tags and extra properties are ignored; a value that is not a number or is outside its range
 * is never kept and becomes a doubt; an unknown space or plant is a doubt (the open space stays).
 */
export function readVoiceReply(text: string, ctx: { open: VoiceSpace; spaces: VoiceSpace[] }): { ok: true; result: VoiceResult } | { ok: false } {
  const a = text.indexOf("{")
  const b = text.lastIndexOf("}")
  if (a < 0 || b <= a) return { ok: false }
  let o: Record<string, unknown>
  try {
    const parsed = JSON.parse(text.slice(a, b + 1))
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false }
    o = parsed as Record<string, unknown>
  } catch {
    return { ok: false }
  }
  const doubts: VoiceDoubt[] = []
  if (Array.isArray(o.doutes))
    for (const d of o.doutes.slice(0, 12)) {
      if (!d || typeof d !== "object") continue
      const x = d as Record<string, unknown>
      const doubt: VoiceDoubt = { field: str(x.champ, 40) || undefined, heard: str(x.entendu) || undefined, why: str(x.raison) || undefined }
      if (doubt.field || doubt.heard || doubt.why) doubts.push(doubt)
    }
  // The space: named and known, else the open one (an unknown name is a doubt, never a guess).
  let space = ctx.open
  if (typeof o.espace === "string" && o.espace) {
    const named = ctx.spaces.find((s) => s.id === o.espace)
    if (named) space = named
    else doubts.push({ field: "espace", heard: str(o.espace, 60), code: "space" })
  }
  let plantId: PlantId | undefined
  if (typeof o.plante === "string" && o.plante) {
    if ((PLANT_IDS as string[]).includes(o.plante) && space.plants.includes(o.plante as PlantId)) plantId = o.plante as PlantId
    else doubts.push({ field: "plante", heard: str(o.plante, 20), code: "plant" })
  }
  const allowed = voiceKeys(space)
  const values: Partial<Record<VoiceKey, number>> = {}
  const raw = o.valeurs && typeof o.valeurs === "object" && !Array.isArray(o.valeurs) ? (o.valeurs as Record<string, unknown>) : {}
  for (const [k, v] of Object.entries(raw)) {
    if (!(allowed as string[]).includes(k)) continue
    const key = k as VoiceKey
    const r = VOICE_RANGE[key]
    const n = toNum(v)
    if (n == null) doubts.push({ field: key, heard: str(String(v), 60), code: "number" })
    else if (n < r.min || n > r.max) doubts.push({ field: key, heard: String(n), code: "range", min: r.min, max: r.max })
    else values[key] = n
  }
  const observations: VoiceResult["observations"] = []
  if (Array.isArray(o.observations))
    for (const x of o.observations) {
      const tag = x && typeof x === "object" ? (x as Record<string, unknown>).tag : x
      if (typeof tag !== "string" || !(OBS_TAGS as readonly string[]).includes(tag) || observations.some((y) => y.tag === tag)) continue
      const g = x && typeof x === "object" ? toNum((x as Record<string, unknown>).gravite) : null
      observations.push({ tag: tag as ObsTag, severity: (g === 2 || g === 3 ? g : 1) as Severity })
    }
  const actions: ActionTag[] = Array.isArray(o.actions) ? [...new Set(o.actions.filter((x): x is ActionTag => typeof x === "string" && (ACTION_TAGS as readonly string[]).includes(x)))] : []
  let mix: VoiceResult["mix"]
  if (o.bidon && typeof o.bidon === "object" && !Array.isArray(o.bidon) && space.modules.nutrition) {
    const bd = o.bidon as Record<string, unknown>
    const m: NonNullable<VoiceResult["mix"]> = {}
    for (const k of ["volumeL", "ec", "ph"] as const) {
      if (bd[k] == null) continue
      const n = toNum(bd[k])
      const r = MIX_RANGE[k]
      if (n == null || n < r.min || n > r.max) doubts.push({ field: `bidon.${k}`, heard: str(String(bd[k]), 60), ...(n == null ? { code: "number" as const } : { code: "range" as const, min: r.min, max: r.max }) })
      else m[k] = n
    }
    if (Object.keys(m).length) mix = m
  }
  const note = str(o.note, 2000)
  return { ok: true, result: { spaceId: space.id, plantId, values, observations, actions, ...(mix ? { mix } : {}), ...(note ? { note } : {}), doubts } }
}

/**
 * The day's entry after a dictation: the dictated values replace, the others stay; observations by tag (the dictated
 * severity wins), actions added, the dictated note after the one already there. The trace: `source: "voice"` and the
 * dictated text apart from the note.
 */
export function mergeVoice(base: Entry, r: VoiceResult, text: string): Entry {
  const out: Entry = { ...base, ...r.values }
  const obs = [...(base.observations ?? [])]
  for (const o of r.observations) {
    const i = obs.findIndex((x) => x.tag === o.tag)
    if (i >= 0) obs[i] = o
    else obs.push(o)
  }
  if (obs.length) out.observations = obs
  const acts = [...new Set([...(base.actions ?? []), ...r.actions])]
  if (acts.length) out.actions = acts
  if (r.note) out.note = base.note?.trim() ? `${base.note.trim()}\n${r.note}` : r.note
  out.source = "voice"
  out.dictation = base.dictation?.trim() ? `${base.dictation.trim()}\n${text.trim()}` : text.trim()
  return out
}
