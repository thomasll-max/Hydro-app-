import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import ICAL from "ical.js"
import { MemoryStore } from "@/store/memory-store"
import { LocalStore } from "@/store/local-store"
import { ArtifactStore, type ClaudeDb } from "@/store/artifact-store"
import type { BatchOp, Doc } from "@/store/doc-store"
import { readable, validDoc, byStr } from "@/model/validate"
import { csvCell, entriesCsv, importBackup, parseBackup, MAX_BACKUP_BYTES } from "@/lib/backup"
import { photoIds, resetData } from "@/lib/reset"
import { blankEntry, entryHasContent } from "@/model/entry"
import { badNums, isBadNum } from "./formulas"
import { buildIcs, escapeText, safeTz, untilUtc } from "@/calendar/ics"
import { safeSpaceColor, spaceColor } from "@/components/hydro/space-pill"
import { cspFor, headersFile, inlineScriptHashes } from "@/lib/csp"
import type { Entry } from "@/model/types"
import type { Reminder } from "@/model/grow"

const root = path.resolve(import.meta.dirname, "../..")
const entry = (date: string, extra: Partial<Entry> = {}): Entry => ({ schemaVersion: 2, id: `${date}_flo`, date, spaceId: "flo", createdAt: "", updatedAt: "", ...extra })

/** Fake artifact db: every read fails. */
function failingDb(): ClaudeDb {
  const err = { code: "revoked", message: "gone" }
  const ref = {
    get: () => Promise.reject(err),
    set: () => Promise.reject(err),
    delete: () => Promise.reject(err),
    onSnapshot: (_n: unknown, e?: (x: unknown) => void) => {
      queueMicrotask(() => e?.(err))
      return () => {}
    },
  }
  return { doc: () => ref as never, collection: () => ref as never }
}

describe("lot 10a — une erreur de lecture n'est jamais une base vide", () => {
  it("list() lève l'erreur, les abonnements appellent onError (jamais un état vide)", async () => {
    const s = new ArtifactStore(failingDb())
    await expect(s.list("spaces")).rejects.toMatchObject({ code: "revoked" })
    const seen: string[] = []
    s.watchCollection("spaces", () => seen.push("data"), () => seen.push("error"))
    s.watchDoc("grow/main", () => seen.push("doc"), () => seen.push("docError"))
    await new Promise((r) => setTimeout(r, 0))
    expect(seen.sort()).toEqual(["docError", "error"])
  })
  it("réinitialisation : une lecture ratée arrête tout avant la moindre suppression", async () => {
    const deleted: string[] = []
    const store = { list: () => Promise.reject(new Error("read")), set: async () => {}, delete: async (p: string) => void deleted.push(p) }
    await expect(resetData(store)).rejects.toThrow("read")
    expect(deleted).toEqual([])
  })
})

describe("lot 10a — écritures", () => {
  it("une écriture refusée par le stockage ne reste pas en mémoire", async () => {
    class Refusing extends MemoryStore {
      protected override async persist() {
        throw new Error("quota")
      }
    }
    const s = new Refusing()
    await expect(s.set("entries/a", { date: "2026-10-19" })).rejects.toThrow("quota")
    expect(await s.get("entries/a")).toBeNull()
  })
  it("écriture par lot : une seule notification par collection (import de 3 000 documents)", async () => {
    const s = new MemoryStore()
    let calls = 0
    s.watchCollection("entries", () => calls++)
    await new Promise((r) => setTimeout(r, 0))
    calls = 0
    const ops: BatchOp[] = Array.from({ length: 3000 }, (_, i) => [`entries/e${i}`, { date: "2026-10-19", spaceId: "flo" }] as const)
    const t0 = performance.now()
    await s.batch(ops)
    expect(calls).toBe(1)
    expect(Object.keys(await s.list("entries"))).toHaveLength(3000)
    expect(performance.now() - t0).toBeLessThan(2000)
  })
  it("sans IndexedDB : stockage local en mémoire seulement, signalé (pas de chargement infini)", async () => {
    const s = new LocalStore()
    expect(await s.status()).toEqual({ volatile: true })
    await s.set("entries/a", { date: "2026-10-19", spaceId: "x" })
    expect((await s.get("entries/a"))?.date).toBe("2026-10-19")
  })
})

