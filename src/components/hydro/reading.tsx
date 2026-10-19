// A reading (lot 10h « instrument »): the value tiles of Aujourd'hui become a measuring instrument's display.
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { status as statusOf, type Status } from "@/calc/advice"
import type { Target } from "@/calc/targets"
import { useSettings } from "@/app/settings-context"
import { InfoTip, type Term } from "./info"
import { Emoji } from "./emoji"
import type { EmojiName } from "@/assets/emoji"

/** Where the bar starts and ends: the target with as much room on each side, widened to today's value. */
export function readingScale(value: number | undefined, target?: Pick<Target, "lo" | "hi">, max?: number): [number, number] | null {
  if (target) {
    const span = target.hi - target.lo || Math.abs(target.hi) * 0.2 || 1
    let lo = Math.max(0, target.lo - span)
    let hi = target.hi + span
    if (value != null && value < lo) lo = value - span * 0.2
    if (value != null && value > hi) hi = value + span * 0.2
    return [lo, hi]
  }
  if (max != null) return [0, Math.max(max, value ?? 0)]
  return null
}

const pct = (v: number, [lo, hi]: [number, number]) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))

/**
 * Small label, the value in mono (~30 px) with its unit, a 6 px bar with the target zone in transparent « eau » and a
 * tick at today's value, the target in mono under it. Out of target: the tick and the value in « à surveiller » or
 * « alerte ». Targets are the real ones of the day (`dayTargets`), never made up: no target, no zone.
 */
export function Reading({
  label,
  term,
  value,
  decimals = 1,
  unit,
  target,
  metric,
  max,
  note,
  children,
  id,
  emoji,
  compact,
}: {
  label: string
  term?: Term
  value?: number
  decimals?: number
  unit?: string
  target?: Pick<Target, "lo" | "hi">
  /** For the pH margin of `status`. */
  metric?: string
  /** Bar scale when there is no target (the value is then shown without a zone). */
  max?: number
  /** Written instead of the target (a sensor scale, PPFD…). */
  note?: string
  /** Shown instead of the number (temperature / RH). */
  children?: ReactNode
  id?: string
  /** A small drawing before the label (lot 10j, the cards of the spaces). */
  emoji?: EmojiName
  /** The cards of the spaces (lot 10j): a smaller value, the bar kept, no line under it. */
  compact?: boolean
}) {
  const { t, num, range } = useSettings()
  const st: Status | undefined = value != null && target ? statusOf(value, target, metric) : undefined
  const scale = value != null || target ? readingScale(value, target, max) : null
  return (
    <div className="min-w-0" id={id} data-status={st}>
      <div className={cn("flex min-w-0 items-center gap-1 text-[0.75rem]", compact ? "text-fg-2" : "text-fg-3")}>
        {emoji && <Emoji name={emoji} size={15} className="mr-0.5" />}
        <span className="min-w-0 truncate">{label}</span>
        {term && <InfoTip term={term} />}
      </div>
      <div className="mt-0.5 flex min-w-0 items-baseline gap-1">
        <span className={cn("truncate font-mono leading-none font-medium tracking-[-0.02em] tabular-nums", compact ? "text-[1.375rem]" : "text-[1.875rem]", st === "warn" && "text-warn", st === "bad" && "text-bad", value == null && !children && "text-fg-3")}>
          {children ?? (value != null ? num(value, decimals) : "—")}
        </span>
        {unit && value != null && <span className="font-mono text-[0.75rem] text-fg-3">{unit}</span>}
      </div>
      {scale && (
        <div className={cn("relative h-1.5 rounded-[3px] bg-track", compact ? "mt-1.5" : "mt-2")} aria-hidden="true">
          {target && (
            <span
              data-zone
              className="absolute inset-y-0 rounded-[3px] bg-water/35"
              style={{ left: `${pct(target.lo, scale)}%`, width: `${pct(target.hi, scale) - pct(target.lo, scale)}%` }}
            />
          )}
          {value != null && (
            <span
              data-tick
              className={cn("absolute -top-[3px] h-3 w-0.5 -translate-x-1/2 rounded-[1px]", st === "warn" ? "bg-warn" : st === "bad" ? "bg-bad" : "bg-fg")}
              style={{ left: `${pct(value, scale)}%` }}
            />
          )}
        </div>
      )}
      {!compact && (
        <div className="mt-1.5 truncate font-mono text-[0.75rem] text-fg-3">
          {target ? `${t("today.target")} ${range(target.lo, target.hi, decimals)}${unit ? ` ${unit}` : ""}` : (note ?? "")}
        </div>
      )}
    </div>
  )
}
