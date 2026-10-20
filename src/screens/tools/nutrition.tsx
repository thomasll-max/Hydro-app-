// Outils → Nutrition (lot 4): recipe from the line's catalog, in mixing order with sources; one tank for one or several
// spaces of the same line, with pH before/after and the Balance added; concentrate jugs and personal products.
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { focusField, focusFirstInvalid, Grid, NumField } from "@/components/hydro/form"
import { Chip, Label, Reveal, Notice } from "@/components/hydro/primitives"
import { SpaceDot } from "@/components/hydro/space-pill"
import { useSettings } from "@/app/settings-context"
import { newId, useGrow } from "@/app/grow-context"
import { badNums, parseNum } from "@/calc/formulas"
import { outside, TANK_RANGE, type Range } from "@/calc/plausible"
import { stageOn, todayIso } from "@/calc/stage"
import { cycleNumber } from "@/calc/targets"
import { tankForecast } from "@/calc/reminders"
import { chosenPer10L, expectedEc, mixRecipe, nextBalancePer10L, phaseAt, phaseById, phaseKind, positionOf, suggestedVolume, type MixItem } from "@/calc/nutrients"
import { getCatalog, isOwnLine, type NutrientCatalog, type ProgramPhase, type ValueSource } from "@/data/nutrients"
import { spaceNutrition } from "@/model/grow-ops"
import { SCHEMA } from "@/model/types"
import type { MessageKey } from "@/i18n/types"
import { cn } from "@/lib/utils"
import { ADDON_NAMES, dosingToConc } from "./nutrition-settings"
import { SettingsLink } from "./equipment-shared"
import { useEditors } from "@/app/editors"
import { ConcentrateCard, CustomProductsCard } from "./nutrition-parts"
import { HandProducts, OwnRecipeTool } from "./own-recipe"
import { StackCard } from "./stack-card"
import { shownPerL, stackDrenchPerL, stackSprayThisWeek, stackTankThisWeek, stackWindow } from "@/calc/stack"
import { STACK } from "@/data/nutrients"
import { equipmentAt } from "@/equipment/calc"
import type { Equipment, EquipmentAssignment } from "@/model/grow"
import { joined, segment, tertiary, toggle } from "@/components/hydro/styles"

/** The tank's numbers with a range (lot 15b, those of a tank said aloud): field id, form key, range. */
const TANK_FIELDS: [string, string, Range][] = [
  ["n-vol", "volume", TANK_RANGE.volumeL],
  ["n-ec", "ec", TANK_RANGE.ec],
  ["n-tap", "tap", TANK_RANGE.ec],
  ["n-phb", "phBefore", TANK_RANGE.ph],
  ["n-pha", "phAfter", TANK_RANGE.ph],
  ["n-ecm", "ecMeasured", TANK_RANGE.ec],
]

function reservoirOf(spaceId: string, equipment: Equipment[], assignments: EquipmentAssignment[]): number | undefined {
  const here = equipmentAt(spaceId, todayIso(), assignments).map((a) => equipment.find((e) => e.id === a.equipmentId))
  return here.find((e) => e?.type === "reservoir" && e.reservoir?.kind !== "runoff")?.reservoir?.usableL
}

const NAMED = new Set(["presoak", "clone", "veg", "flower", "finish", "flush"])
export function usePhaseLabel() {
  const { t } = useSettings()
  return (p: ProgramPhase) => (NAMED.has(p.id) ? t(`nut.ph_${p.id}` as MessageKey) : t("nut.ph_week", { w: p.weeks?.[0] ?? "" }))
}

export function useSrcLabel() {
  const { t } = useSettings()
  return (s?: ValueSource | "spec" | "estimate") => {
    if (!s) return ""
    if (s === "spec") return t("nut.srcSpec")
    if (s === "estimate" || s.kind === "estimate") return t("nut.srcEstimate")
    if (s.kind === "label") return t("nut.srcLabel")
    // The line above already says « converti » with both units (lot 14b).
    if (s.kind === "athenaWeb") return t("nut.srcStack")
    return s.page ? t("nut.srcPage", { p: s.page }) : t("nut.srcAthena")
  }
}

