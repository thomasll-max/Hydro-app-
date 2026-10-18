import type { ReactNode } from "react"
import { Check, CloudOff } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Emoji } from "@/components/hydro/emoji"
import { Label, Reveal, ScreenHero } from "@/components/hydro/primitives"
import { LangSwitch, ThemeSwitch } from "@/components/hydro/top-bar"
import { useSettings } from "@/app/settings-context"
import { ATHENA_DOSING, PH_TARGETS, STEERING, type Source } from "@/data/reference"
import type { EmojiName } from "@/assets/emoji"
import { cn } from "@/lib/utils"
import { getLine } from "@/calc/nutrition"

export function GuideScreen() {
  const { t, num, range, saveState, settings } = useSettings()
  const srcTag = (s: Source) =>
    s === "estimate" ? t("guide.tagEstimate") : s === "athena" ? t("guide.tagAthena") : null

  return (
    <>
      <ScreenHero emoji="compass" title={t("guide.title")}>
        <p className="mt-1 text-[13px] leading-snug text-fg-2">{t("guide.subtitle")}</p>
      </ScreenHero>

      <Reveal i={0} className="mb-3">
        <Card className="gap-3">
          <div className="flex items-center justify-between">
            <Label emoji="gear">{t("guide.settings")}</Label>
            {saveState !== "idle" && (
              <span className={cn("flex items-center gap-1 text-[11.5px] font-semibold", saveState === "saved" ? "text-primary" : "text-fg-3")}>
                {saveState === "saved" ? <Check className="size-3.5" /> : <CloudOff className="size-3.5" />}
                {saveState === "saved" ? t("guide.saved") : t("guide.saveFailed")}
              </span>
            )}
          </div>
          <Row label={t("controls.theme")}>
            <ThemeSwitch />
          </Row>
          <Row label={t("controls.language")}>
            <LangSwitch />
          </Row>
          <p className="text-[11.5px] text-fg-3">{t("guide.settingsD")}</p>
        </Card>
      </Reveal>

      <Reveal i={1}>
        <Card className="px-3.5 py-1">
          <Accordion type="single" collapsible defaultValue="dosing" key={settings.lang}>
            <Section value="dosing" emoji="testTube" title={t("guide.dosing")} desc={t("guide.dosingD", { line: getLine().name })}>
              <Table
                head={[t("guide.ecTarget"), t("guide.growBloom"), t("guide.core")]}
                rows={ATHENA_DOSING.map((r) => [num(r.ec, 1), `${num(r.base, 1)} g`, `${num(r.core, 1)} g`])}
                highlight={(i) => ATHENA_DOSING[i].ec >= 2 && ATHENA_DOSING[i].ec <= 2.5}
              />
              <Src>{t("guide.srcAthena")}</Src>
            </Section>

            <Section value="ph" emoji="thermometer" title={t("guide.ph")} desc={t("guide.phD")}>
              <Table
                head={[t("guide.stage"), t("guide.ph"), ""]}
                rows={PH_TARGETS.map((r) => [
                  t(`guide.${r.key}`),
                  r.lo === r.hi ? num(r.lo, 1) : range(r.lo, r.hi, 1),
                  srcTag(r.source) ?? "",
                ])}
              />
            </Section>

            <Section value="dry" emoji="scales" title={t("guide.dry")} desc={t("guide.dryD")}>
              <Table
                head={[t("guide.stage"), t("guide.ecSubstrate"), t("today.dryback"), t("guide.steering")]}
                rows={STEERING.map((r) => [
                  <span key="s">
                    {t(`guide.${r.stage}`)}
                    <span className="block text-[11px] text-fg-3">
                      {r.flower ? t("guide.flowerWeeks", { range: range(...r.weeks) }) : t("guide.vegWeeks", { range: range(...r.weeks) })}
                    </span>
                  </span>,
                  range(r.ec[0], r.ec[1], r.ec[0] % 1 ? 1 : 0),
                  `${r.dryback} %`,
                  t(`guide.${r.steer}`),
                ])}
              />
              <Src>{t("guide.srcAthena")}</Src>
            </Section>

            <Section value="notes" emoji="bulb" title={t("guide.notes")}>
              <ul className="flex flex-col gap-2 text-[13px] leading-[1.45] text-fg-2">
                {(["note1", "note2", "note3", "note4"] as const).map((n) => (
                  <li key={n} className="flex gap-2">
                    <span className="mt-[7px] size-[5px] shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    {t(`guide.${n}`)}
                  </li>
                ))}
              </ul>
            </Section>

            <Section value="sources" emoji="book" title={t("guide.sources")}>
              <ul className="flex flex-col gap-1.5 text-[13px] text-fg-2">
                {(["srcAthena", "srcRain", "srcBonorum", "srcMaker", "srcEstimate"] as const).map((s) => (
                  <li key={s}>{t(`guide.${s}`)}</li>
                ))}
              </ul>
            </Section>
          </Accordion>
        </Card>
      </Reveal>
      <p className="mt-3 text-center text-[10.5px] text-fg-3">{t("guide.version", { v: "0.2" })}</p>
    </>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[14px] font-medium">{label}</span>
      {children}
    </div>
  )
}

function Section({ value, emoji, title, desc, children }: { value: string; emoji: EmojiName; title: string; desc?: string; children: ReactNode }) {
  return (
    <AccordionItem value={value} className="border-line">
      <AccordionTrigger className="items-center py-3.5 hover:no-underline">
        <span className="flex items-center gap-3">
          <Emoji name={emoji} size={30} />
          <span>
            <span className="block text-[14.5px] font-semibold">{title}</span>
            {desc && <span className="block text-[12px] font-normal text-fg-3">{desc}</span>}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  )
}

function Table({ head, rows, highlight }: { head: ReactNode[]; rows: ReactNode[][]; highlight?: (i: number) => boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className={cn("pb-1.5 text-[11px] font-semibold tracking-[0.5px] text-fg-3 uppercase", i ? "text-right" : "text-left")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={cn("border-t border-line", highlight?.(i) && "bg-primary/8")}>
              {r.map((c, j) => (
                <td key={j} className={cn("px-1 py-2", j ? "text-right tabular" : "text-left")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Src({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-[10.5px] text-fg-3">{children}</p>
}
