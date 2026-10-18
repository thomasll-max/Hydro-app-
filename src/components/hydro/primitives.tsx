import type { ReactNode } from "react"
import { BlurFade } from "@/components/magicui/blur-fade"
import { cn } from "@/lib/utils"
import type { Status } from "@/lib/geometry"
import type { EmojiName } from "@/assets/emoji"
import { Emoji } from "./emoji"

export function ScreenHero({
  emoji,
  eyebrow,
  title,
  children,
}: {
  emoji: EmojiName
  eyebrow?: string
  title: string
  children?: ReactNode
}) {
  return (
    <BlurFade className="mt-1.5 mb-4 flex items-center gap-3.5">
      <Emoji name={emoji} size={64} className="float-y drop-shadow-[0_8px_14px_rgba(0,0,0,0.35)]" />
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="mt-0.5 text-[26px] leading-[1.1] font-semibold tracking-[-0.6px]">{title}</h1>
        {children}
      </div>
    </BlurFade>
  )
}

export function Chips({ children }: { children: ReactNode }) {
  return <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
}

export function Chip({ tone = "neutral", children }: { tone?: "neutral" | "primary" | "warn"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap",
        tone === "neutral" && "border-line bg-surface-2 text-fg-2",
        tone === "primary" && "border-primary/35 bg-primary/10 text-primary",
        tone === "warn" && "border-warn/35 bg-warn/10 text-warn",
      )}
    >
      {children}
    </span>
  )
}

export function Label({ emoji, children, className }: { emoji?: EmojiName; children: ReactNode; className?: string }) {
  return (
    <div className={cn("eyebrow flex items-center gap-1.5", className)}>
      {emoji && <Emoji name={emoji} size={18} />}
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

/** Card entrance used across screens (Magic UI BlurFade, staggered). */
export function Reveal({ i = 0, className, children }: { i?: number; className?: string; children: ReactNode }) {
  return (
    <BlurFade delay={0.06 * i} offset={10} direction="up" blur="4px" duration={0.5} className={className}>
      {children}
    </BlurFade>
  )
}

export function SourceNote({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-center text-[10.5px] leading-[1.5] text-fg-3">{children}</p>
}

/** Polished empty state for a tab or tool that arrives in a later batch ("Arrive au lot X"). Never a broken page. */
export function ComingSoon({ emoji, title, lot, body, foot }: { emoji: EmojiName; title: string; lot: string; body: string; foot?: string }) {
  return (
    <div className="relative overflow-hidden rounded-[var(--r-xl)] border border-line bg-surface px-5 py-6 text-center shadow-card">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-16 h-40 bg-[radial-gradient(closest-side,var(--glow),transparent)]" />
      <Emoji name={emoji} size={84} className="float-y relative mx-auto drop-shadow-[0_10px_18px_rgba(0,0,0,0.3)]" />
      <div className="relative mt-3 inline-flex">
        <Chip tone="primary">{lot}</Chip>
      </div>
      <h2 className="relative mt-2.5 text-[19px] leading-tight font-semibold tracking-[-0.3px]">{title}</h2>
      <p className="relative mx-auto mt-1.5 max-w-[34ch] text-[13px] leading-[1.5] text-fg-2">{body}</p>
      {foot && <p className="relative mx-auto mt-3 max-w-[36ch] text-[11.5px] leading-[1.45] text-fg-3">{foot}</p>}
    </div>
  )
}
