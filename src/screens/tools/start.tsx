// Outils → Premiers pas (lot 8c) : ce qu'il faut rentrer (checklist cochée d'après les données, chaque ligne ouvre le
// bon endroit), puis comment marche l'app au quotidien. A progress card on Today leads here until it is done or hidden.
import { useMemo, useState } from "react"
import { Check, ChevronRight, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Emoji } from "@/components/hydro/emoji"
import { Label, Reveal } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { todayIso } from "@/calc/stage"
import { lastBackup } from "@/lib/backup-reminder"
import { setStartHidden, startChecklist, startHidden, startProgress, type StartItem } from "@/calc/getting-started"
import { TARGET } from "@/store"
import type { EmojiName } from "@/assets/emoji"
import type { MessageKey } from "@/i18n/types"
import { cn } from "@/lib/utils"

export function useStartChecklist(): StartItem[] {
  const { spaces, cycles, equipment, assignments, all } = useGrow()
  return useMemo(
    () =>
      startChecklist({
        spaces,
        cycles,
        equipment,
        assignments,
        mixes: all.mixes,
        entries: all.entries,
        today: todayIso(),
        lastBackup: TARGET === "local" ? lastBackup() : undefined,
      }),
    [spaces, cycles, equipment, assignments, all.mixes, all.entries],
  )
}

/** What a checklist line opens. */
function useStartAction() {
  const ed = useEditors()
  const { spaces } = useGrow()
  return (item: StartItem) => {
    const go = (hash: string) => {
      location.hash = hash
    }
    switch (item.id) {
      case "lamp":
      case "flow":
        return go("equipment")
      case "pots":
        return item.spaceId ? ed.openSpace(item.spaceId, "irrigation") : go("irrigation")
      case "cycle":
        return ed.openCycle(item.cycleId ? { cycleId: item.cycleId } : { cycleId: "new", spaceId: spaces[0]?.id })
      case "mix":
        return go("nutrition")
      case "entry":
        return ed.openEntry({ date: todayIso(), spaceId: spaces[0]?.id })
      case "backup":
        return go("data")
    }
  }
}

const HOW: { id: string; emoji: EmojiName; local?: boolean }[] = [
  { id: "day", emoji: "sun" },
  { id: "tank", emoji: "testTube" },
  { id: "water", emoji: "droplet" },
  { id: "cycle", emoji: "sprout" },
  { id: "calendar", emoji: "calendar" },
  { id: "charts", emoji: "chart" },
  { id: "settings", emoji: "gear" },
  { id: "numbers", emoji: "book" },
  { id: "backup", emoji: "notebook", local: true },
]

export function StartTool() {
  const { t } = useSettings()
  const { spaces, allSpaces } = useGrow()
  const items = useStartChecklist()
  const act = useStartAction()
  const { done, total } = startProgress(items)
  const [hidden, setHidden] = useState(startHidden)
  const spaceName = (id?: string) => allSpaces.find((s) => s.id === id)?.name
  return (
    <div className="flex flex-col gap-3">
      <Reveal i={0}>
        <Card className="gap-1" id="start-list">
          <div className="flex items-center justify-between gap-2">
            <Label emoji="pottedPlant">{t("start.enter")}</Label>
            <span className="text-[12px] font-semibold text-fg-2 tabular-nums" id="start-count">
              {done} / {total}
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px] leading-[1.45] text-fg-2">{t("start.enterD")}</p>
          <ol className="mt-1.5">
            {items.map((it) => {
              const where = it.spaceId && spaces.length > 1 ? spaceName(it.spaceId) : undefined
              return (
                <li key={it.id} className="border-t border-line first:border-t-0">
                  <button type="button" onClick={() => act(it)} className="flex min-h-16 w-full items-start gap-3 py-2.5 text-left" id={`start-${it.id}`} data-done={it.done}>
                    <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px]", it.done ? "border-primary bg-primary text-primary-foreground" : "border-line-strong")}>
                      {it.done && <Check className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[14px] font-semibold", it.done && "text-fg-3 line-through decoration-1")}>
                        {t(`start.i.${it.id}` as MessageKey)}
                        {where && !it.done ? <span className="font-normal text-fg-2"> · {where}</span> : null}
                      </span>
                      <span className="block text-[12px] leading-snug text-fg-3">{t(`start.w.${it.id}` as MessageKey)}</span>
                    </span>
                    <ChevronRight className="mt-1 size-4.5 shrink-0 text-fg-3" />
                  </button>
                </li>
              )
            })}
          </ol>
          {done === total && <p className="mt-1 rounded-md bg-primary/10 px-3 py-2 text-[12.5px] font-medium text-primary">{t("start.allDone")}</p>}
        </Card>
      </Reveal>

      <Reveal i={1}>
        <Card className="px-3.5 py-1" id="start-how">
          <div className="px-0.5 pt-3">
            <Label emoji="compass">{t("start.how")}</Label>
          </div>
          <Accordion type="single" collapsible defaultValue="day">
            {HOW.filter((h) => !h.local || TARGET === "local").map((h) => (
              <AccordionItem key={h.id} value={h.id} className="border-line">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <span className="flex items-center gap-2.5 text-left">
                    <Emoji name={h.emoji} size={26} />
                    <span className="text-[14.5px] font-semibold">{t(`start.h.${h.id}` as MessageKey)}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-[13px] leading-[1.5] text-fg-2">{t(`start.b.${h.id}` as MessageKey)}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </Reveal>

      {hidden && (
        <button type="button" onClick={() => (setStartHidden(false), setHidden(false))} className="mx-auto h-10 px-2 text-[12.5px] font-semibold text-primary">
          {t("start.showCard")}
        </button>
      )}
    </div>
  )
}

/** Aujourd'hui : progress and the next thing to enter. Gone once everything is done, or when hidden. */
export function StartCard() {
  const { t } = useSettings()
  const items = useStartChecklist()
  const [hidden, setHidden] = useState(startHidden)
  const { done, total, next } = startProgress(items)
  if (hidden || !next) return null
  return (
    <Card className="mb-3 gap-2.5 px-4 py-3.5" id="start-card">
      <div className="flex items-start gap-3">
        <Emoji name="sprout" size={36} />
        <div className="min-w-0 flex-1">
          <b className="block text-[14.5px] font-semibold">{t("start.cardTitle", { done, total })}</b>
          <span className="block text-[12.5px] leading-snug text-fg-2">{t("start.cardNext", { what: t(`start.i.${next.id}` as MessageKey) })}</span>
        </div>
        <button
          type="button"
          aria-label={t("start.hide")}
          onClick={() => {
            setStartHidden(true)
            setHidden(true)
          }}
          className="-mt-1 -mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-fg-3"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <a href="#start" className="self-start rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[12.5px] font-semibold text-primary">
        {t("start.open")}
      </a>
    </Card>
  )
}