describe("lot 10a — documents mal formés", () => {
  it("mis de côté sans bloquer le reste, tris tolérants", () => {
    const r = readable<Entry>("entries", { ok: { date: "2026-10-19", spaceId: "flo" }, noDate: { spaceId: "flo" }, weird: "x", badPhotos: { date: "2026-10-19", spaceId: "flo", photos: "p1" } })
    expect(r.list.map((e) => e.id)).toEqual(["ok"])
    expect(r.bad.sort()).toEqual(["entries/badPhotos", "entries/noDate", "entries/weird"])
    expect(validDoc("cycles", { name: "C", cultivars: ["A"] })).toBe(true)
    expect(validDoc("cycles", { name: "C" })).toBe(false)
    expect(validDoc("spaces", { name: "S" })).toBe(false) // no modules: the app reads space.modules[…]
    expect([{ n: undefined }, { n: "b" }, { n: "a" }].sort((a, b) => byStr(a.n, b.n)).map((x) => x.n)).toEqual([undefined, "a", "b"])
  })
})

describe("lot 10a — import", () => {
  it("refuse un fichier trop gros, ignore __proto__ et les documents mal typés", () => {
    expect(parseBackup(" ".repeat(MAX_BACKUP_BYTES + 1))).toEqual({ ok: false, error: "size" })
    const text = JSON.stringify({
      format: "hydro-backup",
      version: 1,
      collections: { entries: { a: { date: "2026-10-19", spaceId: "flo" }, b: { date: 12, spaceId: "flo" }, ["__proto__"]: { date: "2026-10-19", spaceId: "x" } } },
    })
    const p = parseBackup(text)
    expect(p.ok).toBe(true)
    if (!p.ok) return
    expect(p.counts).toEqual({ entries: 1 })
    expect(p.skipped.sort()).toEqual(["entries/__proto__", "entries/b"])
  })
  it("« Remplacer » écrit d'abord et supprime ensuite", async () => {
    const s = new MemoryStore()
    await s.set("entries/old", { date: "2026-10-01", spaceId: "flo" })
    const order: string[] = []
    const spy = {
      list: (c: string) => s.list(c),
      set: async (p: string, d: Doc) => (order.push(`set ${p}`), s.set(p, d)),
      delete: async (p: string) => (order.push(`del ${p}`), s.delete(p)),
    }
    const p = parseBackup(JSON.stringify({ format: "hydro-backup", version: 1, collections: { entries: { neu: { date: "2026-10-19", spaceId: "flo" } }, grow: { main: { name: "G" } } } }))
    if (!p.ok) throw new Error("parse")
    const r = await importBackup(spy, p.backup, "replace")
    expect(r).toEqual({ written: 2, deleted: 1 })
    expect(order).toEqual(["set entries/neu", "set grow/main", "del entries/old"])
  })
})

describe("lot 10a — saisie", () => {
  it("une saisie vide n'a pas de contenu ; les réglages recopiés de la veille ne comptent que s'ils changent", () => {
    const prev = entry("2026-10-18", { ecIn: 2.2, volumePerPotMl: 450, tempDay: 26 })
    const pre = blankEntry("2026-10-19", { spaceId: "flo" }, prev)
    expect(entryHasContent(pre, pre)).toBe(false)
    expect(entryHasContent({ ...pre, ecIn: 2.4 }, pre)).toBe(true)
    expect(entryHasContent({ ...pre, tempDay: 25 }, pre)).toBe(true)
    expect(entryHasContent({ ...pre, note: "  " }, pre)).toBe(false)
    expect(entryHasContent({ ...pre, observations: [{ tag: "spots", severity: 1 }] }, pre)).toBe(true)
  })
  it("un nombre mal tapé est repéré (jamais enregistré vide)", () => {
    expect(isBadNum("2,4")).toBe(false)
    expect(isBadNum("")).toBe(false)
    expect(isBadNum("2,4,5")).toBe(true)
    expect(isBadNum("-")).toBe(true)
    expect(isBadNum("1-2")).toBe(true)
    expect(badNums({ a: "1", b: "x.", c: "3" })).toEqual(["b"])
  })
})

