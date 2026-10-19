// Pulvérisation, « Mon mélange » (lot 10k2b): a spray of one's own, described by the user and marked « perso, non
// vérifié ». The app proposes no dose: it multiplies the doses typed per litre by the litres of the sprayer, and puts the
// next spray in the calendar when a frequency is given. IPW (Athena) stays in ipw.ts, unchanged.
import type { Spray, SprayMix, SprayMixItem } from "@/model/grow"
import type { IsoDate } from "@/model/types"
import { addDays } from "./stage"

/** Mixes kept in the grow that have the expected shape (a hand-edited backup never breaks the screen). */
export function validMixes(list: unknown): SprayMix[] {
  if (!Array.isArray(list)) return []
  return list.filter(
    (m): m is SprayMix =>
      !!m && typeof m === "object" && typeof m.id === "string" && typeof m.name === "string" && Array.isArray(m.items) && m.items.every((i: unknown) => !!i && typeof (i as SprayMixItem).name === "string"),
  )
}

/** What to put in the sprayer: each dose typed per litre × the litres (rounded to 0.1); no dose typed → none given. */
export function mixAmounts(mix: Pick<SprayMix, "items">, litres: number): { name: string; unit: SprayMixItem["unit"]; amount?: number }[] {
  return mix.items.map((i) => ({ name: i.name, unit: i.unit, ...(i.dose != null && i.dose > 0 && litres > 0 ? { amount: Math.round(i.dose * litres * 10) / 10 } : {}) }))
}

/** Next spray of a mix in a space: the last one + its frequency. None without a frequency or before the first spray. */
export function nextMixSpray(sprays: Spray[], mix: Pick<SprayMix, "id" | "everyDays">, spaceId: string): IsoDate | null {
  if (!mix.everyDays || mix.everyDays < 1) return null
  const last = sprays.filter((s) => s.product === "mix" && s.mixId === mix.id && s.spaceIds.includes(spaceId)).sort((a, b) => b.date.localeCompare(a.date))[0]
  return last ? addDays(last.date, Math.round(mix.everyDays)) : null
}

/** A mix as typed in its form: the name trimmed, empty product lines left out, the frequency a whole number of days. */
export type MixDraft = { name: string; items: { name: string; dose: string; unit: SprayMixItem["unit"]; productId?: string }[]; every: string; checklist: string; note: string }

export function mixFromDraft(id: string, d: MixDraft, parse: (s: string) => number | undefined): SprayMix | null {
  const name = d.name.trim()
  if (!name) return null
  const items = d.items
    .filter((i) => i.name.trim())
    .map((i): SprayMixItem => {
      const dose = parse(i.dose)
      return { name: i.name.trim(), unit: i.unit, ...(dose != null && dose > 0 ? { dose } : {}), ...(i.productId ? { productId: i.productId } : {}) }
    })
  const every = parse(d.every)
  const checklist = d.checklist
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
  return { id, name, items, ...(every != null && every >= 1 ? { everyDays: Math.round(every) } : {}), ...(checklist.length ? { checklist } : {}), ...(d.note.trim() ? { note: d.note.trim() } : {}) }
}
