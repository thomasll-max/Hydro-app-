import { clean, splitPath, type Doc, type DocStore, type PhotoStore, type Unsub } from "./doc-store"

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
  protected emit(path: string) {
    const { collection, id } = splitPath(path)
    const d = this.col(collection).get(id) ?? null
    this.docWatchers.get(path)?.forEach((cb) => cb(d && structuredClone(d)))
    this.colWatchers.get(collection)?.forEach((cb) => cb(this.snapshot(collection)))
  }
  /** Hook for persistence (local store). */
  protected async persist(_path: string, _data: Doc | null): Promise<void> {}

  async get(path: string) {
    const { collection, id } = splitPath(path)
    const d = this.col(collection).get(id)
    return d ? structuredClone(d) : null
  }
  async set(path: string, data: Doc) {
    const { collection, id } = splitPath(path)
    const d = clean(structuredClone(data))
    this.col(collection).set(id, d)
    await this.persist(path, d)
    this.emit(path)
  }
  async delete(path: string) {
    const { collection, id } = splitPath(path)
    this.col(collection).delete(id)
    await this.persist(path, null)
    this.emit(path)
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
}
