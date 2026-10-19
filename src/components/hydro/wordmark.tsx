import { useId, type CSSProperties } from "react"
import { cn } from "@/lib/utils"

/** The drop with its leaf (logo « o », app icon, lot 10f). viewBox 0 0 100 125. */
export const DROP_PATH = "M50 4 C50 4 8 58 8 84 A42 42 0 0 0 92 84 C92 58 50 4 50 4 Z"
export const LEAF_PATH = "M50 114 C29 101 29 72 50 54 C71 72 71 101 50 114 Z"
export const VEIN_PATH = "M50 108 L50 64"

/**
 * The drop. `drop` is its colour, `bg` the colour of whatever it sits on (the leaf is cut out of it).
 * `fill` (0–1) draws only the bottom part of the drop, the rest as a faint outline (loading, reservoir gauge: lot 10g).
 */
export function Drop({
  height,
  drop = "var(--water)",
  bg = "var(--background)",
  leaf = true,
  fill,
  className,
  style,
  title,
}: {
  height: number | string
  drop?: string
  bg?: string
  leaf?: boolean
  fill?: number
  className?: string
  style?: CSSProperties
  title?: string
}) {
  const id = useId().replace(/:/g, "")
  const level = fill == null ? null : Math.max(0, Math.min(1, fill))
  // The drop spans y = 4 … 126: the fill line goes up from the bottom.
  const top = level == null ? 0 : 126 - 122 * level
  return (
    <svg
      viewBox="0 0 100 125"
      className={cn("shrink-0 overflow-visible", className)}
      style={{ height, width: typeof height === "number" ? height * 0.8 : `calc(${height} * 0.8)`, ...style }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {level == null ? (
        <path d={DROP_PATH} fill={drop} />
      ) : (
        <>
          <defs>
            <clipPath id={`dc${id}`}>
              <rect x="0" y={top} width="100" height={130 - top} />
            </clipPath>
          </defs>
          <path d={DROP_PATH} fill="none" stroke={drop} strokeWidth="5" strokeOpacity="0.45" />
          <path d={DROP_PATH} fill={drop} clipPath={`url(#dc${id})`} />
        </>
      )}
      {leaf && (
        <>
          <path d={LEAF_PATH} fill={bg} />
          <path d={VEIN_PATH} stroke={drop} strokeWidth="5" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

/**
 * The « hydro. » logo: the word in Fraunces 700 (SOFT 100), the « o » replaced by the drop, a real full stop in leaf green.
 * `size` is the font size in px; `bg` is the colour behind the logo (the leaf is cut out of the drop in it).
 */
export function Wordmark({ size = 24, bg = "var(--background)", className }: { size?: number; bg?: string; className?: string }) {
  return (
    <span
      role="img"
      aria-label="Hydro"
      className={cn("display inline-flex items-baseline leading-none whitespace-nowrap select-none", className)}
      style={{ fontSize: size, fontWeight: 700, letterSpacing: "-0.03em" }}
    >
      <span aria-hidden="true">hydr</span>
      {/* Board « identité finale »: the drop is 0.633 em tall, on the baseline, 1 px each side. */}
      <Drop height="0.633em" bg={bg} style={{ marginInline: 1, alignSelf: "baseline" }} />
      <span aria-hidden="true" style={{ color: "var(--leaf)" }}>
        .
      </span>
    </span>
  )
}
