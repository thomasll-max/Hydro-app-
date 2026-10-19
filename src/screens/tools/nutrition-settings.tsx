// Line, add-ons and dosing method — used at grow level (Réglages) and per space (override).
import { useEffect, useRef, useState } from "react"
import { Grid, NumField, Seg } from "@/components/hydro/form"
import { useSettings } from "@/app/settings-context"
import { TARGET } from "@/store"
import { ADDONS as ADDON_DEFS, getCatalog, isOwnLine, OWN_LINE, visibleCatalogs, type AddonId } from "@/data/nutrients"
import type { DosingMethod, NutritionSettings, OwnTargets } from "@/model/grow"
import { toggle } from "@/components/hydro/styles"
import { isBadNum, parseNum } from "@/calc/formulas"
import type { Range } from "@/model/types"

export const ADDON_NAMES: Record<AddonId, string> = Object.fromEntries(Object.values(ADDON_DEFS).map((a) => [a.id, a.name])) as Record<AddonId, string>

export function dosingToConc(d: DosingMethod): number {
  return d === "powder" ? 0 : Number(d.slice(4))
}
export function concToDosing(c: number): DosingMethod {
  return c === 113 ? "conc113" : c === 226 ? "conc226" : c === 282 ? "conc282" : "powder"
}

export function NutritionFields({ value, onChange, idPrefix }: { value: NutritionSettings; onChange: (n: NutritionSettings) => void; idPrefix: string }) {
  const { t } = useSettings()
  const own = isOwnLine(value.line)
  const line = getCatalog(value.line)
  const lines = visibleCatalogs(TARGET)
  const concs = own ? [] : Object.keys(line.ecTable?.concentrates ?? {}).map(Number).sort((a, b) => a - b)
  // Switching line keeps only the add-ons the new line allows (CaMg / PK never with the Pro Line); another brand has none.
  const pickLine = (id: string) => {
    if (isOwnLine(id)) return onChange({ ...value, line: id, addons: [] })
    const next = getCatalog(id)
    onChange({ ...value, line: id, addons: (isOwnLine(value.line) ? next.defaultAddons : value.addons).filter((a) => next.addons.includes(a)) })
  }
  const options = [...lines.map((l) => ({ value: l.id, label: l.name })), { value: OWN_LINE, label: t("growSet.ownLine") }]
  return (
    <div className="flex flex-col gap-3" id={`${idPrefix}-nut`}>
      <div>
        <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("growSet.line")}</div>
        <Seg<string> label={t("growSet.line")} value={value.line} onChange={pickLine} options={options} />
        <p className="mt-1 text-[0.75rem] text-fg-3" id={`${idPrefix}-line-note`}>
          {own ? t("growSet.ownLineD") : lines.length > 1 ? t("growSet.lineBoth") : t("growSet.lineOnly")}
        </p>
      </div>
      {own && <OwnTargetsFields value={value.own} onChange={(o) => onChange({ ...value, own: o })} idPrefix={idPrefix} />}
      {!own && <div>
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
                className={toggle(on, "px-4")}
              >
                {ADDON_NAMES[a]}
              </button>
            )
          })}
        </div>
        {value.addons.includes("ipw") && <p className="mt-1 text-[0.75rem] text-fg-3">{t("growSet.ipwNote")}</p>}
      </div>}
      {concs.length > 0 && (
        <div>
          <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("growSet.dosing")}</div>
          <Seg<DosingMethod>
            label={t("growSet.dosing")}
            value={value.dosing}
            onChange={(v) => onChange({ ...value, dosing: v })}
            options={[{ value: "powder" as DosingMethod, label: t("growSet.powder") }, ...concs.map((c) => ({ value: concToDosing(c), label: t("growSet.conc", { c: String(c) }) }))]}
          />
          <p className="mt-1 text-[0.75rem] text-fg-3">{value.dosing === "powder" ? t("growSet.dosingHintPowder") : t("growSet.dosingHint")}</p>
        </div>
      )}
    </div>
  )
}

