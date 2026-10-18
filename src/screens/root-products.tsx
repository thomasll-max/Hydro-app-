// One-off root products (e.g. mycorrhizae) offered at a transplant / transfer. Never in the tank.
// The dose is whatever the user types from the label; nothing is suggested when the label value is unknown.
import { useEffect, useState } from "react"
import { NumField } from "@/components/hydro/form"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { parseNum } from "@/calc/formulas"
import { SwitchRow } from "@/screens/tools/equipment-shared"
import type { GrowEvent } from "@/model/types"

export type RootPick = NonNullable<GrowEvent["products"]>

export function useRootProducts(open: boolean, preset: GrowEvent["products"], defaultOn: boolean) {
  const { customProducts } = useGrow()
  const roots = customProducts.filter((p) => p.application === "roots")
  const [on, setOn] = useState<Record<string, boolean>>({})
  const [qty, setQty] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!open) return
    setOn(Object.fromEntries(roots.map((p) => [p.id, preset ? preset.some((x) => x.productId === p.id) : defaultOn && p.onEvent === "transfer"])))
    setQty(Object.fromEntries(roots.map((p) => [p.id, preset?.find((x) => x.productId === p.id)?.qty?.toString() ?? ""])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customProducts.length])
  const value: RootPick = roots.filter((p) => on[p.id]).map((p) => {
    const q = parseNum(qty[p.id])
    return { productId: p.id, unit: p.unit, ...(q != null ? { qty: q } : {}) }
  })
  return { roots, on, setOn, qty, setQty, value }
}

export function RootProductsField({ state }: { state: ReturnType<typeof useRootProducts> }) {
  const { t, range } = useSettings()
  if (!state.roots.length) return null
  return (
    <div className="mt-3 rounded-md border border-line bg-surface px-3 pb-2">
      {state.roots.map((p) => {
        const label = p.dosePerPlant ? t("roots.label", { range: range(p.dosePerPlant.lo, p.dosePerPlant.hi, 1), unit: p.unit }) : t("roots.labelMissing")
        return (
          <div key={p.id}>
            <SwitchRow id={`rp-${p.id}`} label={t("roots.apply", { name: p.name })} hint={`${p.kind ?? ""}${p.kind ? " · " : ""}${t("roots.notTank")}`} checked={!!state.on[p.id]} onChange={(v) => state.setOn((o) => ({ ...o, [p.id]: v }))} />
            {state.on[p.id] && (
              <NumField id={`rp-q-${p.id}`} label={t("roots.qty", { unit: p.unit })} hint={label} value={state.qty[p.id] ?? ""} onChange={(v) => state.setQty((q) => ({ ...q, [p.id]: v }))} />
            )}
          </div>
        )
      })}
    </div>
  )
}
