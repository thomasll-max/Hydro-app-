// Outils → pH / Balance (lot 5): target pH with its source, guided titration by steps of 1 mL per 4 L with a big
// counter, prediction learned from 2 tanks (start at 80 %), saved on the space's last tank. Above the target: no dose.
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Minus, Plus, RotateCcw } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Grid, NumField } from "@/components/hydro/form"
import { Chip, Label, Reveal, SourceNote } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { parseNum } from "@/calc/formulas"
import { todayIso } from "@/calc/stage"
import { balanceHistory, phStatus, predictBalance, START_FRACTION, titrationTotal } from "@/calc/balance"
import { getCatalog } from "@/data/nutrients"
import { cn } from "@/lib/utils"
import type { Target } from "@/calc/targets"

export function PhBalanceTool() {
  const { t, num, range, settings } = useSettings()
  const n1 = (v: number) => num(v, v % 1 ? 1 : 0)
  const { cycle, space, mixes, all, targetsFor, nutrition, saveMix } = useGrow()
  const cat = getCatalog(nutrition.line)
  const show = (v?: number) => (v == null ? "" : settings.lang === "fr" ? String(v).replace(".", ",") : String(v))
  const tg = cycle ? targetsFor(todayIso(), cycle) : null
  // Without a cycle, the line's coco range (Athena) is shown, labelled as such.
  const target: Target = tg?.phIn ?? { lo: cat.ph.coco[0], hi: cat.ph.coco[1], src: "athena" }
  const last = mixes[0]
  const history = balanceHistory(all.mixes, cat.id)

  const [vol, setVol] = useState("")
  const [phBefore, setPhBefore] = useState("")
  const [phNow, setPhNow] = useState("")
  const [startMl, setStartMl] = useState(0)
  const [steps, setSteps] = useState(0)
  const [readings, setReadings] = useState<{ ml: number; ph: number }[]>([])
  useEffect(() => {
    setVol(show(last?.volumeL))
    setPhBefore("")
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space?.id, last?.id, settings.lang])
  function reset() {
    setStartMl(0)
    setSteps(0)
    setReadings([])
    setPhNow("")
  }

  const volumeL = parseNum(vol) ?? 0
  const before = parseNum(phBefore)
  const pred = predictBalance(history, volumeL, { phBefore: before, target })
  const { stepMl, totalMl } = titrationTotal({ volumeL, startMl, steps })
  const lastPh = readings.length ? readings[readings.length - 1].ph : before
  const status = phStatus(lastPh, target)
  const note = () => {
    const ph = parseNum(phNow)
    if (ph == null) return
    setReadings((r) => [...r, { ml: totalMl, ph }])
    setPhNow("")
  }
  const undo = () => {
    if (steps > 0) setSteps((s) => s - 1)
    else setStartMl(0)
  }
  const srcText = target.src === "athena" ? (target.page ? t("nut.srcPage", { p: target.page }) : t("nut.srcAthena")) : target.src === "spec" ? t("nut.srcSpec") : t("nut.srcEstimate")

  const save = async () => {
    if (!last) return
    try {
      await saveMix({ ...last, phBefore: before ?? last.phBefore, ph: lastPh ?? last.ph, balanceAddedMl: totalMl })
      toast.success(t("phb.saved"))
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error).message }))
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Reveal i={0}>
        <Card className="gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <Label emoji="scales">{t("phb.target")}</Label>
            <Chip tone="primary">{srcText}</Chip>
          </div>
          <div className="text-[34px] leading-none font-semibold tabular" id="phb-target">
            {range(target.lo, target.hi, 1)}
          </div>
          <p className="text-[12px] leading-[1.45] text-fg-2">{tg ? t("phb.targetFrom", { stage: t(`stage.${tg.stage}`) }) : t("phb.targetNoCycle")}</p>
          {!nutrition.addons.includes("balance") && <p className="text-[12px] text-warn">{t("phb.balanceOff")}</p>}
        </Card>
      </Reveal>

      <Reveal i={1}>
        <Card className="gap-3">
          <Label emoji="testTube">{t("phb.titration")}</Label>
          <Grid>
            <NumField id="b-vol" label={t("phb.volume")} hint={last ? t("phb.volumeHint", { v: num(last.volumeL) }) : undefined} value={vol} onChange={setVol} />
            <NumField id="b-before" label={t("phb.before")} value={phBefore} onChange={setPhBefore} />
          </Grid>
          {pred ? (
            <div className="rounded-md border border-primary/30 bg-primary/8 px-3 py-2.5" id="phb-pred">
              <div className="text-[12px] text-fg-2">
                {t(pred.basis === "perPh" ? "phb.predPerPh" : "phb.predPer10", { n: pred.tanks, rate: num(pred.rate, pred.basis === "perPh" ? 1 : 2) })}
              </div>
              <div className="mt-0.5 text-[15px] font-semibold">{t("phb.predLine", { pred: n1(pred.predictedMl), start: n1(pred.startMl), pct: Math.round(START_FRACTION * 100) })}</div>
            </div>
          ) : (
            <p className="text-[12px] leading-[1.45] text-fg-3">{t("phb.noPred", { n: history.length })}</p>
          )}

          <div className="rounded-[var(--r-xl)] border border-line bg-surface-2 px-4 py-5 text-center">
            <div className="text-[12px] font-medium text-fg-3">{t("phb.total")}</div>
            <div className="mt-1 text-[76px] leading-none font-semibold tracking-[-2px] tabular" id="phb-total" aria-live="polite">
              {/* Exact value at once: a titration counter must never show an in-between number. */}
              <span key={totalMl} className="inline-block animate-in fade-in zoom-in-95 duration-200">
                {n1(totalMl)}
              </span>
              <span className="ml-1 text-[28px] font-medium text-fg-2">mL</span>
            </div>
            <div className="mt-1.5 text-[12px] text-fg-3">
              {t("phb.detail", { start: n1(startMl), steps, step: n1(stepMl) })}
            </div>
            <div className="mt-4 grid grid-cols-[48px_1fr_48px] gap-2">
              <Button variant="outline" size="icon-lg" className="size-12 rounded-full" onClick={undo} disabled={!steps && !startMl} aria-label={t("phb.undo")}>
                <Minus className="size-5" />
              </Button>
              {pred && pred.startMl > 0 && !startMl && !steps ? (
                <Button className="h-12 rounded-full text-[15px] font-bold" onClick={() => setStartMl(pred.startMl)} disabled={volumeL <= 0}>
                  {t("phb.pourStart", { v: n1(pred.startMl) })}
                </Button>
              ) : (
                <Button className="h-12 rounded-full text-[15px] font-bold" onClick={() => setSteps((s) => s + 1)} disabled={volumeL <= 0 || status === "ok" || status === "over"} id="phb-step">
                  <Plus className="size-5" /> {t("phb.step", { v: num(stepMl, stepMl % 1 ? 1 : 0) })}
                </Button>
              )}
              <Button variant="outline" size="icon-lg" className="size-12 rounded-full" onClick={reset} aria-label={t("phb.reset")}>
                <RotateCcw className="size-5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <NumField id="b-ph" label={t("phb.reading")} hint={t("phb.readingHint")} value={phNow} onChange={setPhNow} />
            <Button variant="outline" className="mb-[18px] h-12 rounded-full px-5" onClick={note} disabled={parseNum(phNow) == null}>
              {t("phb.note")}
            </Button>
          </div>
          {readings.length > 0 && (
            <ol className="flex flex-col" id="phb-readings">
              {readings.map((r, i) => (
                <li key={i} className="flex items-center justify-between border-t border-line py-2 text-[13.5px] tabular-nums first:border-t-0">
                  <span className="text-fg-2">{t("phb.after", { ml: num(r.ml, r.ml % 1 ? 1 : 0) })}</span>
                  <b className={cn("font-semibold", phStatus(r.ph, target) === "ok" ? "text-primary" : phStatus(r.ph, target) === "over" ? "text-bad" : "")}>pH {num(r.ph, 2)}</b>
                </li>
              ))}
            </ol>
          )}
          {status !== "unknown" && (
            <p
              id="phb-status"
              className={cn(
                "rounded-md px-3 py-2 text-[12.5px] leading-[1.45] font-medium",
                status === "ok" && "bg-primary/10 text-primary",
                status === "low" && "bg-info/10 text-info",
                status === "over" && "bg-bad/10 text-bad",
              )}
            >
              {status === "ok" ? t("phb.ok") : status === "low" ? t("phb.low", { step: num(stepMl, stepMl % 1 ? 1 : 0) }) : t("phb.over")}
            </p>
          )}
          <Button onClick={save} disabled={!last || totalMl <= 0} className="h-12 rounded-full text-[15px] font-bold">
            {last ? t("phb.save", { litres: num(last.volumeL), date: last.date.slice(8, 10) + "/" + last.date.slice(5, 7) }) : t("phb.noTank")}
          </Button>
        </Card>
      </Reveal>

      <Reveal i={2}>
        <Card className="gap-1.5">
          <Label emoji="book">{t("phb.how")}</Label>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-[12.5px] leading-[1.45] text-fg-2">
            <li>{t("phb.how1")}</li>
            <li>{t("phb.how2")}</li>
            <li>{t("phb.how3")}</li>
          </ul>
        </Card>
      </Reveal>
      <SourceNote>{t("phb.sources")}</SourceNote>
    </div>
  )
}
