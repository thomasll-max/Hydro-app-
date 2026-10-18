/* eslint-disable @typescript-eslint/no-explicit-any */
// Offline store: everything on the phone, in IndexedDB (documents + photo blobs).
// Used by the stand-alone build for friends, and as a fallback when the artifact db is unavailable.
import type { Doc, PhotoStore } from "./doc-store"
import { MemoryStore } from "./memory-store"

const DB_NAME = "hydro"
const DOCS = "docs"
const PHOTOS = "photos"

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DOCS)
      req.result.createObjectStore(PHOTOS)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(db: IDBDatabase, store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<any>): Promise<T> {
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(store, mode).objectStore(store))
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

export class LocalStore extends MemoryStore {
  readonly kind = "local" as const
  private ready: Promise<IDBDatabase>

  constructor() {
    super()
    this.ready = openDb().then(async (db) => {
      const keys = (await tx(db, DOCS, "readonly", (s) => s.getAllKeys())) as string[]
      const vals = (await tx(db, DOCS, "readonly", (s) => s.getAll())) as Doc[]
      keys.forEach((path, i) => {
        const j = path.lastIndexOf("/")
        this.col(path.slice(0, j)).set(path.slice(j + 1), vals[i])
      })
      return db
    })
  }
  override async get(path: string) {
    await this.ready
    return super.get(path)
  }
  override async list(c: string) {
    await this.ready
    return super.list(c)
  }
  override watchDoc(path: string, cb: (d: Doc | null) => void) {
    let un = () => {}
    let live = true
    this.ready.then(() => live && (un = super.watchDoc(path, cb)))
    return () => {
      live = false
      un()
    }
  }
  override watchCollection(c: string, cb: (d: Record<string, Doc>) => void) {
    let un = () => {}
    let live = true
    this.ready.then(() => live && (un = super.watchCollection(c, cb)))
    return () => {
      live = false
      un()
    }
  }
  protected override async persist(path: string, data: Doc | null) {
    const db = await this.ready
    await tx(db, DOCS, "readwrite", (s) => (data ? s.put(data, path) : s.delete(path)))
  }
}

export class LocalPhotos implements PhotoStore {
  readonly kind = "local" as const
  private db = openDb()
  private urls = new Map<string, string>()
  async upload(blob: Blob) {
    const id = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    await tx(await this.db, PHOTOS, "readwrite", (s) => s.put(blob, id))
    return id
  }
  async url(id: string) {
    const cached = this.urls.get(id)
    if (cached) return cached
    const b = (await tx(await this.db, PHOTOS, "readonly", (s) => s.get(id))) as Blob | undefined
    if (!b) return ""
    const u = URL.createObjectURL(b)
    this.urls.set(id, u)
    return u
  }
  async remove(id: string) {
    await tx(await this.db, PHOTOS, "readwrite", (s) => s.delete(id))
  }
  async clear() {
    await tx(await this.db, PHOTOS, "readwrite", (s) => s.clear())
    for (const u of this.urls.values()) URL.revokeObjectURL(u)
    this.urls.clear()
  }
}
