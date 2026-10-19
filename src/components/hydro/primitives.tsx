import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { Status } from "@/lib/geometry"
import type { EmojiName } from "@/assets/emoji"
import { Emoji } from "./emoji"
import { SpaceTile } from "./space-pill"
import type { SpaceColor } from "@/model/grow"

/**
 * Screen title. Since lot 10f2 there is no illustration next to it (the 3D emojis stay for the assistant, empty
 * states and rare moments): `emoji` is kept by the call sites but no longer drawn. A space's view shows its tinted
 * square with the stage drawing (`tile`, lot 10j).
 */
export function ScreenHero({
  eyebrow,
  title,
  tile,
  children,
}: {
  emoji?: EmojiName
  eyebrow?: string
  title: string
  tile?: { color?: SpaceColor; emoji: EmojiName }
  children?: ReactNode
}) {
  return (
    <div className="mt-2 mb-4 flex items-center gap-3.5">
      {tile && <SpaceTile color={tile.color} emoji={tile.emoji} size={52} />}
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
        // A small outlined tag (lot 10h): no tinted fill; only the word takes the colour.
        "rounded-[6px] border px-2 py-0.5 text-[0.75rem] font-semibold whitespace-nowrap",
        tone === "neutral" && "border-line text-fg-2",
        tone === "primary" && "border-line text-water-ink",
        tone === "warn" && "border-line text-warn",
        tone === "water" && "border-line text-water-ink",
        tone === "leaf" && "border-line text-leaf-ink",
      )}
    >
      {children}
    </span>
  )
}

/**
 * Section title (lot 10h): Fraunces in normal case, no small capitals. `emoji` is drawn only with `mark` (lot 10j: the
 * small drawings come back as landmarks on Aujourd'hui and the main screens; Outils keeps plain titles).
 */
export function Label({ emoji, mark, children, className }: { emoji?: EmojiName; mark?: boolean; children: ReactNode; className?: string }) {
  const title = <h2 className={cn("display text-[1.25rem] leading-tight font-semibold", className)}>{children}</h2>
  if (!mark || !emoji) return title
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Emoji name={emoji} size={24} />
      {title}
    </div>
  )
}

/**
 * A pill that says a state (lot 10j): the stage of a space (« Végé », « Floraison », « Séchage », « Vide »). Outlined,
 * the word in the stage's colour.
 */
export function StatePill({ tone = "neutral", children }: { tone?: "neutral" | "leaf" | "flower"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-[26px] shrink-0 items-center rounded-full border px-2.5 text-[0.75rem] font-semibold whitespace-nowrap",
        tone === "neutral" && "border-line text-fg-2",
        tone === "leaf" && "border-[color-mix(in_oklab,var(--leaf-ink)_45%,transparent)] text-leaf-ink",
        tone === "flower" && "border-[color-mix(in_oklab,var(--phase-3)_45%,transparent)] text-phase-3",
      )}
    >
      {children}
    </span>
  )
}

/**
 * A message that needs a look (lot 10h): normal text with a small marker. « À surveiller » and « alerte » colour a
 * word or a marker, never a whole sentence.
 */
export function Notice({
  tone = "warn",
  id,
  role,
  as: Tag = "p",
  className,
  children,
}: {
  tone?: "ok" | "warn" | "bad" | "info"
  id?: string
  role?: string
  as?: "p" | "span"
  className?: string
  children: ReactNode
}) {
  return (
    <Tag id={id} role={role} className={cn("flex gap-2 text-[0.78125rem] leading-[1.45] text-fg-2", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "mt-[6px] size-1.5 shrink-0 rounded-[2px]",
          tone === "ok" && "bg-water",
          tone === "warn" && "bg-warn",
          tone === "bad" && "bg-bad",
          tone === "info" && "bg-info",
        )}
      />
      <span className="min-w-0">{children}</span>
    </Tag>
  )
}

export function Dot({ status }: { status: Status }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-[7px] shrink-0 rounded-[2px]",
        status === "ok" && "bg-water",
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
