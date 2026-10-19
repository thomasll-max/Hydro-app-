// Simulation d'un an de culture perpétuelle (Colonne → Floraison → Séchage), écrite avec le vrai code de l'app.
// Sortie : sauvegarde complète (format hydro-backup) + instantanés « tel que c'était » à des dates clés + liste des anomalies injectées.
import { thomasGrow, FLOWER_ID, COLUMN_ID } from "../../src/data/thomas-grow"
import { newSpace, transferCycle, cycleSpaceAt } from "../../src/model/grow-ops"
import { GROW_SCHEMA, type ConcentrateStock, type Equipment, type EquipmentAssignment, type Reminder, type Space } from "../../src/model/grow"
import { SCHEMA, type Cycle, type Entry, type GrowEvent, type IsoDate, type Mix, type Plant, type PlantId } from "../../src/model/types"
import { derive } from "../../src/model/entry"
import { addDays, daysBetween, stageOn, fadeStart, flushStart } from "../../src/calc/stage"
import { dayTargets, snapshot, cycleNumber, type DayTargets } from "../../src/calc/targets"
import { rhForVpd } from "../../src/calc/climate"
import { getCatalog } from "../../src/data/nutrients"
import { mixRecipe, phaseAt, positionOf, phaseKind, expectedEc, nextBalancePer10L } from "../../src/calc/nutrients"
import { BACKUP_FORMAT, BACKUP_VERSION } from "../../src/lib/backup"

export const OUT = process.argv[2] ?? "out"
export const START: IsoDate = "2025-10-20"
export const TODAY: IsoDate = "2026-10-19"
const LAST: IsoDate = "2026-10-18"
const DRY_ID = "sechage"
const LINE = "athena-pro"
const CAT = getCatalog(LINE)

