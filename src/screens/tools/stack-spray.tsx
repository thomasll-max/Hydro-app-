// Outils → Pulvérisation → Stack (lot 14b, official Stack page read on 20/10/2026): 7 mL per gallon converted to mL per
// litre, once a week, lights off, dry before lights on; from the last week of veg to flowering week 3, blocked after with
// a clear message. Offered when the Stack add-on is set to be sprayed (Réglages → nutrition).
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NumField } from "@/components/hydro/form"
import { Chip, Label, Notice, Reveal } from "@/components/hydro/primitives"
import { secondary } from "@/components/hydro/styles"
import { useSettings } from "@/app/settings-context"
import { newId, useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { parseNum } from "@/calc/formulas"
import { todayIso } from "@/calc/stage"
import { shownPerL, stackFoliarPerL, stackSprayMl, stackSprayThisWeek, stackWindow } from "@/calc/stack"
import { STACK } from "@/data/nutrients"
import { GROW_SCHEMA } from "@/model/grow"
import { formatInput, locales } from "@/i18n/core"
import { cn } from "@/lib/utils"

export function StackSprayTool() {
  const { t, num, settings } = useSettings()
  const { cycle, space, sprays, saveSpray, nutrition } = useGrow()
  const ed = useEditors()
  const today = todayIso()
  const sprayed = nutrition.addons.includes("stack") && nutrition.stack === "foliar"
  const win = stackWindow(cycle, today)
  const mine = space ? sprays.filter((s) => s.product === "stack" && s.spaceIds.includes(space.id)) : []
  const week = space ? stackSprayThisWeek(sprays, space.id, today) : undefined
  const perL = shownPerL(stackFoliarPerL())
  const [litres, setLitres] = useState("")
  useEffect(() => {
    setLitres(mine[0] ? formatInput(settings.lang, mine[0].litres) : "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space?.id, mine.length])
  const L = parseNum(litres)
  const dose = L && L > 0 ? stackSprayMl(L) : null
  const saving = useRef(false)
  const [busy, setBusy] = useState(false)
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(settings.lang === "en" ? "en-GB" : locales[settings.lang], { weekday: "short", day: "numeric", month: "short" })

  const save = async () => {
    if (!space || !L || !win.ok || !sprayed || saving.current) return
    saving.current = true
    setBusy(true)
    try {
      await saveSpray({
        schemaVersion: GROW_SCHEMA.spray,
        id: newId("spray-"),
        date: today,
        spaceIds: [space.id],
        ...(cycle ? { cycleId: cycle.id } : {}),
        product: "stack",
        mlPerL: perL,
        litres: L,
        createdAt: new Date().toISOString(),
      })
      toast.success(t("spray.stackSaved"))
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error).message }))
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3" id="stack-spray">
      {!sprayed && (
        <Reveal i={0}>
          <Card className="gap-2" id="stack-spray-off">
            <p className="text-[0.78125rem] leading-[1.45] text-fg-2">{t("spray.stackOff")}</p>
            {space && (
              <button type="button" onClick={() => ed.openSpace(space.id, "nutrition")} className={cn(secondary, "self-start")}>
                {t("ipw.enableInSettings")}
              </button>
            )}
          </Card>
        </Reveal>
      )}
      <Reveal i={1}>
        <Card className="gap-2.5" id="stack-spray-window">
          <div className="flex items-center justify-between gap-2">
            <Label>{t("ipw.window")}</Label>
            <Chip tone={win.ok ? "primary" : "warn"}>{win.ok ? t("ipw.allowed") : t("ipw.blocked")}</Chip>
          </div>
          {win.ok ? (
            <p className="text-[0.8125rem] leading-[1.45] text-fg-2">{win.until ? t("nut.stackOkUntil", { date: fmt(win.until) }) : t("nut.stackOk")}</p>
          ) : (
            <Notice tone="bad" className="text-[0.8125rem]" id="stack-spray-blocked">
              {t(`nut.stackWhy_${win.reason}`)}
            </Notice>
          )}
          <p className="text-[0.75rem] leading-[1.45] text-fg-3">{t("spray.stackIntro", { perL: num(perL, 2), gal: num(STACK.foliar.mlPerGal) })}</p>
          {week && <p className="text-[0.75rem] font-medium text-warn">{t("nut.stackWeek", { date: fmt(week) })}</p>}
        </Card>
      </Reveal>
      <Reveal i={2}>
        <Card className="gap-3">
          <div className="grid grid-cols-[1fr_1fr] items-end gap-2.5">
            {/* No « eau osmosée » here: the Stack page does not ask for it (that is IPW's rule). */}
            <NumField id="stack-l" label={t("ipw.litres")} value={litres} onChange={setLitres} />
            <div className="border-t border-line pt-2" id="stack-dose">
              <div className="text-[0.75rem] text-fg-3">{t("spray.stackDose", { perL: num(perL, 2) })}</div>
              <div className="text-[1.625rem] leading-tight font-semibold tabular">{dose != null ? `${num(dose, dose % 1 ? 1 : 0)} mL` : "—"}</div>
            </div>
          </div>
          <p className="text-[0.75rem] leading-[1.45] text-fg-3">{t("nut.stackShake")}</p>
          <Button onClick={save} disabled={!win.ok || !sprayed || !L || !space || busy} className="h-12" id="stack-save">
            {t("spray.stackSave")}
          </Button>
        </Card>
      </Reveal>
      <Reveal i={3}>
        <Card className="gap-1.5">
          <Label>{t("ipw.history")}</Label>
          {mine.length === 0 ? (
            <p className="text-[0.78125rem] text-fg-3">{t("spray.stackNone")}</p>
          ) : (
            <ul id="stack-history">
              {mine.slice(0, 10).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 border-t border-line py-2 text-[0.8125rem] first:border-t-0">
                  <span className="text-fg-2">{fmt(s.date)}</span>
                  <span className="tabular-nums">
                    {num(s.litres, s.litres % 1 ? 1 : 0)} L{s.mlPerL != null && ` · ${num(s.mlPerL * s.litres, 1)} mL`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Reveal>
    </div>
  )
}
