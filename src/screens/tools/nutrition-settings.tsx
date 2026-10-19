// Line, add-ons and dosing method — used at grow level (Réglages) and per space (override).
import { Seg } from "@/components/hydro/form"
import { useSettings } from "@/app/settings-context"
import { TARGET } from "@/store"
import { ADDONS as ADDON_DEFS, getCatalog, visibleCatalogs, type AddonId } from "@/data/nutrients"
import type { DosingMethod, NutritionSettings } from "@/model/grow"
import { cn } from "@/lib/utils"

export const ADDON_NAMES: Record<AddonId, string> = Object.fromEntries(Object.values(ADDON_DEFS).map((a) => [a.id, a.name])) as Record<AddonId, string>

export function dosingToConc(d: DosingMethod): number {
  return d === "powder" ? 0 : Number(d.slice(4))
}
export function concToDosing(c: number): DosingMethod {
  return c === 113 ? "conc113" : c === 226 ? "conc226" : c === 282 ? "conc282" : "powder"
}

export function NutritionFields({ value, onChange, idPrefix }: { value: NutritionSettings; onChange: (n: NutritionSettings) => void; idPrefix: string }) {
  const { t } = useSettings()
  const line = getCatalog(value.line)
  const lines = visibleCatalogs(TARGET)
  const concs = Object.keys(line.ecTable?.concentrates ?? {}).map(Number).sort((a, b) => a - b)
  // Switching line keeps only the add-ons the new line allows (CaMg / PK never with the Pro Line).
  const pickLine = (id: string) => {
    const next = getCatalog(id)
    onChange({ ...value, line: id, addons: value.addons.filter((a) => next.addons.includes(a)) })
  }
  return (
    <div className="flex flex-col gap-3" id={`${idPrefix}-nut`}>
      <div>
        <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("growSet.line")}</div>
        {lines.length > 1 ? (
          <Seg<string> label={t("growSet.line")} value={value.line} onChange={pickLine} options={lines.map((l) => ({ value: l.id, label: l.name }))} />
        ) : (
          <div className="flex h-11 items-center rounded-md border border-line bg-surface px-3 text-[0.875rem] font-semibold">{line.name}</div>
        )}
        <p className="mt-1 text-[0.75rem] text-fg-3">{lines.length > 1 ? t("growSet.lineBoth") : t("growSet.lineOnly")}</p>
      </div>
      <div>
        <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("growSet.addons")}</div>
        <div className="flex flex-wrap gap-1.5">
          {line.addons.map((a) => {
            const on = value.addons.includes(a)
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ ...value, addons: on ? value.addons.filter((x) => x !== a) : [...value.addons, a] })}
                className={cn("h-11 rounded-full border px-4 text-[0.8125rem] font-semibold", on ? "border-primary/45 bg-primary/12 text-fg" : "border-line bg-surface-2 text-fg-2")}
              >
                {ADDON_NAMES[a]}
              </button>
            )
          })}
        </div>
        {value.addons.includes("ipw") && <p className="mt-1 text-[0.75rem] text-fg-3">{t("growSet.ipwNote")}</p>}
      </div>
      {concs.length > 0 && (
        <div>
          <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("growSet.dosing")}</div>
          <Seg<DosingMethod>
            label={t("growSet.dosing")}
            value={value.dosing}
            onChange={(v) => onChange({ ...value, dosing: v })}
            options={[{ value: "powder" as DosingMethod, label: t("growSet.powder") }, ...concs.map((c) => ({ value: concToDosing(c), label: t("growSet.conc", { c: String(c) }) }))]}
          />
          <p className="mt-1 text-[0.75rem] text-fg-3">{t("growSet.dosingHint")}</p>
        </div>
      )}
    </div>
  )
}
