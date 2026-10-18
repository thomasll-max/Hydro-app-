// Pure geometry for the arc gauge (270° sweep, maquette style).

export const GAUGE = { r: 40, sweep: 0.75 } as const

export type Status = "ok" | "warn" | "bad"

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x))
}

/** Dash pattern for an arc from fraction a to b of the 270° sweep. */
export function arcDash(a: number, b: number, r = GAUGE.r) {
  const c = 2 * Math.PI * r
  const len = GAUGE.sweep * c
  const from = clamp01(a)
  const to = clamp01(b)
  return { dasharray: `${Math.max(0, to - from) * len} ${c}`, dashoffset: -from * len, length: len, circumference: c }
}

/** In band → ok; within `tol` of the band (fraction of its width) → warn; else bad. */
export function bandStatus(value: number, lo: number, hi: number, tol = 1): Status {
  if (value >= lo && value <= hi) return "ok"
  const margin = (hi - lo) * tol
  return value >= lo - margin && value <= hi + margin ? "warn" : "bad"
}
