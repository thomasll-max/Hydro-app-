// Nutrition tool, side cards: concentrate jerrycans (assistant + stocks) and personal products typed from the label.
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { AreaField, Grid, NumField, Seg, Sheet, TextField } from "@/components/hydro/form"
import { Chip, Label, Reveal } from "@/components/hydro/primitives"
import { SwitchRow } from "@/screens/tools/equipment-shared"
import { SaveBar, useSaver, useShow } from "@/screens/sheets"
import { useSettings } from "@/app/settings-context"
import { newId, useGrow } from "@/app/grow-context"
import { badNums, parseNum } from "@/calc/formulas"
import { todayIso } from "@/calc/stage"
import { bagLitres, openStocks, startWaterL, stockStatus } from "@/calc/concentrate"
import { GROW_SCHEMA, type ConcentrateStock, type CustomProduct } from "@/model/grow"
import type { NutrientCatalog } from "@/data/nutrients"
import { cn } from "@/lib/utils"
import { secondary, tertiary } from "@/components/hydro/styles"

// ---------- Concentrates ----------
export function ConcentrateCard({ cat, conc, i }: { cat: NutrientCatalog; conc: number; i: number }) {
  const { t, num, settings } = useSettings()
  const { concentrateStocks, all, saveConcentrateStock } = useGrow()
  const [open, setOpen] = useState(false)
  const powders = cat.products.filter((p) => p.form === "powder")
  if (!powders.length || !cat.ecTable) return null
  const stocks = openStocks(concentrateStocks, cat.id)
  const date = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(settings.lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: "numeric" })
  const finish = async (s: ConcentrateStock) => {
    try {
      await saveConcentrateStock({ ...s, finishedOn: todayIso() })
      toast.success(t("nut.stockFinished"))
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error).message }))
    }
  }
  return (
    <Reveal i={i}>
      <Card className="gap-2.5" id="nut-stocks">
        <div className="flex items-center justify-between gap-2">
          <Label emoji="bucket">{t("nut.stocks")}</Label>
          {conc > 0 && (
            <button type="button" onClick={() => setOpen(true)} className={secondary}>
              {t("nut.stockAdd")}
            </button>
          )}
        </div>
        <p className="text-[0.75rem] leading-[1.45] text-fg-3">{conc > 0 ? t("nut.stocksD") : t("nut.stockPowder")}</p>
        {conc > 0 && !stocks.length && <p className="text-[0.78125rem] text-fg-2">{t("nut.stocksNone")}</p>}
        {stocks.map((s) => {
          const st = stockStatus(s, concentrateStocks, all.mixes)
          const name = cat.products.find((p) => p.id === s.productId)?.name ?? s.productId
          const pct = s.litresMade > 0 ? Math.max(0, Math.min(1, st.leftL / s.litresMade)) : 0
          return (
            <div key={s.id} className="border-t border-line pt-2.5">
              <div className="flex items-center justify-between gap-2">
                <b className="text-[0.875rem] font-semibold">
                  {name} <span className="font-normal text-fg-3">· {num(s.gPerL)} g/L</span>
                </b>
                {st.empty ? <Chip tone="warn">{t("nut.stockEmpty")}</Chip> : st.low ? <Chip tone="warn">{t("nut.stockLow")}</Chip> : null}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-[3px] bg-track" aria-hidden="true">
                <div className={cn("h-full rounded-[3px]", st.low ? "bg-warn" : "bg-water")} style={{ width: `${pct * 100}%` }} />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[0.75rem] text-fg-3">
                <span className="tabular">
                  {t("nut.stockLeft", { left: num(st.leftL, 1), made: num(s.litresMade, 1) })} · {st.tanksLeft != null ? t("nut.stockTanks", { n: st.tanksLeft }) : t("nut.stockNoUse")}
                </span>
                <span>{t("nut.stockMade", { date: date(s.madeOn) })}</span>
              </div>
              <button type="button" onClick={() => finish(s)} className={cn("mt-1.5", tertiary, "text-[0.75rem]")}>
                {t("nut.stockFinish")}
              </button>
            </div>
          )
        })}
        {stocks.length > 0 && <p className="text-[0.75rem] text-fg-3">{t("nut.stockLowNote")}</p>}
      </Card>
      <ConcentrateSheet open={open} onOpenChange={setOpen} cat={cat} conc={conc} />
    </Reveal>
  )
}

