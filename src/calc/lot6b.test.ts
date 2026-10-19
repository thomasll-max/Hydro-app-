import { describe, expect, it } from "vitest"
import { MemoryStore } from "@/store/memory-store"
import { backupJson, BACKUP_COLLECTIONS, entriesCsv, exportBackup, importBackup, parseBackup } from "@/lib/backup"
import { seedDocs, thomasGrow, FLOWER_ID } from "@/data/thomas-grow"
import { askContext, askPrompt, MAX_TURNS } from "./ask"
import { dayTargets } from "./targets"
import type { Entry } from "@/model/types"

const NOW = "2026-10-18T06:00:00.000Z"
const TODAY = "2026-10-18"
const entry = (date: string, p: Partial<Entry> = {}): Entry => ({ schemaVersion: 2, id: `${date}_${FLOWER_ID}`, date, spaceId: FLOWER_ID, createdAt: NOW, updatedAt: NOW, ...p })

async function filled() {
  const s = new MemoryStore()
  for (const [p, d] of seedDocs(thomasGrow(NOW, TODAY))) await s.set(p, d)
  await s.set(`entries/${TODAY}_${FLOWER_ID}`, entry(TODAY, { dryback: 42, ecRunoff: 4.4, note: 'pH ; "runoff" ok', targets: { stage: "veg", dryback: { lo: 25, hi: 50 } } }))
  await s.set("mixes/m1", { schemaVersion: 4, id: "m1", date: TODAY, volumeL: 100, spaceIds: [FLOWER_ID], items: [{ id: "proGrow", qty: 900, unit: "mL", concentrate: 226 }], createdAt: NOW })
  await s.set("digest/latest", { date: TODAY })
  return s
}
const dump = async (s: MemoryStore) => Object.fromEntries(await Promise.all(BACKUP_COLLECTIONS.map(async (c) => [c, await s.list(c)] as const)))

describe("lot 6 — sauvegarde JSON", () => {
  it("export puis import JSON → données identiques", async () => {
    const a = await filled()
    const text = backupJson(await exportBackup(a, "artifact", new Date(NOW)))
    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const b = new MemoryStore()
    const r = await importBackup(b, parsed.backup, "merge")
    expect(r.deleted).toBe(0)
    expect(await dump(b)).toEqual(await dump(a))
    // And again: export of the copy = export of the original (except the date).
    const again = await exportBackup(b, "artifact", new Date(NOW))
    expect(backupJson(again)).toBe(text)
  })
  it("le résumé du digest du matin n'est pas sauvegardé (reconstruit chaque jour)", async () => {
    const b = await exportBackup(await filled(), "local")
    expect(b.collections.digest).toBeUndefined()
    expect(Object.keys(b.collections.spaces!)).toEqual(expect.arrayContaining(["floraison", "colonne"]))
  })
  it("remplacer : supprime ce qui n'est pas dans le fichier ; fusionner : le garde", async () => {
    const a = await filled()
    const backup = await exportBackup(a, "artifact")
    const b = await filled()
    await b.set("entries/2026-10-19_extra", entry("2026-10-19"))
    await importBackup(b, backup, "merge")
    expect((await b.list("entries"))["2026-10-19_extra"]).toBeDefined()
    const r = await importBackup(b, backup, "replace")
    expect(r.deleted).toBe(1)
    expect((await b.list("entries"))["2026-10-19_extra"]).toBeUndefined()
  })
  it("fichiers refusés : pas du JSON, pas une sauvegarde Hydro, version future ; documents invalides ignorés", () => {
    expect(parseBackup("{")).toEqual({ ok: false, error: "json" })
    expect(parseBackup('{"a":1}')).toEqual({ ok: false, error: "format" })
    expect(parseBackup('{"format":"hydro-backup","version":99,"collections":{}}')).toEqual({ ok: false, error: "version" })
    const p = parseBackup('{"format":"hydro-backup","version":1,"collections":{"spaces":{"x":{"id":"x","name":"X","modules":{}},"bad/id":{"id":"y"},"z":3},"unknown":{"a":{}}}}')
    expect(p.ok && p.counts).toEqual({ spaces: 1 })
  })
  it("journal en CSV : séparateur « ; », nom de l'espace, texte échappé", () => {
    const csv = entriesCsv([entry(TODAY, { dryback: 42, note: 'pH ; "ok"' })], () => "Floraison")
    const [head, row] = csv.split("\n")
    expect(head.startsWith("date;spaceId;plantId;tempDay")).toBe(true)
    expect(row.startsWith("2026-10-18;Floraison;;")).toBe(true)
    expect(row.endsWith('"pH ; ""ok"""')).toBe(true)
  })
})

describe("lot 6 — Demander à Claude", () => {
  const seed = thomasGrow(NOW, TODAY)
  const flower = seed.spaces.find((s) => s.id === FLOWER_ID)!
  const data = {
    grow: seed.grow,
    space: flower,
    cycle: null,
    targets: dayTargets("veg", { mode: "manual", substrate: "coco", line: "athena-pro" }),
    entries: [entry(TODAY, { dryback: 42, ecRunoff: 4.4 }), { ...entry(TODAY, { dryback: 99 }), id: "p", plantId: "P1" as const }],
    mixes: [],
    equipment: seed.equipment,
    assignments: seed.assignments,
  }
  it("contexte : gamme, cibles avec source, saisies de l'espace, données manquantes ; rien d'inventé", () => {
    const c = askContext(data, TODAY)
    expect(c).toContain("Athena Pro Line")
    expect(c).toContain("ecRunoff 4–5 (Athena p. 41)")
    expect(c).toContain("dryback% (pesée) 42, EC runoff 4.4")
    expect(c).not.toContain("99")
    expect(c).toContain("Données manquantes (non mesurées) : débit de la pompe, débit de l'extracteur")
    expect(c).toContain("Pas de cycle en cours")
  })
  it("prompt : règles + données + question ; conversation gardée sur les derniers échanges", () => {
    const first = askPrompt("CTX", "Q1", [], "fr")
    expect(first).toHaveLength(1)
    expect(first[0].content).toMatch(/Réponds en français[\s\S]*CTX[\s\S]*Q1/)
    expect(first[0].content).toContain("dis-le au lieu de l'inventer")
    const hist = Array.from({ length: 10 }, (_, i) => ({ role: (i % 2 ? "assistant" : "user") as "user" | "assistant", content: `t${i}` }))
    const next = askPrompt("CTX", "Q2", hist, "en")
    expect(next[0].content).toContain("CTX")
    expect(next[next.length - 1]).toEqual({ role: "user", content: "Q2" })
    expect(next.length).toBeLessThanOrEqual(MAX_TURNS + 1)
    expect(next[0].role).toBe("user")
  })
})
