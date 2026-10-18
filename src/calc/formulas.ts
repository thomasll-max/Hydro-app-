// Pure formulas. Every function is unit-tested (formulas.test.ts).

/** Saturation vapour pressure, kPa — Tetens formula. */
export function svp(tempC: number): number {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3))
}

/** Leaf VPD, kPa. Leaf temperature = air + offset (default −2 °C). */
export function vpd(airC: number, rhPct: number, leafOffsetC = -2): number {
  return svp(airC + leafOffsetC) - svp(airC) * (rhPct / 100)
}

/** Dryback %, from the witness pot: (peak − morning trough) ÷ peak. */
export function dryback(peakKg: number, troughKg: number): number {
  return ((peakKg - troughKg) / peakKg) * 100
}

/** Runoff % of the volume given. */
export function runoffPct(givenMl: number, runoffMl: number): number {
  return (runoffMl / givenMl) * 100
}

/** Volume (mL) for a given % of the pot volume. 1 % of 15 L = 150 mL. */
export function potPctToMl(potL: number, pct: number): number {
  return potL * 10 * pct
}

/** Duration of one shot, seconds = volume ÷ measured flow. */
export function shotSeconds(volumeMl: number, flowMlPerMin: number): number {
  return (volumeMl / flowMlPerMin) * 60
}

/** DLI, mol/m²/day = PPFD × hours × 0.0036. */
export function dli(ppfd: number, hours: number): number {
  return ppfd * hours * 0.0036
}

/** PPFD needed for a DLI target. */
export function ppfdForDli(dliTarget: number, hours: number): number {
  return dliTarget / (hours * 0.0036)
}

export function round(v: number, decimals = 1): number {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/** Accepts "2,4", "2.4", " 2 " → 2.4; anything else → undefined. */
export function parseNum(s: string | undefined | null): number | undefined {
  if (s == null) return undefined
  const t = String(s).trim().replace(",", ".")
  if (t === "" || !/^-?\d*\.?\d+$/.test(t)) return undefined
  return Number(t)
}