function ConcentrateSheet({ open, onOpenChange, cat, conc }: { open: boolean; onOpenChange: (o: boolean) => void; cat: NutrientCatalog; conc: number }) {
  const { t, num } = useSettings()
  const { concentrateStocks, saveConcentrateStock } = useGrow()
  const powders = cat.products.filter((p) => p.form === "powder")
  const strengths = Object.keys(cat.ecTable?.concentrates ?? {}).map(Number).sort((a, b) => a - b)
  const [product, setProduct] = useState(powders[0]?.id ?? "")
  const [bag, setBag] = useState("")
  const [g, setG] = useState(String(conc || cat.ecTable?.recommended || 226))
  const [date, setDate] = useState(todayIso())
  const { busy, run } = useSaver(() => onOpenChange(false))
  useEffect(() => {
    if (!open) return
    setBag("")
    setDate(todayIso())
    setG(String(conc || cat.ecTable?.recommended || 226))
  }, [open, conc, cat])
  const kg = parseNum(bag)
  const gPerL = Number(g)
  const final = kg ? bagLitres(kg, gPerL) : null
  const core = cat.products.find((p) => p.id.toLowerCase().includes("core"))?.name ?? "Core"
  const save = () =>
    run(async () => {
      if (badNums({ bag }).length) throw new Error(t("safe.fixFields"))
      if (!kg || !final) throw new Error(t("nut.cNeedBag"))
      // A new jug replaces the open one of the same product and strength.
      for (const s of openStocks(concentrateStocks, cat.id).filter((s) => s.productId === product && s.gPerL === gPerL)) await saveConcentrateStock({ ...s, finishedOn: date })
      await saveConcentrateStock({
        schemaVersion: GROW_SCHEMA.concentrateStock,
        id: newId("conc-"),
        productId: product,
        line: cat.id,
        gPerL,
        litresMade: final,
        bagKg: kg,
        madeOn: date,
        createdAt: new Date().toISOString(),
      })
    })
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("nut.cTitle")} description={t("nut.cDesc")} footer={<SaveBar busy={busy} onSave={save} />}>
      <div className="flex flex-col gap-3">
        <div>
          <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("nut.cProduct")}</div>
          <Seg<string> label={t("nut.cProduct")} value={product} onChange={setProduct} options={powders.map((p) => ({ value: p.id, label: p.name }))} />
        </div>
        <div>
          <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("nut.cStrength")}</div>
          <Seg<string> label={t("nut.cStrength")} value={g} onChange={setG} options={strengths.map((s) => ({ value: String(s), label: `${num(s)} g/L` }))} />
        </div>
        <Grid>
          <NumField id="c-bag" label={t("nut.cBag")} hint={t("nut.cBagHint")} value={bag} onChange={setBag} />
          <TextField id="c-date" type="date" label={t("nut.cDate")} value={date} onChange={(v) => setDate(v || todayIso())} />
        </Grid>
        <div className="border-t border-line pt-2.5">
          <div className="text-[0.75rem] text-fg-3">{t("nut.cFinal")}</div>
          <div className="text-[1.625rem] font-semibold tabular" id="c-final">
            {final ? `${num(final, 1)} L` : "—"}
          </div>
        </div>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[0.8125rem] leading-[1.45] text-fg-2">
          <li>{t("nut.cStep1", { water: final ? num(startWaterL(final), 1) : "…" })}</li>
          <li>{t("nut.cStep2", { bag: kg ? num(kg, 1) : "…" })}</li>
          <li>{t("nut.cStep3")}</li>
          <li>{t("nut.cStep4", { final: final ? num(final, 1) : "…" })}</li>
          <li>{t("nut.cStep5", { core })}</li>
        </ol>
      </div>
    </Sheet>
  )
}

