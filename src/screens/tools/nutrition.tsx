import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Grid, NumField } from "@/components/hydro/form"
import { Chip, Label, Reveal, SourceNote } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { newId, useGrow } from "@/app/grow-context"
import { parseNum } from "@/calc/formulas"
import { stageOn, todayIso } from "@/calc/stage"
import { phTarget } from "@/calc/targets"
import { tankForecast } from "@/calc/reminders"
import { expectedEc, getLine, NUTRIENT_LINES, recipe, recipeForStage, suggestedVolume, type RecipeKind } from "@/calc/nutrition"
import { Seg } from "@/components/hydro/form"
import { SCHEMA, type StageKey } from "@/model/types"
import type { MessageKey } from "@/i18n/types"
import { cn } from "@/lib/utils"
import { concToDosing, dosingToConc } from "./nutrition-settings"
import { equipmentAt } from "@/equipment/calc"
import type { Equipment, EquipmentAssignment } from "@/model/grow"

function reservoirOf(spaceId: string, equipment: Equipment[], assignments: EquipmentAssignment[]): number | undefined {
  const here = equipmentAt(spaceId, todayIso(), assignments).map((a) => equipment.find((e) => e.id === a.equipmentId))
  return here.find((e) => e?.type === "reservoir" && e.reservoir?.kind !== "runoff")?.reservoir?.usableL
}

const KINDS: { v: RecipeKind; k: MessageKey; stage: StageKey }[] = [
  { v: "seedling", k: "nut.kSeedling", stage: "seedling" },
  { v: "veg", k: "nut.kVeg", stage: "veg" },
  { v: "flower", k: "nut.kFlower", stage: "stretch" },
  { v: "finish", k: "nut.kFinish", stage: "finish" },
  { v: "flush", k: "nut.kFlush", stage: "flush" },
]

