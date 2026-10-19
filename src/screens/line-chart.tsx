// A chart of Graphiques (lot 10k4, planche « Les menus »): straight segments between measurements, a dotted link over
// a day without measurement (the line stops only after more than 7 days), the target band of the day behind, points out
// of the target in « à surveiller », the tanks as dotted vertical lines, the curve in the space's colour. Touching the
// chart picks a day: its values replace the last ones in the header.
import type { PointerEvent } from "react"
import { useSettings } from "@/app/settings-context"
import { spaceColor } from "@/components/hydro/space-pill"
import { addDays, daysBetween } from "@/calc/stage"
import { CURVE_DEFS, GAP_DAYS, isOff, segments, type Series } from "@/calc/series"
import type { Space } from "@/model/grow"
import type { IsoDate } from "@/model/types"

const W = 340
const H = 120
const L = 30 // room for the values on the left
const R = 4
const B = 18 // room for the dates at the bottom
const T = 8

/** Up to 3 round values over [lo, hi]. */
function ticks(lo: number, hi: number, decimals: number): number[] {
  const f = 10 ** Math.min(decimals, 1)
  const a = Math.ceil(lo * f) / f
  const b = Math.floor(hi * f) / f
  if (b <= a) return [Math.round(((lo + hi) / 2) * f) / f]
  const m = Math.round(((a + b) / 2) * f) / f
  return [...new Set([a, m, b])]
}

export function LineChart({
  series,
  spaces,
  tanks,
  range,
  decimals,
  label,
  picked,
  onPick,
}: {
  series: Series[]
  spaces: Space[]
  tanks: IsoDate[]
  range: { from: IsoDate; to: IsoDate }
  decimals: number
  label: string
  picked?: IsoDate | null
  onPick?: (d: IsoDate | null) => void
}) {
  const { num, dm } = useSettings()
  const span = Math.max(1, daysBetween(range.from, range.to))
  const x = (d: IsoDate) => L + (daysBetween(range.from, d) / span) * (W - L - R)
  const all = series.flatMap((s) => s.points.flatMap((p) => [p.v, p.lo, p.hi].filter((v): v is number => v != null)))
  const vLo = Math.min(...all)
  const vHi = Math.max(...all)
  const flat = !(vHi > vLo)
  const pad = flat ? 1 : (vHi - vLo) * 0.1
  const lo = vLo - pad
  const hi = vHi + pad
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const band = series[0]?.points ?? []
  const many = series.reduce((n, s) => n + s.points.length, 0) > 45
  const dates = [...new Set([0, 1 / 3, 2 / 3, 1].map((k) => addDays(range.from, Math.round(k * span))))]
  const days = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort()
  // The day nearest to the finger (a tap again on the same day lets go).
  const pick = (e: PointerEvent<SVGSVGElement>, toggle: boolean) => {
    if (!onPick || !days.length) return
    const r = e.currentTarget.getBoundingClientRect()
    const at = ((e.clientX - r.left) / r.width) * W
    const near = days.reduce((a, d) => (Math.abs(x(d) - at) < Math.abs(x(a) - at) ? d : a), days[0])
    onPick(toggle && near === picked ? null : near)
  }
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={label}
      className="block touch-pan-y overflow-visible select-none"
      onPointerDown={(e) => pick(e, true)}
      onPointerMove={(e) => e.buttons && pick(e, false)}
    >
      {/* The target of each day, behind (it changes with the stage). */}
      {band.map((p, i) => {
        if (p.lo == null || p.hi == null) return null
        const next = band[i + 1]
        const x1 = x(p.date)
        const x2 = next ? x(next.date) : W - R
        return <rect key={p.date} x={x1} width={Math.max(1, x2 - x1)} y={y(p.hi)} height={Math.max(1, y(p.lo) - y(p.hi))} className="fill-water/15" data-band />
      })}
      {ticks(vLo, vHi, decimals).map((v) => (
        <text key={v} x={L - 6} y={y(v) + 3.5} textAnchor="end" className="fill-fg-3 font-num text-[10.5px]">
          {num(v, Math.min(decimals, 1))}
        </text>
      ))}
      {dates.map((d, i) => (
        <text key={d} x={x(d)} y={H - 3} textAnchor={i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle"} className="fill-fg-3 font-num text-[10.5px]">
          {dm(d)}
        </text>
      ))}
      {tanks.map((d) => (
        <line key={d} x1={x(d)} x2={x(d)} y1={T} y2={H - B} strokeDasharray="2 3" strokeWidth={1} className="stroke-fg-3" data-tank={d} />
      ))}
      {picked && <line x1={x(picked)} x2={x(picked)} y1={T} y2={H - B} strokeWidth={1} className="stroke-fg-2" data-picked={picked} />}
      {series.map((s) => {
        const color = spaceColor(spaces.find((sp) => sp.id === s.spaceId)?.color)
        const { solid, dotted } = segments(s.points, GAP_DAYS, CURVE_DEFS[s.curve].fromMixes ? Infinity : undefined)
        const last = s.points.at(-1)
        return (
          <g key={s.spaceId} data-series={s.spaceId}>
            {solid.map((piece) =>
              piece.length > 1 ? <polyline key={piece[0].date} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" points={piece.map((p) => `${x(p.date)},${y(p.v)}`).join(" ")} data-solid /> : null,
            )}
            {dotted.map(([a, b]) => (
              <line key={`${a.date}-${b.date}`} x1={x(a.date)} y1={y(a.v)} x2={x(b.date)} y2={y(b.v)} stroke={color} strokeWidth={1.6} strokeDasharray="3 3" data-dotted />
            ))}
            {s.points.map((p) => {
              const off = isOff(p)
              const show = off || !many || p === last || p.date === picked
              return show ? <circle key={p.date} cx={x(p.date)} cy={y(p.v)} r={p === last || p.date === picked ? 3.6 : off ? 3 : 2.4} fill={off ? "var(--warn)" : color} data-off={off || undefined} /> : null
            })}
          </g>
        )
      })}
    </svg>
  )
}
