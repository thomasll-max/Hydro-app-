// Outils → Climat et air (lot 5): leaf VPD from the last reading (or typed), target by stage (common benchmark,
// labelled), humidity to aim for at this temperature, air renewal from the space's extractor.
import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Grid, NumField } from "@/components/hydro/form"
import { Chip, Label, Reveal, SourceNote } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { parseNum } from "@/calc/formulas"
import { todayIso } from "@/calc/stage"
import { AIR_REF_SECONDS, leafVpd, rhRangeForVpd, spaceAir, vpdStatus } from "@/calc/climate"
import { CalcRow, CalcValue, SettingsLink } from "./equipment-shared"
import { useEditors } from "@/app/editors"
import { cn } from "@/lib/utils"

export function ClimateTool() {
  const { t, num, range, settings } = useSettings()
  const { cycle, space, all, equipment, assignments, targetsFor } = useGrow()
  const today = todayIso()
  const show = (v?: number) => (v == null ? "" : settings.lang === "fr" ? String(v).replace(".", ",") : String(v))
  const last = space ? all.entries.find((e) => e.spaceId === space.id && !e.plantId && e.tempDay != null) : undefined
  const tg = cycle ? targetsFor(today, cycle) : null

  const ed = useEditors()
  const [f, setF] = useState<Record<string, string>>({})
  useEffect(() => {
    setF({ temp: show(last?.tempDay), rh: show(last?.rh), offset: show(last?.leafOffsetC ?? cycle?.leafOffsetC ?? -2) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space?.id, last?.id, settings.lang])
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }))

  if (!space) return <p className="text-[13px] text-fg-3">{t("lgt.noSpace")}</p>
  const T = parseNum(f.temp)
  const RH = parseNum(f.rh)
  const off = parseNum(f.offset) ?? -2
  const res = T != null && RH != null ? leafVpd(T, RH, off) : null
  const status = res ? vpdStatus(res.vpd, tg?.vpd) : "none"
  const rhAim = tg?.vpd && T != null ? rhRangeForVpd(tg.vpd, T, off) : null
  const air = spaceAir(space, today, equipment, assignments)
  const dur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, "0")} s` : `${Math.round(s)} s`)



  return (
    <div className="flex flex-col gap-3">
      <Reveal i={0}>
        <Card className="gap-3" id="clim-vpd">
          <div className="flex items-center justify-between gap-2">
            <Label emoji="thermometer">{t("clim.vpd")}</Label>
            {last && <Chip>{t("clim.fromEntry", { date: last.date.slice(8, 10) + "/" + last.date.slice(5, 7) })}</Chip>}
          </div>
          <Grid cols={3}>
            <NumField id="c-t" label={t("clim.temp")} value={f.temp ?? ""} onChange={set("temp")} />
            <NumField id="c-rh" label={t("clim.rh")} value={f.rh ?? ""} onChange={set("rh")} />
            <NumField id="c-off" label={t("clim.offset")} value={f.offset ?? ""} onChange={set("offset")} />
          </Grid>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-line bg-surface-2 px-3 py-2.5">
              <div className="text-[11px] text-fg-3">{t("clim.vpdLeaf")}</div>
              <div className={cn("text-[30px] leading-tight font-semibold tabular", status === "ok" && "text-primary", (status === "low" || status === "high") && "text-warn")} id="clim-vpd-v">
                {res ? num(res.vpd, 2) : "—"}
              </div>
              <div className="text-[10.5px] text-fg-3">kPa{res ? ` · ${t("clim.leaf", { c: num(res.leafC, 1) })}` : ""}</div>
            </div>
            <div className="rounded-md border border-line bg-surface-2 px-3 py-2.5">
              <div className="text-[11px] text-fg-3">{t("clim.target")}</div>
              <div className="text-[22px] leading-tight font-semibold tabular">{tg?.vpd ? range(tg.vpd.lo, tg.vpd.hi, 1) : "—"}</div>
              <div className="text-[10.5px] text-fg-3">{tg?.vpd ? t("clim.targetSrc", { stage: t(`stage.${tg.stage}`) }) : t("clim.noCycle")}</div>
            </div>
          </div>
          {res && status !== "none" && (
            <p className={cn("rounded-md px-3 py-2 text-[12.5px] font-medium", status === "ok" ? "bg-primary/10 text-primary" : "bg-warn/10 text-warn")} id="clim-status">
              {status === "ok" ? t("clim.ok") : status === "low" ? t("clim.low") : t("clim.high")}
            </p>
          )}
          {rhAim && T != null && (
            <p className="text-[12.5px] text-fg-2" id="clim-rh-aim">
              {t("clim.rhAim", { t: num(T, 1), rh: range(rhAim.lo, rhAim.hi) })}
            </p>
          )}
          <p className="text-[11.5px] text-fg-3">{t("clim.formula")}</p>
        </Card>
      </Reveal>

      <Reveal i={1}>
        <Card className="gap-2.5" id="clim-air">
          <Label emoji="cyclone">{t("clim.air")}</Label>
          {!air ? (
            <p className="text-[12.5px] text-warn">{t("clim.noExtractor")}</p>
          ) : (
            <>
              <SettingsLink
                summary={[
                  air.ext.name,
                  air.m3h != null ? `${num(air.m3h)} m³/h` : t("clim.flowMissing"),
                  air.ext.extractor?.speedPct != null ? t("clim.sumSpeed", { p: num(air.ext.extractor.speedPct) }) : t("clim.speedUnknown"),
                ].join(" · ")}
                label={t("tools.settingsBtn")}
                onOpen={() => ed.openSpace(space.id, "air")}
              />
              <div>
                <CalcRow label={t("clim.renewal")} sub={t("clim.renewalRef", { a: AIR_REF_SECONDS[0] / 60, b: AIR_REF_SECONDS[1] / 60 })}>
                  <CalcValue c={air.seconds} fmt={(v) => t("clim.every", { d: dur(v) })} />
                </CalcRow>
                <CalcRow label={t("clim.perHour")}>
                  <CalcValue c={air.perHour} fmt={(v) => num(v, 0)} />
                </CalcRow>
              </div>
              {air.status && air.status !== "ok" && <p className="text-[12px] text-warn">{air.status === "slow" ? t("clim.slow") : t("clim.fast")}</p>}
              {air.carbonFilter && <p className="text-[11.5px] text-fg-3">{t("equip.c.carbonWarn")}</p>}
              {air.m3h == null && (
                <a href="#equipment" className="text-[12.5px] font-semibold text-primary">
                  {t("irr.openEquipment")}
                </a>
              )}
            </>
          )}
        </Card>
      </Reveal>
      <SourceNote>{t("clim.sources")}</SourceNote>
    </div>
  )
}