// ---------- hasard reproductible ----------
let seed = 20261019
const rnd = () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const between = (lo: number, hi: number) => lo + (hi - lo) * rnd()
const r = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d
const iso = (d: IsoDate, h = 8, m = 0) => `${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]
/** Valeur dans la bande [lo, hi], resserrée au centre (jamais hors cible sans anomalie voulue). */
const inBand = (lo: number, hi: number, d = 1) => r(lo + (hi - lo) * (0.25 + 0.5 * rnd()), d)

// ---------- graine : le grow de Thomas + un espace séchage ----------
const seedNow = iso(START, 7)
const s = thomasGrow(seedNow, START)
s.grow.name = "Grow de Thomas (simulation 1 an)"
const spaces: Space[] = [...s.spaces]
const drySpace = newSpace({ id: DRY_ID, name: "Séchage", template: "drying", order: 2, color: "violet", now: seedNow, dimensionsCm: { l: 60, w: 60, h: 160 } })
spaces.push(drySpace)
const equipment: Equipment[] = s.equipment.map((e) => (e.id === "rain" ? { ...e, source: "measured", pump: { ...e.pump, flowMlPerMin: 900, flowMeasuredAt: START, outlets: 4 } } : e))
equipment.push({ schemaVersion: GROW_SCHEMA.equipment, id: "clip-fan", type: "fan", name: "Ventilateur clip 15 cm", createdAt: seedNow, updatedAt: seedNow, notes: "Simulation : brassage du séchoir." })
const assignments: EquipmentAssignment[] = [...s.assignments, { schemaVersion: GROW_SCHEMA.assignment, id: "seed-sechage-1", equipmentId: "clip-fan", spaceId: DRY_ID, from: START }]
const customProducts = s.customProducts

// ---------- plan des cycles ----------
type Plan = { n: number; germ: IsoDate; transfer: IsoDate; flip: IsoDate; harvest: IsoDate; cultivars: string[] }
const CULTIVARS = [["Blue Zushi"], ["Melonade Runtz"], ["Blue Zushi", "Melonade Runtz"], ["Cherry Limeade"], ["Melonade Runtz"], ["Blue Zushi"]]
const plans: Plan[] = []
{
  let transfer: IsoDate = "2025-11-24"
  for (let n = 1; n <= 6; n++) {
    const germ = addDays(transfer, -35)
    const flip = addDays(transfer, 7)
    const harvest = addDays(flip, 63)
    plans.push({ n, germ, transfer, flip, harvest, cultivars: CULTIVARS[n - 1] })
    transfer = addDays(harvest, 1)
  }
}
/** Date du passage au capteur AC Infinity (début du cycle 5) : teste la méthode de dryback « capteur ». */
const SENSOR_FROM = plans[4].transfer
/** Vacances : aucun relevé (teste « dernière saisie le… »). */
const HOLIDAY = { from: "2026-07-20", to: "2026-07-24" }

const cycles: Cycle[] = []
const plants: Plant[] = []
const harvested = (p: Plan) => p.harvest <= LAST
for (const p of plans) {
  if (p.germ > LAST) continue
  const created = iso(p.germ, 9)
  let c: Cycle = {
    schemaVersion: SCHEMA.cycle,
    id: `cycle-${p.n}`,
    name: `Cycle ${p.n}`,
    spaceId: COLUMN_ID,
    transfers: [],
    cultivars: p.cultivars,
    germinationDate: p.germ,
    plannedTransferDate: p.transfer,
    plannedFlipDate: p.flip,
    plannedDryingDays: 10,
    flowerWeeks: 9,
    substrate: "coco",
    waterMode: "auto",
    potVolumeL: 15,
    potCount: 4,
    flowMlPerMin: 900,
    lights: "IONFRAME EVO4 300 W · IONBEAM S16",
    lightsOn: "06:00",
    shotPct: 3,
    p1Shots: 5,
    p1IntervalMin: 20,
    p0DelayMin: 90,
    nutrientLine: LINE,
    tapEc: 0.05,
    leafOffsetC: -2,
    createdAt: created,
    updatedAt: created,
  }
  if (p.transfer <= LAST) c = { ...transferCycle(c, FLOWER_ID, p.transfer, iso(p.transfer, 10)), transferDate: p.transfer }
  if (p.flip <= LAST) c.flipDate = p.flip
  if (harvested(p)) {
    c = { ...transferCycle(c, DRY_ID, p.harvest, iso(p.harvest, 18), { note: "Branches suspendues au séchoir" }), harvestDate: p.harvest }
    const wet = Math.round(between(1750, 2250))
    const dryG = Math.round(wet * between(0.21, 0.24))
    c.harvest = {
      wetG: wet,
      dryG,
      watts: 300,
      dryingDays: 10,
      dryingNotes: "Simulation : 18 °C, 58–62 % HR, tiges qui cassent net au jour 10.",
      ...(addDays(p.harvest, 10) <= LAST ? { curingStart: addDays(p.harvest, 10), jarRh: 62 } : {}),
      tasting: pick(["Simulation : nez sucré, fruit rouge, fumée douce.", "Simulation : agrumes et crème, très résineux.", "Simulation : melon, gaz léger en fin de bouche."]),
    }
  }
  cycles.push(c)
  const ids: PlantId[] = ["P1", "P2", "P3", "P4"]
  ids.forEach((label, i) => plants.push({ schemaVersion: SCHEMA.plant, id: `${c.id}_${label}`, label, cycleId: c.id, cultivar: p.cultivars[i % p.cultivars.length], phenotype: i === 2 ? "pheno trapu" : undefined, updatedAt: created }))
}

// ---------- utilitaires de cycle ----------
const planOf = (c: Cycle) => plans.find((p) => `cycle-${p.n}` === c.id)!
/** Cycle présent dans un espace à une date (transferts rejoués). */
function cycleIn(space: string, d: IsoDate): Cycle | undefined {
  return cycles.find((c) => c.germinationDate! <= d && cycleSpaceAt(c, d) === space && !(space === DRY_ID && daysBetween(c.harvestDate ?? d, d) > 10))
}

// ---------- journal, bidons, événements ----------
const entries: Entry[] = []
const mixes: Mix[] = []
const events: GrowEvent[] = []
/** Anomalies injectées : [date, espace, métrique, sens]. Le validateur vérifie que l'app les signale. */
export type Injected = { date: IsoDate; space: string; metric: string; dir: "high" | "low" }
const injected: Injected[] = []

const lastMix: Record<string, Mix | undefined> = {}
const stockLeft: Record<string, number> = {}
const stocks: ConcentrateStock[] = []
function newStock(productId: string, bagKg: number, d: IsoDate) {
  const litres = r((bagKg * 1000) / 226, 1)
  const st: ConcentrateStock = { schemaVersion: GROW_SCHEMA.concentrateStock, id: `stock-${productId}-${d}`, productId, line: LINE, gPerL: 226, litresMade: litres, madeOn: d, bagKg, note: "Simulation", createdAt: iso(d, 11) }
  stocks.push(st)
  stockLeft[productId] = litres
}
newStock("proGrow", 2.27, START)
newStock("proBloom", 2.27, START)
newStock("proCore", 2.27, START)

function makeMix(space: string, c: Cycle, d: IsoDate, volumeL: number) {
  const st = stageOn(c, d)
  const pos = positionOf(st)!
  const phase = phaseAt(CAT, pos)!
  const ecT = phase.stage === "flush" ? 0 : phase.stage === "clone" ? 2.0 : cycleNumber(c) <= 1 ? 2.2 : 3.0
  const prev = lastMix[space]
  const balanceKnown = prev ? nextBalancePer10L(prev) : undefined
  const res = mixRecipe(LINE, { phaseId: phase.id, volumeL, ec: ecT, concentrate: 226, chosenPer10L: { cleanse: 8 }, balanceMlPer10L: balanceKnown, custom: customProducts, substrate: "coco", week: st.flowerWeek })
  // Bidons de concentré : refaire un bidon (sac entier) quand il n'en reste pas assez pour ce bac.
  for (const it of res.items) {
    if (!it.concentrate || it.qty == null) continue
    const need = it.qty / 1000
    if (stockLeft[it.id] < need) {
      const old = stocks.filter((x) => x.productId === it.id && !x.finishedOn).at(-1)
      if (old) old.finishedOn = d
      newStock(it.id, 2.27, d)
    }
    stockLeft[it.id] -= need
  }
  const phBefore = phase.stage === "flush" ? undefined : r(between(5.2, 5.5), 2)
  const titrated = res.items.find((i) => i.id === "balance")
  const balanceAddedMl = titrated ? (balanceKnown == null ? r((volumeL / 4) * between(0.5, 0.8), 0) : pick([0, 0, 0, 0, 1, 2])) : undefined
  const tank: Mix = {
    schemaVersion: SCHEMA.mix,
    id: `mix-sim-${d}-${space}`,
    date: d,
    cycleId: c.id,
    spaceIds: [space],
    volumeL,
    line: LINE,
    phase: phase.id,
    kind: phaseKind(phase),
    ecTarget: res.ec,
    ecExpected: phase.stage === "flush" ? undefined : expectedEc(res.ec, c.tapEc ?? 0),
    phTarget: { lo: res.ph.lo, hi: res.ph.hi },
    ...(balanceKnown != null ? { balanceMlPer10L: balanceKnown } : {}),
    ...(balanceAddedMl != null ? { balanceAddedMl } : {}),
    ...(phBefore != null ? { phBefore } : {}),
    ph: r(phase.stage === "clone" ? 5.6 : inBand(res.ph.lo, res.ph.hi, 2), 2),
    ec: r(phase.stage === "flush" ? 0.06 : expectedEc(res.ec, c.tapEc ?? 0) + between(-0.05, 0.05), 2),
    items: res.items.filter((i) => i.kind === "product" || i.kind === "custom").map((i) => ({ id: i.id, name: i.name, qty: i.qty, unit: i.unit, ...(i.concentrate ? { concentrate: i.concentrate } : {}), ...(i.range ? { range: i.range } : {}) })),
    recipe: res.items.filter((i) => i.qty != null).map((i) => `${i.name || (i.kind === "roWater" ? "Eau osmosée" : "Eau")} ${i.qty} ${i.unit}`).join(" · "),
    createdAt: iso(d, 17),
  }
  if (tank.balanceMlPer10L == null) delete tank.balanceMlPer10L
  mixes.push(tank)
  lastMix[space] = tank
  return tank
}

function ev(d: IsoDate, type: GrowEvent["type"], c: Cycle | undefined, space: string, note?: string, extra: Partial<GrowEvent> = {}) {
  events.push({ schemaVersion: SCHEMA.event, id: `ev-${type}-${c?.id ?? "x"}-${d}`, date: d, type, cycleId: c?.id, spaceId: space, ...(note ? { note } : {}), ...extra, createdAt: iso(d, 12) })
}

// Bacs de la Floraison : un au changement de phase (transfert, 12/12, Fade, rinçage), puis tous les 6 jours.
function flowerMixDays(p: Plan): IsoDate[] {
  const c = cycles.find((x) => x.id === `cycle-${p.n}`)!
  const marks = [p.transfer, p.flip, fadeStart({ flipDate: p.flip })!, flushStart({ flipDate: p.flip, flowerWeeks: 9 })!, p.harvest]
  const out: IsoDate[] = []
  for (let i = 0; i < marks.length - 1; i++) for (let d = marks[i]; d < marks[i + 1]; d = addDays(d, 6)) if (daysBetween(d, marks[i + 1]) >= 2 || d === marks[i]) out.push(d)
  return out.filter((d) => d <= LAST && c)
}
const flowerMixPlan = new Map<IsoDate, Plan>()
for (const p of plans) for (const d of flowerMixDays(p)) flowerMixPlan.set(d, p)

const tankLevel: Record<string, number> = {}
const holiday = (d: IsoDate) => d >= HOLIDAY.from && d <= HOLIDAY.to

/** Valeurs mesurées d'un jour, au centre de la cible ; `off` pousse une métrique hors cible (anomalie voulue). */
function measured(t: DayTargets, off?: { metric: string; dir: "high" | "low" }) {
  const v = (k: keyof DayTargets, fallback: [number, number], d = 1) => {
    const tg = t[k] as { lo: number; hi: number } | undefined
    const [lo, hi] = tg ? [tg.lo, tg.hi] : fallback
    if (off?.metric === k) {
      const w = Math.max(hi - lo, Math.abs(hi) * 0.1)
      return r(off.dir === "high" ? hi + w * 1.6 : Math.max(0, lo - w * 1.6), d)
    }
    return inBand(lo, hi, d)
  }
  return v
}

for (let d = START; d <= LAST; d = addDays(d, 1)) {
  for (const space of [COLUMN_ID, FLOWER_ID, DRY_ID]) {
    const c = cycleIn(space, d)
    if (!c) continue
    const p = planOf(c)
    const st = stageOn(c, d)

    // ---- événements du jour ----
    if (space === FLOWER_ID && d === p.transfer) {
      ev(d, "transfer", c, space, "Passage en pots de 15 L sur l'arrosage automatique", { products: [{ productId: "great-white" }] })
      events.push({ schemaVersion: SCHEMA.event, id: `ev-transplant-${c.id}`, date: d, type: "transplant", cycleId: c.id, spaceId: space, createdAt: iso(d, 12) })
    }
    if (space === FLOWER_ID && d === p.flip) ev(d, "flip", c, space, "Passage en 12/12")
    if (space === FLOWER_ID && d === fadeStart(c)) ev(d, "fade", c, space, "Fade à la place du Core (S8)")
    if (space === FLOWER_ID && d === flushStart(c)) ev(d, "flush", c, space, "Rinçage : eau osmosée + Cleanse 26 mL/10 L")
    if (space === DRY_ID && d === p.harvest) ev(d, "harvest", c, FLOWER_ID, "Récolte, plantes entières suspendues")
    if (space === DRY_ID && d === addDays(p.harvest, 10)) ev(d, "other", c, space, "Fin du séchage, mise en bocaux")

    // ---- bacs ----
    if (space === FLOWER_ID && flowerMixPlan.get(d)?.n === p.n && st.key !== "harvested") {
      const perDay = (st.key === "stretch" ? 6 : st.key === "flush" ? 9 : 8) * 450 * 4 / 1000
      const next = [...flowerMixPlan.keys()].filter((x) => x > d).sort()[0] ?? addDays(d, 6)
      const days = Math.min(7, Math.max(2, daysBetween(d, next)))
      const vol = Math.min(120, Math.ceil((perDay * days) / 5) * 5)
      makeMix(space, c, d, vol)
      tankLevel[space] = vol
    }
    if (space === COLUMN_ID && daysBetween(c.germinationDate!, d) % 7 === 0) makeMix(space, c, d, 15)

    if (holiday(d) || rnd() < 0.05) continue // jour sans saisie
    const now = iso(d, 7, Math.floor(between(5, 55)))
    const base: Entry = { schemaVersion: SCHEMA.entry, id: `${d}_${space}`, date: d, spaceId: space, cycleId: c.id, time: now.slice(11, 16), createdAt: now, updatedAt: now }
    const notes: string[] = []

    if (space === DRY_ID) {
      entries.push(derive({ ...base, tempDay: r(between(17.5, 19), 1), tempNight: r(between(16.5, 17.5), 1), rh: Math.round(between(57, 62)), leafOffsetC: 0 }))
      continue
    }

    const t = dayTargets(st.key, { mode: c.waterMode, substrate: c.substrate, flowerWeek: st.flowerWeek, cycleNumber: cycleNumber(c), line: LINE })
    if (!t) continue
    // Anomalie voulue : environ 1 jour sur 14 en Floraison.
    const offPool = ["ecRunoff", "phRunoff", "dryback", "runoffPct", "vpd"].filter((k) => t[k as keyof DayTargets] && !(k === "dryback" && d >= SENSOR_FROM))
    const off = space === FLOWER_ID && st.key !== "flush" && rnd() < 0.07 ? { metric: pick(offPool), dir: (rnd() < 0.5 ? "high" : "low") as "high" | "low" } : undefined
    const v = measured(t, off)
    const e: Entry = { ...base, leafOffsetC: -2 }

    // Climat
    const temp = r(st.key === "seedling" ? between(24.5, 26) : st.key === "finish" || st.key === "flush" ? between(22.5, 24) : between(25, 27), 1)
    e.tempDay = temp
    e.tempNight = r(temp - between(3, 5), 1)
    const vpdAim = off?.metric === "vpd" ? v("vpd", [0.8, 1.2], 2) : inBand(t.vpd!.lo, t.vpd!.hi, 2)
    e.rh = Math.round(rhForVpd(vpdAim, temp, -2) ?? 60)

    // Lumière
    const hours = st.key === "seedling" || st.key === "veg" ? 18 : 12
    e.photoperiodH = hours
    const colVeg = space === COLUMN_ID && daysBetween(c.germinationDate!, d) >= 14 // en vrai : de la végé dans la Colonne
    e.ppfd = Math.round(colVeg ? between(430, 520) : inBand(t.ppfd!.lo, t.ppfd!.hi, 0))
    if (!colVeg && t.dli && e.ppfd * hours * 0.0036 > t.dli.hi) e.ppfd = Math.floor(t.dli.hi / (hours * 0.0036)) - 5
    if (!colVeg && t.dli && e.ppfd * hours * 0.0036 < t.dli.lo) e.ppfd = Math.ceil(t.dli.lo / (hours * 0.0036)) + 5
    e.lightPct = space === COLUMN_ID ? (colVeg ? 100 : 60) : st.key === "veg" ? 70 : 100
    e.lightHeightCm = space === COLUMN_ID ? 35 : 45
    if (colVeg) e.rh = Math.round(between(62, 68))

    // Solution
    const mix = lastMix[space]
    if (mix) {
      e.mixId = mix.id
      e.ecIn = st.key === "flush" ? 0.06 : off?.metric === "ecIn" ? v("ecIn", [2, 3]) : r(t.ecIn!.lo === t.ecIn!.hi ? t.ecIn!.lo + (c.tapEc ?? 0) * 0 : inBand(t.ecIn!.lo, t.ecIn!.hi), 2)
      e.phIn = r(t.phIn!.lo === t.phIn!.hi ? t.phIn!.lo : inBand(t.phIn!.lo, t.phIn!.hi, 2), 2)
    }

    // Arrosage (Floraison, arrosage automatique)
    if (space === FLOWER_ID) {
      const shots = st.key === "stretch" ? 6 : st.key === "flush" ? 9 : st.key === "veg" ? 8 : st.key === "bulk" ? 8 : 7
      e.shots = shots
      e.volumePerPotMl = shots * 450
      const ro = t.runoffPct ? v("runoffPct", [8, 16]) : r(between(15, 25))
      e.runoffMl = Math.round((e.volumePerPotMl * ro) / 100)
      if (d >= SENSOR_FROM) {
        const peak = r(between(50, 55), 1)
        e.sensorPeakPct = peak
        e.sensorMorningPct = r(peak * (1 - between(0.15, 0.22)), 1)
        e.drybackMethod = "acinfinity"
      } else {
        const peak = r(between(12.9, 13.4), 2)
        const db = t.dryback ? v("dryback", [30, 40]) : r(between(30, 40))
        e.weightPeakKg = peak
        e.weightMorningKg = r(peak * (1 - db / 100), 2)
        e.drybackMethod = "weight"
      }
      e.ecRunoff = st.key === "flush" ? r(Math.max(0.3, 3.2 - (st.flowerDay! - 60) * 0.9), 1) : v("ecRunoff", [3, 5])
      e.phRunoff = st.key === "flush" ? r(between(6.0, 6.3), 2) : r(v("phRunoff", [5.8, 6.2], 2), 2)
      // Niveau du réservoir tous les 3 jours environ.
      tankLevel[space] = Math.max(0, (tankLevel[space] ?? 0) - (e.volumePerPotMl * 4) / 1000)
      if (rnd() < 0.35) e.reservoirL = Math.round(tankLevel[space])
    }

    // Plante
    const age = daysBetween(c.germinationDate!, d)
    const fd = st.flowerDay ?? 0
    e.heightCm = Math.round(st.key === "seedling" ? 4 + age * 0.6 : st.key === "veg" ? 26 + (age - 35) * 1.2 : Math.min(95, 34 + fd * 2.2) + between(-2, 2))

    // Propagation
    if (space === COLUMN_ID && age <= 10) {
      e.sownCount = 6
      e.germinatedCount = age < 2 ? 0 : age < 4 ? 3 : 5
      e.domeOn = age <= 7
    }

    // Actions et observations
    const actions: Entry["actions"] = []
    if (mix && mix.date === d) actions.push("newMix")
    if (space === FLOWER_ID && d === p.transfer) actions.push("transplant")
    if (space === FLOWER_ID && d === p.flip) actions.push("photoperiod")
    if (space === FLOWER_ID && st.key === "veg" && daysBetween(p.transfer, d) === 3) actions.push("lst")
    if (space === FLOWER_ID && (fd === 21 || fd === 42)) actions.push("defoliation")
    if (space === FLOWER_ID && fd === 14) actions.push("lollipop")
    if (space === FLOWER_ID && d === flushStart(c)) actions.push("flush")
    if (actions.length) e.actions = actions
    const obs: NonNullable<Entry["observations"]> = []
    if (off?.metric === "ecRunoff" && off.dir === "high") obs.push({ tag: "burntTips", severity: 1 }), notes.push("Pointes un peu brûlées.")
    if (space === FLOWER_ID && st.key === "finish" && fd >= 55) obs.push({ tag: "yellowing", severity: 1 }), notes.push("Jaunissement de fin de cycle, normal.")
    if (c.id === "cycle-3" && space === FLOWER_ID && fd >= 38 && fd <= 41) obs.push({ tag: "pests", severity: fd === 38 ? 2 : 1 }), notes.push(fd === 38 ? "Quelques thrips sous les feuilles, pièges jaunes posés." : "Thrips en baisse.")
    if (space === FLOWER_ID && d === addDays(p.transfer, 1)) obs.push({ tag: "droopy", severity: 1 }), notes.push("Un peu molles après le transfert.")
    if (obs.length) e.observations = obs
    if (d === p.flip && space === FLOWER_ID) notes.push("Passage en 12/12 ce matin.")
    if (notes.length) e.note = notes.join(" ")

    e.targets = snapshot(t)
    const out = derive(e)
    entries.push(out)
    if (off) injected.push({ date: d, space, metric: off.metric, dir: off.dir })

    // Hauteur par plante, une fois par semaine (dimanche) en Floraison.
    if (space === FLOWER_ID && new Date(`${d}T12:00:00Z`).getUTCDay() === 0)
      for (const pl of ["P1", "P2", "P3", "P4"] as PlantId[])
        entries.push({ schemaVersion: SCHEMA.entry, id: `${d}_${space}_${pl}`, date: d, spaceId: space, cycleId: c.id, plantId: pl, heightCm: Math.round((e.heightCm ?? 50) + between(-8, 8)), createdAt: now, updatedAt: now })
  }
}

// Changement de matériel en cours d'année.
events.push({ schemaVersion: SCHEMA.event, id: "ev-equipment-filtre", date: "2026-06-30", type: "equipment", spaceId: FLOWER_ID, equipmentId: "cloudline-s6", note: "Filtre à charbon remplacé", createdAt: iso("2026-06-30", 12) })
// Débit de la pompe remesuré à chaque transfert (dernier = début du cycle 5).
const pumpMeasures = [START, ...plans.map((p) => p.transfer).filter((d) => d <= LAST)]

// ---------- rappels ----------
const reminders: Reminder[] = []
function rem(id: string, title: string, start: string, rrule: string | undefined, spaceId: string | undefined, note?: string) {
  reminders.push({ schemaVersion: GROW_SCHEMA.reminder, id, kind: "custom", title, start, ...(rrule ? { rrule } : {}), ...(spaceId ? { spaceId } : {}), ...(note ? { note } : {}), alarmMin: 15, done: [], createdAt: iso(START, 9) })
}
rem("rem-goutteurs", "Vérifier les goutteurs", `2025-10-20T09:00`, "FREQ=WEEKLY;BYDAY=MO", FLOWER_ID)
rem("rem-ph", "Étalonner le pH-mètre", `2025-10-25T10:00`, "FREQ=MONTHLY", undefined)
rem("rem-grilles", "Changer les grilles de drain en cuivre", `2026-01-10T10:00`, "FREQ=MONTHLY;INTERVAL=6", FLOWER_ID, "Notice RAIN : environ tous les 6 mois.")
rem("rem-tuyau", "Réparer le tuyau de l'arrosage automatique", `2026-10-20T18:00`, undefined, FLOWER_ID)
rem("rem-bloom", "Commander un sac de Pro Bloom", `2026-10-22T12:00`, undefined, undefined)

export const data = { spaces, equipment, assignments, customProducts, grow: s.grow, cycles, plants, entries, mixes, events, reminders, stocks, injected, plans, pumpMeasures, SENSOR_FROM, HOLIDAY }
