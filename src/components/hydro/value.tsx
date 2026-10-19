// A number with its unit (lot 10k, « calme »): one look for every value of the app.
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** The narrow no-break space between a number and its unit: « 38 % », « 4,0 mS/cm ». */
export const NNBSP = "\u202f"

/**
 * Geologica 600 with tabular figures (columns stay aligned); the unit smaller (half size for the big readings), weight
 * 500, quieter, after a narrow no-break space. `size`: lg ≈ 30 px (readings), md ≈ 22 px, sm = the size of the text.
 */
export function Value({ children, unit, size = "sm", className, tone }: { children: ReactNode; unit?: string; size?: "lg" | "md" | "sm"; className?: string; tone?: "warn" | "bad" | "muted" }) {
  return (
    <span
      className={cn(
        "font-num font-semibold whitespace-nowrap",
        size === "lg" && "text-[1.875rem] leading-none tracking-[-0.02em]",
        size === "md" && "text-[1.375rem] leading-none tracking-[-0.02em]",
        tone === "warn" && "text-warn",
        tone === "bad" && "text-bad",
        tone === "muted" && "text-fg-3",
        className,
      )}
    >
      {children}
      {unit && (
        <span className={cn("font-medium text-fg-3", size === "sm" ? "text-[0.85em]" : "text-[0.5em]")}>
          {NNBSP}
          {unit}
        </span>
      )}
    </span>
  )
}
