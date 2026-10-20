import { describe, expect, it } from "vitest"
import { canShareTank, customApplies, mixRecipe, nextBalancePer10L, phaseAt, phaseById, positionOf, productIds } from "./nutrients"
import { bagLitres, stockStatus } from "./concentrate"
import { stageOn, addDays } from "./stage"
import { spaceContext } from "./space-context"
import { ATHENA_BLENDED, ATHENA_PRO, CATALOGS, balanceStepMl, getCatalog, visibleCatalogs } from "@/data/nutrients"
import { deadlines } from "@/calendar/deadlines"
import { deadlineTitle } from "@/calendar/labels"
import { thomasGrow } from "@/data/thomas-grow"
import { newSpace } from "@/model/grow-ops"
import type { ConcentrateStock, CustomProduct } from "@/model/grow"
import type { Mix } from "@/model/types"

const NOW = "2026-10-18T06:00:00.000Z"
const item = (r: ReturnType<typeof mixRecipe>, id: string) => r.items.find((i) => i.id === id)
const pro = (phaseId: string, volumeL: number, ec?: number, concentrate = 226, extra: object = {}) => mixRecipe("athena-pro", { phaseId, volumeL, ec, concentrate, ...extra })
const blended = (phaseId: string, volumeL: number) => mixRecipe("athena-blended", { phaseId, volumeL })

describe("lot 4a — Pro Line, concentrés (p. 37)", () => {
  it("EC 2,0 → 57 + 34 mL à 226 g/L ; 114 + 69 à 113 ; 46 + 27 à 282", () => {
    for (const [c, base, core] of [
      [226, 57, 34],
      [113, 114, 69],
      [282, 46, 27],
    ]) {
      const r = pro("flower", 10, 2.0, c)
      expect(item(r, "proBloom")).toMatchObject({ qty: base, unit: "mL", concentrate: c, estimate: false, src: { kind: "athena", page: 37 } })
      expect(item(r, "proCore")?.qty).toBe(core)
    }
  })
  it("EC 3,0 sur un bac de 100 L → 900 + 540 mL", () => {
    const r = pro("veg", 100, 3.0)
    expect(item(r, "proGrow")?.qty).toBe(900)
    expect(item(r, "proCore")?.qty).toBe(540)
  })
  it("S8 → Fade 51, sans Core, pH 6,0–6,4", () => {
    const pos = positionOf(stageOn({ flipDate: "2026-10-02", flowerWeeks: 9 }, addDays("2026-10-02", 49)))!
    expect(pos).toEqual({ stage: "flower", week: 8 })
    const phase = phaseAt(ATHENA_PRO, pos)!
    expect(phase.id).toBe("finish")
    const r = pro(phase.id, 10)
    expect(item(r, "fade")).toMatchObject({ qty: 51, src: { kind: "athena", page: 31 } })
    expect(item(r, "proCore")).toBeUndefined()
    expect(r.ph).toMatchObject({ lo: 6.0, hi: 6.4 })
  })
  it("Fade désactivé : Core conservé en S8 (le Fade le remplace seulement s'il est utilisé)", () => {
    const r = pro("finish", 10, 3, 226, { addons: ["cleanse", "balance"] })
    expect(item(r, "fade")).toBeUndefined()
    expect(item(r, "proCore")).toMatchObject({ qty: 54, note: "fadeOff" })
  })
  it("S7 : encore du Core, pas de Fade", () => {
    const r = pro(phaseAt(ATHENA_PRO, { stage: "flower", week: 7 })!.id, 10)
    expect(item(r, "proCore")?.qty).toBe(54)
    expect(item(r, "fade")).toBeUndefined()
  })
  it("Pro à EC 2,2 : doses tirées du tableau p. 37 (entre deux lignes = estimation), pas de mise à l'échelle", () => {
    const r = pro("veg", 10, 2.2)
    expect(r.scaled).toBe(false)
    expect(item(r, "proGrow")?.estimate).toBe(true) // between the 2.0 and 2.5 rows (lot 10c)
    expect(item(pro("veg", 10, 2.0), "proGrow")?.estimate).toBe(false) // a published row
    expect(pro("finish", 10, 2.4).scaled).toBe(false) // Fade 51 is fixed (p. 31), nothing scaled
  })
  it("Cleanse en plage 5–13 mL / 10 L : rien d'inventé tant que la dose n'est pas choisie", () => {
    const r = pro("veg", 50, 3)
    expect(item(r, "cleanse")).toMatchObject({ qty: null, range: [25, 65] })
    expect(item(pro("veg", 50, 3, 226, { chosenPer10L: { cleanse: 8 } }), "cleanse")?.qty).toBe(40)
  })
  it("Balance : palier de 1 mL pour 4 L (100 L → 25 mL) ; noté puis versé en premier au bidon suivant", () => {
    expect(balanceStepMl(100)).toBe(25)
    expect(item(pro("veg", 100, 3), "balance")).toMatchObject({ qty: null, note: "balanceSteps", stepMl: 25 })
    const next = nextBalancePer10L({ volumeL: 100, balanceAddedMl: 30 })!
    expect(next).toBe(3)
    const r = pro("veg", 100, 3, 226, { balanceMlPer10L: next })
    expect(r.items[1]).toMatchObject({ id: "balance", qty: 30, note: "balanceFirst" })
  })
})

