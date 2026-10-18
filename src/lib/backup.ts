// Backup (spec §11–12, lot 6): the same JSON format in both versions. Every collection, every document as stored
// (schemaVersion included). Photos are referenced by id only (the files stay in the artifact's assets / on the phone).
// Import merges (documents with the same path are replaced) or replaces (documents absent from the file are deleted).
import type { Doc, DocStore } from "@/store/doc-store"
import { COLLECTIONS, type CollectionName } from "@/model/grow"
import type { Entry } from "@/model/types"

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

export type ParseResult = { ok: true; backup: Backup; counts: Partial<Record<CollectionName, number>>; total: number } | { ok: false; error: "json" | "format" | "version" }

/** Reads a backup file. Unknown collections are ignored; documents must be objects. */
export function parseBackup(text: string): ParseResult {
  let o: unknown
  try {
    o = JSON.parse(text)
  } catch {
    return { ok: false, error: "json" }
  }
  const b = o as Partial<Backup>
  if (!b || typeof b !== "object" || b.format !== BACKUP_FORMAT || typeof b.collections !== "object" || !b.collections) return { ok: false, error: "format" }
  if (typeof b.version !== "number" || b.version > BACKUP_VERSION) return { ok: false, error: "version" }
  const collections: Backup["collections"] = {}
  const counts: Partial<Record<CollectionName, number>> = {}
  let total = 0
  for (const c of BACKUP_COLLECTIONS) {
    const docs = (b.collections as Record<string, unknown>)[c]
    if (!docs || typeof docs !== "object") continue
    const ok = Object.fromEntries(Object.entries(docs as Record<string, unknown>).filter(([id, d]) => id && !id.includes("/") && d && typeof d === "object" && !Array.isArray(d))) as Record<string, Doc>
    if (!Object.keys(ok).length) continue
    collections[c] = ok
    counts[c] = Object.keys(ok).length
    total += counts[c]!
  }
  return { ok: true, backup: { format: BACKUP_FORMAT, version: b.version, exportedAt: String(b.exportedAt ?? ""), source: String(b.source ?? ""), collections }, counts, total }
}

export type ImportMode = "merge" | "replace"

/** Writes a backup into a store. "replace" first removes the documents the file does not have. Returns what changed. */
export async function importBackup(store: Pick<DocStore, "list" | "set" | "delete">, backup: Backup, mode: ImportMode, onProgress?: (done: number, total: number) => void) {
  const writes = BACKUP_COLLECTIONS.flatMap((c) => Object.entries(backup.collections[c] ?? {}).map(([id, d]) => [`${c}/${id}`, d] as const))
  const deletes: string[] = []
  if (mode === "replace")
    for (const c of BACKUP_COLLECTIONS) {
      const keep = backup.collections[c] ?? {}
      for (const id of Object.keys(await store.list(c))) if (!(id in keep)) deletes.push(`${c}/${id}`)
    }
  const total = writes.length + deletes.length
  let done = 0
  for (const p of deletes) {
    await store.delete(p)
    onProgress?.(++done, total)
  }
  // grow/main last: on a fresh install its presence means "seeded", so the rest must already be there.
  const ordered = [...writes.filter(([p]) => p !== "grow/main"), ...writes.filter(([p]) => p === "grow/main")]
  for (const [p, d] of ordered) {
    await store.set(p, d)
    onProgress?.(++done, total)
  }
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

const cell = (v: unknown) => {
  if (v == null) return ""
  const s = String(v)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Journal entries as CSV (";" separator, works with French spreadsheets). Space names replace ids. */
export function entriesCsv(entries: Entry[], spaceName: (id: string) => string): string {
  const rows = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.spaceId.localeCompare(b.spaceId))
  const head = CSV_FIELDS.join(";")
  return [head, ...rows.map((e) => CSV_FIELDS.map((f) => cell(f === "spaceId" ? spaceName(e.spaceId) : e[f])).join(";"))].join("\n")
}
