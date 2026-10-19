// Store backed by the claude.ai artifact runtime: `db` for documents, `assets` for photos.
import { clean, runBatch, splitPath, type BatchOp, type Doc, type DocStore, type PhotoStore } from "./doc-store"

type Snap = { id: string; exists: boolean; data(): Doc | undefined }
type QSnap = { docs: Snap[] }
type DocRef = {
  get(): Promise<Snap>
  set(d: Doc): Promise<void>
  delete(): Promise<void>
  onSnapshot(n: (s: Snap) => void, e?: (err: unknown) => void): () => void
}
type ColRef = { get(): Promise<QSnap>; onSnapshot(n: (s: QSnap) => void, e?: (err: unknown) => void): () => void }
export type ClaudeDb = { doc(p: string): DocRef; collection(p: string): ColRef }
export type ClaudeAssets = {
  upload(b: Blob, o?: { type?: string }): Promise<{ id: string; url: string }>
  delete(id: string): Promise<unknown>
}

/** Whatever the runtime hands back, cleanup never throws. */
function safeUnsub(u: unknown): () => void {
  return () => {
    try {
      if (typeof u === "function") u()
      else if (u && typeof (u as Promise<unknown>).then === "function") (u as Promise<unknown>).then((f) => typeof f === "function" && f())
    } catch {
      /* ignore */
    }
  }
}

const toMap = (q: QSnap) => Object.fromEntries(q.docs.filter((d) => d.exists).map((d) => [d.id, d.data() ?? {}]))

/** The runtime retries "unavailable" once on its own advice (db.d.ts): a short randomized delay, then one more try. */
async function once<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    if ((e as { code?: string })?.code !== "unavailable") throw e
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 500))
    return fn()
  }
}

export class ArtifactStore implements DocStore {
  readonly kind = "artifact" as const
  constructor(private db: ClaudeDb) {}
  async get(path: string) {
    const s = await once(() => this.db.doc(path).get())
    return s.exists ? (s.data() ?? null) : null
  }
  async set(path: string, data: Doc) {
    await once(() => this.db.doc(path).set(clean(data)))
  }
  async delete(path: string) {
    await once(() => this.db.doc(path).delete())
  }
  /** A failed read throws: export, reset and import must never take an error for an empty collection. */
  async list(collection: string) {
    return toMap(await once(() => this.db.collection(collection).get()))
  }
  async batch(ops: readonly BatchOp[]) {
    await runBatch(this, ops)
  }
  watchDoc(path: string, cb: (d: Doc | null) => void, onError?: (e: unknown) => void) {
    return safeUnsub(this.db.doc(path).onSnapshot((s) => cb(s.exists ? (s.data() ?? null) : null), (e) => onError?.(e)))
  }
  watchCollection(collection: string, cb: (d: Record<string, Doc>) => void, onError?: (e: unknown) => void) {
    return safeUnsub(this.db.collection(collection).onSnapshot((q) => cb(toMap(q)), (e) => onError?.(e)))
  }
  /** Path of a document inside a collection (both sides of splitPath). */
  static path(collection: string, id: string) {
    return `${collection}/${id}`
  }
  static split = splitPath
}

export class ArtifactPhotos implements PhotoStore {
  readonly kind = "artifact" as const
  constructor(private assets: ClaudeAssets) {}
  async upload(blob: Blob) {
    const r = await this.assets.upload(blob, { type: blob.type || "image/jpeg" })
    return r.id
  }
  async url(id: string) {
    return `/_blob/${id}`
  }
  async remove(id: string) {
    await this.assets.delete(id)
  }
}
