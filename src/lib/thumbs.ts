// Thumbnails of the photos (lot 12b): made once from the photo (≈ 320 px JPEG) and kept on this device in their own
// IndexedDB base « hydro-thumbs » (a cache: rebuilt if it is cleared, never backed up). The gallery asks for them as
// tiles come into view, three at a time. The photo is read as an image, like the page shows it (no fetch: the
// artifact's frame allows images from its assets). A photo that cannot be read any more (a partial backup) is missing.
const DB = "hydro-thumbs"
const STORE = "thumbs"
export const THUMB_SIDE = 320
const AT_ONCE = 3

export type Thumb = { url: string } | { missing: true }

let dbp: Promise<IDBDatabase | null> | null = null
function db(): Promise<IDBDatabase | null> {
  if (!dbp)
    dbp = new Promise((resolve) => {
      try {
        if (typeof indexedDB === "undefined") return resolve(null)
        const req = indexedDB.open(DB, 1)
        req.onupgradeneeded = () => req.result.createObjectStore(STORE)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(null)
        req.onblocked = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  return dbp
}

function op<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return db().then(
    (d) =>
      new Promise<T | undefined>((resolve) => {
        if (!d) return resolve(undefined)
        try {
          const r = fn(d.transaction(STORE, mode).objectStore(STORE))
          r.onsuccess = () => resolve(r.result)
          r.onerror = () => resolve(undefined)
        } catch {
          resolve(undefined)
        }
      }),
  )
}

const urls = new Map<string, string>()
const pending = new Map<string, Promise<Thumb>>()
let running = 0
const waiting: (() => void)[] = []
const slot = () => (running < AT_ONCE ? (running++, Promise.resolve()) : new Promise<void>((r) => waiting.push(() => (running++, r()))))
const release = () => {
  running--
  waiting.shift()?.()
}

/** Loads a photo as an image (the way the page already shows it): null when it is gone (no URL, a 404, unreadable). */
async function load(src: string): Promise<HTMLImageElement | null> {
  if (!src) return null
  const img = new Image()
  img.decoding = "async"
  img.src = src
  try {
    await img.decode()
    return img.naturalWidth ? img : null
  } catch {
    return null
  }
}

async function make(img: HTMLImageElement): Promise<Blob | null> {
  try {
    const k = Math.min(1, THUMB_SIDE / Math.min(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * k))
    const h = Math.max(1, Math.round(img.naturalHeight * k))
    const c = document.createElement("canvas")
    c.width = w
    c.height = h
    c.getContext("2d")!.drawImage(img, 0, 0, w, h)
    return await new Promise((res) => c.toBlob((b) => res(b), "image/jpeg", 0.74))
  } catch {
    return null
  }
}

/**
 * The thumbnail of a photo: from memory, else from the device's cache, else made now from the photo and kept.
 * `full` gives the photo's own URL (the asset of the artifact, the blob of the phone).
 */
export function thumb(id: string, full: (id: string) => Promise<string>): Promise<Thumb> {
  const known = urls.get(id)
  if (known) return Promise.resolve({ url: known })
  const p = pending.get(id)
  if (p) return p
  const run = (async (): Promise<Thumb> => {
    await slot()
    try {
      const kept = await op<Blob>("readonly", (s) => s.get(id) as IDBRequest<Blob>)
      let blob = kept instanceof Blob && kept.size ? kept : null
      if (!blob) {
        const src = await full(id).catch(() => "")
        const img = await load(src)
        if (!img) return { missing: true }
        blob = await make(img)
        // A canvas that cannot be read back: the photo itself stands in, not kept.
        if (!blob) return { url: src }
        await op("readwrite", (s) => s.put(blob!, id))
      }
      const url = URL.createObjectURL(blob)
      urls.set(id, url)
      return { url }
    } finally {
      release()
      pending.delete(id)
    }
  })()
  pending.set(id, run)
  return run
}

/** Whether a photo can still be read (the viewer shows a warning instead of an empty frame). */
export async function photoReadable(src: string): Promise<boolean> {
  return !!(await load(src))
}

/** How many thumbnails this device keeps (tests, and the 300-photo check). */
export function thumbCount(): Promise<number> {
  return op<number>("readonly", (s) => s.count()).then((n) => n ?? 0)
}

/** Forget every thumbnail (« Réinitialiser l'app »). */
export async function clearThumbs(): Promise<void> {
  await op("readwrite", (s) => s.clear())
  for (const u of urls.values()) URL.revokeObjectURL(u)
  urls.clear()
}
