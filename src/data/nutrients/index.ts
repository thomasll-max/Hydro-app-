// Registry of nutrient lines. Other brands plug in here as new catalogs (lot 7).
import { ATHENA_BLENDED } from "./athena-blended"
import { ATHENA_PRO } from "./athena-pro"
import type { NutrientCatalog } from "./types"

export * from "./types"
export { ATHENA_PRO, PRO_CONCENTRATES, PRO_GRAMS } from "./athena-pro"
export { ATHENA_BLENDED } from "./athena-blended"
export { ADDONS, BALANCE_STEP, CLEANSE_FLUSH, IPW, balanceStepMl } from "./addons"

export const CATALOGS: Record<string, NutrientCatalog> = { [ATHENA_PRO.id]: ATHENA_PRO, [ATHENA_BLENDED.id]: ATHENA_BLENDED }
export const DEFAULT_LINE = ATHENA_PRO.id

export const getCatalog = (id?: string): NutrientCatalog => CATALOGS[id ?? DEFAULT_LINE] ?? ATHENA_PRO

/** Lines offered in the menus. Blended stays hidden in Thomas's (Claude) version until the friends' version (lot 8). */
export function visibleCatalogs(target: "artifact" | "local"): NutrientCatalog[] {
  return target === "local" ? Object.values(CATALOGS) : [ATHENA_PRO]
}
