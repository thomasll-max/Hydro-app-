// Outils → Pulvérisation IPW (lot 5): protocol dose for the sprayer, allowed window (veg, flowering S1–S3), schedule,
// checklist before spraying, spray log and the next-spray reminder (calendar). Foliar only, never in the tank.
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NumField, Seg } from "@/components/hydro/form"
import { Chip, Label, Reveal, SourceNote } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { newId, useGrow } from "@/app/grow-context"
import { parseNum } from "@/calc/formulas"
import { stageOn, todayIso } from "@/calc/stage"
import { IPW_CHECKLIST, IPW_PROTOCOLS, ipwAllowed, ipwDoseMl, ipwLastDay, ipwMlPerL, ipwSchedule, nextIpw, type IpwCheck, type IpwProtocol } from "@/calc/ipw"
import { GROW_SCHEMA } from "@/model/grow"
import { cn } from "@/lib/utils"
import { useEditors } from "@/app/editors"

export function IpwTool() {
  const { t, num, settings } = useSettings()
  const { cycle, space, sprays, saveSpray, nutrition } = useGrow()
  const ed = useEditors()
  const today = todayIso()
  const enabled = nutrition.addons.includes("ipw")
  const stage = cycle ? stageOn(cycle, today) : null
  const allowed = stage ? ipwAllowed(stage) : ({ ok: false, reason: "notStarted" } as const)
  const lastDay = ipwLastDay(cycle?.flipDate)
  const mine = space ? sprays.filter((s) => s.product === "ipw" && s.spaceIds.includes(space.id)) : []
  const running = space ? nextIpw(sprays, space.id, lastDay) : null

  const [protocol, setProtocol] = useState<IpwProtocol>("prevention")
  const [litres, setLitres] = useState("")
  const [checked, setChecked] = useState<IpwCheck[]>([])
  useEffect(() => {
    const last = mine[0]
    setProtocol((last?.protocol as IpwProtocol) ?? "prevention")
    setLitres(last ? (settings.lang === "fr" ? String(last.litres).replace(".", ",") : String(last.litres)) : "")
    setChecked([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space?.id, mine.length])
  const L = parseNum(litres)
  // A double tap must not record the spray twice (lot 10a).
  const saving = useRef(false)
  const [busy, setBusy] = useState(false)
  const dose = L && L > 0 ? ipwDoseMl(L, protocol) : null
  // Same protocol still running: the schedule keeps its first day; otherwise a new run starts today.
  const start = running && running.protocol === protocol ? running.start : today
  const plan = ipwSchedule(protocol, start, lastDay).filter((d) => d >= today).slice(0, 8)
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(settings.lang === "fr" ? "fr-FR" : "en-GB", { weekday: "short", day: "numeric", month: "short" })
  const allChecked = IPW_CHECKLIST.every((c) => checked.includes(c))


  const save = async () => {
    if (!space || !L || !allowed.ok || saving.current) return
    saving.current = true
    setBusy(true)
    try {
      await saveSpray({
        schemaVersion: GROW_SCHEMA.spray,
        id: newId("spray-"),
        date: today,
        spaceIds: [space.id],
        ...(cycle ? { cycleId: cycle.id } : {}),
        product: "ipw",
        mlPerL: ipwMlPerL(protocol),
        litres: L,
        protocol,
        protocolStart: start,
        checked,
        createdAt: new Date().toISOString(),
      })
      toast.success(t("ipw.saved"))
      setChecked([])
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error).message }))
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!enabled && (
        <Reveal i={0}>
          <Card className="gap-2 border-warn/35" id="ipw-off">
            <p className="text-[0.78125rem] leading-[1.45] text-fg-2">{t("ipw.off")}</p>
            {space && (
              <button type="button" onClick={() => ed.openSpace(space.id, "nutrition")} className="self-start rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[0.78125rem] font-semibold text-primary">
                {t("ipw.enableInSettings")}
              </button>
            )}
          </Card>
        </Reveal>
      )}

      <Reveal i={1}>
        <Card className="gap-2.5" id="ipw-window">
          <div className="flex items-center justify-between gap-2">
            <Label emoji="sweat">{t("ipw.window")}</Label>
            <Chip tone={allowed.ok ? "primary" : "warn"}>{allowed.ok ? t("ipw.allowed") : t("ipw.blocked")}</Chip>
          </div>
          <p className={cn("text-[0.8125rem] leading-[1.45]", allowed.ok ? "text-fg-2" : "font-medium text-bad")}>
            {allowed.ok ? (lastDay ? t("ipw.until", { date: fmt(lastDay) }) : t("ipw.okVeg")) : t(`ipw.why.${allowed.reason}`)}
          </p>
          <p className="text-[0.75rem] text-fg-3">{t("ipw.windowRule")}</p>
        </Card>
      </Reveal>

      <Reveal i={2}>
        <Card className="gap-3">
          <Label emoji="testTube">{t("ipw.protocol")}</Label>
          <Seg<IpwProtocol> label={t("ipw.protocol")} value={protocol} onChange={setProtocol} options={IPW_PROTOCOLS.map((p) => ({ value: p, label: t(`ipw.p.${p}`) }))} />
          <p className="text-[0.75rem] leading-[1.45] text-fg-2">{t(`ipw.pd.${protocol}`)}</p>
          <div className="grid grid-cols-[1fr_1fr] items-end gap-2.5">
            <NumField id="ipw-l" label={t("ipw.litres")} hint={t("ipw.litresHint")} value={litres} onChange={setLitres} />
            <div className="rounded-md border border-line bg-surface-2 px-3 py-2" id="ipw-dose">
              <div className="text-[0.75rem] text-fg-3">{t("ipw.dose", { r: ipwMlPerL(protocol) })}</div>
              <div className="text-[1.625rem] leading-tight font-semibold tabular">{dose != null ? `${num(dose, dose % 1 ? 1 : 0)} mL` : "—"}</div>
            </div>
          </div>
          {plan.length > 0 && allowed.ok && (
            <div>
              <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{running && running.protocol === protocol ? t("ipw.planRunning") : t("ipw.planNew")}</div>
              <div className="flex flex-wrap gap-1.5" id="ipw-plan">
                {plan.map((d) => (
                  <Chip key={d} tone={d === today ? "primary" : "neutral"}>
                    {fmt(d)}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </Card>
      </Reveal>

      <Reveal i={3}>
        <Card className="gap-1">
          <Label emoji="book">{t("ipw.checklist")}</Label>
          <ul className="mt-1.5 flex flex-col" id="ipw-checklist">
            {IPW_CHECKLIST.map((c) => {
              const on = checked.includes(c)
              return (
                <li key={c}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setChecked((x) => (on ? x.filter((y) => y !== c) : [...x, c]))}
                    className="flex min-h-11 w-full items-center gap-3 border-t border-line py-2 text-left first:border-t-0"
                  >
                    <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px]", on ? "border-primary bg-primary text-primary-foreground" : "border-line-strong")}>
                      {on && <Check className="size-4" />}
                    </span>
                    <span className="text-[0.84375rem] leading-snug">{t(`ipw.c.${c}`)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <Button onClick={save} disabled={!allowed.ok || !L || !space || busy} className="mt-2 h-12 rounded-full text-[0.9375rem] font-bold">
            {allChecked ? t("ipw.save") : t("ipw.saveUnchecked", { n: checked.length, total: IPW_CHECKLIST.length })}
          </Button>
        </Card>
      </Reveal>

      <Reveal i={4}>
        <Card className="gap-1.5">
          <Label emoji="calendar">{t("ipw.history")}</Label>
          {running && enabled && <p className="text-[0.78125rem] font-medium text-primary">{t("ipw.next", { date: fmt(running.date) })}</p>}
          {mine.length === 0 ? (
            <p className="text-[0.78125rem] text-fg-3">{t("ipw.none")}</p>
          ) : (
            <ul id="ipw-history">
              {mine.slice(0, 10).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 border-t border-line py-2 text-[0.8125rem] first:border-t-0">
                  <span className="text-fg-2">{fmt(s.date)}</span>
                  <span className="tabular-nums">
                    {t(`ipw.p.${s.protocol ?? "prevention"}`)} · {num(s.litres, s.litres % 1 ? 1 : 0)} L · {num(s.mlPerL * s.litres, 0)} mL
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Reveal>
      <SourceNote>{t("ipw.sources")}</SourceNote>
    </div>
  )
}
