// "Demander à Claude" (spec §2, §12, lot 6; Claude version only). Each call is memoryless: the prompt carries the
// instructions, the space's data and the conversation so far. Pure, tested: nothing about the grow is invented here,
// only what the app knows (and what it does not) is written down.
import type { Equipment, EquipmentAssignment, Grow, Space } from "@/model/grow"
import type { Cycle, Entry, IsoDate, Mix } from "@/model/types"
import type { DayTargets } from "./targets"
import { stageOn, todayIso } from "./stage"
import { equipmentAt } from "@/equipment/calc"
import { getCatalog, isOwnLine } from "@/data/nutrients"
import { spaceNutrition } from "@/model/grow-ops"
import type { Lang } from "@/i18n/types"

export type AskTurn = { role: "user" | "assistant"; content: string }
export type AskData = {
  grow: Grow | null
  space: Space
  cycle: Cycle | null
  targets: DayTargets | null
  entries: Entry[]
  mixes: Mix[]
  equipment: Equipment[]
  assignments: EquipmentAssignment[]
}

/** Turns kept in a conversation (older ones are dropped: the prompt stays short). */
export const MAX_TURNS = 6

const r = (lo: number, hi: number) => (lo === hi ? `${lo}` : `${lo}–${hi}`)
const ENTRY_FIELDS: [keyof Entry, string][] = [
  ["tempDay", "T°C"],
  ["rh", "HR%"],
  ["vpd", "VPD"],
  ["dryback", "dryback% (pesée)"],
  ["drybackSensor", "dryback% capteur (échelle du capteur, sans cible Athena)"],
  ["volumePerPotMl", "mL/pot"],
  ["runoffPct", "runoff%"],
  ["ecIn", "EC in"],
  ["phIn", "pH in"],
  ["ecRunoff", "EC runoff"],
  ["phRunoff", "pH runoff"],
  ["ppfd", "PPFD"],
  ["heightCm", "hauteur cm"],
  ["reservoirL", "réservoir L"],
]

/** What the app knows about one space today, as plain text. */
export function askContext(d: AskData, today: IsoDate): string {
  const lines: string[] = []
  const nut = spaceNutrition(d.grow, d.space)
  const cat = getCatalog(nut.line)
  lines.push(`Grow : ${d.grow?.name ?? "—"} · espace « ${d.space.name} » (${d.space.template}${d.space.dimensionsCm?.l && d.space.dimensionsCm?.w ? `, ${d.space.dimensionsCm.l}×${d.space.dimensionsCm.w}×${d.space.dimensionsCm.h ?? "?"} cm` : ""}).`)
  lines.push(
    isOwnLine(nut.line)
      ? "Nutrition : autre marque, dosée par le cultivateur (aucune recette ni cible d'EC ou de pH dans l'app). Ne pas proposer de doses Athena."
      : `Nutrition : ${cat.name}, add-ons ${nut.addons.join(", ") || "aucun"}, dosage ${nut.dosing}. Ne jamais mélanger avec une autre gamme.`,
  )
  if (d.cycle) {
    const s = stageOn(d.cycle, today)
    lines.push(
      `Cycle « ${d.cycle.name} » (${d.cycle.cultivars.join(", ") || "variété ?"}) : stade ${s.key}${s.flowerWeek ? `, floraison S${s.flowerWeek} J${s.flowerDay}` : s.day ? `, jour ${s.day}` : ""}; substrat ${d.cycle.substrate}, arrosage ${d.cycle.waterMode}, ${d.cycle.potCount ?? "?"} pots de ${d.cycle.potVolumeL ?? "?"} L.`,
    )
  } else lines.push("Pas de cycle en cours dans cet espace.")
  if (d.targets) {
    const t = d.targets
    const parts = (["ecIn", "ecRunoff", "phIn", "dryback", "runoffPct", "vpd", "ppfd", "dli"] as const)
      .filter((k) => t[k])
      .map((k) => `${k} ${r(t[k]!.lo, t[k]!.hi)} (${t[k]!.src === "athena" ? `Athena${t[k]!.page ? ` p. ${t[k]!.page}` : ""}` : t[k]!.src === "common" ? "repère courant" : t[k]!.src})`)
    lines.push(`Cibles du jour : ${parts.join(" ; ")}.`)
  }
  const recent = d.entries.filter((e) => e.spaceId === d.space.id && !e.plantId).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7)
  if (recent.length) {
    lines.push("Dernières saisies (la plus récente d'abord) :")
    for (const e of recent) {
      const vals = ENTRY_FIELDS.filter(([k]) => e[k] != null).map(([k, l]) => `${l} ${e[k]}`)
      lines.push(`- ${e.date} : ${vals.join(", ") || "rien de mesuré"}${e.note ? ` · note : ${e.note.slice(0, 200)}` : ""}`)
    }
  } else lines.push("Aucune saisie dans le journal pour cet espace.")
  const mix = d.mixes.filter((m) => m.spaceIds?.includes(d.space.id)).sort((a, b) => b.date.localeCompare(a.date))[0]
  if (mix) lines.push(`Dernier bidon : ${mix.date}, ${mix.volumeL} L${mix.ecTarget != null ? `, EC visée ${mix.ecTarget}` : ""}${mix.ph != null ? `, pH ${mix.ph}` : ""}${mix.recipe ? ` (${mix.recipe})` : ""}.`)
  const here = equipmentAt(d.space.id, today, d.assignments)
    .map((a) => d.equipment.find((e) => e.id === a.equipmentId))
    .filter((e): e is Equipment => !!e)
  if (here.length) lines.push(`Équipement : ${here.map((e) => e.name).join(", ")}.`)
  const missing: string[] = []
  const pump = here.find((e) => e.type === "pump")
  if (pump && pump.pump?.flowMlPerMin == null) missing.push("débit de la pompe")
  const ext = here.find((e) => e.type === "extractor")
  if (ext && ext.extractor?.m3h == null && ext.extractor?.cfm == null) missing.push("débit de l'extracteur")
  if (missing.length) lines.push(`Données manquantes (non mesurées) : ${missing.join(", ")}.`)
  return lines.join("\n")
}

