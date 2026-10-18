// Outils → Lumière (lot 5): PPFD from the space's lamps at their dimmer, DLI and its inverse, W/m², free height,
// a proportional top view with a 3 × 3 grid (PPFD map measured with a phone / Photone), targets with their source.
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Grid, NumField } from "@/components/hydro/form"
import { Chip, Label, Reveal, SourceNote } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { parseNum } from "@/calc/formulas"
import { stageOn, todayIso } from "@/calc/stage"
import { cellLevel, dimmerFor, dliOf, mapStats, ppfdFor, spaceFreeHeight, spaceLightAt, spaceSchema } from "@/calc/light"
import { equipmentAt } from "@/equipment/calc"
import type { Equipment } from "@/model/grow"
import { CalcRow, CalcValue } from "./equipment-shared"
import { cn } from "@/lib/utils"

export function LightTool() {
  const { t, num, range, settings } = useSettings()
  const { cycle, space, equipment, assignments, targetsFor, saveSpace, saveEquipment } = useGrow()
  const today = todayIso()
  const show = (v?: number | null) => (v == null ? "" : settings.lang === "fr" ? String(v).replace(".", ",") : String(v))
  const lamps = space
    ? equipmentAt(space.id, today, assignments)
        .map((a) => ({ a, e: equipment.find((e) => e.id === a.equipmentId) }))
        .filter((x): x is { a: (typeof assignments)[number]; e: Equipment } => x.e?.type === "lamp")
    : []
  const stage = cycle ? stageOn(cycle, today) : null
  const tg = cycle ? targetsFor(today, cycle) : null
  const defaultHours = !stage || stage.key === "seedling" || stage.key === "veg" || stage.key === "notStarted" ? 18 : 12

  const [dim, setDim] = useState<Record<string, string>>({})
  const [hours, setHours] = useState("")
  const [dliTarget, setDliTarget] = useState("")
  const [cells, setCells] = useState<string[]>(Array(9).fill(""))
  useEffect(() => {
    setDim(Object.fromEntries(lamps.map(({ e }) => [e.id, show(e.lamp?.dimmerPct)])))
    setHours(show(defaultHours))
    setDliTarget("")
    setCells(Array.from({ length: 9 }, (_, i) => show(space?.lightMap?.cells[i] ?? undefined)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space?.id, cycle?.id, settings.lang, lamps.length])

  const schema = useMemo(
    () =>
      spaceSchema(
        space?.dimensionsCm,
        lamps.map(({ a, e }) => ({ id: e.id, name: e.name, l: e.lamp?.dimensionsCm?.l, w: e.lamp?.dimensionsCm?.w, count: a.quantity ?? e.quantity })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [space?.id, space?.dimensionsCm, lamps.length, equipment],
  )
  if (!space) return <p className="text-[13px] text-fg-3">{t("lgt.noSpace")}</p>
  const dimmers = Object.fromEntries(Object.entries(dim).map(([k, v]) => [k, parseNum(v)]))
  const unknownDimmer = lamps.some(({ e }) => dimmers[e.id] == null)
  const { now, full } = spaceLightAt(space, today, equipment, assignments, dimmers)
  const h = parseNum(hours) ?? defaultHours
  const stats = mapStats(cells.map((c) => parseNum(c) ?? null))
  const ppfdEst = now?.ppfd
  const ppfdUsed = stats ? { v: stats.mean, src: "measured" as const } : ppfdEst?.ok ? { v: ppfdEst.value, src: "estimate" as const } : null
  const dliNow = ppfdUsed ? dliOf(ppfdUsed.v, h) : null
  const target = parseNum(dliTarget)
  const needPpfd = target ? ppfdFor(target, h) : null
  const needDim = needPpfd != null && full?.ppfd.ok ? dimmerFor(needPpfd, full.ppfd.value) : null
  const freeH = spaceFreeHeight(space, today, equipment, assignments)
  const ppfdTarget = tg?.ppfd
  const srcLabel = (s?: string) => (s === "common" ? t("lgt.srcCommon") : s === "athena" ? t("nut.srcAthena") : s ? t("nut.srcEstimate") : "")

  const saveDimmers = async () => {
    try {
      for (const { e } of lamps) if (dimmers[e.id] != null && dimmers[e.id] !== e.lamp?.dimmerPct) await saveEquipment({ ...e, lamp: { ...e.lamp, dimmerPct: dimmers[e.id] } })
      toast.success(t("lgt.dimSaved"))
    } catch (err) {
      toast.error(t("common.saveError", { reason: (err as Error).message }))
    }
  }
  const saveMap = async () => {
    try {
      await saveSpace({ ...space, lightMap: { date: today, cells: cells.map((c) => parseNum(c) ?? null) } })
      toast.success(t("lgt.mapSaved"))
    } catch (err) {
      toast.error(t("common.saveError", { reason: (err as Error).message }))
    }
  }
  const dimDirty = lamps.some(({ e }) => dimmers[e.id] != null && dimmers[e.id] !== e.lamp?.dimmerPct)

  return (
    <div className="flex flex-col gap-3">
      <Reveal i={0}>
        <Card className="gap-2.5" id="lgt-ppfd">
          <div className="flex items-center justify-between gap-2">
            <Label emoji="bulb">{t("lgt.now")}</Label>
            {ppfdUsed && <Chip tone={ppfdUsed.src === "measured" ? "primary" : "neutral"}>{ppfdUsed.src === "measured" ? t("lgt.measured") : t("nut.estimate")}</Chip>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Big k={t("lgt.ppfd")} v={ppfdUsed ? num(ppfdUsed.v) : "—"} unit="µmol/m²/s" />
            <Big k={t("lgt.dli", { h: num(h) })} v={dliNow != null ? num(dliNow, 1) : "—"} unit="mol/m²/j" />
          </div>
          {!ppfdUsed && ppfdEst && !ppfdEst.ok && (
            <div className="flex justify-end">
              <CalcValue c={ppfdEst} fmt={(v) => num(v)} />
            </div>
          )}
          {!lamps.length && <p className="text-[12px] text-warn">{t("lgt.noLamp")}</p>}
          {ppfdTarget && (
            <p className="text-[12px] text-fg-2">
              {t("lgt.targets", { ppfd: range(ppfdTarget.lo, ppfdTarget.hi), dli: tg?.dli ? range(tg.dli.lo, tg.dli.hi) : "—", src: srcLabel(ppfdTarget.src) })}
            </p>
          )}
          {unknownDimmer && lamps.length > 0 && !stats && <p className="text-[11.5px] text-fg-3">{t("lgt.dimUnknown")}</p>}
        </Card>
      </Reveal>

      <Reveal i={1}>
        <Card className="gap-3">
          <Label emoji="gear">{t("lgt.settings")}</Label>
          <Grid>
            <NumField id="l-h" label={t("lgt.hours")} value={hours} onChange={setHours} />
            {lamps.map(({ e }) => (
              <NumField key={e.id} id={`l-dim-${e.id}`} integer label={t("lgt.dimmer", { name: e.name })} hint={e.lamp?.dimmable ? t("lgt.dimLevels", { n: e.lamp.dimmable }) : undefined} value={dim[e.id] ?? ""} onChange={(v) => setDim((x) => ({ ...x, [e.id]: v }))} />
            ))}
          </Grid>
          {dimDirty && (
            <Button variant="outline" className="h-10 self-start rounded-full" onClick={saveDimmers}>
              {t("lgt.dimSave")}
            </Button>
          )}
          <div>
            {now && (
              <CalcRow label={t("lgt.wm2")} sub={t("lgt.wm2Sub")}>
                <CalcValue c={now.wPerM2} fmt={(v) => `${num(v)} W/m²`} />
              </CalcRow>
            )}
            {now && (
              <CalcRow label={t("lgt.ppf")} sub={t("lgt.ppfSub")}>
                <CalcValue c={now.ppf} fmt={(v) => `${num(v)} µmol/s`} />
              </CalcRow>
            )}
            <CalcRow label={t("lgt.free")} sub={t("lgt.freeSub")}>
              <CalcValue c={freeH} fmt={(v) => `${num(v)} cm`} />
            </CalcRow>
          </div>
        </Card>
      </Reveal>

      <Reveal i={2}>
        <Card className="gap-3" id="lgt-inverse">
          <Label emoji="sun">{t("lgt.inverse")}</Label>
          <Grid>
            <NumField id="l-dli" label={t("lgt.dliTarget")} hint={tg?.dli ? t("lgt.dliHint", { r: range(tg.dli.lo, tg.dli.hi) }) : undefined} value={dliTarget} onChange={setDliTarget} />
            <div className="rounded-md border border-line bg-surface-2 px-3 py-2">
              <div className="text-[11px] text-fg-3">{t("lgt.needPpfd", { h: num(h) })}</div>
              <div className="text-[22px] font-semibold tabular" id="lgt-need">
                {needPpfd != null ? num(needPpfd) : "—"}
              </div>
              {needDim != null && <div className="text-[11px] text-primary">{t("lgt.needDim", { p: needDim })}</div>}
            </div>
          </Grid>
        </Card>
      </Reveal>

      <Reveal i={3}>
        <Card className="gap-3" id="lgt-schema">
          <div className="flex items-center justify-between gap-2">
            <Label emoji="compass">{t("lgt.schema")}</Label>
            {space.dimensionsCm?.l && space.dimensionsCm?.w && <Chip>{`${num(space.dimensionsCm.l)} × ${num(space.dimensionsCm.w)} cm`}</Chip>}
          </div>
          {schema ? (
            <svg viewBox={`-4 -4 ${schema.width + 8} ${schema.height + 8}`} className="mx-auto block max-h-[300px] w-full" role="img" aria-label={t("lgt.schema")} data-ratio={(schema.width / schema.height).toFixed(3)}>
              <rect x={0} y={0} width={schema.width} height={schema.height} rx={6} className="fill-surface-2 stroke-line-strong" strokeWidth={1.5} />
              {schema.cells.map((c, i) => {
                const v = parseNum(cells[i])
                const lvl = cellLevel(v, ppfdTarget)
                return (
                  <g key={i}>
                    <rect
                      x={c.x + 2}
                      y={c.y + 2}
                      width={c.w - 4}
                      height={c.h - 4}
                      rx={4}
                      className={cn(lvl === "none" && "fill-transparent", lvl === "low" && "fill-info/25", lvl === "ok" && "fill-primary/30", lvl === "high" && "fill-warn/30")}
                      strokeDasharray="3 3"
                      stroke="currentColor"
                      strokeOpacity={0.18}
                    />
                    {v != null && (
                      <text x={c.x + c.w / 2} y={c.y + c.h / 2 + 5} textAnchor="middle" className="fill-fg text-[14px] font-semibold tabular-nums">
                        {num(v)}
                      </text>
                    )}
                  </g>
                )
              })}
              {schema.lamps.map((l) =>
                l.rect ? <rect key={l.id} x={l.rect.x} y={l.rect.y} width={l.rect.w} height={l.rect.h} rx={3} className="fill-warn/15 stroke-warn" strokeWidth={1.5} /> : null,
              )}
            </svg>
          ) : (
            <p className="text-[12px] text-warn">{t("lgt.noDims")}</p>
          )}
          {schema && schema.lamps.some((l) => !l.rect) && <p className="text-[11.5px] text-fg-3">{t("lgt.lampNoDims", { list: [...new Set(schema.lamps.filter((l) => !l.rect).map((l) => l.name))].join(", ") })}</p>}
          <p className="text-[11.5px] text-fg-3">{t("lgt.schemaNote")}</p>
          <div className="grid grid-cols-3 gap-2" id="lgt-map">
            {cells.map((c, i) => (
              <NumField key={i} id={`l-cell-${i}`} integer label={t("lgt.cell", { n: i + 1 })} value={c} onChange={(v) => setCells((x) => x.map((y, j) => (j === i ? v : y)))} />
            ))}
          </div>
          {stats && (
            <p className="text-[12px] text-fg-2" id="lgt-stats">
              {t("lgt.stats", { mean: num(stats.mean), min: num(stats.min), max: num(stats.max), u: num(stats.uniformity, 2), n: stats.measured })}
            </p>
          )}
          <Button variant="outline" className="h-10 self-start rounded-full" onClick={saveMap} disabled={!stats}>
            {t("lgt.mapSave")}
          </Button>
          {space.lightMap && <p className="text-[11px] text-fg-3">{t("lgt.mapDate", { date: space.lightMap.date.slice(8, 10) + "/" + space.lightMap.date.slice(5, 7) })}</p>}
        </Card>
      </Reveal>
      <SourceNote>{t("lgt.sources")}</SourceNote>
    </div>
  )
}

function Big({ k, v, unit }: { k: string; v: string; unit: string }) {
  return (
    <div className="rounded-md border border-line bg-surface-2 px-3 py-2.5">
      <div className="text-[11px] text-fg-3">{k}</div>
      <div className="text-[28px] leading-tight font-semibold tabular">{v}</div>
      <div className="text-[10.5px] text-fg-3">{unit}</div>
    </div>
  )
}