/** Default EC of a phase: the published one; Pro cycle 1 starts lower (spec §9: solution 2.0–2.4). */
function defaultEc(cat: NutrientCatalog, phase: ProgramPhase, firstCycle: boolean): number {
  if (cat.ecTable && firstCycle && (phase.stage === "veg" || phase.stage === "flower")) return 2.2
  return phase.ec
}

export function NutritionTool() {
  const { nutrition } = useGrow()
  return isOwnLine(nutrition.line) ? <OwnRecipeTool /> : <LineNutrition />
}

function LineNutrition() {
  const { t, num, range, dm, show } = useSettings()
  const { cycle, cycles, mixes, entries, saveMix, saveCycle, nutrition, space, spaces, grow, equipment, assignments, customProducts, sprays } = useGrow()
  const cat = getCatalog(nutrition.line)
  const phaseLabel = usePhaseLabel()
  const srcLabel = useSrcLabel()
  // Tank volume defaults to the usable volume of the space's reservoir (equipment).
  const reservoirL = space ? reservoirOf(space.id, equipment, assignments) : undefined
  const ed = useEditors()

  const pos = cycle ? positionOf(stageOn(cycle, todayIso())) : null
  const cyclePhase = (pos && phaseAt(cat, pos)) || phaseById(cat, "veg") || cat.program[0]
  const firstCycle = !cycle || cycleNumber(cycle, cycles) <= 1
  // Stack (lot 14b): its add-on on, how it is given, its window today, and this week's tank that already had it.
  const stackOn = nutrition.addons.includes("stack")
  const stackUse = nutrition.stack ?? "tank"
  const stackWin = stackWindow(cycle, todayIso())
  const stackDone = space ? stackTankThisWeek(mixes, [space.id], todayIso()) : undefined
  const stackLast =
    stackUse === "foliar"
      ? space && stackSprayThisWeek(sprays, space.id, todayIso())
      : mixes.find((m) => space && m.spaceIds?.includes(space.id) && m.items?.some((i) => i.id === "stack" && i.qty != null))?.date
  const lineMixes = mixes.filter((m) => !m.line || m.line === cat.id)
  const last = lineMixes[0]
  const forecast = cycle?.potCount ? tankForecast(mixes, entries, cycle.potCount) : null
  const suggested = forecast ? suggestedVolume(forecast.perDayL, reservoirL ?? 120) : null

  const [phaseId, setPhaseId] = useState(cyclePhase.id)
  const [f, setF] = useState<Record<string, string>>({})
  const [shared, setShared] = useState<string[]>([])
  // A double tap must not record the tank twice (lot 10a): the ref locks at once, the state disables the button.
  const saving = useRef(false)
  const [busy, setBusy] = useState(false)
  // The tank just saved stays in view (lot 10d): « Dernier bidon … enregistré à l'instant ».
  const [justSaved, setJustSaved] = useState<string | null>(null)
  const phase = phaseById(cat, phaseId) ?? cyclePhase

  // Dose chosen in a range last time (per 10 L, as typed), to prefill. Older tanks only kept the scaled quantity: the
  // EC scaling of that tank is taken out again, so the dose no longer drifts from one tank to the next (lot 10c).
  const lastChosen = (id: string) => chosenPer10L(cat, last, id)
  const nextBal = last ? nextBalancePer10L(last) : undefined
  useEffect(() => {
    setPhaseId(cyclePhase.id)
    setF({
      // Nothing known (no consumption, no last tank, no reservoir): left empty, never a guessed 30 L (lot 10c).
      volume: show(suggested ?? last?.volumeL ?? reservoirL),
      ec: show(last?.phase === cyclePhase.id && last?.ecTarget ? last.ecTarget : defaultEc(cat, cyclePhase, firstCycle)),
      tap: show(cycle?.tapEc ?? 0.05),
      balance: show(nextBal),
      ...Object.fromEntries(cyclePhase.doses.map((d) => [`c_${d.product}`, show(lastChosen(d.product))])),
      ...Object.fromEntries(customProducts.map((p) => [`c_${p.id}`, show(lastChosen(p.id))])),
    })
    setShared(space ? [space.id] : [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle?.id, space?.id, cat.id])
  const pickPhase = (id: string) => {
    const p = phaseById(cat, id)
    if (!p) return
    setPhaseId(id)
    setF((s) => ({ ...s, ec: show(defaultEc(cat, p, firstCycle)) }))
  }

  // The 13 phases of Blended: boxes at least as wide as the longest word (« Vorwässern »), never cut (lot 14a). The
  // Pro Line's five phases keep their row.
  const longest = Math.max(...cat.program.flatMap((p) => phaseLabel(p).split(/[\s/-]+/).map((w) => w.length)))
  const phaseColumns = cat.program.length > 8 ? { fontSize: "0.8125rem", gridTemplateColumns: `repeat(auto-fit,minmax(min(100%,max(4rem,calc(${longest}ch + 1.25rem))),1fr))` } : undefined
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }))
  // The ranges of a tank (lot 15b): written under the field at once, the tank waits for the right value.
  const wrong = TANK_FIELDS.filter(([, k, r]) => outside(parseNum(f[k]), r))
  const rangeErr = (k: string) => {
    const r = wrong.find((x) => x[1] === k)?.[2]
    return r ? t("safe.outOfRange", { min: num(r.min), max: num(r.max) }) : undefined
  }
  const conc = cat.ecTable ? dosingToConc(nutrition.dosing) : 0
  const concOptions = cat.ecTable ? [0, ...Object.keys(cat.ecTable.concentrates).map(Number).sort((x, y) => x - y)] : []
  const volumeL = parseNum(f.volume) ?? 0
  const ec = phase.stage === "flush" ? 0 : (parseNum(f.ec) ?? phase.ec)
  const tap = parseNum(f.tap) ?? 0
  const chosen = Object.fromEntries(Object.entries(f).filter(([k]) => k.startsWith("c_")).map(([k, v]) => [k.slice(2), parseNum(v)]))
  const result = useMemo(
    () =>
      mixRecipe(cat.id, {
        phaseId: phase.id,
        volumeL,
        ec,
        concentrate: conc,
        addons: nutrition.addons,
        chosenPer10L: chosen,
        balanceMlPer10L: parseNum(f.balance),
        custom: customProducts,
        substrate: cycle?.substrate ?? "coco",
        week: phase.id === cyclePhase.id && pos?.stage === "flower" ? pos.week : undefined,
        // Stack goes in the tank of the cycle's phase only, inside its window (the date is today's).
        stack: stackOn && stackUse === "tank" ? { ok: stackWin.ok && phase.id === cyclePhase.id, doneOn: stackDone } : undefined,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cat.id, phase.id, volumeL, ec, conc, nutrition.addons, JSON.stringify(chosen), f.balance, customProducts, cycle?.substrate, cyclePhase.id, pos?.week, stackOn, stackUse, stackWin.ok, stackDone],
  )
  const items = result.items
  const ph = result.ph
  const pname = (id: string) => cat.products.find((p) => p.id === id)?.name ?? id
  const coreName = cat.products.find((p) => p.id === "proCore")?.name ?? "Core"
  const ranged = items.filter((i) => i.range)

  // Spaces this tank can feed: nutrition module on, same line (never Pro and Blended in one tank).
  const feedable = spaces.filter((s) => s.modules.nutrition)
  const lineOf = (id: string) => spaceNutrition(grow, spaces.find((s) => s.id === id)).line

  const sub = (i: MixItem): string => {
    if (i.kind === "water") return t("nut.waterSub")
    if (i.kind === "roWater") return t("nut.roWaterSub")
    switch (i.note) {
      case "balanceFirst":
        return t("nut.nBalanceFirst")
      case "balanceSteps":
        return t("nut.nBalanceSteps", { step: num(i.stepMl ?? 0, Number.isInteger(i.stepMl ?? 0) ? 0 : 1) })
      case "coreAlone":
        return t("nut.nCoreAlone")
      case "replacesCore":
        return t("nut.nReplacesCore", { core: coreName })
      case "fadeOff":
        return t("nut.nFadeOff", { core: coreName })
      case "labelMissing":
        return t("nut.nLabelMissing")
      case "range":
        return t("nut.nRange")
      case "labelRange":
        return t("nut.nLabelRange")
      case "concentrate":
        return t("nut.nConcentrate")
      case "stack": {
        const [lo, hi] = stackDrenchPerL()
        return t("nut.stackSub", { gal: range(STACK.drench.mlPerGal[0], STACK.drench.mlPerGal[1]), perL: range(shownPerL(lo), shownPerL(hi), 2) })
      }
      case "stackDone":
        return t("nut.stackDone", { date: dm(stackDone ?? "") })
    }
    return i.unit === "g" ? t("nut.nPowder") : ""
  }
  const qtyText = (i: MixItem) => {
    const d = i.unit === "L" || i.concentrate || (i.qty != null && Number.isInteger(i.qty)) ? 0 : 1
    if (i.qty != null) return `${num(i.qty, d)} ${i.unit}`
    if (i.range) return `${range(i.range[0], i.range[1], 0)} ${i.unit}`
    return "—"
  }

  const save = async () => {
    if (saving.current) return
    const ids = shared.length ? shared : space ? [space.id] : []
    if (!ids.length) return toast(t("nut.needSpace"))
    if (badNums(f).length) {
      focusFirstInvalid()
      return toast.error(t("safe.fixFields"))
    }
    if (wrong.length) return focusField(wrong[0][0])
    saving.current = true
    setBusy(true)
    try {
      const id = newId("mix-")
      await saveMix({
        schemaVersion: SCHEMA.mix,
        id,
        date: todayIso(),
        spaceIds: ids,
        volumeL,
        line: cat.id,
        phase: phase.id,
        kind: phaseKind(phase),
        ecTarget: phase.stage === "flush" ? 0 : ec,
        ecExpected: phase.stage === "flush" ? undefined : expectedEc(ec, tap),
        phTarget: { lo: ph.lo, hi: ph.hi },
        balanceMlPer10L: parseNum(f.balance),
        balanceAddedMl: parseNum(f.balAdded),
        phBefore: parseNum(f.phBefore),
        ph: parseNum(f.phAfter),
        ec: parseNum(f.ecMeasured),
        items: items
          .filter((i) => i.kind === "product" || i.kind === "custom")
          .map((i) => ({ id: i.id, name: i.name, qty: i.qty, unit: i.unit, ...(i.concentrate ? { concentrate: i.concentrate } : {}), ...(i.range ? { range: i.range } : {}), ...(i.range && chosen[i.id] != null ? { per10L: chosen[i.id] } : {}) })),
        recipe: items
          .filter((i) => i.qty != null)
          .map((i) => `${i.name || t(i.kind === "roWater" ? "nut.roWater" : "nut.water")} ${num(i.qty!, i.unit === "L" || i.concentrate ? 0 : 1)} ${i.unit}`)
          .join(" · "),
        createdAt: new Date().toISOString(),
      })
      if (cycle && tap !== cycle.tapEc) await saveCycle({ ...cycle, tapEc: tap })
      toast.success(ids.length > 1 ? t("nut.savedMany", { n: ids.length }) : t("nut.saved"))
      setJustSaved(id)
      setF((s) => ({ ...s, phBefore: "", phAfter: "", balAdded: "", ecMeasured: "" }))
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error).message }))
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  const balAfter = nextBalancePer10L({ volumeL, balanceMlPer10L: parseNum(f.balance), balanceAddedMl: parseNum(f.balAdded) })
  const balanceOn = items.some((i) => i.id === "balance")

  return (
    <div className="flex flex-col gap-3">
      <Reveal i={0}>
        <Card className="gap-3">
          <div className="flex items-center justify-between gap-2">
            <Label>{t("nut.recipe")}</Label>
            <Chip>{`${t("nut.line")} · ${cat.name}`}</Chip>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.75rem] font-medium text-fg-2">{t("nut.phase")}</span>
            {pos && <span className="text-[0.75rem] text-fg-3">{`${t("nut.fromCycle")}${t("common.colon")}${phaseLabel(cyclePhase)}`}</span>}
          </div>
          <div className={joined()} role="radiogroup" aria-label={t("nut.phase")} id="nut-phases" style={phaseColumns}>
            {cat.program.map((p) => (
              <button
                key={p.id}
                role="radio"
                aria-checked={phase.id === p.id}
                onClick={() => pickPhase(p.id)}
                className={segment(phase.id === p.id)}
              >
                {phaseLabel(p)}
              </button>
            ))}
          </div>
          {space && (
            <SettingsLink
              summary={[
                cat.name,
                concOptions.length ? (conc > 0 ? t("nut.sumConc", { c: num(conc) }) : t("nut.powder")) : null,
                nutrition.addons.length ? t("nut.sumAddons", { list: nutrition.addons.map((a) => ADDON_NAMES[a]).join(", ") }) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              label={t("tools.settingsBtn")}
              onOpen={() => ed.openSpace(space.id, "nutrition")}
            />
          )}
          {phase.stage !== "flush" && conc > 0 && <span className="-mt-1 text-[0.75rem] leading-snug text-fg-3">{t("nut.concNote", { core: coreName })}</span>}
          <Grid>
            <NumField
              id="n-vol"
              label={t("nut.volume")}
              hint={suggested ? t("nut.volumeHint", { v: num(suggested) }) : reservoirL ? t("nut.volumeReservoir", { v: num(reservoirL) }) : t("nut.volumeHintNone")}
              value={f.volume ?? ""}
              onChange={set("volume")}
              error={rangeErr("volume")}
            />
            {phase.stage !== "flush" && (
              <NumField
                id="n-ec"
                label={t("nut.ec")}
                hint={cat.ecTable && firstCycle ? t("nut.ecHint", { ec: num(phase.ec, 1) }) : t("nut.ecHintLine", { ec: num(phase.ec, 1) })}
                value={f.ec ?? ""}
                onChange={set("ec")}
                error={rangeErr("ec")}
              />
            )}
            {phase.stage !== "flush" && <NumField id="n-tap" label={t("nut.tap")} hint={t("nut.tapHint")} value={f.tap ?? ""} onChange={set("tap")} error={rangeErr("tap")} />}
            {phase.stage !== "flush" && balanceOn && (
              <NumField id="n-bal" label={t("nut.balance", { name: pname("balance") })} hint={nextBal != null ? t("nut.balanceHint") : undefined} value={f.balance ?? ""} onChange={set("balance")} />
            )}
            {ranged.map((i) => {
              const per10 = i.range!.map((x) => (volumeL > 0 ? (x / volumeL) * 10 : 0))
              return (
                <NumField
                  key={i.id}
                  id={`n-c-${i.id}`}
                  label={t("nut.chosen", { name: i.name })}
                  hint={t("nut.chosenHint", { range: range(per10[0], per10[1], per10[0] % 1 ? 1 : 0) })}
                  value={f[`c_${i.id}`] ?? ""}
                  onChange={set(`c_${i.id}`)}
                />
              )
            })}
          </Grid>
        </Card>
      </Reveal>

      <Reveal i={1}>
        <Card>
          <Label className="px-3.5">
            {t("nut.order")}
          </Label>
          <ol className="mt-2" id="nut-order">
            {items.map((i, idx) => (
              <li key={i.id} data-item={i.id} className={cn("grid grid-cols-[28px_1fr_auto] items-center gap-2.5 border-t border-line px-3.5 py-3", i.qty == null && "opacity-85")}>
                <span className="flex size-6 items-center justify-center rounded-[6px] border-[1.5px] border-info text-[0.75rem] font-semibold text-info tabular-nums">{idx + 1}</span>
                <span className="min-w-0">
                  <span className="block text-[0.875rem] font-semibold">{i.name || t(i.kind === "roWater" ? "nut.roWater" : "nut.water")}</span>
                  <span className={cn("block text-[0.75rem] leading-snug", i.note === "labelMissing" ? "text-warn" : "text-fg-3")}>
                    {[sub(i), i.src ? srcLabel(i.src) : null, i.estimate ? t("nut.estimate") : null].filter(Boolean).join(" · ")}
                  </span>
                  {i.concentrate != null && i.grams != null && <span className="block text-[0.75rem] leading-snug text-primary">{t("nut.concSub", { c: num(i.concentrate), g: num(i.grams, 1) })}</span>}
                </span>
                <span className="text-right text-[1.125rem] font-semibold tabular">{qtyText(i)}</span>
              </li>
            ))}
          </ol>
          {/* Lot 7b: personal products given by hand, under the recipe (never in the tank nor its EC). */}
          <div className="px-3.5 pt-2">
            <HandProducts
              athena
              phase={phase.stage === "veg" ? { stage: "veg" } : phase.stage === "flower" ? { stage: "flower", week: phase.id === cyclePhase.id && pos?.stage === "flower" ? pos.week : phase.weeks?.[0] } : null}
            />
          </div>
        </Card>
      </Reveal>

      {stackOn && <StackCard i={2} use={stackUse} win={stackWin} last={stackLast || undefined} spaceId={space?.id} />}

      <Reveal i={2}>
        <Card className="gap-2.5">
          {phase.stage !== "flush" ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="border-t border-line pt-2.5">
                  <div className="text-[0.75rem] text-fg-3">{t("nut.expected")}</div>
                  <div className="text-[1.375rem] font-semibold tabular">{num(expectedEc(ec, tap), 2)}</div>
                </div>
                <div className="border-t border-line pt-2.5" id="nut-ph">
                  <div className="text-[0.75rem] text-fg-3">{t("nut.phTarget")}</div>
                  <div className="text-[1.375rem] font-semibold tabular">{range(ph.lo, ph.hi, 1)}</div>
                  <div className="text-[0.75rem] text-fg-3">{srcLabel(ph.src)}</div>
                </div>
              </div>
              <p className="text-[0.75rem] leading-[1.45] text-fg-2">{t("nut.expectedSub", { ec: num(ec, 1), tap: num(tap, 2) })}</p>
              {result.scaled && <Notice className="text-[0.75rem]">{t("nut.scaledNote", { ec: num(phase.ec, 1) })}</Notice>}
              {result.ecClamped != null && (
                <Notice className="text-[0.75rem]" id="nut-ec-clamped">
                  {t("nut.ecClamped", { ec: num(result.ecClamped, 1) })}
                </Notice>
              )}
              {result.invalidVolume && <p className="text-[0.75rem] leading-[1.45] text-fg-3">{t("nut.invalidVolume")}</p>}
              {balanceOn && <p className="text-[0.75rem] leading-[1.45] text-fg-2">{t("nut.phSub", { name: pname("balance") })}</p>}
              {phase.stage === "clone" && <p className="text-[0.75rem] leading-[1.45] text-fg-2">{t("nut.seedNote")}</p>}
              {items.some((i) => i.id === "fade") && <p className="text-[0.75rem] leading-[1.45] text-fg-2">{t("nut.finishNote", { fade: pname("fade") })}</p>}
              {cat.ecTable && firstCycle && (phase.stage === "veg" || phase.stage === "flower") && <p className="text-[0.75rem] leading-[1.45] text-fg-2">{t("nut.startLowNote")}</p>}
              {!cat.ecTable && <p className="text-[0.75rem] leading-[1.45] text-fg-2">{t("nut.blendedNote")}</p>}
            </>
          ) : (
            <p className="text-[0.78125rem] leading-[1.45] text-fg-2">{t("nut.flushNote", { cleanse: pname("cleanse") })}</p>
          )}
          <p className="text-[0.75rem] leading-[1.45] text-fg-3">{t("nut.storageNote")}</p>
        </Card>
      </Reveal>

      <Reveal i={3}>
        <Card className="gap-3" id="nut-tank">
          <Label>{t("nut.tank")}</Label>
          {feedable.length > 1 && (
            <div>
              <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("nut.tankFor")}</div>
              <div className="flex flex-wrap gap-1.5">
                {feedable.map((s) => {
                  const other = lineOf(s.id) !== cat.id
                  const on = shared.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={other}
                      aria-pressed={on}
                      onClick={() => setShared((x) => (on ? x.filter((y) => y !== s.id) : [...x, s.id]))}
                      className={toggle(on, other ? "opacity-50" : undefined)}
                    >
                      <SpaceDot color={s.color} /> {s.name}
                      {other && <span className="text-[0.75rem] font-normal">· {t("nut.otherLine")}</span>}
                    </button>
                  )
                })}
              </div>
              <p className="mt-1 text-[0.75rem] text-fg-3">{t("nut.tankForHint")}</p>
            </div>
          )}
          <Grid>
            {/* Before / after the pH up (Balance); without it, one pH: the tank's (lot 10d). */}
            {balanceOn && <NumField id="n-phb" label={t("nut.phBefore", { name: pname("balance") })} hint={t("nut.measuredHint")} value={f.phBefore ?? ""} onChange={set("phBefore")} error={rangeErr("phBefore")} />}
            {balanceOn && <NumField id="n-bala" label={t("nut.balanceAdded", { name: pname("balance") })} value={f.balAdded ?? ""} onChange={set("balAdded")} />}
            <NumField id="n-pha" label={balanceOn ? t("nut.phAfter", { name: pname("balance") }) : t("nut.phTank")} value={f.phAfter ?? ""} onChange={set("phAfter")} error={rangeErr("phAfter")} />
            <NumField id="n-ecm" label={t("nut.ecMeasured")} value={f.ecMeasured ?? ""} onChange={set("ecMeasured")} error={rangeErr("ecMeasured")} />
          </Grid>
          {balanceOn && balAfter != null && parseNum(f.balAdded) != null && <p className="text-[0.75rem] text-primary">{t("nut.nextBalance", { v: num(balAfter, 2) })}</p>}
          <Button onClick={save} disabled={volumeL <= 0 || busy} className="h-12" id="nut-save">
            {t("nut.save")}
          </Button>
          {last && (
            <div id="nut-last" className="flex items-center gap-2 border-t border-line pt-2">
              <p className="min-w-0 flex-1 text-[0.78125rem] leading-snug text-fg-2">
                {t("nut.lastTank", { date: dm(last.date), volume: num(last.volumeL) })}
                {last.ec != null && ` · EC ${num(last.ec, 1)}`}
                {last.ph != null && ` · pH ${num(last.ph, 1)}`}
                {last.id === justSaved && <b className="ml-1 font-semibold text-fg">· {t("nut.lastTankJust")}</b>}
              </p>
              <button type="button" onClick={() => ed.openMix(last)} className={tertiary}>
                {t("nut.openTank")}
              </button>
            </div>
          )}
        </Card>
      </Reveal>

      <ConcentrateCard cat={cat} conc={conc} i={4} />
      <CustomProductsCard i={5} />
    </div>
  )
}
