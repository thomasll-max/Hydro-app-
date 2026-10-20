// « Valeur douteuse » (lot 15b): a value saved out of its plausible range stays in the data, left out of every
// calculation; the Journal shows it, marked, with its unit.
import { useSettings } from "@/app/settings-context"
import type { RangeKey } from "@/calc/plausible"
import type { MessageKey } from "@/i18n/types"
import type { Entry } from "@/model/types"
import { cn } from "@/lib/utils"
import { splitUnit } from "./form"

const LABEL: Record<RangeKey, MessageKey> = {
  tempDay: "entry.tempDay",
  tempNight: "entry.tempNight",
  rh: "entry.rh",
  weightMorningKg: "entry.weightMorning",
  weightPeakKg: "entry.weightPeak",
  sensorMorningPct: "entry.sensorMorning",
  sensorPeakPct: "entry.sensorPeak",
  sensorPct: "entry.sensorPct",
  runoffMl: "entry.runoffMl",
  ecRunoff: "entry.ecRunoff",
  phRunoff: "entry.phRunoff",
  volumePerPotMl: "entry.volumePerPot",
  shots: "entry.shots",
  ecIn: "entry.ecIn",
  phIn: "entry.phIn",
  heightCm: "entry.height",
  reservoirL: "entry.reservoirL",
  sownCount: "entry.sown",
  germinatedCount: "entry.germinated",
  lightPct: "entry.lightPct",
  lightHeightCm: "entry.lightHeight",
  ppfd: "entry.ppfd",
  photoperiodH: "entry.photoperiod",
}

/** « Valeur douteuse, hors des calculs : T° jour 400 °C · pH runoff 13,1 » under a day of the Journal. */
export function DoubtfulLine({ e, className }: { e: Entry; className?: string }) {
  const { t, show } = useSettings()
  const keys = Object.keys(e.doubtful ?? {}).filter((k): k is RangeKey => k in LABEL)
  if (!keys.length) return null
  const list = keys
    .map((k) => {
      const [name, unit] = splitUnit(t(LABEL[k]))
      return `${name} ${show(e.doubtful![k])}${unit ? ` ${unit}` : ""}`
    })
    .join(" · ")
  return (
    <span className={cn("block text-[0.75rem] leading-snug font-semibold text-warn", className)} data-doubtful={keys.join(" ")}>
      {t("journal.doubtful", { list })}
    </span>
  )
}

/** A computed value that cannot be from its measures: « — », and a cue saying why (lot 15b). */
export function ImpossibleMark() {
  const { t } = useSettings()
  return (
    <span className="ml-0.5 text-[0.75rem] font-medium text-warn" title={t("safe.impossible")} data-impossible>
      ?<span className="sr-only"> {t("safe.impossible")}</span>
    </span>
  )
}