describe("lot 4a — Blended (p. 58), B avant A", () => {
  it("végé S2, 50 L → Grow B et Grow A 145 mL chacun, CaMg 40–65, Cleanse 25–65, EC 2,1", () => {
    const phase = phaseAt(ATHENA_BLENDED, { stage: "veg", week: 2 })!
    const r = blended(phase.id, 50)
    expect(item(r, "growB")?.qty).toBe(145)
    expect(item(r, "growA")?.qty).toBe(145)
    expect(item(r, "camg")).toMatchObject({ qty: null, range: [40, 65] })
    expect(item(r, "cleanse")).toMatchObject({ qty: null, range: [25, 65] })
    expect(r.ec).toBe(2.1)
    expect(productIds(r).indexOf("growB")).toBeLessThan(productIds(r).indexOf("growA"))
  })
  it("fl. S5, 10 L → Bloom B/A 26, PK 24, CaMg 8–13, EC 2,4", () => {
    const r = blended(phaseAt(ATHENA_BLENDED, { stage: "flower", week: 5 })!.id, 10)
    expect(item(r, "bloomB")?.qty).toBe(26)
    expect(item(r, "bloomA")?.qty).toBe(26)
    expect(item(r, "pk")?.qty).toBe(24)
    expect(item(r, "camg")?.range).toEqual([8, 13])
    expect(r.ec).toBe(2.4)
    expect(productIds(r)).toEqual(["balance", "bloomB", "bloomA", "pk", "camg", "cleanse"])
  })
  it("S8 → PK 32, Fade 32, EC 1,5", () => {
    const r = blended(phaseAt(ATHENA_BLENDED, { stage: "flower", week: 8 })!.id, 10)
    expect(item(r, "pk")?.qty).toBe(32)
    expect(item(r, "fade")?.qty).toBe(32)
    expect(item(r, "camg")).toBeUndefined()
    expect(r.ec).toBe(1.5)
  })
  it("une EC différente de la référence est une mise à l'échelle estimée", () => {
    const r = mixRecipe("athena-blended", { phaseId: "veg", volumeL: 10, ec: 4.2 })
    expect(r.scaled).toBe(true)
    expect(item(r, "growA")).toMatchObject({ qty: 58, estimate: true })
  })
  it("les deux gammes proposées dans les deux versions (lot 14a)", () => {
    // Lot 14a: both lines in both versions (Blended was hidden in the Claude version until then).
    expect(visibleCatalogs().map((c) => c.id)).toEqual(["athena-pro", "athena-blended"])
  })
})

describe("lot 4a — aucun mélange entre les gammes", () => {
  const PRO_ONLY = ["proGrow", "proBloom", "proCore"]
  const BLENDED_ONLY = ["growA", "growB", "bloomA", "bloomB", "pk", "camg"]
  it("chaque recette n'utilise que les produits de sa gamme", () => {
    for (const cat of Object.values(CATALOGS)) {
      const own = new Set(cat.products.map((p) => p.id))
      for (const phase of cat.program) {
        const r = mixRecipe(cat.id, { phaseId: phase.id, volumeL: 20, concentrate: 226, addons: ["fade", "cleanse", "balance", "ipw", "camg", "pk"] })
        for (const id of productIds(r)) expect(own.has(id)).toBe(true)
        const forbidden = cat.id === "athena-pro" ? BLENDED_ONLY : PRO_ONLY
        for (const id of forbidden) expect(productIds(r)).not.toContain(id)
      }
    }
  })
  it("CaMg et PK jamais avec la Pro Line, même activés", () => {
    expect(getCatalog("athena-pro").addons).not.toContain("camg")
    const r = pro("flower", 10, 3, 226, { addons: ["camg", "pk", "fade", "cleanse", "balance"] })
    expect(productIds(r)).not.toContain("camg")
    expect(productIds(r)).not.toContain("pk")
  })
  it("chaque dose porte sa source (page du Handbook)", () => {
    for (const cat of Object.values(CATALOGS)) for (const phase of cat.program) for (const d of phase.doses) expect(d.src.kind).toBe("athena")
    expect(phaseById(ATHENA_BLENDED, "fl5")!.doses.every((d) => d.src.kind === "athena" && d.src.page === 58)).toBe(true)
  })
  it("Fade : 51 en Pro, 32 en Blended, jamais l'un dans l'autre", () => {
    expect(item(pro("finish", 10), "fade")?.qty).toBe(51)
    expect(item(blended("fl8", 10), "fade")?.qty).toBe(32)
  })
  it("un bidon ne se partage qu'entre espaces de la même gamme", () => {
    expect(canShareTank(["athena-pro", "athena-pro", "athena-pro"])).toBe(true)
    expect(canShareTank(["athena-pro", "athena-blended"])).toBe(false)
  })
})

