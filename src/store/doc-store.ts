// Storage abstraction: the same app runs on the claude.ai artifact database
// (Thomas's copy) or fully on the phone (offline build for friends).

export type Doc = Record<string, unknown>
export type Unsub = () => void
/** One write of a batch: a document, or null to delete it. */
export type BatchOp = readonly [path: string, data: Doc | null]

export interface DocStore {
  readonly kind: "artifact" | "local" | "memory"
  get(path: string): Promise<Doc | null>
  set(path: string, data: Doc): Promise<void>
  delete(path: string): Promise<void>
  /** All documents of a collection, keyed by id. Throws when the read fails (never an empty map instead). */
  list(collection: string): Promise<Record<string, Doc>>
  /** Live document. A failed read calls onError, never cb(null): an error is not an empty database. */
  watchDoc(path: string, cb: (d: Doc | null) => void, onError?: (e: unknown) => void): Unsub
  watchCollection(collection: string, cb: (docs: Record<string, Doc>) => void, onError?: (e: unknown) => void): Unsub
  /** Many writes at once (import, reset): one save and one notification per collection when the store can. */
  batch?(ops: readonly BatchOp[]): Promise<void>
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

/** Runs the writes of a batch, `size` at a time (stores without a native batch). */
export async function runBatch(store: Pick<DocStore, "set" | "delete">, ops: readonly BatchOp[], size = 8): Promise<void> {
  for (let i = 0; i < ops.length; i += size) {
    await Promise.all(ops.slice(i, i + size).map(([p, d]) => (d ? store.set(p, d) : store.delete(p))))
  }
}

/** Writes in chunks (with progress): the store's batch when it has one. */
export async function writeAll(store: Pick<DocStore, "set" | "delete" | "batch">, ops: readonly BatchOp[], onProgress?: (done: number) => void, chunk = 200): Promise<void> {
  for (let i = 0; i < ops.length; i += chunk) {
    const part = ops.slice(i, i + chunk)
    if (store.batch) await store.batch(part)
    else await runBatch(store, part)
    onProgress?.(Math.min(ops.length, i + chunk))
  }
}
