import type { DocStore, PhotoStore } from "./doc-store"
import { ArtifactPhotos, ArtifactStore, type ClaudeAssets, type ClaudeDb } from "./artifact-store"
import { LocalPhotos, LocalStore } from "./local-store"

export type Stores = { docs: DocStore; photos: PhotoStore; userId: string | null }

type Runtime = { use(name: string): Promise<unknown> }
const runtime = (): Runtime | null => {
  const c = (globalThis as { claude?: Runtime }).claude
  return c && typeof c.use === "function" ? c : null
}

/** Build target "local" (offline, for friends) never touches the artifact runtime. */
export const TARGET: "artifact" | "local" = import.meta.env.VITE_TARGET === "local" ? "local" : "artifact"

let picked: Promise<Stores> | null = null
export function getStores(): Promise<Stores> {
  if (picked) return picked
  picked = (async () => {
    const rt = TARGET === "artifact" ? runtime() : null
    if (rt) {
      const [db, assets, user] = await Promise.all([
        rt.use("db").catch(() => null) as Promise<ClaudeDb | null>,
        rt.use("assets").catch(() => null) as Promise<ClaudeAssets | null>,
        rt.use("user").catch(() => null) as Promise<{ id(): Promise<string | null> } | null>,
      ])
      if (db) {
        const userId = user ? await user.id().catch(() => null) : null
        return { docs: new ArtifactStore(db), photos: assets ? new ArtifactPhotos(assets) : new LocalPhotos(), userId }
      }
    }
    return { docs: new LocalStore(), photos: new LocalPhotos(), userId: null }
  })()
  return picked
}
