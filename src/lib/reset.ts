// Réinitialiser l'app (lot 8, demande de Thomas): every document of every collection is deleted, and the local photos.
// Display preferences (language, theme) are kept. After a reload the app starts over: Thomas's starting grow in the
// Claude version, the first-launch assistant in the local version.
import type { DocStore, PhotoStore } from "@/store/doc-store"
import { COLLECTIONS } from "@/model/grow"

/** Browser keys kept by a reset (display only). */
const KEEP = new Set(["hydro.ui"])

export async function resetData(store: Pick<DocStore, "list" | "delete">, photos?: Pick<PhotoStore, "clear">, onProgress?: (done: number) => void): Promise<number> {
  let done = 0
  // grow/main last: while it exists the app does not seed a new grow in the middle of the reset.
  const order = [...COLLECTIONS.filter((c) => c !== "grow"), "grow" as const]
  for (const c of order) {
    for (const id of Object.keys(await store.list(c))) {
      await store.delete(`${c}/${id}`)
      done++
      onProgress?.(done)
    }
  }
  await photos?.clear?.()
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith("hydro.") && !KEEP.has(k)) localStorage.removeItem(k)
  } catch {
    /* storage blocked: nothing to clear */
  }
  return done
}
