// Shared bits for the Equipment screen and sheet: type icons, calc display ("donnée manquante"), space summaries.
import type { ReactNode } from "react"
import { Switch } from "@/components/ui/switch"
import { useSettings } from "@/app/settings-context"
import type { EmojiName } from "@/assets/emoji"
import type { Equipment, EquipmentAssignment, EquipmentType, Space } from "@/model/grow"
import { airRenewalSeconds, areaM2, DEFAULT_LOSS_FACTOR, equipmentAt, extractorM3h, shotSeconds, spaceLight, volumeM3, type Calc } from "@/equipment/calc"
import type { MessageKey } from "@/i18n/types"
import { cn } from "@/lib/utils"
import { secondary } from "@/components/hydro/styles"

export const TYPE_EMOJI: Record<EquipmentType, EmojiName> = {
  lamp: "bulb",
  reservoir: "bucket",
  pump: "sweat",
  container: "pottedPlant",
  extractor: "cyclone",
  fan: "wind",
  dehumidifier: "droplet",
  humidifier: "droplet",
  heater: "thermometer",
  ac: "thermometer",
  sensor: "plug",
  other: "toolbox",
}

/** A number, or the "donnée manquante" chip listing what to fill in. */
export function CalcValue({ c, fmt, className }: { c: Calc; fmt: (v: number) => string; className?: string }) {
  const { t } = useSettings()
  if (c.ok)
    return (
      <span className={cn("tabular font-semibold", className)}>
        {fmt(c.value)}
        {c.hypothesis && <span className="ml-1 text-[0.75rem] font-semibold text-warn">· {t("equip.hypothesis")}</span>}
      </span>
    )
  const list = c.missing.map((m) => t(`equip.miss.${m}` as MessageKey)).join(", ")
  return (
    <span className="inline-flex flex-col items-end text-right">
      <span className="inline-flex items-center gap-1 text-[0.75rem] font-semibold whitespace-nowrap text-warn">
        <span className="size-1.5 rounded-[2px] bg-warn" aria-hidden="true" />
        {t("equip.missing")}
      </span>
      <span className="mt-0.5 text-[0.75rem] text-fg-3">{t("equip.c.missingList", { list })}</span>
    </span>
  )
}

export function CalcRow({ label, sub, children }: { label: string; sub?: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-line py-2 first:border-t-0">
      <span className="min-w-0 flex-1 text-[0.8125rem] text-fg-2">
        {label}
        {sub && <span className="block text-[0.75rem] leading-snug text-fg-3">{sub}</span>}
      </span>
      <span className="max-w-[55%] text-right text-[0.84375rem]">{children}</span>
    </div>
  )
}

export function SwitchRow({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 border-t border-line py-1.5 first:border-t-0">
      <span className="min-w-0">
        <span className="block text-[0.875rem] font-medium">{label}</span>
        {hint && <span className="block text-[0.75rem] leading-snug text-fg-3">{hint}</span>}
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="data-[size=default]:h-6 data-[size=default]:w-11 [&_[data-slot=switch-thumb]]:size-5! [&_[data-slot=switch-thumb]]:data-[state=checked]:translate-x-[calc(100%-0px)]" />
    </label>
  )
}

/** Everything computable for one space at a date, from its dimensions and the equipment placed there. */
export function spaceSummary(space: Space, date: string, equipment: Equipment[], assignments: EquipmentAssignment[]) {
  const here = equipmentAt(space.id, date, assignments)
  const items = here.map((a) => ({ a, e: equipment.find((x) => x.id === a.equipmentId) })).filter((x): x is { a: EquipmentAssignment; e: Equipment } => !!x.e)
  const of = (t: EquipmentType) => items.filter((x) => x.e.type === t)
  const light = spaceLight(space, date, equipment, assignments)
  const ext = of("extractor")[0]?.e
  const air = ext ? airRenewalSeconds(space.dimensionsCm, extractorM3h(ext.extractor), ext.extractor?.speedPct ?? 100) : null
  const pots = of("container")[0]?.e
  const pump = of("pump")[0]?.e
  const potL = pots?.container?.volumeL
  const shot = pump || pots ? shotSeconds({ potL, pct: 3, flowMlPerMin: pump?.pump?.flowMlPerMin }) : null
  const tank = of("reservoir").find((x) => x.e.reservoir?.kind !== "runoff")?.e
  return { items, area: areaM2(space.dimensionsCm), volume: volumeM3(space.dimensionsCm), light, air, ext, pots, potL, shot, tank, loss: DEFAULT_LOSS_FACTOR }
}

/** Summary of a space's settings in a tool, with the way to change them (Réglages de l'espace). */
export function SettingsLink({ summary, onOpen, label }: { summary: ReactNode; onOpen: () => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line pt-2.5" data-settings-link>
      <span className="min-w-0 text-[0.78125rem] leading-[1.45] text-fg-2">{summary}</span>
      <button type="button" onClick={onOpen} className={secondary}>
        {label}
      </button>
    </div>
  )
}
