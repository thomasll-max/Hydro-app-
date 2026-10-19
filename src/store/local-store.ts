/* eslint-disable @typescript-eslint/no-explicit-any */
// Offline store: everything on the phone, in IndexedDB (documents + photo blobs).
// Used by the stand-alone build for friends, and by the Claude build outside the artifact (previews).
import type { BatchOp, Doc, PhotoStore } from "./doc-store"
import { MemoryStore } from "./memory-store"

const DB_NAME = "hydro"
const DOCS = "docs"
const PHOTOS = "photos"
/** Tabs and the installed app share the data: a write in one is replayed in the others. */
const CHANNEL = "hydro-docs"
/** Some private modes never answer: give up after this, and say so instead of loading forever. */
const OPEN_TIMEOUT_MS = 6000

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"))
    const timer = setTimeout(() => reject(new Error("IndexedDB timeout")), OPEN_TIMEOUT_MS)
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(DB_NAME, 1)
    } catch (e) {
      clearTimeout(timer)
      return reject(e)
    }
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DOCS)
      req.result.createObjectStore(PHOTOS)
    }
    req.onsuccess = () => {
      clearTimeout(timer)
      resolve(req.result)
    }
    req.onerror = () => {
      clearTimeout(timer)
      reject(req.error)
    }
  })
}

function tx<T>(db: IDBDatabase, store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<any>): Promise<T> {
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(store, mode).objectStore(store))
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

/** Several writes in one transaction: all saved, or none. */
function txMany(db: IDBDatabase, ops: readonly BatchOp[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(DOCS, "readwrite")
    const s = t.objectStore(DOCS)
    for (const [path, d] of ops) d ? s.put(d, path) : s.delete(path)
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error ?? new Error("IndexedDB write aborted"))
  })
}

export class LocalStore extends MemoryStore {
  readonly kind = "local" as const
  private ready: Promise<IDBDatabase | null>
  private channel: BroadcastChannel | null = null
  /** IndexedDB could not be opened: the data only lives in memory until the page closes. */
  volatile = false

  constructor() {
    super()
    this.ready = openDb()
      .then(async (db) => {
        const keys = (await tx(db, DOCS, "readonly", (s) => s.getAllKeys())) as string[]
        const vals = (await tx(db, DOCS, "readonly", (s) => s.getAll())) as Doc[]
        this.apply(keys.map((path, i) => [path, vals[i]] as const))
        return db
      })
      .catch(() => {
        this.volatile = true
        return null
      })
    try {
      this.channel = typeof BroadcastChannel === "function" ? new BroadcastChannel(CHANNEL) : null
      this.channel?.addEventListener("message", (ev: MessageEvent<{ ops?: BatchOp[] }>) => {
        const ops = ev.data?.ops
        if (!Array.isArray(ops)) return
        this.ready.then(() => {
          this.apply(ops)
          this.emit(...ops.map(([p]) => p))
        })
      })
    } catch {
      this.channel = null
    }
  }
  /** Resolves once the documents are loaded; true when nothing can be saved on this device. */
  async status(): Promise<{ volatile: boolean }> {
    await this.ready
    return { volatile: this.volatile }
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
  protected override async persist(ops: readonly BatchOp[]) {
    const db = await this.ready
    if (!db) return // volatile: memory only (the app shows a warning)
    await txMany(db, ops)
    try {
      this.channel?.postMessage({ ops })
    } catch {
      /* another tab will see it at its next load */
    }
  }
}

export class LocalPhotos implements PhotoStore {
  readonly kind = "local" as const
  private db = (() => {
    const p = openDb()
    p.catch(() => {}) // reported by the call that needs it
    return p
  })()
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
    const u = this.urls.get(id)
    if (u) URL.revokeObjectURL(u)
    this.urls.delete(id)
  }
  async clear() {
    await tx(await this.db, PHOTOS, "readwrite", (s) => s.clear())
    for (const u of this.urls.values()) URL.revokeObjectURL(u)
    this.urls.clear()
  }
}
