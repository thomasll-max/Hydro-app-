// Backup (spec §11–12, lot 6): the same JSON format in both versions. Every collection, every document as stored
// (schemaVersion included). Photos are referenced by id only (the files stay in the artifact's assets / on the phone).
// Import merges (documents with the same path are replaced) or replaces (documents absent from the file are deleted).
import { writeAll, type BatchOp, type Doc, type DocStore } from "@/store/doc-store"
import { COLLECTIONS, type CollectionName } from "@/model/grow"
import type { Entry } from "@/model/types"
import { validDoc } from "@/model/validate"

export const BACKUP_FORMAT = "hydro-backup"
export const BACKUP_VERSION = 1

export type Backup = {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  /** "artifact" (Thomas's version) or "local" (friends' version): the content is the same. */
  source: string
  collections: Partial<Record<CollectionName, Record<string, Doc>>>
}

/** Collections saved. The morning digest is rebuilt every day: not worth keeping. */
export const BACKUP_COLLECTIONS: CollectionName[] = COLLECTIONS.filter((c) => c !== "digest")
/** Larger files are refused before reading (a real grow weighs well under 1 MB). */
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024

export async function exportBackup(store: Pick<DocStore, "list">, source: string, now = new Date()): Promise<Backup> {
  const collections: Backup["collections"] = {}
  for (const c of BACKUP_COLLECTIONS) {
    const docs = await store.list(c)
    if (Object.keys(docs).length) collections[c] = docs
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), source, collections }
}

export function backupJson(b: Backup): string {
  return JSON.stringify(b, null, 1)
}

/** Every document of every collection as stored, malformed ones included (crash screen). A failed read is noted, not hidden. */
export async function exportRaw(store: Pick<DocStore, "list">, now = new Date()): Promise<string> {
  const collections: Record<string, Record<string, Doc>> = {}
  const errors: Record<string, string> = {}
  for (const c of COLLECTIONS) {
    try {
      collections[c] = await store.list(c)
    } catch (e) {
      errors[c] = String((e as Error)?.message ?? e)
    }
  }
  return JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), source: "raw", collections, ...(Object.keys(errors).length ? { errors } : {}) }, null, 1)
}

export type ParseResult =
  | { ok: true; backup: Backup; counts: Partial<Record<CollectionName, number>>; total: number; /** Malformed documents left out (collection/id). */ skipped: string[] }
  | { ok: false; error: "json" | "format" | "version" | "size" }

/** Ids that would clash with object internals ("__proto__"…) or with paths are never imported. */
const badId = (id: string) => !id || id.includes("/") || id === "__proto__" || id === "constructor" || id === "prototype"

/** Reads a backup file. Unknown collections are ignored; each document is checked like the app checks its data. */
export function parseBackup(text: string): ParseResult {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: "size" }
  let o: unknown
  try {
    o = JSON.parse(text)
  } catch {
    return { ok: false, error: "json" }
  }
  const b = o as Partial<Backup>
  if (!b || typeof b !== "object" || Array.isArray(b) || b.format !== BACKUP_FORMAT || typeof b.collections !== "object" || !b.collections || Array.isArray(b.collections)) return { ok: false, error: "format" }
  if (typeof b.version !== "number" || b.version > BACKUP_VERSION) return { ok: false, error: "version" }
  const collections: Backup["collections"] = {}
  const counts: Partial<Record<CollectionName, number>> = {}
  const skipped: string[] = []
  let total = 0
  for (const c of BACKUP_COLLECTIONS) {
    if (!Object.hasOwn(b.collections, c)) continue
    const docs = (b.collections as Record<string, unknown>)[c]
    if (!docs || typeof docs !== "object" || Array.isArray(docs)) continue
    const ok: Record<string, Doc> = {}
    for (const id of Object.keys(docs)) {
      const d = (docs as Record<string, unknown>)[id]
      if (!badId(id) && validDoc(c, d)) ok[id] = d
      else skipped.push(`${c}/${id}`)
    }
    if (!Object.keys(ok).length) continue
    collections[c] = ok
    counts[c] = Object.keys(ok).length
    total += counts[c]!
  }
  return { ok: true, backup: { format: BACKUP_FORMAT, version: b.version, exportedAt: String(b.exportedAt ?? ""), source: String(b.source ?? ""), collections }, counts, total, skipped }
}