describe("lot 10a — photos et couleurs", () => {
  it("photos du journal retrouvées pour les supprimer de l'artefact", async () => {
    expect(photoIds({ a: { photos: ["p1", "p2"] }, b: { photos: ["p2"] }, c: {} }).sort()).toEqual(["p1", "p2"])
    const s = new MemoryStore()
    await s.set("entries/a", { date: "2026-10-19", spaceId: "flo", photos: ["p1"] })
    const removed: string[] = []
    await resetData(s, { remove: async (id: string) => void removed.push(id) })
    expect(removed).toEqual(["p1"])
  })
  it("couleur d'espace : seulement les 8 couleurs connues", () => {
    expect(safeSpaceColor("sky")).toBe("sky")
    expect(spaceColor("red;background:url(x)")).toBe("var(--space-slate)")
  })
})

describe("lot 10a — CSV et .ics", () => {
  it("CSV : formules neutralisées, virgule décimale en français", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)")
    expect(csvCell("@cmd")).toBe("'@cmd")
    expect(csvCell(6.2)).toBe("6,2")
    expect(csvCell(6.2, "en")).toBe("6.2")
    expect(csvCell(-2)).toBe("-2")
    const csv = entriesCsv([entry("2026-10-19", { phIn: 5.8, note: "+1 mL" })], () => "Floraison")
    expect(csv.split("\n")[1]).toContain(";5,8;")
    expect(csv.split("\n")[1].endsWith("'+1 mL")).toBe(true)
  })
  it(".ics : CR échappé, fuseau sûr, UNTIL en UTC, EXDATE des faits, rappel ponctuel reporté", () => {
    expect(escapeText("a\rb")).toBe("a\\nb")
    expect(safeTz("Europe/Oslo")).toBe("Europe/Oslo")
    expect(safeTz('Europe/Oslo";X')).toBe("UTC")
    expect(untilUtc("FREQ=DAILY;UNTIL=20261031", "Europe/Oslo")).toBe("FREQ=DAILY;UNTIL=20261031T225959Z")
    const rec: Reminder = { schemaVersion: 2, id: "r1", kind: "custom", title: "Arroser", start: "2026-10-20T08:00", rrule: "FREQ=DAILY;UNTIL=20261025", done: ["2026-10-21"], createdAt: "" }
    const once: Reminder = { schemaVersion: 2, id: "r2", kind: "custom", title: "Une fois", start: "2026-10-20T09:00", snoozed: { "2026-10-20": "2026-10-22T09:00" }, createdAt: "" }
    const ics = buildIcs({ reminders: [rec, once], deadlines: [], tz: "Europe/Oslo", now: new Date("2026-10-19T08:00:00Z"), calName: "Hydro", alarmText: (x) => x })
    expect(ics).toContain("RRULE:FREQ=DAILY;UNTIL=20261025T225959Z") // 25/10: already winter time (UTC+1)
    expect(ics).toContain("EXDATE;TZID=Europe/Oslo:20261021T080000")
    expect(ics).toContain("DTSTART;TZID=Europe/Oslo:20261022T090000")
    const comp = new ICAL.Component(ICAL.parse(ics))
    expect(comp.getAllSubcomponents("vevent")).toHaveLength(2)
  })
})

describe("lot 10a — Netlify", () => {
  it("CSP avec le hash exact des scripts en ligne, en-têtes de sécurité", () => {
    const html = "<html><script type=module>alert(1)</script><script src=x.js></script></html>"
    expect(inlineScriptHashes(html)).toHaveLength(1)
    expect(cspFor(html)).toContain("frame-ancestors 'none'")
    expect(cspFor(html)).not.toContain("unsafe-inline' 'sha")
    expect(headersFile(html).startsWith("/*\n  Content-Security-Policy: default-src 'self'")).toBe(true)
    const toml = fs.readFileSync(path.join(root, "netlify.toml"), "utf8")
    for (const h of ["X-Content-Type-Options = \"nosniff\"", "Referrer-Policy", "X-Frame-Options = \"DENY\""]) expect(toml).toContain(h)
  })
})
