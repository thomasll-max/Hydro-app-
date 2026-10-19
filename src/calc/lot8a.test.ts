import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { MemoryStore } from "@/store/memory-store"
import { resetData } from "@/lib/reset"
import { backupDue } from "@/lib/backup-reminder"
import { backupJson, exportBackup, importBackup, parseBackup } from "@/lib/backup"
import { seedDocs, thomasGrow } from "@/data/thomas-grow"
import { COLLECTIONS } from "@/model/grow"

const NOW = "2026-10-18T06:00:00.000Z"
const root = path.resolve(import.meta.dirname, "../..")

async function filled() {
  const s = new MemoryStore()
  for (const [p, d] of seedDocs(thomasGrow(NOW, "2026-10-18"))) await s.set(p, d)
  await s.set("entries/2026-10-18_floraison", { id: "2026-10-18_floraison", date: "2026-10-18", spaceId: "floraison" })
  return s
}

describe("lot 8 — réinitialiser", () => {
  it("efface tous les documents de toutes les collections, le grow en dernier", async () => {
    const s = await filled()
    const order: string[] = []
    const spy = { list: (c: string) => s.list(c), set: (p: string, d: Record<string, unknown>) => s.set(p, d), delete: async (p: string) => (order.push(p), s.delete(p)) }
    const n = await resetData(spy)
    expect(n).toBeGreaterThan(20)
    for (const c of COLLECTIONS) expect(Object.keys(await s.list(c))).toHaveLength(0)
    expect(order[order.length - 1]).toBe("grow/main")
  })
})

describe("lot 8 — d'une app à l'autre", () => {
  it("une sauvegarde copiée depuis la version Claude se colle dans une app locale vide (même format)", async () => {
    const claude = await filled()
    const text = backupJson(await exportBackup(claude, "artifact"))
    const local = new MemoryStore()
    const p = parseBackup(text)
    expect(p.ok).toBe(true)
    if (!p.ok) return
    await importBackup(local, p.backup, "replace")
    expect(Object.keys(await local.list("spaces")).sort()).toEqual(["colonne", "floraison"])
    expect((await local.get("grow/main"))?.name).toBe("Grow de Thomas")
  })
})

describe("lot 8 — rappel de sauvegarde (version locale)", () => {
  it("dû sans sauvegarde ou après 7 jours, jamais sans données", () => {
    expect(backupDue(null, "2026-10-18", true)).toEqual({ due: true, days: null })
    expect(backupDue("2026-10-12", "2026-10-18", true)).toEqual({ due: false, days: 6 })
    expect(backupDue("2026-10-11", "2026-10-18", true)).toEqual({ due: true, days: 7 })
    expect(backupDue(null, "2026-10-18", false).due).toBe(false)
  })
})

describe("lot 8 — version locale installable", () => {
  it("manifeste, icônes, service worker et Netlify en place", () => {
    const m = JSON.parse(fs.readFileSync(path.join(root, "pwa/manifest.webmanifest"), "utf8"))
    expect(m).toMatchObject({ name: "Hydro", display: "standalone", start_url: "./" })
    for (const i of m.icons) expect(fs.existsSync(path.join(root, "pwa", i.src))).toBe(true)
    expect(fs.readFileSync(path.join(root, "pwa/sw.js"), "utf8")).toContain("caches.match")
    const toml = fs.readFileSync(path.join(root, "netlify.toml"), "utf8")
    expect(toml).toContain('command = "npm run build:local"')
    expect(toml).toContain('publish = "dist-local"')
  })
})
