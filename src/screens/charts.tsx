import { useState } from "react"
import { Card } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Chip, Label, Reveal, ScreenHero } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import type { MessageKey } from "@/i18n/types"

const CURVES: MessageKey[] = [
  "charts.cDryback",
  "charts.cEc",
  "charts.cPh",
  "charts.cRunoff",
  "charts.cClimate",
  "charts.cLight",
  "charts.cHeight",
  "charts.cUse",
]

export function ChartsScreen() {
  const { t } = useSettings()
  const [period, setPeriod] = useState("7")
  return (
    <>
      <ScreenHero emoji="chart" title={t("charts.title")}>
        <p className="mt-1 text-[13px] leading-snug text-fg-2">{t("charts.subtitle")}</p>
      </ScreenHero>

      <Reveal i={0} className="mb-3">
        <ToggleGroup
          type="single"
          value={period}
          onValueChange={(v) => v && setPeriod(v)}
          aria-label={t("charts.period")}
          className="grid w-full grid-cols-3 rounded-full border border-line bg-surface-2 p-[3px]"
        >
          {[
            ["7", "charts.p7"],
            ["30", "charts.p30"],
            ["cycle", "charts.pCycle"],
          ].map(([v, k]) => (
            <ToggleGroupItem
              key={v}
              value={v}
              className="h-9 rounded-full! text-[13px] font-semibold text-fg-3 hover:bg-transparent data-[state=on]:bg-surface data-[state=on]:text-fg data-[state=on]:shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
            >
              {t(k as MessageKey)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Reveal>

      <Reveal i={1} className="mb-3">
        <Card className="overflow-hidden px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <b className="text-[15px] leading-snug font-semibold">{t("charts.emptyTitle")}</b>
            <Chip>{t("app.comingLot", { n: 6 })}</Chip>
          </div>
          <p className="mt-1.5 text-[13px] leading-[1.45] text-fg-2">{t("charts.emptyBody")}</p>
          {/* Ghost of the chart to come: target band + grid, no data */}
          <svg viewBox="0 0 320 96" className="mt-3 h-24 w-full" aria-hidden="true" preserveAspectRatio="none">
            <rect x="0" y="30" width="320" height="28" rx="4" fill="var(--primary)" opacity="0.09" />
            {[16, 44, 72].map((y) => (
              <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="var(--line)" strokeDasharray="3 5" />
            ))}
            <line x1="212" x2="212" y1="6" y2="90" stroke="var(--fg-3)" strokeDasharray="2 4" opacity="0.6" />
          </svg>
        </Card>
      </Reveal>

      <Reveal i={2}>
        <Card className="pb-2">
          <Label emoji="chart">{t("charts.list")}</Label>
          <ul className="mt-2 grid grid-cols-2 gap-x-3">
            {CURVES.map((k) => (
              <li key={k} className="flex items-center gap-2 border-t border-line py-2.5 text-[13px] [&:nth-child(-n+2)]:border-t-0">
                <span className="h-[3px] w-3.5 rounded-full bg-primary/70" aria-hidden="true" />
                {t(k)}
              </li>
            ))}
          </ul>
        </Card>
      </Reveal>
    </>
  )
}
