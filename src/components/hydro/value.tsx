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

/**
 * A short phrase whose numbers take the number font (lot 10k: « bidon ≈ 2 j », « dernière saisie hier à 07:24 »): a
 * number in Geologica 600 at the size of the text, a date or a time (« 07/02 », « 11:20 ») in Geologica 500.
 */
export function NumText({ children, quiet }: { children: string; /** A quiet line (a stage under a name): every number in 500. */ quiet?: boolean }) {
  const parts = children.split(/(\d+(?:[.,:/]\d+)*)/)
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <span key={i} className={cn("font-num", quiet || /[:/]/.test(p) ? "font-medium" : "font-semibold")}>{p}</span> : p))}
    </>
  )
}
