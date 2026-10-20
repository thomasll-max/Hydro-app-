// The artifact's `sample` capability ("Demander à Claude"). Claude version only; null everywhere else
// (local build, preview, viewer without the capability): the feature is then hidden.
import { useEffect, useState } from "react"
import { TARGET } from "@/store"

export type SampleError = { code?: string; message?: string; text?: string }
export type SampleFn = ((
  input: string | { role: "user" | "assistant"; content: string }[],
  opts?: { onText?: (p: { text: string; delta: string }) => void; signal?: AbortSignal; cache?: boolean; modelTier?: "quick" | "default" | "complex"; images?: Blob[] },
) => Promise<{ text: string; truncated?: boolean }>) &
  Record<string, unknown> & {
    /** What this view may send (lot 12c): `images` only when the artifact declares `sample: {images: true}`. */
    limits?: () => Promise<{ images?: { maxCount: number; maxBytes: number; mediaTypes: string[] } }>
  }

type Runtime = { use(name: string): Promise<unknown> }

let picked: Promise<SampleFn | null> | null = null
export function getSample(): Promise<SampleFn | null> {
  if (picked) return picked
  const rt = TARGET === "artifact" ? (globalThis as { claude?: Runtime }).claude : undefined
  picked = rt && typeof rt.use === "function" ? (rt.use("sample").catch(() => null) as Promise<SampleFn | null>) : Promise.resolve(null)
  return picked
}

/**
 * Whether a photo can go to Claude in this view (lot 12c). The artifact must declare `sample: {images: true}`; until
 * then `limits()` reports no images and every photo button stays hidden.
 */
export function useSampleImages(): { maxBytes: number; mediaTypes: string[] } | null {
  const sample = useSample()
  const [caps, setCaps] = useState<{ maxBytes: number; mediaTypes: string[] } | null>(null)
  useEffect(() => {
    let live = true
    if (!sample?.limits) return setCaps(null)
    sample
      .limits()
      .then((l) => live && setCaps(l?.images ? { maxBytes: l.images.maxBytes, mediaTypes: l.images.mediaTypes } : null))
      .catch(() => live && setCaps(null))
    return () => {
      live = false
    }
  }, [sample])
  return caps
}

/** The sample function once the runtime answers; null while unknown or unavailable. */
export function useSample(): SampleFn | null {
  const [fn, setFn] = useState<SampleFn | null>(null)
  useEffect(() => {
    let live = true
    getSample().then((f) => live && setFn(() => f))
    return () => {
      live = false
    }
  }, [])
  return fn
}