/** Prompt for one question, with the conversation so far (memoryless calls). */
/** What goes with a photo (lot 12c): when and where it was taken, its tags; nothing more is said about it. */
export type AskPhoto = { date: IsoDate; space?: string; plant?: string; tags?: string[] }

/**
 * The rules for a photo sent with the question (lot 12c): describe, tie to the measures, suggest leads; never a
 * diagnosis given as certain; say when the photo is not enough.
 */
export function askPhotoNote(p: AskPhoto): string {
  const meta = [`prise le ${p.date}`, p.space ? `espace « ${p.space} »` : null, p.plant ? `plante ${p.plant}` : null, p.tags?.length ? `étiquettes du cultivateur : ${p.tags.join(", ")}` : null].filter(Boolean).join(", ")
  return [
    `PHOTO JOINTE (${meta}).`,
    "Décris ce que tu vois sur la photo, relie-le aux mesures ci-dessus, et propose des pistes à vérifier.",
    "Ne présente jamais un diagnostic comme certain : dis ce qui est possible, et comment le vérifier.",
    "Si la photo ne suffit pas (flou, trop loin, lumière de la lampe qui change les couleurs, partie de la plante qu'on ne voit pas), dis-le et dis quelle photo aiderait.",
  ].join(" ")
}

export function askPrompt(context: string, question: string, history: AskTurn[], lang: Lang, photo?: AskPhoto): AskTurn[] {
  if (photo) question = `${question}\n\n${askPhotoNote(photo)}`
  const rules = [
    lang === "fr" ? "Réponds en français." : lang === "de" ? "Antworte auf Deutsch (du-Form)." : "Answer in English.",
    "Tu aides un cultivateur dans sa tente, au téléphone : réponse courte (moins de 150 mots), concrète, une seule correction prioritaire si quelque chose cloche.",
    "Appuie-toi sur les données ci-dessous. Si une dose ou une valeur n'y figure pas et n'est pas dans l'Athena Handbook, dis-le au lieu de l'inventer.",
    "Ne mélange jamais deux gammes de nutriments. Cite la source quand tu donnes un chiffre (Athena p. X, repère courant, mesure).",
  ].join(" ")
  const first = `${rules}\n\nDONNÉES DE L'APP (${todayIso()})\n${context}\n\nQUESTION\n${question}`
  const past = history.slice(-MAX_TURNS)
  if (!past.length) return [{ role: "user", content: first }]
  // Data and rules go with the first kept question; later turns are the conversation as it happened.
  const [h0, ...rest] = past[0].role === "user" ? past : past.slice(1)
  if (!h0) return [{ role: "user", content: first }]
  return [{ role: "user", content: `${rules}\n\nDONNÉES DE L'APP\n${context}\n\nQUESTION\n${h0.content}` }, ...rest, { role: "user", content: question }]
}

/** Suggested questions (keys of the dictionary). */
export const ASK_SUGGESTIONS = ["ask.s1", "ask.s2", "ask.s3"] as const
