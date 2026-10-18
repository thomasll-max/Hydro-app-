// Concentrate jerrycans (Athena method, docs/athena-fiche.md): a whole bag dissolved per product, one jerrycan per
// product, Core never mixed with Grow or Bloom. Stock = litres made − mL drawn by the tanks saved since.
import type { ConcentrateStock } from "@/model/grow"
import type { IsoDate, Mix } from "@/model/types"

/** Litres a whole bag makes: bag weight ÷ strength (0.9 kg → ≈ 4.0 L at 226 g/L; 11.3 kg → 50 L). */
export function bagLitres(bagKg: number, gPerL: number): number {
  return Math.round(((bagKg * 1000) / gPerL) * 10) / 10
}

/** Water to start with (≈ 80 % of the final volume), then the whole bag, 15–45 min of mixing, top up, 1–2 min more. */
export function startWaterL(finalL: number): number {
  return Math.round(finalL * 0.8 * 10) / 10
}

/** Strength of a concentrate item of a saved tank (v3 tanks wrote it in the unit: "mL @226 g/L"). */
function itemConcentrate(i: NonNullable<Mix["items"]>[number]): number | undefined {
  if (i.concentrate) return i.concentrate
  const m = /@(\d+)/.exec(i.unit)
  return m ? Number(m[1]) : undefined
}

/** mL of a product's concentrate drawn by one tank. */
export function drawnMl(mix: Mix, productId: string, gPerL: number): number {
  return (mix.items ?? []).filter((i) => i.id === productId && i.qty != null && itemConcentrate(i) === gPerL).reduce((s, i) => s + (i.qty ?? 0), 0)
}

/** The jerrycan a tank drew from: the latest one of that product and strength made on or before the tank, still open then. */
function stockFor(stocks: ConcentrateStock[], productId: string, gPerL: number, date: IsoDate): ConcentrateStock | undefined {
  return stocks
    .filter((s) => s.productId === productId && s.gPerL === gPerL && s.madeOn <= date && (!s.finishedOn || date < s.finishedOn))
    .sort((a, b) => b.madeOn.localeCompare(a.madeOn) || b.id.localeCompare(a.id))[0]
}

export type StockStatus = {
  stock: ConcentrateStock
  leftL: number
  usedL: number
  /** What the last tank drew (L), the basis of "tanks left". */
  lastDrawL?: number
  tanksLeft?: number
  /** Fewer than LOW_TANKS tanks left at the last draw (estimate). */
  low: boolean
  empty: boolean
  /** Date of the tank after which the stock went low (stable deadline date). */
  lowSince?: IsoDate
}

/** "Presque vide": not enough left for 2 more tanks like the last one (time to dissolve a new bag). */
export const LOW_TANKS = 2

export function stockStatus(stock: ConcentrateStock, stocks: ConcentrateStock[], mixes: Mix[]): StockStatus {
  const mine = [...mixes]
    .filter((m) => m.date >= stock.madeOn && (!stock.finishedOn || m.date < stock.finishedOn))
    .filter((m) => stockFor(stocks, stock.productId, stock.gPerL, m.date)?.id === stock.id)
    .map((m) => ({ m, ml: drawnMl(m, stock.productId, stock.gPerL) }))
    .filter((x) => x.ml > 0)
    .sort((a, b) => a.m.date.localeCompare(b.m.date) || a.m.id.localeCompare(b.m.id))
  let left = stock.litresMade
  let lowSince: IsoDate | undefined
  let lastDraw: number | undefined
  for (const { m, ml } of mine) {
    left -= ml / 1000
    lastDraw = ml / 1000
    if (!lowSince && left < LOW_TANKS * lastDraw) lowSince = m.date
  }
  const leftL = Math.max(0, Math.round(left * 100) / 100)
  const tanksLeft = lastDraw ? Math.floor((leftL + 1e-9) / lastDraw) : undefined
  return {
    stock,
    leftL,
    usedL: Math.round((stock.litresMade - left) * 100) / 100,
    lastDrawL: lastDraw,
    tanksLeft,
    low: !!lowSince,
    empty: leftL <= 0 || (lastDraw != null && leftL < lastDraw),
    lowSince,
  }
}

/** Open jerrycans (not marked finished), newest first. */
export function openStocks(stocks: ConcentrateStock[], line?: string): ConcentrateStock[] {
  return stocks.filter((s) => !s.finishedOn && (!line || s.line === line)).sort((a, b) => b.madeOn.localeCompare(a.madeOn))
}