export type ImportMode = "merge" | "replace"

/**
 * Writes a backup into a store. "replace" then removes the documents the file does not have: writes come FIRST, so an
 * interrupted import never leaves less than before. Writes go by batches (one save, one refresh per batch).
 */
export async function importBackup(store: Pick<DocStore, "list" | "set" | "delete" | "batch">, backup: Backup, mode: ImportMode, onProgress?: (done: number, total: number) => void) {
  const writes: BatchOp[] = BACKUP_COLLECTIONS.flatMap((c) => Object.entries(backup.collections[c] ?? {}).map(([id, d]) => [`${c}/${id}`, d] as const))
  const deletes: BatchOp[] = []
  if (mode === "replace")
    for (const c of BACKUP_COLLECTIONS) {
      const keep = backup.collections[c] ?? {}
      for (const id of Object.keys(await store.list(c))) if (!Object.hasOwn(keep, id)) deletes.push([`${c}/${id}`, null])
    }
  const total = writes.length + deletes.length
  // grow/main last among the writes: on a fresh install its presence means "seeded", so the rest must already be there.
  const rest = writes.filter(([p]) => p !== "grow/main")
  const grow = writes.filter(([p]) => p === "grow/main")
  await writeAll(store, rest, (n) => onProgress?.(n, total))
  await writeAll(store, grow, (n) => onProgress?.(rest.length + n, total))
  await writeAll(store, deletes, (n) => onProgress?.(writes.length + n, total))
  return { written: writes.length, deleted: deletes.length }
}

/** File name with the date: hydro-2026-10-18.json */
export const backupName = (date: string, ext = "json") => `hydro-${date}.${ext}`

// ---------- Journal as CSV (spreadsheets) ----------
const CSV_FIELDS: (keyof Entry)[] = [
  "date",
  "spaceId",
  "plantId",
  "tempDay",
  "tempNight",
  "rh",
  "vpd",
  "weightMorningKg",
  "weightPeakKg",
  "dryback",
  "sensorMorningPct",
  "sensorPeakPct",
  "drybackSensor",
  "drybackMethod",
  "volumePerPotMl",
  "shots",
  "runoffMl",
  "runoffPct",
  "ecIn",
  "phIn",
  "ecRunoff",
  "phRunoff",
  "lightPct",
  "lightHeightCm",
  "ppfd",
  "photoperiodH",
  "dli",
  "heightCm",
  "reservoirL",
  "note",
]

/**
 * One CSV cell. Numbers use the decimal comma in French (else a spreadsheet reads "6.2" as a date); text that a
 * spreadsheet would run as a formula (= + - @, tab, CR) is prefixed with an apostrophe.
 */
export function csvCell(v: unknown, lang: "fr" | "en" = "fr"): string {
  if (v == null) return ""
  if (typeof v === "number") return Number.isFinite(v) ? (lang === "fr" ? String(v).replace(".", ",") : String(v)) : ""
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Journal entries as CSV (";" separator, works with French spreadsheets). Space names replace ids. */
export function entriesCsv(entries: Entry[], spaceName: (id: string) => string, lang: "fr" | "en" = "fr"): string {
  const rows = [...entries].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.spaceId).localeCompare(String(b.spaceId)))
  const head = CSV_FIELDS.join(";")
  return [head, ...rows.map((e) => CSV_FIELDS.map((f) => csvCell(f === "spaceId" ? spaceName(e.spaceId) : e[f], lang)).join(";"))].join("\n")
}
