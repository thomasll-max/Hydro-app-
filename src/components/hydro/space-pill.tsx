// Space selector under the top bar: a scrolling pill "All · rooms · spaces", remembered in settings.
import { useEffect, useRef } from "react"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { groupBySite } from "@/model/grow-ops"
import { SPACE_COLORS, type SpaceColor } from "@/model/grow"
import { cn } from "@/lib/utils"

/** Only the 8 known colours reach the CSS: anything else (an edited backup…) is shown as slate (lot 10a). */
export const safeSpaceColor = (c?: string): SpaceColor => ((SPACE_COLORS as readonly string[]).includes(c ?? "") ? (c as SpaceColor) : "slate")
export const spaceColor = (c?: string) => `var(--space-${safeSpaceColor(c)})`

export function SpaceDot({ color, className }: { color?: SpaceColor; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-2 shrink-0 rounded-full", className)} style={{ background: spaceColor(color) }} />
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
          "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold whitespace-nowrap transition-colors duration-200",
          on ? "bg-surface text-fg shadow-[0_1px_3px_rgba(0,0,0,0.25)]" : "text-fg-3 hover:text-fg",
          site && "uppercase tracking-[0.4px] text-[11px]",
        )}
      >
        {color && <SpaceDot color={color} />}
        {label}
      </button>
    )
  }
  return (
    <div className="mx-auto max-w-[480px] pr-[max(16px,env(safe-area-inset-right,0px))] pb-2 pl-[max(16px,env(safe-area-inset-left,0px))]">
      <div
        ref={ref}
        role="group"
        aria-label={t("space.selector")}
        className="no-scrollbar flex items-center gap-0.5 overflow-x-auto rounded-full border border-line bg-surface-2 p-[3px]"
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
