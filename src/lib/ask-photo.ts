// A photo handed from the gallery to « Demander à Claude » (lot 12c): the viewer sets it, the tool takes it once.
import type { AskPhoto } from "@/calc/ask"

export type PendingPhoto = AskPhoto & { id: string }
let pending: PendingPhoto | null = null

export function setPendingPhoto(p: PendingPhoto) {
  pending = p
}

export function takePendingPhoto(): PendingPhoto | null {
  const p = pending
  pending = null
  return p
}