export function NutritionTool() {
  const { t, num, range, settings } = useSettings()
  const { cycle, mixes, entries, saveMix, saveCycle, nutrition, space, grow, saveGrow, saveSpace, equipment, assignments } = useGrow()
  // Tank volume defaults to the usable volume of the space's reservoir (equipment).
  const reservoirL = space ? reservoirOf(space.id, equipment, assignments) : undefined
  const setConcentrate = (c: number) => {
    const dosing = concToDosing(c)
    if (space?.nutrition && Object.keys(space.nutrition).length) void saveSpace({ ...space, nutrition: { ...space.nutrition, dosing } })
    else void saveGrow({ nutrition: { ...(grow?.nutrition ?? nutrition), dosing } })
  }
  const show = (v?: number) => (v == null ? "" : settings.lang === "fr" ? String(v).replace(".", ",") : String(v))
  const line = getLine(cycle?.nutrientLine)
  const cycleKind = cycle ? recipeForStage(stageOn(cycle, todayIso()).key) : "veg"
  const last = mixes[0]
  const forecast = cycle ? tankForecast(mixes, entries, cycle.potCount) : null
  const suggested = forecast ? suggestedVolume(forecast.perDayL, reservoirL ?? 120) : null

  const [kind, setKind] = useState<RecipeKind>(cycleKind)
  const [f, setF] = useState<Record<string, string>>({})
  useEffect(() => {
    setKind(cycleKind)
    setF({
      volume: show(suggested ?? last?.volumeL ?? reservoirL ?? 30),
      ec: show(last?.ecTarget ?? 2.2),
      tap: show(cycle?.tapEc ?? 0.05),
      cleanse: show(line.cleanseMlPer10L[cycleKind]),
      balance: show(last?.balanceMlPer10L),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle?.id, settings.lang])
  useEffect(() => {
    setF((s) => ({ ...s, cleanse: show(line.cleanseMlPer10L[kind]) }))
  }, [kind]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }))
  // Pro Line dosing: concentrate at 226 g/L by default (setup), or weighed powder (0).
  const conc = dosingToConc(nutrition.dosing)
  const concOptions = [0, ...Object.keys(line.concentrates ?? {}).map(Number).sort((x, y) => x - y)]
  const volumeL = parseNum(f.volume) ?? 0
  const ec = kind === "flush" ? 0 : (parseNum(f.ec) ?? 2.2)
  const tap = parseNum(f.tap) ?? 0
  const items = useMemo(
    () => recipe(line, { kind, volumeL, ec, cleanseMlPer10L: parseNum(f.cleanse), balanceMlPer10L: parseNum(f.balance), concentrate: conc }),
    [line, kind, volumeL, ec, f.cleanse, f.balance, conc],
  )
  const stage = KINDS.find((k) => k.v === kind)!.stage
  const ph = phTarget(stage, cycle?.substrate ?? "coco")
  const name = (role: string) => line.products.find((p) => p.role === role)?.name ?? ""

  const sub = (id: string, role: string, estimate?: boolean) => {
    if (role === "water") return t("nut.waterSub")
    if (role === "roWater") return t("nut.roWaterSub")
    if (role === "balance") return f.balance ? t("nut.balanceKnown") : t("nut.balanceUnknown")
    if (role === "base") return conc > 0 ? t("nut.baseSubConc") : t("nut.baseSub")
    if (role === "core") return t("nut.coreSub")
    if (role === "fade") return `${t("nut.fadeSub", { core: name("core") })}${estimate ? ` · ${t("nut.estimate")}` : ""}`
    if (role === "cleanse") return t("nut.cleanseSub", { v: num(parseNum(f.cleanse) ?? line.cleanseMlPer10L[kind], 0) })
    return id
  }

  const save = async () => {
    if (!cycle) return toast(t("irr.noCycle"))
    try {
      await saveMix({
        schemaVersion: SCHEMA.mix,
        id: newId("mix-"),
        date: todayIso(),
        volumeL,
        line: line.id,
        kind,
        ecTarget: kind === "flush" ? 0 : ec,
        ecExpected: kind === "flush" ? undefined : expectedEc(ec, tap),
        phTarget: { lo: ph.lo, hi: ph.hi },
        balanceMlPer10L: parseNum(f.balance),
        items: items.map((i) => ({ id: i.id, name: i.name, qty: i.qty, unit: i.concentrate ? `mL @${i.concentrate} g/L` : i.unit })),
        recipe: items
          .filter((i) => i.qty != null)
          .map((i) => `${i.name ?? t(i.role === "roWater" ? "nut.roWater" : "nut.water")} ${num(i.qty!, i.unit === "L" || i.concentrate ? 0 : 1)} ${i.unit}`)
          .join(" · "),
        createdAt: new Date().toISOString(),
      })
      if (tap !== cycle.tapEc) await saveCycle({ ...cycle, tapEc: tap })
      toast.success(t("nut.saved"))
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error).message }))
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Reveal i={0}>
        <Card className="gap-3">
          <div className="flex items-center justify-between">
            <Label emoji="testTube">{t("nut.recipe")}</Label>
            {Object.keys(NUTRIENT_LINES).length > 1 ? null : <Chip>{`${t("nut.line")} · ${line.name}`}</Chip>}
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("nut.recipe")}>
            {KINDS.map((k) => (
              <button
                key={k.v}
                role="radio"
                aria-checked={kind === k.v}
                onClick={() => setKind(k.v)}
                className={cn("h-10 rounded-full border px-3.5 text-[13px] font-semibold", kind === k.v ? "border-primary/40 bg-primary/12 text-primary" : "border-line bg-surface-2 text-fg-2")}
              >
                {t(k.k)}
              </button>
            ))}
          </div>
          {kind !== "flush" && (
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-fg-2">{t("nut.dosing")}</span>
              <Seg<string>
                label={t("nut.dosing")}
                value={String(conc)}
                onChange={(v) => setConcentrate(Number(v))}
                options={concOptions.map((c) => ({ value: String(c), label: c === 0 ? t("nut.powder") : `${num(c)} g/L` }))}
              />
              {conc > 0 && <span className="text-[11px] leading-snug text-fg-3">{t("nut.concNote", { core: line.products.find((p) => p.role === "core")?.name ?? "" })}</span>}
            </div>
          )}
          <Grid>
            <NumField id="n-vol" label={t("nut.volume")} hint={suggested ? t("nut.volumeHint", { v: num(suggested) }) : t("nut.volumeHintNone")} value={f.volume ?? ""} onChange={set("volume")} />
            {kind !== "flush" && <NumField id="n-ec" label={t("nut.ec")} hint={t("nut.ecHint")} value={f.ec ?? ""} onChange={set("ec")} />}
            {kind !== "flush" && <NumField id="n-tap" label={t("nut.tap")} hint={t("nut.tapHint")} value={f.tap ?? ""} onChange={set("tap")} />}
            <NumField id="n-cl" label={t("nut.cleanse", { name: name("cleanse") })} hint={t("nut.cleanseHint", { range: range(...line.cleanseRange) })} value={f.cleanse ?? ""} onChange={set("cleanse")} />
            {kind !== "flush" && <NumField id="n-bal" label={t("nut.balance", { name: name("balance") })} hint={last?.balanceMlPer10L != null ? t("nut.balanceHint") : undefined} value={f.balance ?? ""} onChange={set("balance")} />}
          </Grid>
        </Card>
      </Reveal>

      <Reveal i={1}>
        <Card className="px-0 pb-1">
          <Label emoji="testTube" className="px-3.5">
            {t("nut.order")}
          </Label>
          <ol className="mt-2">
            {items.map((i, idx) => (
              <li key={i.id} className={cn("grid grid-cols-[28px_1fr_auto] items-center gap-2.5 border-t border-line px-3.5 py-3", i.qty == null && i.role === "balance" && "opacity-80")}>
                <span className="flex size-6 items-center justify-center rounded-full border-[1.5px] border-info text-[11.5px] font-semibold text-info tabular-nums">{idx + 1}</span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold">{i.name ?? t(i.role === "roWater" ? "nut.roWater" : "nut.water")}</span>
                  <span className="block text-[11.5px] leading-snug text-fg-3">{sub(i.id, i.role, i.estimate)}</span>
                  {i.concentrate != null && i.grams != null && (
                    <span className="block text-[11.5px] leading-snug text-primary">
                      {t("nut.concSub", { c: num(i.concentrate), g: num(i.grams, 1) })}
                      {i.estimate ? ` · ${t("nut.estimate")}` : ""}
                    </span>
                  )}
                </span>
                <span className="text-right text-[18px] font-semibold tabular">
                  {i.qty == null ? "—" : `${num(i.qty, i.unit === "L" || i.concentrate ? 0 : 1)} ${i.unit}`}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </Reveal>

      <Reveal i={2}>
        <Card className="gap-2.5">
          {kind !== "flush" ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border border-line bg-surface-2 px-3 py-2.5">
                  <div className="text-[11px] text-fg-3">{t("nut.expected")}</div>
                  <div className="text-[22px] font-semibold tabular">{num(expectedEc(ec, tap), 2)}</div>
                </div>
                <div className="rounded-md border border-line bg-surface-2 px-3 py-2.5">
                  <div className="text-[11px] text-fg-3">{t("nut.phTarget")}</div>
                  <div className="text-[22px] font-semibold tabular">{range(ph.lo, ph.hi, 1)}</div>
                </div>
              </div>
              <p className="text-[12px] leading-[1.45] text-fg-2">{t("nut.expectedSub", { ec: num(ec, 1), tap: num(tap, 2) })}</p>
              <p className="text-[12px] leading-[1.45] text-fg-2">{t("nut.phSub", { name: name("balance") })}</p>
              {kind === "seedling" && <p className="text-[12px] leading-[1.45] text-fg-2">{t("nut.seedNote")}</p>}
              {kind === "finish" && <p className="text-[12px] leading-[1.45] text-fg-2">{t("nut.finishNote", { fade: name("fade") })}</p>}
              {(kind === "veg" || kind === "flower") && <p className="text-[12px] leading-[1.45] text-fg-2">{t("nut.startLowNote")}</p>}
            </>
          ) : (
            <p className="text-[12.5px] leading-[1.45] text-fg-2">{t("nut.flushNote", { cleanse: name("cleanse") })}</p>
          )}
          <p className="text-[12px] leading-[1.45] text-fg-3">{t("nut.storageNote")}</p>
        </Card>
      </Reveal>

      <Button onClick={save} disabled={!cycle || volumeL <= 0} className="h-12 rounded-full text-[15px] font-bold">
        {t("nut.save")}
      </Button>
      {!cycle && <p className="text-center text-[12px] text-fg-3">{t("irr.noCycle")}</p>}
      <SourceNote>{t("nut.sourceLine", { source: line.source })}</SourceNote>
    </div>
  )
}
