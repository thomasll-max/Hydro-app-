import { describe, expect, it } from "vitest"
import { MemoryStore } from "@/store/memory-store"
import { exportBackup, backupJson, parseBackup } from "@/lib/backup"
import { draftDocs, draftIssues, duplicateDraftSpace, emptyDraft, ONBOARDING_NUTRITION, removeDraftSpace, setTemplate, startCycle, stepIssues, type Draft } from "@/lib/onboarding"
import type { Equipment, EquipmentAssignment, Grow, Space } from "@/model/grow"
import type { Cycle } from "@/model/types"

const NOW = "2026-10-18T06:00:00.000Z"
const names = { lamp: "Lampe", pots: (v: number) => `Pots ${v} L`, tank: (l: number) => `Réservoir ${l} L`, extractor: "Extracteur" }
const ids = () => {
  let n = 0
  return (p: string) => `${p}${++n}`
}
const docsOf = (d: Draft) => draftDocs(d, { now: NOW, today: "2026-10-18", id: ids(), names, timeZone: "Europe/Paris" })
const of = <T,>(docs: [string, Record<string, unknown>][], col: string) => docs.filter(([p]) => p.startsWith(`${col}/`)).map(([, d]) => d as unknown as T)

function named(): Draft {
  return { ...emptyDraft("Floraison"), name: "Grow de Léa" }
}

describe("lot 8b — assistant : étapes", () => {
  it("bloque « Suivant » tant que le grow n'a pas de nom, et seulement pour ça", () => {
    const d = emptyDraft("Floraison")
    expect(stepIssues(d, "name")).toEqual(["name"])
    expect(stepIssues({ ...d, name: "  " }, "name")).toEqual(["name"])
    expect(stepIssues(named(), "name")).toEqual([])
    expect(draftIssues(named())).toEqual([])
  })

  it("espaces : un nom chacun, dimensions vides acceptées, négatives refusées", () => {
    const d = named()
    expect(stepIssues(d, "spaces")).toEqual([])
    expect(stepIssues({ ...d, spaces: [{ ...d.spaces[0], name: "" }] }, "spaces")).toEqual(["spaceName"])
    expect(stepIssues({ ...d, spaces: [{ ...d.spaces[0], dims: { l: -1 } }] }, "spaces")).toEqual(["dims"])
  })

  it("équipement facultatif : vide, l'étape passe", () => {
    expect(stepIssues(named(), "equipment")).toEqual([])
  })

  it("changer de modèle remet les modules du modèle", () => {
    const s = setTemplate(named().spaces[0], "drying")
    expect(s.modules.drying).toBe(true)
    expect(s.modules.nutrition).toBe(false)
  })

  it("un premier cycle demande ses pots (rien n'est supposé)", () => {
    const d = named()
    const c = startCycle(d, "Cycle 1")
    expect(c.potL).toBeUndefined()
    expect(stepIssues({ ...d, cycle: c }, "cycle")).toEqual(["cyclePots"])
    expect(stepIssues({ ...d, cycle: { ...c, potL: 11, potN: 3 } }, "cycle")).toEqual([])
    // Pots typed at the equipment step are taken over.
    const withGear = { ...d, spaces: [{ ...d.spaces[0], gear: { potL: 15, potN: 4 } }] }
    expect(startCycle(withGear, "Cycle 1")).toMatchObject({ potL: 15, potN: 4 })
  })

  it("dupliquer un espace copie son équipement ; on garde toujours au moins un espace", () => {
    const d0 = named()
    const d = { ...d0, spaces: [{ ...d0.spaces[0], dims: { l: 80, w: 80, h: 160 }, gear: { lampName: "SF-1000", lampW: 100, potL: 11, potN: 4 } }] }
    const dup = duplicateDraftSpace(d, d.spaces[0].key, "k2", (n) => `${n} (copie)`)
    expect(dup.spaces).toHaveLength(2)
    expect(dup.spaces[1]).toMatchObject({ key: "k2", name: "Floraison (copie)", dims: { l: 80, w: 80, h: 160 }, gear: { lampName: "SF-1000", lampW: 100, potL: 11, potN: 4 } })
    expect(removeDraftSpace(d, d.spaces[0].key).spaces).toHaveLength(1)
    const withCycle = { ...dup, cycle: startCycle(dup, "Cycle 1", "k2") }
    expect(removeDraftSpace(withCycle, "k2").cycle?.spaceKey).toBe(d.spaces[0].key)
  })
})

