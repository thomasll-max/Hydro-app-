// Settings model (db path: settings/main). Pure functions only.
import type { Lang } from "@/i18n/types"

export const SETTINGS_PATH = "settings/main"
export const SETTINGS_SCHEMA = 1
export const LOCAL_KEY = "hydro.ui" // localStorage: instant theme + language before db answers

export type ThemePref = "light" | "dark" | "system"

export type Settings = {
  schemaVersion: number
  theme: ThemePref
  lang: Lang
  activeCycleId?: string
  /** Space selector at the top: "all", "site:{id}" or a space id. Remembered. */
  space?: string
  /** Pro Line dosing: 0 = weighed powder (g), else concentrate strength in g/L (Athena: 113, 226 recommended, 282). */
  concentrate?: number
  updatedAt: string
}

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: SETTINGS_SCHEMA,
  theme: "system",
  lang: "fr",
  updatedAt: "1970-01-01T00:00:00.000Z",
}

const THEMES: ThemePref[] = ["light", "dark", "system"]

/** Accept anything (db doc, localStorage JSON) and return a valid Settings. */
export function parseSettings(raw: unknown): Settings {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  return {
    schemaVersion: SETTINGS_SCHEMA,
    theme: THEMES.includes(o.theme as ThemePref) ? (o.theme as ThemePref) : DEFAULT_SETTINGS.theme,
    lang: o.lang === "en" || o.lang === "fr" ? o.lang : DEFAULT_SETTINGS.lang,
    activeCycleId: typeof o.activeCycleId === "string" ? o.activeCycleId : undefined,
    space: typeof o.space === "string" && o.space ? o.space : undefined,
    concentrate: [0, 113, 226, 282].includes(o.concentrate as number) ? (o.concentrate as number) : undefined,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : DEFAULT_SETTINGS.updatedAt,
  }
}

/** Newest wins, so a change made on the phone is not undone by an older copy. */
export function newer(a: Settings, b: Settings): Settings {
  return Date.parse(b.updatedAt) > Date.parse(a.updatedAt) ? b : a
}

/** Theme actually shown: explicit choice, else the system / host preference. */
export function resolveTheme(pref: ThemePref, systemDark: boolean): "light" | "dark" {
  return pref === "system" ? (systemDark ? "dark" : "light") : pref
}

