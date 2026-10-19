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
import { navigate, type ToolId } from "@/app/nav"
import { todayIso } from "@/calc/stage"
import { lastBackup } from "@/lib/backup-reminder"
import { setStartHidden, startChecklist, startHidden, startProgress, type StartItem } from "@/calc/getting-started"
import { TARGET } from "@/store"
import type { EmojiName } from "@/assets/emoji"
import type { MessageKey } from "@/i18n/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { iconButton, tertiary } from "@/components/hydro/styles"

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
    const go = (tool: ToolId) => navigate({ tab: "tools", tool })
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
            <span className="text-[0.75rem] font-semibold text-fg-2 tabular-nums" id="start-count">
              {done} / {total}
            </span>
          </div>
          <p className="mt-0.5 text-[0.78125rem] leading-[1.45] text-fg-2">{t("start.enterD")}</p>
          <ol className="mt-1.5">
            {items.map((it) => {
              const where = it.spaceId && spaces.length > 1 ? spaceName(it.spaceId) : undefined
              return (
                <li key={it.id} className="border-t border-line first:border-t-0">
                  <button type="button" onClick={() => act(it)} className="flex min-h-16 w-full items-start gap-3 py-2.5 text-left" id={`start-${it.id}`} data-done={it.done}>
                    <span className={cn("mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px]", it.done ? "border-leaf bg-leaf text-background" : "border-line-strong")}>
                      {it.done && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[0.875rem] font-semibold", it.done && "text-fg-3 line-through decoration-1")}>
                        {t(`start.i.${it.id}` as MessageKey)}
                        {where && !it.done ? <span className="font-normal text-fg-2"> · {where}</span> : null}
                      </span>
                      <span className="block text-[0.75rem] leading-snug text-fg-3">{t(`start.w.${it.id}` as MessageKey)}</span>
                    </span>
                    <ChevronRight className="mt-1 size-4.5 shrink-0 text-fg-3" />
                  </button>
                  {it.canStart && it.cycleId && <StartToday cycleId={it.cycleId} />}
                </li>
              )
            })}
          </ol>
          {done === total && <p className="mt-1 border-t border-line pt-2 text-[0.78125rem] font-medium text-leaf-ink">{t("start.allDone")}</p>}
        </Card>
      </Reveal>

      <Reveal i={1}>
        <Card id="start-how">
          <div className="px-0.5 pt-3">
            <Label emoji="compass">{t("start.how")}</Label>
          </div>
          <Accordion type="single" collapsible defaultValue="day">
            {HOW.filter((h) => !h.local || TARGET === "local").map((h) => (
              <AccordionItem key={h.id} value={h.id} className="border-line">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <span className="flex items-center gap-2.5 text-left">
                    <Emoji name={h.emoji} size={26} />
                    <span className="text-[0.90625rem] font-semibold">{t(`start.h.${h.id}` as MessageKey)}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-[0.8125rem] leading-[1.5] text-fg-2">{t(`start.b.${h.id}` as MessageKey)}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </Reveal>

      {hidden && (
        <button type="button" onClick={() => (setStartHidden(false), setHidden(false))} className={cn("mx-auto", tertiary)}>
          {t("start.showCard")}
        </button>
      )}
    </div>
  )
}

/** A running cycle without a start date: one tap sets it to today (lot 10b). */
function StartToday({ cycleId }: { cycleId: string }) {
  const { t } = useSettings()
  const { cycles, saveCycle } = useGrow()
  const [busy, setBusy] = useState(false)
  const c = cycles.find((x) => x.id === cycleId)
  if (!c) return null
  const go = async () => {
    setBusy(true)
    try {
      await saveCycle({ ...c, germinationDate: todayIso() })
      toast.success(t("start.started"))
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error)?.message ?? "?" }))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button onClick={go} disabled={busy} className="mb-2.5 ml-9 h-11 px-4 text-[0.84375rem]" id="start-today">
      {t("start.startToday")}
    </Button>
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
    <Card framed className="mb-3 gap-2.5 px-4 py-3.5" id="start-card">
      <div className="flex items-start gap-3">
        <Emoji name="sprout" size={36} />
        <div className="min-w-0 flex-1">
          <b className="block text-[0.90625rem] font-semibold">{t("start.cardTitle", { done, total })}</b>
          <span className="block text-[0.78125rem] leading-snug text-fg-2">{t("start.cardNext", { what: t(`start.i.${next.id}` as MessageKey) })}</span>
        </div>
        <button
          type="button"
          aria-label={t("start.hide")}
          onClick={() => {
            setStartHidden(true)
            setHidden(true)
          }}
          className={cn("-mt-1 -mr-1.5", iconButton)}
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-[3px] bg-track" aria-hidden="true">
        <div className="h-full rounded-[3px] bg-leaf" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <a href="#tools/start" className={cn(tertiary, "self-start")}>
        {t("start.open")}
      </a>
    </Card>
  )
}