const FIELDS = ["vegEc", "vegPhLo", "vegPhHi", "flowerEc", "flowerPhLo", "flowerPhHi"] as const
type Field = (typeof FIELDS)[number]

/** Typed targets → the fields' text. */
function toText(o: OwnTargets | undefined, show: (v?: number) => string): Record<Field, string> {
  return {
    vegEc: show(o?.veg?.ec?.lo),
    vegPhLo: show(o?.veg?.ph?.lo),
    vegPhHi: show(o?.veg?.ph?.hi),
    flowerEc: show(o?.flower?.ec?.lo),
    flowerPhLo: show(o?.flower?.ph?.lo),
    flowerPhHi: show(o?.flower?.ph?.hi),
  }
}

/** The fields' text → targets: only what is typed (EC = one value; pH = min–max, one side typed = that value). */
export function ownTargetsFromText(f: Record<Field, string>): OwnTargets | undefined {
  const ec = (v: string): Range | undefined => {
    const n = parseNum(v)
    return n != null ? { lo: n, hi: n } : undefined
  }
  const ph = (lo: string, hi: string): Range | undefined => {
    const a = parseNum(lo)
    const b = parseNum(hi)
    if (a == null && b == null) return undefined
    const x = a ?? b!
    const y = b ?? a!
    return { lo: Math.min(x, y), hi: Math.max(x, y) }
  }
  const phase = (e?: Range, p?: Range) => (e || p ? { ...(e ? { ec: e } : {}), ...(p ? { ph: p } : {}) } : undefined)
  const veg = phase(ec(f.vegEc), ph(f.vegPhLo, f.vegPhHi))
  const flower = phase(ec(f.flowerEc), ph(f.flowerPhLo, f.flowerPhHi))
  return veg || flower ? { ...(veg ? { veg } : {}), ...(flower ? { flower } : {}) } : undefined
}

/**
 * « Mes cibles (facultatif) » of another brand (lot 7a): EC and pH by phase, typed by the grower, never proposed. Saved
 * a moment after typing (the grow's settings save at each change).
 */
function OwnTargetsFields({ value, onChange, idPrefix }: { value?: OwnTargets; onChange: (o: OwnTargets | undefined) => void; idPrefix: string }) {
  const { t, show } = useSettings()
  const [f, setF] = useState<Record<Field, string>>(() => toText(value, show))
  const typed = useRef(false)
  const push = useRef(onChange)
  push.current = onChange
  useEffect(() => {
    if (!typed.current || FIELDS.some((k) => isBadNum(f[k]))) return
    const id = setTimeout(() => push.current(ownTargetsFromText(f)), 600)
    return () => clearTimeout(id)
  }, [f])
  const set = (k: Field) => (v: string) => {
    typed.current = true
    setF((s) => ({ ...s, [k]: v }))
  }
  const phase = (p: "veg" | "flower") => (
    <div>
      <div className="mb-1 text-[0.8125rem] font-semibold">{t(p === "veg" ? "own.tVeg" : "own.tFlower")}</div>
      <Grid cols={3}>
        <NumField id={`${idPrefix}-own-${p}-ec`} label={t("own.tEc")} value={f[`${p}Ec`]} onChange={set(`${p}Ec`)} />
        <NumField id={`${idPrefix}-own-${p}-phlo`} label={t("own.tPhLo")} value={f[`${p}PhLo`]} onChange={set(`${p}PhLo`)} />
        <NumField id={`${idPrefix}-own-${p}-phhi`} label={t("own.tPhHi")} value={f[`${p}PhHi`]} onChange={set(`${p}PhHi`)} />
      </Grid>
    </div>
  )
  return (
    <div className="flex flex-col gap-2.5 border-t border-line pt-3" id={`${idPrefix}-own-targets`}>
      <div>
        <div className="text-[0.875rem] font-semibold">{t("own.targets")}</div>
        <p className="mt-0.5 text-[0.75rem] leading-[1.45] text-fg-3">{t("own.targetsD")}</p>
      </div>
      {phase("veg")}
      {phase("flower")}
    </div>
  )
}
