import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { Status } from "@/lib/geometry"
import type { EmojiName } from "@/assets/emoji"
import { Emoji } from "./emoji"
import { LineIcon } from "./line-icon"

/**
 * Screen title. Since lot 10f2 there is no illustration next to it (the 3D emojis stay for the assistant, empty
 * states and rare moments): `emoji` is kept by the call sites but no longer drawn.
 */
export function ScreenHero({
  eyebrow,
  title,
  children,
}: {
  emoji?: EmojiName
  eyebrow?: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="mt-2 mb-4 flex items-center gap-3.5">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="display mt-0.5 text-[1.75rem] leading-[1.1] [overflow-wrap:anywhere]">{title}</h1>
        {children}
      </div>
    </div>
  )
}

export function Chips({ children }: { children: ReactNode }) {
  return <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
}

export function Chip({ tone = "neutral", children }: { tone?: "neutral" | "primary" | "warn" | "water" | "leaf"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-[0.75rem] font-semibold whitespace-nowrap",
        tone === "neutral" && "border-line bg-surface-2 text-fg-2",
        tone === "primary" && "border-primary/35 bg-primary/10 text-primary",
        tone === "warn" && "border-warn/35 bg-warn/10 text-warn",
        tone === "water" && "border-water/40 bg-water/10 text-water-ink",
        tone === "leaf" && "border-leaf/45 bg-leaf/10 text-leaf-ink",
      )}
    >
      {children}
    </span>
  )
}

export function Label({ emoji, children, className }: { emoji?: EmojiName; children: ReactNode; className?: string }) {
  return (
    <div className={cn("eyebrow flex items-center gap-1.5", className)}>
      {emoji && <LineIcon name={emoji} size={17} />}
      <span>{children}</span>
    </div>
  )
}

export function Dot({ status }: { status: Status }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-[7px] shrink-0 rounded-full",
        status === "ok" && "bg-primary",
        status === "warn" && "bg-warn",
        status === "bad" && "bg-bad",
      )}
    />
  )
}

/**
 * Card wrapper. Until lot 10f the cards faded in one after the other; that systematic entrance is gone (only screen
 * transitions and action feedback move). `i` is kept by the call sites.
 */
export function Reveal({ className, children }: { i?: number; className?: string; children: ReactNode }) {
  return <div className={className}>{children}</div>
}

export function SourceNote({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-center text-[0.75rem] leading-[1.5] text-fg-3">{children}</p>
}

/** Polished empty state for a tab or tool that arrives in a later batch ("Arrive au lot X"). Never a broken page. */
export function ComingSoon({ emoji, title, lot, body, foot }: { emoji: EmojiName; title: string; lot: string; body: string; foot?: string }) {
  return (
    <div className="relative overflow-hidden rounded-[var(--r-xl)] border border-line bg-surface px-5 py-6 text-center">
      <Emoji name={emoji} size={84} className="relative mx-auto" />
      <div className="relative mt-3 inline-flex">
        <Chip tone="primary">{lot}</Chip>
      </div>
      <h2 className="display relative mt-2.5 text-[1.25rem] leading-tight">{title}</h2>
      <p className="relative mx-auto mt-1.5 max-w-[34ch] text-[0.8125rem] leading-[1.5] text-fg-2">{body}</p>
      {foot && <p className="relative mx-auto mt-3 max-w-[36ch] text-[0.75rem] leading-[1.45] text-fg-3">{foot}</p>}
    </div>
  )
}
