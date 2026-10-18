import { useEffect, useState } from "react"
import { NumberTicker } from "@/components/magicui/number-ticker"
import { arcDash, clamp01 } from "@/lib/geometry"

/**
 * Arc gauge with a target band — adapted from Magic UI AnimatedCircularProgressBar:
 * same stroke-dash technique, reshaped to the maquette's 270° arc with a highlighted band.
 */
export function ArcGauge({
  value,
  lo,
  hi,
  max,
  min = 0,
  decimals = 0,
  unit,
  locale,
  delay = 0.25,
  tone = "ok",
}: {
  value: number
  lo: number
  hi: number
  max: number
  min?: number
  decimals?: number
  unit?: string
  locale: string
  delay?: number
  tone?: "ok" | "warn" | "bad"
}) {
  const f = (x: number) => clamp01((x - min) / (max - min))
  const track = arcDash(0, 1)
  const band = arcDash(f(lo), f(hi))
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const id = setTimeout(() => setShown(f(value)), delay * 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, min, max, delay])

  const common = {
    cx: 50,
    cy: 50,
    r: 40,
    fill: "none",
    strokeWidth: 9,
    strokeLinecap: "round" as const,
    transform: "rotate(135 50 50)",
  }
  return (
    <div className="relative mx-auto my-1.5 size-[92px]">
      <svg viewBox="0 0 100 100" className="size-full" aria-hidden="true">
        <circle {...common} stroke="var(--track)" strokeDasharray={track.dasharray} strokeDashoffset={track.dashoffset} />
        <circle
          {...common}
          stroke="color-mix(in srgb, var(--primary) 28%, transparent)"
          strokeDasharray={band.dasharray}
          strokeDashoffset={band.dashoffset}
        />
        <circle
          {...common}
          stroke={tone === "bad" ? "var(--bad)" : tone === "warn" ? "var(--warn)" : "var(--primary)"}
          strokeDasharray={`${track.length} ${track.circumference}`}
          strokeDashoffset={track.length - shown * track.length}
          style={{ transition: "stroke-dashoffset 1.4s var(--ease)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pt-1 text-[22px] font-semibold tracking-[-0.5px] tabular">
        <NumberTicker value={value} decimalPlaces={decimals} locale={locale} delay={delay} />
        {unit && <span className="ml-0.5 text-[12px] font-medium text-fg-3">{unit}</span>}
      </div>
    </div>
  )
}
