// Rejoue l'année jour par jour avec les fonctions de l'app et note tout ce qui cloche.
import fs from "node:fs"
import path from "node:path"
import { data, START, TODAY, OUT } from "./generate"
import { asOf, toBackup } from "./build"
import { addDays, daysBetween, stageOn } from "../../src/calc/stage"
import { dayTargets, cycleNumber } from "../../src/calc/targets"
import { oneCorrection, pills } from "../../src/calc/advice"
import { buildDailyDigest } from "../../src/calc/digest"
import { spaceContext } from "../../src/calc/space-context"
import { deadlines, deadlineState } from "../../src/calendar/deadlines"
import { calendarItems } from "../../src/calendar/agenda"
import { buildIcs } from "../../src/calendar/ics"
import { openStocks, stockStatus } from "../../src/calc/concentrate"
import { CURVES, buildSeries, indexEntries, periodRange } from "../../src/calc/series"
import { backupJson, entriesCsv, exportBackup, importBackup, parseBackup } from "../../src/lib/backup"
import { MemoryStore } from "../../src/store/memory-store"
import { balanceHistory, predictBalance } from "../../src/calc/balance"
import type { IsoDate } from "../../src/model/types"

type Finding = { kind: string; date?: IsoDate; space?: string; detail: string }
const findings: Finding[] = []
const add = (f: Finding) => findings.push(f)
const stats: Record<string, number> = {}
const inc = (k: string, n = 1) => (stats[k] = (stats[k] ?? 0) + n)

const cycleById = (id?: string) => data.cycles.find((c) => c.id === id)

// ---------- A. chaque saisie : stade, cibles, conseil ----------
for (const e of data.entries) {
  if (e.plantId || e.spaceId === "sechage") continue
  inc("saisies vérifiées")
  const c = cycleById(e.cycleId)!
  const st = stageOn(c, e.date)
  if (e.targets?.stage !== st.key) add({ kind: "stade incohérent", date: e.date, space: e.spaceId, detail: `${e.targets?.stage} ≠ ${st.key}` })
  const t = dayTargets(st.key, { mode: c.waterMode, substrate: c.substrate, flowerWeek: st.flowerWeek, cycleNumber: cycleNumber(c), line: c.nutrientLine })
  if (!t) continue
  const adv = oneCorrection(e, t, c.waterMode)
  const inj = data.injected.find((i) => i.date === e.date && i.space === e.spaceId)
  if (inj) {
    inc("anomalies injectées")
    if (!adv) add({ kind: "anomalie non signalée", date: e.date, space: e.spaceId, detail: `${inj.metric} ${inj.dir}` })
    else if (adv.metric !== inj.metric || adv.dir !== inj.dir) add({ kind: "conseil sur une autre valeur", date: e.date, space: e.spaceId, detail: `injecté ${inj.metric} ${inj.dir}, conseil ${adv.metric} ${adv.dir}` })
    else inc("anomalies bien signalées")
  } else if (adv) {
    const p = pills(e, t)
    const vals = Object.entries(p).filter(([, s]) => s !== "ok").map(([k, s]) => `${k}=${(e as Record<string, unknown>)[k]} (${s}, cible ${t[k as keyof typeof t] && JSON.stringify({ lo: (t as any)[k].lo, hi: (t as any)[k].hi })})`)
    const colVeg = e.spaceId === "colonne" && st.key === "seedling" && daysBetween(c.germinationDate!, e.date) >= 14
    add({ kind: colVeg ? "végé en Colonne jugée comme un semis" : "fausse alerte", date: e.date, space: e.spaceId, detail: vals.join(" ; ") })
  }
}

// ---------- B. chaque matin : carte Bonjour, échéances, calendrier, réservoir, bidons ----------
const overdueSeen = new Map<string, { first: IsoDate; last: IsoDate; kind: string }>()
const digestSamples: Record<string, string> = {}
for (let D = addDays(START, 1); D <= TODAY; D = addDays(D, 1)) {
  const x = asOf(D)
  const dd = { ...x, sites: [], concentrateStocks: x.concentrateStocks }
  inc("matins rejoués")
  try {
    const dg = buildDailyDigest(dd, D, "fr")
    if (/NaN|undefined|null|\{\w+\}|Infinity/.test(dg.text)) add({ kind: "texte cassé dans la carte Bonjour", date: D, detail: dg.text.split("\n").filter((l) => /NaN|undefined|null|\{\w+\}|Infinity/.test(l)).join(" | ") })
    if (["2025-10-23", "2026-01-21", "2026-02-01", "2026-02-08", "2026-07-25", "2026-09-10", TODAY].includes(D)) digestSamples[D] = dg.text
    const after = daysBetween(data.HOLIDAY.to, D)
    if (after === 1) {
      const fl = dg.spaces.find((s) => s.spaceId === "floraison")
      const last = fl?.lines.find((l) => l.kind === "lastEntry")
      if (!last?.warn) add({ kind: "trou de saisie non signalé", date: D, detail: last?.text ?? "pas de ligne" })
      else inc("trou de saisie signalé")
    }
    for (const s of dg.spaces) for (const l of s.lines) if (l.kind === "reservoir" && l.warn) inc(`alerte réservoir (${s.name})`)
  } catch (err) {
    add({ kind: "plantage carte Bonjour", date: D, detail: String(err) })
  }
  try {
    const dl = deadlines(dd, D)
    for (const d of dl) {
      const st = deadlineState(d, x.reminders)
      if (!st.done && st.date < D) {
        const o = overdueSeen.get(d.key)
        overdueSeen.set(d.key, { first: o?.first ?? D, last: D, kind: d.kind })
      }
    }
    const items = calendarItems(dd, D, addDays(D, 30), D, "Europe/Oslo")
    if (items.some((i) => !i.date || Number.isNaN(Date.parse(i.date)))) add({ kind: "date invalide dans le calendrier", date: D, detail: "" })
  } catch (err) {
    add({ kind: "plantage échéances / calendrier", date: D, detail: String(err) })
  }
  for (const sp of x.spaces) {
    const ctx = spaceContext(sp, x, D)
    const a = ctx.autonomy
    if (a?.days.ok && (a.days.value < 0 || !Number.isFinite(a.days.value) || a.days.value > 60)) add({ kind: "autonomie du réservoir aberrante", date: D, space: sp.id, detail: `${a.days.value} j` })
    if (sp.id === "floraison" && !ctx.cycle && D > "2025-11-24") inc("matins sans cycle en Floraison")
    if (sp.id === "floraison" && a?.tooOld) inc("matins « solution trop vieille » en Floraison")
  }
  for (const st of openStocks(x.concentrateStocks)) {
    const s = stockStatus(st, x.concentrateStocks, x.mixes)
    if (s.leftL < 0 || Number.isNaN(s.leftL)) add({ kind: "stock de concentré négatif", date: D, detail: `${st.productId} ${s.leftL}` })
  }
}
for (const [key, o] of overdueSeen) {
  const days = daysBetween(o.first, o.last) + 1
  if (days > 3) add({ kind: "échéance en retard qui traîne", date: o.first, detail: `${o.kind} (${key}) : en retard ${days} matins, jusqu'au ${o.last}` })
}

