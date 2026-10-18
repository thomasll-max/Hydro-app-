// The artifact's `sample` capability ("Demander à Claude"). Claude version only; null everywhere else
// (local build, preview, viewer without the capability): the feature is then hidden.
import { useEffect, useState } from "react"
import { TARGET } from "@/store"

export type SampleError = { code?: string; message?: string; text?: string }
export type SampleFn = ((input: string | { role: "user" | "assistant"; content: string }[], opts?: { onText?: (p: { text: string; delta: string }) => void; signal?: AbortSignal; cache?: boolean; modelTier?: "quick" | "default" | "complex" }) => Promise<{ text: string; truncated?: boolean }>) & Record<string, unknown>

type Runtime = { use(name: string): Promise<unknown> }

let picked: Promise<SampleFn | null> | null = null
export function getSample(): Promise<SampleFn | null> {
  if (picked) return picked
  const rt = TARGET === "artifact" ? (globalThis as { claude?: Runtime }).claude : undefined
  picked = rt && typeof rt.use === "function" ? (rt.use("sample").catch(() => null) as Promise<SampleFn | null>) : Promise.resolve(null)
  return picked
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
