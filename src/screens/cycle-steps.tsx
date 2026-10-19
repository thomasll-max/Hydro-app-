// Today: the next step of the cycle in one tap on the day (lot 10b): "Passer en végé", "Passer en 12/12", "Récolter".
// The step writes its real date (and its event); "Annuler" in the toast puts it back. The planned harvest is only shown.
import { useState } from "react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { daysBetween, todayIso } from "@/calc/stage"
import { applyStep, expectedHarvest, nextStep, STEP_FIELD, undoStep, type CycleStep } from "@/calc/steps"
import type { Cycle } from "@/model/types"
import type { MessageKey } from "@/i18n/types"

const DONE: Record<CycleStep, MessageKey> = { veg: "step.doneVeg", flip: "step.doneFlip", harvest: "step.doneHarvest" }
const DESC: Record<CycleStep, MessageKey> = { veg: "step.vegD", flip: "step.flipD", harvest: "step.harvestD" }

export function StepCard({ cycle }: { cycle: Cycle }) {
  const { t, dm } = useSettings()
  const { saveCycle } = useGrow()
  const [busy, setBusy] = useState(false)
  const today = todayIso()
  const step = nextStep(cycle, today)
  const expected = expectedHarvest(cycle)
  if (!step) return null
  // Harvest is offered all through flowering, but stays discreet until the last week before the expected day.
  const early = step === "harvest" && !!expected && daysBetween(today, expected) > 7

  const go = async () => {
    if (busy) return
    setBusy(true)
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

  return (
    <Card className="gap-2" id="step-card">
      <Label emoji={step === "harvest" ? "blossom" : step === "flip" ? "bulb" : "herb"}>{t("step.next")}</Label>
      <p className="text-[0.78125rem] leading-[1.45] text-fg-2">{t(DESC[step])}</p>
      {expected && (
        <p className="text-[0.78125rem] font-medium text-fg-2" id="step-expected">
          {t("cycleForm.expectedHarvest", { date: dm(expected) })} <span className="font-normal text-fg-3">· {t("cycleForm.expectedHarvestD", { weeks: cycle.flowerWeeks })}</span>
        </p>
      )}
      <Button onClick={go} disabled={busy} variant={early ? "outline" : "default"} className="h-12" id={`step-${step}`}>
        {t(`step.${step}`)}
      </Button>
    </Card>
  )
}

/** Space without a running cycle: the cycle harvested last here, to log its weights and drying. */
export function LastHarvest({ spaceId }: { spaceId?: string }) {
  const { t, dm } = useSettings()
  const { cycles } = useGrow()
  const ed = useEditors()
  const last = cycles.filter((c) => c.spaceId === spaceId && c.harvestDate && !c.archived).sort((a, b) => (a.harvestDate! < b.harvestDate! ? 1 : -1))[0]
  if (!last || daysBetween(last.harvestDate!, todayIso()) > 30) return null
  return (
    <Card className="gap-2" id="last-harvest">
      <Label emoji="blossom">{t("step.lastHarvest", { name: last.name, date: dm(last.harvestDate!) })}</Label>
      <Button variant="outline" className="h-11 self-start" onClick={() => ed.openCycle({ harvestOnly: true, cycleId: last.id })}>
        {t("step.harvestDetails")}
      </Button>
    </Card>
  )
}
