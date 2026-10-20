// Pure i18n helpers — no React here, so they are unit-testable.
import { fr } from "./fr"
import { en } from "./en"
import { de } from "./de"
import type { Lang, MessageKey, Messages } from "./types"

export const dictionaries: Record<Lang, Messages> = { fr, en, de }
export const locales: Record<Lang, string> = { fr: "fr-FR", en: "en-US", de: "de-DE" }
/** A word put in lower case mid-sentence; German nouns keep their capital (lot 10i). */
export const lowerWord = (lang: Lang, s: string) => (lang === "de" ? s : s.toLowerCase())
/**
 * A phrase put mid-sentence (lot 15c): only its first letter goes to lower case, an acronym (« PPF », « EC ») and the rest
 * keep theirs; German keeps its capitals.
 */
export const lowerFirst = (lang: Lang, s: string) => (lang === "de" || /^\p{Lu}{2}/u.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1))

/** French and German write « 2,4 » (decimal comma), English « 2.4 » (lot 10i). */
export const decimalComma = (lang: Lang) => lang !== "en"

export type Vars = Record<string, string | number>

export function lookup(dict: Messages, key: MessageKey): string {
  let node: unknown = dict
  for (const part of key.split(".")) node = (node as Record<string, unknown>)?.[part]
  return typeof node === "string" ? node : key
}

/** French counts 0 and 1 as singular, English and German only 1. */
export const isSingular = (lang: Lang, n: number) => (lang === "fr" ? Math.abs(n) < 2 : n === 1)

/** `{n}` → the value; `{n|espace|espaces}` → the word agreeing with n (lot 10e: no more "espace(s)"). */
export function interpolate(template: string, vars?: Vars, lang: Lang = "fr"): string {
  if (!vars) return template
  return template.replace(/\{(\w+)(?:\|([^|}]*)\|([^}]*))?\}/g, (m, k: string, one?: string, many?: string) => {
    if (!(k in vars)) return m
    if (one == null) return String(vars[k])
    const n = Number(String(vars[k]).replace(",", "."))
    return isSingular(lang, n) ? one : (many ?? one)
  })
}

export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  return interpolate(lookup(dictionaries[lang], key), vars, lang)
}

/** Every leaf key of a dictionary, dot-separated, sorted. */
export function flattenKeys(obj: object, prefix = ""): string[] {
  return Object.entries(obj)
    .flatMap(([k, v]) => (typeof v === "string" ? [prefix + k] : flattenKeys(v as object, `${prefix}${k}.`)))
    .sort()
}

/** Placeholders like {n} used by a template, sorted. */
export function placeholders(template: string): string[] {
  return [...new Set([...template.matchAll(/\{(\w+)(?:\|[^}]*)?\}/g)].map((m) => m[1]))].sort()
}

const numCache = new Map<string, Intl.NumberFormat>()
/** A stored number as a form shows it ("2,4" in French): no rounding, empty when unknown. */
export function formatInput(lang: Lang, value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return ""
  return decimalComma(lang) ? String(value).replace(".", ",") : String(value)
}

export function formatNumber(lang: Lang, value: number, decimals = 0): string {
  const id = `${lang}:${decimals}`
  let f = numCache.get(id)
  if (!f) {
    f = new Intl.NumberFormat(locales[lang], { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    numCache.set(id, f)
  }
  return f.format(value)
}

/** A range like "5,8–6,2" (fr) or "5.8–6.2" (en). */
export function formatRange(lang: Lang, lo: number, hi: number, decimals = 0): string {
  return `${formatNumber(lang, lo, decimals)}–${formatNumber(lang, hi, decimals)}`
}

/** Short day + month: "18/10" (fr), "18.10." (de), "Oct 18" (en). */
export function formatDayMonth(lang: Lang, d: Date): string {
  if (lang === "en") return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d)
  return new Intl.DateTimeFormat(locales[lang], { day: "2-digit", month: "2-digit" }).format(d)
}

/** Full date with the year: "19/10/2026" (fr), "19.10.2026" (de), "Oct 19, 2026" (en), lot 10e (backups, files). */
export function formatDate(lang: Lang, d: Date): string {
  return new Intl.DateTimeFormat(locales[lang], lang === "en" ? { month: "short", day: "numeric", year: "numeric" } : { day: "2-digit", month: "2-digit", year: "numeric" }).format(d)
}

/** Day and short month: "19 oct." (fr), "19. Okt." (de), "Oct 19" (en). */
export function formatDayShortMonth(lang: Lang, d: Date): string {
  return new Intl.DateTimeFormat(locales[lang], { day: "numeric", month: "short" }).format(d)
}

/** 24 h clock in every language (grow schedules are written that way). */
export function formatTime(lang: Lang, d: Date): string {
  return new Intl.DateTimeFormat(locales[lang], { hour: "2-digit", minute: "2-digit", hour12: false }).format(d)
}
