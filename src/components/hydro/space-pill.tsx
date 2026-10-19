// Space selector under the top bar: text tabs "All · rooms · spaces" (the active one underlined, lot 10h), remembered in settings.
import { useEffect, useRef } from "react"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { groupBySite } from "@/model/grow-ops"
import { SPACE_COLORS, type SpaceColor } from "@/model/grow"
import { cn } from "@/lib/utils"
import type { EmojiName } from "@/assets/emoji"
import { Emoji } from "./emoji"

/** Only the 8 known colours reach the CSS: anything else (an edited backup…) is shown as slate (lot 10a). */
export const safeSpaceColor = (c?: string): SpaceColor => ((SPACE_COLORS as readonly string[]).includes(c ?? "") ? (c as SpaceColor) : "slate")
export const spaceColor = (c?: string) => `var(--space-${safeSpaceColor(c)})`

export function SpaceDot({ color, className }: { color?: SpaceColor; className?: string }) {
  // A small square with rounded corners, 10 px (lot 10h).
  return <span aria-hidden="true" className={cn("inline-block size-2.5 shrink-0 rounded-[3px]", className)} style={{ background: spaceColor(color) }} />
}

/** The space's tinted square with the drawing of its stage (lot 10j): the main landmark of a space on Aujourd'hui. */
export function SpaceTile({ color, emoji, size = 42 }: { color?: SpaceColor; emoji: EmojiName; size?: number }) {
  return (
    <span
      aria-hidden="true"
      data-space-tile
      className="grid shrink-0 place-items-center"
      style={{ width: size, height: size, borderRadius: Math.round(size / 3.8), background: `color-mix(in oklab, ${spaceColor(color)} 22%, transparent)` }}
    >
      <Emoji name={emoji} size={Math.round((size * 2) / 3)} />
    </span>
  )
}

export function SpacePill() {
  const { t, settings, setSpace } = useSettings()
  const { spaces, sites } = useGrow()
  const ref = useRef<HTMLDivElement>(null)
  const value = settings.space ?? "all"
  useEffect(() => {
    // Keep the selected pill in view (block body: see tools.tsx).
    const el = ref.current?.querySelector<HTMLElement>("[aria-pressed='true']")
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [value])
  if (spaces.length < 2 && !sites.length) return null

  const groups = groupBySite(spaces, sites)
  const item = (id: string, label: string, color?: SpaceColor, site?: boolean) => {
    const on = value === id
    return (
      <button
        key={id}
        type="button"
        aria-pressed={on}
        onClick={() => setSpace(id)}
        className={cn(
          "relative flex h-11 shrink-0 items-center gap-1.5 text-[0.9375rem] whitespace-nowrap transition-colors duration-200",
          on ? "font-semibold text-fg" : "text-fg-3 hover:text-fg",
          site && "text-[0.875rem]",
        )}
      >
        {color && <SpaceDot color={color} />}
        {label}
        {/* The active tab: a 2 px « eau » underline (lot 10h). */}
        {on && <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 rounded-[1px] bg-water" />}
      </button>
    )
  }
  return (
    <div className="mx-auto max-w-[480px] pr-[max(16px,env(safe-area-inset-right,0px))] pb-2 pl-[max(16px,env(safe-area-inset-left,0px))]">
      <div
        ref={ref}
        role="group"
        aria-label={t("space.selector")}
        className="no-scrollbar flex items-center gap-[22px] overflow-x-auto border-b border-line"
      >
        {item("all", t("space.all"))}
        {groups.map((g) => [
          g.site && sites.length > 0 ? item(`site:${g.site.id}`, g.site.name, undefined, true) : null,
          ...g.spaces.map((s) => item(s.id, s.name, s.color)),
        ])}
      </div>
    </div>
  )
}
