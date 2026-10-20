// Lot 13: the sources, quietly. A small ⓘ (16 px, 44 px to touch) beside a tool's title or the figures it is about; it
// opens a small sheet saying where these figures come from, then « Toutes les sources → » (the page À propos). The rule
// does not change: every figure stays traceable, only the place where its source is shown does. What changes the
// reading of a figure (« estimation », « donnée manquante », « perso, non vérifié ») stays visible beside it.
import { useState } from "react"
import { Info } from "lucide-react"
import { Sheet } from "./form"
import { tertiary } from "./styles"
import { useSettings } from "@/app/settings-context"
import { navigate, whenSheetsClosed } from "@/app/nav"
import { cn } from "@/lib/utils"

/** Opens À propos (Outils → À propos), after a sheet it came from is closed. */
export const openAbout = () => whenSheetsClosed(() => navigate({ tab: "tools", tool: "about" }, { push: true }))

/** One line per source: a text of the dictionary holds them separated by line breaks. */
export const infoLines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

export function SourceInfo({ id, lines, className }: { id: string; lines: string[]; className?: string }) {
  const { t } = useSettings()
  const [open, setOpen] = useState(false)
  if (!lines.length) return null
  return (
    <>
      <button
        type="button"
        id={`info-${id}`}
        data-source-info={id}
        aria-label={t("info.open")}
        onClick={() => setOpen(true)}
        className={cn("-m-3.5 grid size-11 shrink-0 place-items-center rounded-full text-fg-3 transition-colors hover:text-fg-2 focus-visible:ring-2 focus-visible:ring-water focus-visible:outline-none", className)}
      >
        <Info aria-hidden="true" className="size-4" strokeWidth={2} />
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={t("info.title")} dirty={false}>
        <ul id={`info-${id}-lines`} className="flex flex-col gap-2.5 text-[0.875rem] leading-[1.45] text-fg-2">
          {lines.map((l, i) => (
            <li key={i} className="flex gap-2.5">
              <span aria-hidden="true" className="mt-[8px] size-[5px] shrink-0 rounded-[2px] bg-fg-3" />
              <span className="min-w-0 first-letter:uppercase">{l}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          id="info-all"
          className={cn(tertiary, "mt-3")}
          onClick={() => {
            setOpen(false)
            openAbout()
          }}
        >
          {t("info.all")}
        </button>
      </Sheet>
    </>
  )
}
