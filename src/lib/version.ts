// Version de l'app (lot 8e) : commit court + date du build, injectés au build (vite.config.ts → __HYDRO_BUILD__).
// Version locale : version.json (jamais mis en cache) dit si une version plus récente est en ligne.
export type BuildInfo = {
  commit: string
  /** ISO date of the build. */
  builtAt: string
  /** Built from uncommitted changes on top of `commit` (shown as "+"). */
  dirty?: boolean
}

declare const __HYDRO_BUILD__: BuildInfo | undefined
export const CURRENT_BUILD: BuildInfo = typeof __HYDRO_BUILD__ !== "undefined" ? __HYDRO_BUILD__ : { commit: "dev", builtAt: "" }

export const VERSION_FILE = "version.json"
export const CHECK_EVERY_MS = 30 * 60 * 1000

/** version.json as fetched (anything else → null). */
export function parseBuildInfo(raw: unknown): BuildInfo | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  if (typeof o.commit !== "string" || !o.commit || typeof o.builtAt !== "string" || Number.isNaN(Date.parse(o.builtAt))) return null
  return { commit: o.commit, builtAt: o.builtAt, ...(o.dirty === true ? { dirty: true } : {}) }
}

/** A later build is online (an older or identical version.json, e.g. from a stale cache, never asks to update). */
export function isNewerBuild(current: BuildInfo, remote: BuildInfo | null): boolean {
  if (!remote) return false
  const a = Date.parse(current.builtAt)
  const b = Date.parse(remote.builtAt)
  if (Number.isNaN(b)) return false
  return Number.isNaN(a) ? false : b > a
}

/** "3cdf83c · 18/10/2026 21:40" ("+" after the commit for a build with uncommitted changes). */
export function formatVersion(b: BuildInfo, locale: string, timeZone?: string): string {
  const id = `${b.commit}${b.dirty ? "+" : ""}`
  const t = Date.parse(b.builtAt)
  if (Number.isNaN(t)) return id
  const date = new Date(t).toLocaleString(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", ...(timeZone ? { timeZone } : {}) })
  return `${id} · ${date.replace(",", "")}`
}
