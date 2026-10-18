import { Area, AreaChart, ReferenceArea, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

/**
 * Mini-curve with the target band behind it (shadcn Chart + Recharts ReferenceArea).
 * Out-of-band points turn orange; the last point is emphasized.
 */
export function Spark({
  data,
  lo,
  hi,
  domain,
  label,
  formatValue,
}: {
  data: { x: string; v: number }[]
  lo: number
  hi: number
  domain: [number, number]
  label: string
  formatValue: (v: number) => string
}) {
  const config = { v: { label, color: "var(--primary)" } } satisfies ChartConfig
  const last = data.length - 1
  const Dot = (p: { cx?: number; cy?: number; index?: number; payload?: unknown }) => {
    const v = (p.payload as { v?: number } | undefined)?.v ?? 0
    const out = v < lo || v > hi
    return (
      <circle
        key={p.index}
        cx={p.cx}
        cy={p.cy}
        r={p.index === last ? 4 : 2.5}
        fill={out ? "var(--warn)" : "var(--primary)"}
        stroke="var(--surface)"
        strokeWidth={1.5}
      />
    )
  }
  return (
    <ChartContainer config={config} className="aspect-auto h-[84px] w-full" initialDimension={{ width: 320, height: 84 }}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-v)" stopOpacity={0.28} />
            <stop offset="1" stopColor="var(--color-v)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="x" hide />
        <YAxis domain={domain} hide />
        <ReferenceArea y1={lo} y2={hi} fill="var(--primary)" fillOpacity={0.09} stroke="none" radius={4} ifOverflow="hidden" />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideIndicator formatter={(v) => <span className="tabular">{formatValue(Number(v))}</span>} />}
        />
        <Area
          dataKey="v"
          type="monotone"
          stroke="var(--color-v)"
          strokeWidth={2.2}
          fill="url(#spark-fill)"
          dot={Dot}
          activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--surface)", strokeWidth: 2 }}
          animationDuration={1400}
          animationBegin={300}
        />
      </AreaChart>
    </ChartContainer>
  )
}
