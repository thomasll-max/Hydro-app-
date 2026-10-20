// Athena products outside the Handbook (lot 14b). Sources: docs/athena-fiche.md, « Compléments hors Handbook ».
// Stack: the official Stack page (https://store.athenaag.com/stack/, read on 20/10/2026); doses written per US gallon,
// converted (1 gal = 3.785 L) and shown with their original unit. Proper and Cuts: no dose published by Athena — the app
// offers them, the dose and the weeks come from the grower's label only: no value of theirs anywhere in the code.
import type { IsoDate } from "@/model/types"

export const GALLON_L = 3.785

/** mL per US gallon → mL per litre (exact; shown rounded to 2 decimals and marked « converti »). */
export const perGalToPerL = (mlPerGal: number) => mlPerGal / GALLON_L

export const STACK = {
  id: "stack",
  name: "Stack",
  url: "https://store.athenaag.com/stack/",
  readOn: "2026-10-20" as IsoDate,
  /** In the tank (root drench): 1–2 mL per gallon, once a week, in that week's tank, added last; safe for irrigation. */
  drench: { mlPerGal: [1, 2] as [number, number], perWeek: 1 },
  /** Foliar: 7 mL per gallon, once a week, lights off, dry before lights on, not after flowering week 3. */
  foliar: { mlPerGal: 7, perWeek: 1 },
  /** From the last week of veg to flowering week 3 (the official page; resellers' « week 4–5 » is not followed). */
  lastFlowerWeek: 3,
  /** Organic ingredients: may separate, shake well; may go by hand (lot 7b rule). */
  organic: true,
} as const

/** How Stack is given, chosen by the grower: in the tank (last), by hand in the watering can, or sprayed. */
export type StackUse = "tank" | "hand" | "foliar"
export const STACK_USES: StackUse[] = ["tank", "hand", "foliar"]

/** Athena products with no published dose: offered, the dose typed from the label (« dose de l'étiquette, saisie par toi »). */
export type LabelOnlyId = "proper" | "cuts"
export const LABEL_ONLY: { id: LabelOnlyId; name: string; lines: string[]; stage?: "clone" }[] = [
  { id: "proper", name: "Proper", lines: ["athena-pro", "athena-blended"] },
  { id: "cuts", name: "Cuts", lines: ["athena-blended"], stage: "clone" },
]
