import type { ReactNode } from "react"
import { Glossary } from "@/components/hydro/info"
import { Card } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { LineIcon } from "@/components/hydro/line-icon"
import { Reveal, ScreenHero } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { PH_TARGETS, STEERING, type Source } from "@/data/reference"
import { manualRows, proReferenceRows } from "@/calc/reperes"
import { useGrow } from "@/app/grow-context"
import { dosingToConc } from "@/screens/tools/nutrition-settings"
import type { EmojiName } from "@/assets/emoji"
import { cn } from "@/lib/utils"
import { getCatalog } from "@/data/nutrients"

/** Outils → Repères. Embedded in the Tools screen (hero hidden there). */
export function GuideScreen({ embedded }: { embedded?: boolean } = {}) {
  const { t, num, range, settings } = useSettings()
  const { nutrition } = useGrow()
  const conc = dosingToConc(nutrition.dosing) || 226
  const pro = proReferenceRows(conc)
  const srcTag = (s: Source) =>
    s === "estimate" ? t("guide.tagEstimate") : s === "athena" ? t("guide.tagAthena") : null

  return (
    <>
      {!embedded && (
        <ScreenHero emoji="compass" title={t("guide.title")}>
          <p className="mt-1 text-[0.8125rem] leading-snug text-fg-2">{t("guide.subtitle")}</p>
        </ScreenHero>
      )}

      <Reveal i={1}>
        <Card>
          <Accordion type="single" collapsible defaultValue="dosing" key={settings.lang}>
            <Section value="dosing" emoji="testTube" title={t("guide.dosing")} desc={t("guide.dosingD", { line: getCatalog().name })}>
              <Table
                head={[
                  t("guide.ecTarget"),
                  <span key="g" className="normal-case">{t("guide.gCol")}</span>,
                  <span key="c" className="normal-case">{t("guide.concCol", { c: String(conc) })}</span>,
                ]}
                rows={pro.map((r) => [
                  num(r.ec, 1),
                  <span key="g">
                    {num(r.baseG, 1)} <span className="text-fg-3">/</span> {num(r.coreG, 1)}
                  </span>,
                  r.baseMl != null ? (
                    <span key="m" className="font-semibold">
                      {num(r.baseMl)} <span className="font-normal text-fg-3">/</span> {num(r.coreMl!)}
                    </span>
                  ) : (
                    <span key="m" className="text-fg-3">—</span>
                  ),
                ])}
                highlight={(i) => pro[i].ec >= 2 && pro[i].ec <= 2.5}
              />
              <Src>
                {t("guide.dosingNote")} {t("guide.srcAthena")}
              </Src>
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
                    <span className="block text-[0.75rem] text-fg-3">
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

            <Section value="manual" emoji="droplet" title={t("guide.manual")} desc={t("guide.manualD")}>
              <Table
                head={[t("guide.stage"), t("today.dryback"), t("guide.ecRunoff")]}
                rows={manualRows().map((r) => [
                  r.label.kind === "veg" ? t("guide.weekVeg") : r.label.kind === "week" ? t("guide.weekFlower", { w: r.label.w }) : t("guide.weekFlowerRange", { a: r.label.a, b: r.label.b }),
                  `${range(r.dryback.lo, r.dryback.hi)} %`,
                  range(r.ecRunoff.lo, r.ecRunoff.hi, 1),
                ])}
                highlight={(i) => i === 1}
              />
              <Src>
                {t("guide.s1Note")} {t("guide.srcAthena")}
              </Src>
            </Section>

            <Section value="notes" emoji="bulb" title={t("guide.notes")}>
              <ul className="flex flex-col gap-2 text-[0.8125rem] leading-[1.45] text-fg-2">
                {(["note1", "note2", "note3", "note4"] as const).map((n) => (
                  <li key={n} className="flex gap-2">
                    <span className="mt-[7px] size-[5px] shrink-0 rounded-[2px] bg-fg-3" aria-hidden="true" />
                    {t(`guide.${n}`)}
                  </li>
                ))}
              </ul>
            </Section>

            <Section value="glossary" emoji="book" title={t("glossary.title")} desc={t("glossary.titleD")}>
              <Glossary />
            </Section>

            <Section value="sources" emoji="book" title={t("guide.sources")}>
              <ul className="flex flex-col gap-1.5 text-[0.8125rem] text-fg-2">
                {(["srcAthena", "srcRain", "srcBonorum", "srcMaker", "srcEstimate"] as const).map((s) => (
                  <li key={s}>{t(`guide.${s}`)}</li>
                ))}
              </ul>
            </Section>
          </Accordion>
        </Card>
      </Reveal>
      <p className="mt-3 text-center text-[0.75rem] text-fg-3">{t("guide.blendedSoon")}</p>
    </>
  )
}

function Section({ value, emoji, title, desc, children }: { value: string; emoji: EmojiName; title: string; desc?: string; children: ReactNode }) {
  return (
    <AccordionItem value={value} className="border-line">
      <AccordionTrigger className="items-center py-3.5 hover:no-underline">
        <span className="flex items-center gap-3">
          <LineIcon name={emoji} size={22} />
          <span>
            <span className="block text-[0.90625rem] font-semibold">{title}</span>
            {desc && <span className="block text-[0.75rem] font-normal text-fg-3">{desc}</span>}
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
      <table className="w-full border-collapse text-[0.8125rem]">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className={cn("pb-1.5 text-[0.75rem] font-semibold tracking-[0.5px] text-fg-3 uppercase", i ? "text-right" : "text-left")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={cn("border-t border-line", highlight?.(i) && "bg-surface-2 font-semibold")}>
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
  return <p className="mt-2 text-[0.75rem] text-fg-3">{children}</p>
}
