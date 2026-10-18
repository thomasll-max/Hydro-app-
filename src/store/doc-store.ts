// Storage abstraction: the same app runs on the claude.ai artifact database
// (Thomas's copy) or fully on the phone (offline build for friends).

export type Doc = Record<string, unknown>
export type Unsub = () => void

export interface DocStore {
  readonly kind: "artifact" | "local" | "memory"
  get(path: string): Promise<Doc | null>
  set(path: string, data: Doc): Promise<void>
  delete(path: string): Promise<void>
  /** All documents of a collection, keyed by id. */
  list(collection: string): Promise<Record<string, Doc>>
  watchDoc(path: string, cb: (d: Doc | null) => void): Unsub
  watchCollection(collection: string, cb: (docs: Record<string, Doc>) => void): Unsub
}

export interface PhotoStore {
  readonly kind: "artifact" | "local" | "memory"
  upload(blob: Blob): Promise<string> // returns photo id
  url(id: string): Promise<string>
  remove(id: string): Promise<void>
  /** Deletes every photo kept on this device (reset). */
  clear?(): Promise<void>
}

/** Split "a/b/c/d" into collection "a/b/c" and id "d". */
export function splitPath(path: string): { collection: string; id: string } {
  const i = path.lastIndexOf("/")
  return { collection: path.slice(0, i), id: path.slice(i + 1) }
}

/** Firestore-like stores reject undefined: drop them (recursively). */
export function clean<T>(v: T): T {
  if (Array.isArray(v)) return v.map(clean) as T
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v)) if (x !== undefined && !(typeof x === "number" && Number.isNaN(x))) o[k] = clean(x)
    return o as T
  }
  return v
}
