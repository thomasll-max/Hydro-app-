import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

// Was Magic UI NumberTicker (counted up from 0). Since lot 10f2 the value is shown as it is, like the screen of a meter:
// no counting animation. Locale-aware formatting (FR 2,0 / EN 2.0). `delay` is kept by the call sites.

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  delay?: number
  decimalPlaces?: number
  locale?: string
}

export function NumberTicker({ value, delay: _delay, className, decimalPlaces = 0, locale = "fr-FR", ...props }: NumberTickerProps) {
  void _delay
  return (
    <span className={cn("inline-block tabular-nums", className)} {...props}>
      {Intl.NumberFormat(locale, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces }).format(value)}
    </span>
  )
}
