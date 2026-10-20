// Minimal shape checks per collection (lot 10a). A malformed document (hand-edited backup, old bug) must never
// block the app: it is left aside — never deleted — and the rest renders. The same checks filter an import.
import type { CollectionName } from "./grow"

type Doc = Record<string, unknown>
const str = (v: unknown) => typeof v === "string"
const iso = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v)
const obj = (v: unknown) => !!v && typeof v === "object" && !Array.isArray(v)
/** Optional field: absent, or of the right kind. */
const opt = (v: unknown, ok: (x: unknown) => boolean) => v == null || ok(v)
const arr = (v: unknown) => Array.isArray(v)
const strArr = (v: unknown) => Array.isArray(v) && v.every(str)

const CHECKS: Record<CollectionName, (d: Doc) => boolean> = {
  grow: (d) => opt(d.name, str) && opt(d.nutrition, obj) && opt(d.digestTime, str) && opt(d.timeZone, str) && opt(d.ownerName, str),
  sites: (d) => str(d.name) && opt(d.order, num),
  spaces: (d) => str(d.name) && obj(d.modules) && opt(d.order, num) && opt(d.template, str) && opt(d.color, str) && opt(d.irrigation, obj) && opt(d.light, obj) && opt(d.nutrition, obj),
  cycles: (d) => str(d.name) && strArr(d.cultivars) && opt(d.spaceId, str) && opt(d.transfers, arr) && opt(d.createdAt, str) && opt(d.harvest, obj) && opt(d.sensor, obj),
  groups: (d) => str(d.cycleId) && opt(d.name, str),
  plants: (d) => str(d.cycleId) && str(d.label) && opt(d.cultivar, str),
  entries: (d) => iso(d.date) && str(d.spaceId) && opt(d.observations, arr) && opt(d.actions, arr) && opt(d.photos, strArr) && opt(d.note, str) && opt(d.targets, obj) && opt(d.dictation, str) && opt(d.source, str),
  events: (d) => iso(d.date) && str(d.type) && opt(d.products, arr) && opt(d.note, str),
  mixes: (d) => iso(d.date) && num(d.volumeL) && opt(d.items, arr) && opt(d.spaceIds, strArr),
  reminders: (d) => str(d.start) && opt(d.title, str) && opt(d.done, strArr) && opt(d.snoozed, obj),
  concentrateStocks: (d) => str(d.productId) && iso(d.madeOn) && str(d.line) && num(d.gPerL) && num(d.litresMade),
  sprays: (d) => iso(d.date) && strArr(d.spaceIds) && str(d.product),
  customProducts: (d) => str(d.name),
  equipment: (d) => str(d.name) && str(d.type),
  equipmentAssignments: (d) => str(d.equipmentId) && iso(d.from) && opt(d.to, str) && (d.spaceId === null || opt(d.spaceId, str)),
  settings: () => true,
  digest: () => true,
}

/** True when the document can be read by the app. `id`, when present, must be a string. */
export function validDoc(c: CollectionName, d: unknown): d is Doc {
  if (!obj(d)) return false
  const doc = d as Doc
  if (doc.id != null && !str(doc.id)) return false
  return CHECKS[c](doc)
}

/** Documents of a collection the app can read, with their id; the others are only counted. */
export function readable<T>(c: CollectionName, docs: Record<string, unknown> | undefined): { list: T[]; bad: string[] } {
  const list: T[] = []
  const bad: string[] = []
  for (const [id, d] of Object.entries(docs ?? {})) {
    if (validDoc(c, d)) list.push((d.id == null ? { ...d, id } : d) as T)
    else bad.push(`${c}/${id}`)
  }
  return { list, bad }
}

/** Sort helpers that never throw on a missing field. */
export const byStr = (a: unknown, b: unknown) => String(a ?? "").localeCompare(String(b ?? ""))
