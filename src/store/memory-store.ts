import { clean, splitPath, type BatchOp, type Doc, type DocStore, type PhotoStore, type Unsub } from "./doc-store"

/** In-memory store with live listeners. Used by tests, and as the base of the local store. */
export class MemoryStore implements DocStore {
  readonly kind: DocStore["kind"] = "memory"
  protected cols = new Map<string, Map<string, Doc>>()
  private docWatchers = new Map<string, Set<(d: Doc | null) => void>>()
  private colWatchers = new Map<string, Set<(d: Record<string, Doc>) => void>>()

  protected col(c: string) {
    let m = this.cols.get(c)
    if (!m) this.cols.set(c, (m = new Map()))
    return m
  }
  protected snapshot(c: string): Record<string, Doc> {
    return Object.fromEntries([...this.col(c)].map(([k, v]) => [k, structuredClone(v)]))
  }
  /** Notifies the watchers of these documents, each collection once. */
  protected emit(...paths: string[]) {
    const cols = new Set<string>()
    for (const path of paths) {
      const { collection, id } = splitPath(path)
      cols.add(collection)
      const d = this.col(collection).get(id) ?? null
      this.docWatchers.get(path)?.forEach((cb) => cb(d && structuredClone(d)))
    }
    for (const c of cols) this.colWatchers.get(c)?.forEach((cb) => cb(this.snapshot(c)))
  }
  /** Applies writes in memory only (persisted elsewhere, or received from another tab). */
  protected apply(ops: readonly BatchOp[]) {
    for (const [path, d] of ops) {
      const { collection, id } = splitPath(path)
      if (d) this.col(collection).set(id, d)
      else this.col(collection).delete(id)
    }
  }
  /** Hook for persistence (local store). Runs BEFORE memory changes: a refused write is never shown. */
  protected async persist(_ops: readonly BatchOp[]): Promise<void> {}

  async get(path: string) {
    const { collection, id } = splitPath(path)
    const d = this.col(collection).get(id)
    return d ? structuredClone(d) : null
  }
  async set(path: string, data: Doc) {
    await this.batch([[path, data]])
  }
  async delete(path: string) {
    await this.batch([[path, null]])
  }
  async batch(ops: readonly BatchOp[]) {
    if (!ops.length) return
    const ready: BatchOp[] = ops.map(([p, d]) => [p, d ? clean(structuredClone(d)) : null])
    await this.persist(ready)
    this.apply(ready)
    this.emit(...ready.map(([p]) => p))
  }
  async list(collection: string) {
    return this.snapshot(collection)
  }
  watchDoc(path: string, cb: (d: Doc | null) => void): Unsub {
    let s = this.docWatchers.get(path)
    if (!s) this.docWatchers.set(path, (s = new Set()))
    s.add(cb)
    this.get(path).then(cb)
    return () => s!.delete(cb)
  }
  watchCollection(collection: string, cb: (docs: Record<string, Doc>) => void): Unsub {
    let s = this.colWatchers.get(collection)
    if (!s) this.colWatchers.set(collection, (s = new Set()))
    s.add(cb)
    queueMicrotask(() => cb(this.snapshot(collection)))
    return () => s!.delete(cb)
  }
}

export class MemoryPhotos implements PhotoStore {
  readonly kind: PhotoStore["kind"] = "memory"
  private blobs = new Map<string, Blob>()
  async upload(blob: Blob) {
    const id = `mem-${this.blobs.size + 1}`
    this.blobs.set(id, blob)
    return id
  }
  async url(id: string) {
    const b = this.blobs.get(id)
    return b ? URL.createObjectURL(b) : ""
  }
  async remove(id: string) {
    this.blobs.delete(id)
  }
  async clear() {
    this.blobs.clear()
  }
}
