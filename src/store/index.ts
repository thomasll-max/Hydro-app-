import type { DocStore, PhotoStore } from "./doc-store"
import { ArtifactPhotos, ArtifactStore, type ClaudeAssets, type ClaudeDb } from "./artifact-store"
import { LocalPhotos, LocalStore } from "./local-store"

export type Stores = {
  docs: DocStore
  photos: PhotoStore
  userId: string | null
  /** Claude version: false when the viewer is not the owner (the 17 db rules let only the owner read). null = not told. */
  owner: boolean | null
  /** Local store whose IndexedDB could not be opened: nothing is kept after the page closes. */
  volatile: boolean
}

/** The artifact runtime is there but its database is not: never fall back on a store the owner would not see. */
export class StoreUnavailable extends Error {
  constructor() {
    super("db unavailable")
    this.name = "StoreUnavailable"
  }
}

type Runtime = { use(name: string): Promise<unknown> }
type User = { id(): Promise<string | null>; isOwner?(): Promise<boolean> }
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
        rt.use("user").catch(() => null) as Promise<User | null>,
      ])
      if (!db) throw new StoreUnavailable()
      const userId = user ? await user.id().catch(() => null) : null
      const owner = user && typeof user.isOwner === "function" ? await user.isOwner().catch(() => null) : null
      return { docs: new ArtifactStore(db), photos: assets ? new ArtifactPhotos(assets) : new LocalPhotos(), userId, owner, volatile: false }
    }
    const docs = new LocalStore()
    const { volatile } = await docs.status()
    return { docs, photos: new LocalPhotos(), userId: null, owner: null, volatile }
  })()
  // A failure is not cached: "Réessayer" asks the runtime again.
  picked.catch(() => {
    picked = null
  })
  return picked
}
