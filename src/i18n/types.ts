import type { fr } from "./fr"

/** Same shape as the French dictionary, every leaf a string. */
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }
export type Messages = Widen<typeof fr>

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>
}[keyof T & string]
export type MessageKey = Leaves<Messages>

export type Lang = "fr" | "en" | "de"
export const LANGS: Lang[] = ["fr", "en", "de"]
export const isLang = (v: unknown): v is Lang => LANGS.includes(v as Lang)
