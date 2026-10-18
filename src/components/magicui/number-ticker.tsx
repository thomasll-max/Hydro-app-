
import { useEffect, useRef, type ComponentPropsWithoutRef } from "react"
import { useInView, useMotionValue, useSpring } from "motion/react"

import { cn } from "@/lib/utils"

// Magic UI NumberTicker — adapted: locale-aware formatting (FR 2,0 / EN 2.0), theme tokens for color,
// and re-formatting when the language changes.

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  startValue?: number
  direction?: "up" | "down"
  delay?: number
  decimalPlaces?: number
  locale?: string
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  locale = "fr-FR",
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(direction === "down" ? value : startValue)
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  })
  const isInView = useInView(ref, { once: true, margin: "0px" })

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    if (isInView) {
      timer = setTimeout(() => {
        motionValue.set(direction === "down" ? startValue : value)
      }, delay * 1000)
    }

    return () => {
      if (timer !== null) {
        clearTimeout(timer)
      }
    }
  }, [motionValue, isInView, delay, value, direction, startValue])

  useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (ref.current) {
          ref.current.textContent = Intl.NumberFormat(locale, {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
          }).format(Number(latest.toFixed(decimalPlaces)))
        }
      }),
    [springValue, decimalPlaces, locale]
  )

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = Intl.NumberFormat(locale, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(Number(springValue.get().toFixed(decimalPlaces)))
    }
  }, [locale, decimalPlaces, springValue])

  return (
    <span
      ref={ref}
      className={cn(
        "inline-block tabular-nums",
        className
      )}
      {...props}
    >
      {Intl.NumberFormat(locale, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(direction === "down" ? value : startValue)}
    </span>
  )
}