// ---------- Personal products ----------
export function CustomProductsCard({ i }: { i: number }) {
  const { t, range } = useSettings()
  const { customProducts } = useGrow()
  const [edit, setEdit] = useState<CustomProduct | null>(null)
  const [open, setOpen] = useState(false)
  const openFor = (p: CustomProduct | null) => {
    setEdit(p)
    setOpen(true)
  }
  const weeks = (p: CustomProduct) => {
    const u = p.use
    if (!u) return p.weeks ?? null
    const parts = [u.veg ? t("nut.ph_veg") : null, u.flowerFrom != null ? t("nut.ph_week", { w: u.flowerTo != null && u.flowerTo !== u.flowerFrom ? `${u.flowerFrom}–${u.flowerTo}` : u.flowerFrom }) : null]
    return parts.filter(Boolean).join(", ") || p.weeks || null
  }
  return (
    <Reveal i={i}>
      <Card className="gap-2.5" id="nut-custom">
        <div className="flex items-center justify-between gap-2">
          <Label emoji="testTube">{t("nut.custom")}</Label>
          <button type="button" onClick={() => openFor(null)} className={secondary}>
            {t("nut.customAdd")}
          </button>
        </div>
        <p className="text-[0.75rem] leading-[1.45] text-fg-3">{t("nut.customD")}</p>
        {customProducts.map((p) => {
          const dose =
            p.application === "tank"
              ? p.dosePer10L
                ? t("nut.customDose", { range: range(p.dosePer10L.lo, p.dosePer10L.hi, 1), unit: p.unit })
                : t("nut.customNoDose")
              : p.dosePerPlant
                ? t("nut.customPlant", { range: range(p.dosePerPlant.lo, p.dosePerPlant.hi, 1), unit: p.unit })
                : t("nut.customNoDose")
          const w = weeks(p)
          return (
            <button key={p.id} type="button" onClick={() => openFor(p)} className="flex items-center justify-between gap-2 border-t border-line pt-2.5 text-left">
              <span className="min-w-0">
                <b className="block text-[0.875rem] font-semibold">
                  {p.name} <span className="font-normal text-fg-3">· {p.application === "tank" ? t("nut.customTank") : t("nut.customRoots")}</span>
                </b>
                <span className={cn("block text-[0.75rem]", p.dosePer10L || p.dosePerPlant ? "text-fg-2" : "text-warn")}>
                  {dose}
                  {w ? ` · ${t("nut.customWeeks", { w })}` : ""}
                  {p.inactive ? ` · ${t("nut.customOff")}` : ""}
                </span>
                <span className="block text-[0.75rem] text-fg-3">{t("nut.srcLabel")}</span>
              </span>
              <span className="shrink-0 text-[0.75rem] font-semibold underline decoration-water decoration-[1.5px] underline-offset-4">{t("nut.customEdit")}</span>
            </button>
          )
        })}
      </Card>
      <CustomProductSheet open={open} onOpenChange={setOpen} product={edit} />
    </Reveal>
  )
}