// ---------- C. fin d'année : graphiques, export, import, CSV, .ics, Balance ----------
const x = asOf(TODAY)
const idx = indexEntries(x.entries)
for (const sp of ["floraison", "colonne", "sechage"]) {
  for (const period of ["7", "30", "cycle"] as const) {
    const rg = periodRange(period, TODAY, x.cycles.filter((c) => c.spaceId === sp || (c.transfers ?? []).some((t) => t.to === sp)))
    for (const curve of CURVES) {
      const s = buildSeries(curve, sp, rg, { byspace: idx, mixes: x.mixes, potCount: 4 })
      if (s.points.some((p) => !Number.isFinite(p.v))) add({ kind: "point de graphique invalide", detail: `${sp} ${curve} ${period}` })
      if (period === "cycle" && sp === "floraison" && curve === "dryback") stats[`graph Floraison dryback « cycle » : du ${rg.from} au ${rg.to}`] = s.points.length
    }
  }
}
{
  const year = { from: START, to: TODAY }
  const s = buildSeries("ecRunoff", "floraison", year, { byspace: idx, mixes: x.mixes, potCount: 4 })
  stats["points EC runoff sur 1 an (après réduction)"] = s.points.length
}
const bk = toBackup(x, TODAY)
const json = backupJson(bk)
stats["taille de la sauvegarde (Ko)"] = Math.round(json.length / 1024)
const parsed = parseBackup(json)
if (!parsed.ok) add({ kind: "sauvegarde illisible", detail: JSON.stringify(parsed) })
else {
  const store = new MemoryStore()
  const t0 = Date.now()
  await importBackup(store, parsed.backup, "replace")
  stats["import en mémoire (ms)"] = Date.now() - t0
  const back = await exportBackup(store, "test")
  for (const [c, docs] of Object.entries(bk.collections)) if (Object.keys(docs).length !== Object.keys(back.collections[c as keyof typeof back.collections] ?? {}).length) add({ kind: "aller-retour export/import incomplet", detail: c })
}
const csv = entriesCsv(x.entries, (id) => x.spaces.find((s) => s.id === id)?.name ?? id)
stats["lignes du CSV"] = csv.split("\n").length - 1
try {
  const dls = deadlines({ ...x, sites: [] }, TODAY).map((d) => ({ deadline: d, title: d.kind, date: d.date }))
  const ics = buildIcs({ reminders: x.reminders, deadlines: dls, tz: "Europe/Oslo", now: new Date(`${TODAY}T08:00:00Z`), calName: "Hydro", alarmText: (t) => t })
  stats["lignes du .ics"] = ics.split("\n").length
} catch (err) {
  add({ kind: "export .ics", detail: String(err).slice(0, 200) })
}
const hist = balanceHistory(x.mixes, "athena-pro")
const pred = predictBalance(hist, 80, { phBefore: 5.35, target: { lo: 5.8, hi: 6.2 } })
stats["bacs dans l'historique Balance"] = hist.length
stats["prédiction Balance pour 80 L"] = pred ? JSON.stringify(pred) as never : -1
const stocksEnd = openStocks(x.concentrateStocks).map((st) => {
  const s = stockStatus(st, x.concentrateStocks, x.mixes)
  return `${st.productId} fait le ${st.madeOn} : reste ${s.leftL} L${s.low ? " (presque vide)" : ""}`
})

const byKind: Record<string, number> = {}
for (const f of findings) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1
const out = { stats, byKind, findings, stocksEnd, digestSamples, injected: data.injected.length }
fs.writeFileSync(path.join(OUT, "validation.json"), JSON.stringify(out, null, 1))
console.log(JSON.stringify({ stats, byKind, stocksEnd }, null, 1))
