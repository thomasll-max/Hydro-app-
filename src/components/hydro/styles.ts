// Shared « instrument » classes (lot 10h) for the controls drawn by hand in the screens.
import { cn } from "@/lib/utils"

const COLS = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 7: "grid-cols-7" } as const

/** Exclusive choices: joined boxes with one common outline (by default they wrap to more rows when there is no room). */
export const joined = (cols?: keyof typeof COLS, className?: string) =>
  cn(
    "grid overflow-hidden rounded-[10px] border border-line-strong",
    cols ? COLS[cols] : "[grid-template-columns:repeat(auto-fit,minmax(min(100%,4rem),1fr))]",
    className,
  )

/** One box of a `joined` group: the active one is filled, text and ground inverted. */
export const segment = (on: boolean, className?: string) =>
  cn(
    "flex min-h-11 min-w-0 items-center justify-center gap-1.5 px-2 py-1.5 text-center text-[0.8125rem] leading-tight font-semibold shadow-[1px_0_0_var(--line-strong),0_1px_0_var(--line-strong)] transition-colors",
    on ? "bg-fg text-background hover:text-background" : "text-fg-2 hover:text-fg",
    className,
  )

/** The same box for a ToggleGroupItem (Radix radios), whose state comes from data-state. */
export const segmentItem =
  "flex h-auto min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-none px-2 py-1.5 text-center text-[0.8125rem] leading-tight font-semibold whitespace-normal text-fg-2 transition-colors hover:bg-transparent hover:text-fg data-[spacing=0]:rounded-none data-[spacing=0]:shadow-[1px_0_0_var(--line-strong),0_1px_0_var(--line-strong)] data-[state=on]:bg-fg data-[state=on]:text-background data-[state=on]:hover:text-background"

/** Multiple choices (aria-pressed): one outlined box each, filled when on. */
export const toggle = (on: boolean, className?: string) =>
  cn(
    "flex min-h-11 items-center gap-1.5 rounded-[10px] border px-3.5 text-[0.8125rem] font-semibold transition-colors",
    on ? "border-fg bg-fg text-background hover:text-background" : "border-line-strong text-fg-2 hover:text-fg",
    className,
  )

/** Secondary button drawn by hand: 1 px outline, no fill. */
export const secondary =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-[10px] border border-line-strong px-3.5 text-[0.8125rem] font-semibold text-fg transition-colors hover:bg-surface-2"

/** Tertiary button: underlined text (« eau » underline, 4 px offset). */
export const tertiary =
  "inline-flex min-h-11 shrink-0 items-center gap-1 text-[0.8125rem] font-semibold text-fg underline decoration-water decoration-[1.5px] underline-offset-4"

/** Small icon button (close, previous / next): no fill, 44 px. */
export const iconButton = "flex size-11 shrink-0 items-center justify-center rounded-[10px] text-fg-2 hover:bg-surface-2"
