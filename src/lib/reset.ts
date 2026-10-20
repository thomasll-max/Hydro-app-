// Réinitialiser l'app (lot 8, demande de Thomas): every document of every collection is deleted, and the photos.
// Display preferences (language, theme) are kept. After a reload the app starts over: Thomas's starting grow in the
// Claude version, the first-launch assistant in the local version.
import { writeAll, type BatchOp, type DocStore, type PhotoStore } from "@/store/doc-store"
import { COLLECTIONS } from "@/model/grow"
import { clearThumbs } from "./thumbs"

/** Browser keys kept by a reset (display only). */
const KEEP = new Set(["hydro.ui"])

/** Photo ids referenced by the journal (the artifact's assets have no "delete all"). */
export function photoIds(entries: Record<string, unknown>): string[] {
  const ids = new Set<string>()
  for (const e of Object.values(entries)) {
    const p = (e as { photos?: unknown })?.photos
    if (Array.isArray(p)) for (const id of p) if (typeof id === "string" && id) ids.add(id)
  }
  return [...ids]
}

export async function resetData(
  store: Pick<DocStore, "list" | "delete" | "set" | "batch">,
  photos?: Pick<PhotoStore, "clear" | "remove">,
  onProgress?: (done: number) => void,
): Promise<number> {
  // Read everything first: a failed read stops the reset before anything is deleted.
  const ops: BatchOp[] = []
  let entries: Record<string, unknown> = {}
  for (const c of COLLECTIONS.filter((x) => x !== "grow")) {
    const docs = await store.list(c)
    if (c === "entries") entries = docs
    for (const id of Object.keys(docs)) ops.push([`${c}/${id}`, null])
  }
  const grow = Object.keys(await store.list("grow")).map((id) => [`grow/${id}`, null] as const)
  // Photos: all at once on the phone; one by one in the artifact (ids from the journal). A failed one is skipped.
  if (photos?.clear) await photos.clear()
  else if (photos?.remove) for (const id of photoIds(entries)) await photos.remove(id).catch(() => {})
  // The thumbnails kept on this device (lot 12b) go with them.
  await clearThumbs().catch(() => {})
  await writeAll(store, ops, onProgress)
  // grow/main last: while it exists the app does not seed a new grow in the middle of the reset.
  await writeAll(store, grow, (n) => onProgress?.(ops.length + n))
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith("hydro.") && !KEEP.has(k)) localStorage.removeItem(k)
  } catch {
    /* storage blocked: nothing to clear */
  }
  return ops.length + grow.length
}
