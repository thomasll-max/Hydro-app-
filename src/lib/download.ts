// Hands a generated file to the user. Claude version: the artifact's `downloads` capability (the viewer
// confirms; .ics is not on its allowlist, so the caller passes a .zip). Local version: a plain download link.
import { TARGET } from "@/store"

export type SaveOutcome = "saved" | "declined" | "unavailable"

type Downloads = { save(r: { filename: string; data: Blob | string }): Promise<unknown> }
type Runtime = { use(name: string): Promise<unknown> }

export async function canDownload(): Promise<boolean> {
  if (TARGET === "local") return true
  const rt = (globalThis as { claude?: Runtime }).claude
  if (!rt || typeof rt.use !== "function") return typeof document !== "undefined"
  return !!(await rt.use("downloads").catch(() => null))
}

export async function saveFile(filename: string, data: Blob): Promise<SaveOutcome> {
  const rt = TARGET === "artifact" ? (globalThis as { claude?: Runtime }).claude : undefined
  if (rt && typeof rt.use === "function") {
    const dl = (await rt.use("downloads").catch(() => null)) as Downloads | null
    if (!dl) return "unavailable"
    try {
      await dl.save({ filename, data })
      return "saved"
    } catch (e) {
      return (e as { code?: string })?.code === "declined" ? "declined" : "unavailable"
    }
  }
  try {
    const url = URL.createObjectURL(data)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return "saved"
  } catch {
    return "unavailable"
  }
}
