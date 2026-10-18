// Line, add-ons and dosing method — used at grow level (Réglages) and per space (override).
import { Seg } from "@/components/hydro/form"
import { useSettings } from "@/app/settings-context"
import { getLine, NUTRIENT_LINES } from "@/calc/nutrition"
import type { AddonId, DosingMethod, NutritionSettings } from "@/model/grow"
import { cn } from "@/lib/utils"

export const ADDONS: AddonId[] = ["fade", "cleanse", "balance", "ipw"]
export const ADDON_NAMES: Record<AddonId, string> = { fade: "Fade", cleanse: "Cleanse", balance: "Balance", ipw: "IPW" }

export function dosingToConc(d: DosingMethod): number {
  return d === "powder" ? 0 : Number(d.slice(4))
}
export function concToDosing(c: number): DosingMethod {
  return c === 113 ? "conc113" : c === 226 ? "conc226" : c === 282 ? "conc282" : "powder"
}

export function NutritionFields({ value, onChange, idPrefix }: { value: NutritionSettings; onChange: (n: NutritionSettings) => void; idPrefix: string }) {
  const { t } = useSettings()
  const line = getLine(value.line)
  const lines = Object.values(NUTRIENT_LINES)
  const concs = Object.keys(line.concentrates ?? {}).map(Number).sort((a, b) => a - b)
  return (
    <div className="flex flex-col gap-3" id={`${idPrefix}-nut`}>
      <div>
        <div className="mb-1 text-[12px] font-medium text-fg-2">{t("growSet.line")}</div>
        {lines.length > 1 ? (
          <Seg<string> label={t("growSet.line")} value={value.line} onChange={(v) => onChange({ ...value, line: v })} options={lines.map((l) => ({ value: l.id, label: l.name }))} />
        ) : (
          <div className="flex h-11 items-center rounded-md border border-line bg-surface px-3 text-[14px] font-semibold">{line.name}</div>
        )}
        <p className="mt-1 text-[11px] text-fg-3">{t("growSet.lineOnly")}</p>
      </div>
      <div>
        <div className="mb-1 text-[12px] font-medium text-fg-2">{t("growSet.addons")}</div>
        <div className="flex flex-wrap gap-1.5">
          {ADDONS.map((a) => {
            const on = value.addons.includes(a)
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ ...value, addons: on ? value.addons.filter((x) => x !== a) : [...value.addons, a] })}
                className={cn("h-10 rounded-full border px-4 text-[13px] font-semibold", on ? "border-primary/45 bg-primary/12 text-fg" : "border-line bg-surface-2 text-fg-2")}
              >
                {ADDON_NAMES[a]}
              </button>
            )
          })}
        </div>
        {value.addons.includes("ipw") && <p className="mt-1 text-[11px] text-fg-3">{t("growSet.ipwNote")}</p>}
      </div>
      <div>
        <div className="mb-1 text-[12px] font-medium text-fg-2">{t("growSet.dosing")}</div>
        <Seg<DosingMethod>
          label={t("growSet.dosing")}
          value={value.dosing}
          onChange={(v) => onChange({ ...value, dosing: v })}
          options={[{ value: "powder" as DosingMethod, label: t("growSet.powder") }, ...concs.map((c) => ({ value: concToDosing(c), label: t("growSet.conc", { c: String(c) }) }))]}
        />
        <p className="mt-1 text-[11px] text-fg-3">{t("growSet.dosingHint")}</p>
      </div>
    </div>
  )
}