describe("lot 4a — produits perso (Proper)", () => {
  const seed = thomasGrow(NOW, "2026-10-18")
  const proper = seed.customProducts.find((p) => p.id === "proper")!
  it("Proper vide tant qu'il n'est pas saisi : dans aucune recette (lot 14b : dose non publiée par Athena)", () => {
    expect(proper.dosePer10L).toBeUndefined()
    const r = pro("veg", 100, 3, 226, { custom: seed.customProducts })
    expect(item(r, "proper")).toBeUndefined()
    expect(item(r, "great-white")).toBeUndefined() // racines, jamais dans le bidon
  })
  it("dose et semaines saisies depuis l'étiquette : utilisé seulement ces semaines-là", () => {
    const typed: CustomProduct = { ...proper, dosePer10L: { lo: 2, hi: 2 }, use: { flowerFrom: 4, flowerTo: 8 } }
    expect(item(pro("flower", 50, 3, 226, { custom: [typed] }), "proper")).toMatchObject({ qty: 10, src: { kind: "label" } })
    expect(item(pro("veg", 50, 3, 226, { custom: [typed] }), "proper")).toBeUndefined()
    expect(item(pro("flower", 50, 3, 226, { custom: [typed], week: 2 }), "proper")).toBeUndefined()
    expect(customApplies(typed, phaseById(ATHENA_PRO, "finish")!)).toBe(true)
  })
})

describe("lot 4a — concentré et stocks", () => {
  it("sac de 0,9 kg → 4,0 L à 226 g/L", () => expect(bagLitres(0.9, 226)).toBe(4))
  const stock: ConcentrateStock = { schemaVersion: 2, id: "s1", productId: "proBloom", line: "athena-pro", gPerL: 226, litresMade: 4.0, madeOn: "2026-10-01", bagKg: 0.9 }
  const tank = (id: string, date: string, volumeL = 100): Mix => {
    const r = pro("flower", volumeL, 3.0)
    return {
      schemaVersion: 4,
      id,
      date,
      volumeL,
      line: "athena-pro",
      phase: "flower",
      items: r.items.filter((i) => i.kind === "product").map((i) => ({ id: i.id, name: i.name, qty: i.qty, unit: i.unit, concentrate: i.concentrate })),
      createdAt: NOW,
    }
  }
  it("stock de 4,0 L moins 2 bidons Pro de 100 L à EC 3,0 → 2,2 L", () => {
    const s = stockStatus(stock, [stock], [tank("m1", "2026-10-05"), tank("m2", "2026-10-11")])
    expect(s.leftL).toBe(2.2)
    expect(s.tanksLeft).toBe(2)
    expect(s.low).toBe(false)
  })
  it("échéance « concentré presque vide » : moins de 2 bidons comme le dernier, datée du premier bac qu'il ne couvre plus", () => {
    const seed = thomasGrow(NOW, "2026-10-18")
    const mixes = [tank("m1", "2026-10-05"), tank("m2", "2026-10-11"), tank("m3", "2026-10-16")]
    const data = { grow: seed.grow, spaces: seed.spaces, cycles: seed.cycles, entries: [], mixes, equipment: seed.equipment, assignments: seed.assignments, concentrateStocks: [stock] }
    const dl = deadlines(data, "2026-10-18").find((d) => d.kind === "concentrateLow")!
    // Lot 10b: 1,3 L = 1 more tank of 0,9 L; tanks every 6 days (median) → the one of 28/10 needs a new bag.
    expect(dl).toMatchObject({ key: "concentrateLow_s1", date: "2026-10-28", source: "estimate", vars: { product: "Pro Bloom", litres: 1.3 } })
    expect(deadlineTitle("fr", dl)).toBe("Concentré presque vide : Pro Bloom (≈ 1,3 L)")
    // Bidon fini : plus d'échéance.
    expect(deadlines({ ...data, concentrateStocks: [{ ...stock, finishedOn: "2026-10-17" }] }, "2026-10-18").some((d) => d.kind === "concentrateLow")).toBe(false)
  })
})

describe("lot 4a — un bidon pour plusieurs espaces", () => {
  it("un bidon pour 3 espaces : chacun le voit et en tire son autonomie", () => {
    const seed = thomasGrow(NOW, "2026-10-18")
    const third = newSpace({ id: "mere", name: "Mère", template: "mother", order: 2, now: NOW })
    const spaces = [...seed.spaces, third]
    const mix: Mix = { schemaVersion: 4, id: "m3x", date: "2026-10-18", volumeL: 100, spaceIds: spaces.map((s) => s.id), line: "athena-pro", phase: "veg", phBefore: 7.1, balanceAddedMl: 30, ph: 6.0, createdAt: NOW }
    const data = { cycles: seed.cycles, entries: [], mixes: [mix], equipment: seed.equipment, assignments: seed.assignments }
    for (const s of spaces) expect(spaceContext(s, data, "2026-10-18").mixes.map((m) => m.id)).toEqual(["m3x"])
    expect(nextBalancePer10L(mix)).toBe(3)
  })
})