describe("lot 8b — assistant : documents écrits", () => {
  it("grow/main en dernier, avec le nom, l'heure du résumé, le fuseau et la nutrition choisie", () => {
    const docs = docsOf({ ...named(), digestTime: "08:30" })
    expect(docs[docs.length - 1][0]).toBe("grow/main")
    const g = docs[docs.length - 1][1] as unknown as Grow
    expect(g).toMatchObject({ id: "main", name: "Grow de Léa", digestTime: "08:30", timeZone: "Europe/Paris", nutrition: ONBOARDING_NUTRITION })
    // Friends start without any add-on ticked (Thomas's choices are his).
    expect(ONBOARDING_NUTRITION.addons).toEqual([])
  })

  it("équipement vide : aucun élément créé, aucune valeur inventée", () => {
    const docs = docsOf(named())
    expect(of(docs, "equipment")).toHaveLength(0)
    expect(of(docs, "cycles")).toHaveLength(0)
    const sp = of<Space>(docs, "spaces")[0]
    expect(sp.dimensionsCm).toBeUndefined()
  })

  it("chaque champ rempli devient un élément placé dans son espace, sans champ ajouté", () => {
    const d0 = named()
    const d = { ...d0, spaces: [{ ...d0.spaces[0], gear: { lampName: "SF-1000", potL: 11, potN: 4, tankL: 60, extM3h: 280 } }] }
    const docs = docsOf(d)
    const eq = of<Equipment>(docs, "equipment")
    const sp = of<Space>(docs, "spaces")[0]
    expect(eq.map((e) => e.type).sort()).toEqual(["container", "extractor", "lamp", "reservoir"])
    const lamp = eq.find((e) => e.type === "lamp")!
    expect(lamp.name).toBe("SF-1000")
    expect(lamp.lamp?.watts).toBeUndefined() // not typed → not guessed
    expect(eq.find((e) => e.type === "container")).toMatchObject({ name: "Pots 11 L", quantity: 4, container: { volumeL: 11, count: 4 } })
    expect(eq.find((e) => e.type === "reservoir")).toMatchObject({ name: "Réservoir 60 L", reservoir: { usableL: 60 } })
    expect(eq.find((e) => e.type === "extractor")).toMatchObject({ name: "Extracteur", extractor: { m3h: 280 } })
    const as = of<EquipmentAssignment>(docs, "equipmentAssignments")
    expect(as).toHaveLength(4)
    expect(as.every((a) => a.spaceId === sp.id && a.from === "2026-10-18" && !a.to)).toBe(true)
    expect(as.find((a) => a.equipmentId === eq.find((e) => e.type === "container")!.id)?.quantity).toBe(4)
  })

  it("deux espaces dupliqués ont chacun leur propre matériel", () => {
    const d0 = named()
    const d = duplicateDraftSpace({ ...d0, spaces: [{ ...d0.spaces[0], gear: { lampW: 150 } }] }, d0.spaces[0].key, "k2", (n) => `${n} 2`)
    const docs = docsOf(d)
    const [a, b] = of<Space>(docs, "spaces")
    expect(a.id).not.toBe(b.id)
    expect(b.order).toBe(1)
    const lamps = of<Equipment>(docs, "equipment")
    expect(lamps).toHaveLength(2)
    expect(lamps.every((l) => l.lamp?.watts === 150)).toBe(true)
    const as = of<EquipmentAssignment>(docs, "equipmentAssignments")
    expect(new Set(as.map((x) => x.spaceId))).toEqual(new Set([a.id, b.id]))
  })

  it("le premier cycle est rangé dans son espace, avec les lampes et la gamme du grow", () => {
    const d0 = named()
    const veg = { ...setTemplate(d0.spaces[0], "veg"), key: "v", name: "Végé" }
    const flower = { ...d0.spaces[0], gear: { lampName: "SF-2000" } }
    const d: Draft = { ...d0, spaces: [veg, flower], nutrition: { line: "athena-blended", addons: [], dosing: "powder" } }
    const cycle = { ...startCycle(d, "Premier", "v"), cultivars: "Gelato, Zkittlez", potL: 7.5, potN: 2, germinationDate: "2026-10-20" }
    const docs = docsOf({ ...d, cycle })
    const c = of<Cycle>(docs, "cycles")[0]
    const vegId = of<Space>(docs, "spaces").find((s) => s.name === "Végé")!.id
    expect(c).toMatchObject({ name: "Premier", spaceId: vegId, cultivars: ["Gelato", "Zkittlez"], potVolumeL: 7.5, potCount: 2, germinationDate: "2026-10-20", nutrientLine: "athena-blended", lights: "" })
    const c2 = of<Cycle>(docsOf({ ...d, cycle: { ...cycle, spaceKey: flower.key } }), "cycles")[0]
    expect(c2.lights).toBe("SF-2000")
  })

  it("le résultat est une sauvegarde valide (même format que l'export)", async () => {
    const d0 = named()
    const d = { ...d0, spaces: [{ ...d0.spaces[0], gear: { potL: 11, potN: 4 } }] }
    const s = new MemoryStore()
    for (const [p, doc] of docsOf({ ...d, cycle: startCycle(d, "Cycle 1") })) await s.set(p, doc)
    const parsed = parseBackup(backupJson(await exportBackup(s, "local")))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.counts).toMatchObject({ grow: 1, spaces: 1, equipment: 1, equipmentAssignments: 1, cycles: 1 })
  })
})
