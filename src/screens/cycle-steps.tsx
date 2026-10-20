// The next step of the cycle in one tap (lot 10b): "Passer en végé", "Passer en 12/12", "Récolter". The step writes its
// real date (and its event); "Annuler" in the toast puts it back. Since lot 10l1 its button lives in the state block of
// the page of a space (space-page.tsx).
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { daysBetween, todayIso } from "@/calc/stage"
import { applyStep, STEP_FIELD, undoStep, type CycleStep } from "@/calc/steps"
import type { Cycle } from "@/model/types"
import type { MessageKey } from "@/i18n/types"

const DONE: Record<CycleStep, MessageKey> = { veg: "step.doneVeg", flip: "step.doneFlip", harvest: "step.doneHarvest" }

/** Does a step today, with « Annuler » in the toast. */
export function useStepAction(cycle: Cycle) {
  const { t, dm } = useSettings()
  const { saveCycle } = useGrow()
  const [busy, setBusy] = useState(false)
  const go = async (step: CycleStep) => {
    if (busy) return
    setBusy(true)
    const today = todayIso()
    const before = cycle[STEP_FIELD[step]]
    const done = applyStep(cycle, step, today)
    try {
      await saveCycle(done)
      toast.success(t(DONE[step], { date: dm(today) }), {
        action: {
          label: t("step.undo"),
          onClick: () => {
            saveCycle(undoStep(done, step, before)).then(
              () => toast(t("step.undone")),
              (e) => toast.error(t("common.saveError", { reason: (e as Error)?.message ?? "?" })),
            )
          },
        },
      })
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error)?.message ?? "?" }))
    } finally {
      setBusy(false)
    }
  }
  return { go, busy }
}

/** Space without a running cycle: the cycle harvested last here, to log its weights and drying. */
export function LastHarvest({ spaceId }: { spaceId?: string }) {
  const { t, dm } = useSettings()
  const { cycles } = useGrow()
  const ed = useEditors()
  const last = cycles.filter((c) => c.spaceId === spaceId && c.harvestDate && !c.archived).sort((a, b) => (a.harvestDate! < b.harvestDate! ? 1 : -1))[0]
  if (!last || daysBetween(last.harvestDate!, todayIso()) > 30) return null
  return (
    <section className="flex flex-col gap-2" id="last-harvest">
      <h2 className="display text-[1.1875rem] leading-tight">{t("step.lastHarvest", { name: last.name, date: dm(last.harvestDate!) })}</h2>
      <Button variant="outline" className="h-11 self-start" onClick={() => ed.openCycle({ harvestOnly: true, cycleId: last.id })}>
        {t("step.harvestDetails")}
      </Button>
    </section>
  )
}