export function CustomProductSheet({ open, onOpenChange, product }: { open: boolean; onOpenChange: (o: boolean) => void; product: CustomProduct | null }) {
  const { t, range } = useSettings()
  const { saveCustomProduct, deleteCustomProduct } = useGrow()
  const show = useShow()
  const [f, setF] = useState<Record<string, string>>({})
  const [where, setWhere] = useState<CustomProduct["application"]>("tank")
  const [unit, setUnit] = useState<CustomProduct["unit"]>("mL")
  const [veg, setVeg] = useState(false)
  const [inactive, setInactive] = useState(false)
  const { busy, run } = useSaver(() => onOpenChange(false))
  useEffect(() => {
    if (!open) return
    const p = product
    setWhere(p?.application ?? "tank")
    setUnit(p?.unit ?? "mL")
    setVeg(!!p?.use?.veg)
    setInactive(!!p?.inactive)
    const label = p?.labelDose ?? (p?.dosePer10L ? { ...p.dosePer10L, perL: 10 } : undefined)
    setF({
      name: p?.name ?? "",
      brand: p?.brand ?? "",
      kind: p?.kind ?? "",
      lo: show(p?.application === "roots" ? p?.dosePerPlant?.lo : label?.lo),
      hi: show(p?.application === "roots" ? p?.dosePerPlant?.hi : label?.hi),
      perL: show(label?.perL),
      weeks: p?.weeks ?? "",
      from: show(p?.use?.flowerFrom),
      to: show(p?.use?.flowerTo),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product])
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }))
  const lo = parseNum(f.lo)
  const hi = parseNum(f.hi) ?? lo
  const perL = parseNum(f.perL)
  const per10 = useMemo(() => (lo != null && hi != null && perL ? { lo: Math.round((lo / perL) * 10 * 100) / 100, hi: Math.round((hi / perL) * 10 * 100) / 100 } : undefined), [lo, hi, perL])
  const save = () =>
    run(async () => {
      const name = f.name.trim()
      if (!name) throw new Error(t("nut.pNeedName"))
      if (badNums(f, ["lo", "hi", "perL", "from", "to"]).length) throw new Error(t("safe.fixFields"))
      const from = parseNum(f.from)
      const to = parseNum(f.to)
      const use = veg || from != null ? { ...(veg ? { veg: true } : {}), ...(from != null ? { flowerFrom: from, flowerTo: to ?? from } : {}) } : undefined
      const base: CustomProduct = {
        schemaVersion: GROW_SCHEMA.customProduct,
        id: product?.id ?? newId("cp-"),
        name,
        unit,
        application: where,
        verified: false,
        source: "label",
        createdAt: product?.createdAt ?? new Date().toISOString(),
        ...(f.brand.trim() ? { brand: f.brand.trim() } : {}),
        ...(f.kind.trim() ? { kind: f.kind.trim() } : {}),
        ...(f.weeks.trim() ? { weeks: f.weeks.trim() } : {}),
        ...(inactive ? { inactive: true } : {}),
        ...(product?.onEvent ? { onEvent: product.onEvent } : where === "roots" ? { onEvent: "transfer" as const } : {}),
      }
      if (where === "tank") {
        if (per10 && lo != null && hi != null && perL) Object.assign(base, { dosePer10L: per10, labelDose: { lo, hi, perL } })
        if (use) base.use = use
      } else if (lo != null && hi != null) base.dosePerPlant = { lo, hi }
      await saveCustomProduct(base)
    })
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={product?.name ?? t("nut.pTitle")}
      description={t("nut.pDesc")}
      footer={<SaveBar busy={busy} onSave={save} onDelete={product ? async () => { await deleteCustomProduct(product.id); onOpenChange(false) } : undefined} />}
    >
      <div className="flex flex-col gap-3">
        <Grid>
          <TextField id="p-name" label={t("nut.pName")} value={f.name ?? ""} onChange={set("name")} />
          <TextField id="p-brand" label={t("nut.pBrand")} value={f.brand ?? ""} onChange={set("brand")} />
        </Grid>
        <TextField id="p-kind" label={t("nut.pKind")} value={f.kind ?? ""} onChange={set("kind")} />
        <div>
          <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("nut.pWhere")}</div>
          <Seg<CustomProduct["application"]>
            label={t("nut.pWhere")}
            value={where}
            onChange={setWhere}
            options={[
              { value: "tank", label: t("nut.customTank") },
              { value: "roots", label: t("nut.customRoots") },
            ]}
          />
        </div>
        <div>
          <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("nut.pUnit")}</div>
          <Seg<CustomProduct["unit"]> label={t("nut.pUnit")} value={unit} onChange={setUnit} options={(["mL", "g"] as const).map((u) => ({ value: u, label: u }))} />
        </div>
        <Grid cols={where === "tank" ? 3 : 2}>
          <NumField id="p-lo" label={t("nut.pDoseLo", { unit })} value={f.lo ?? ""} onChange={set("lo")} />
          <NumField id="p-hi" label={t("nut.pDoseHi", { unit })} value={f.hi ?? ""} onChange={set("hi")} />
          {where === "tank" && <NumField id="p-per" label={t("nut.pDoseFor")} hint={t("nut.pDoseForHint")} value={f.perL ?? ""} onChange={set("perL")} />}
        </Grid>
        {where === "tank" && per10 && <p className="text-[0.75rem] text-primary tabular">{t("nut.pPer10", { range: range(per10.lo, per10.hi, 2), unit })}</p>}
        {where === "roots" && <p className="text-[0.75rem] text-fg-3">{t("nut.pPerPlant")}</p>}
        {where === "tank" && (
          <>
            <SwitchRow id="p-veg" label={t("nut.pUseVeg")} checked={veg} onChange={setVeg} />
            <Grid>
              <NumField id="p-from" integer label={t("nut.pFlowerFrom")} value={f.from ?? ""} onChange={set("from")} />
              <NumField id="p-to" integer label={t("nut.pFlowerTo")} value={f.to ?? ""} onChange={set("to")} />
            </Grid>
          </>
        )}
        <AreaField id="p-weeks" label={t("nut.pWeeksText")} value={f.weeks ?? ""} onChange={set("weeks")} />
        <SwitchRow id="p-off" label={t("nut.pInactive")} checked={inactive} onChange={setInactive} />
        <p className="text-[0.75rem] leading-[1.45] text-fg-3">{t("nut.pNote")}</p>
      </div>
    </Sheet>
  )
}
