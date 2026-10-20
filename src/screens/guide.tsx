import type { ReactNode } from "react"
import { Glossary } from "@/components/hydro/info"
import { Card } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { LineIcon } from "@/components/hydro/line-icon"
import { Reveal, ScreenHero } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { PH_TARGETS, STEERING, type Source } from "@/data/reference"
import { blendedCleanse, blendedManualRows, blendedReferenceRows, manualRows, proReferenceRows } from "@/calc/reperes"
import { usePhaseLabel } from "@/screens/tools/nutrition"
import { useGrow } from "@/app/grow-context"
import { dosingToConc } from "@/screens/tools/nutrition-settings"
import type { EmojiName } from "@/assets/emoji"
import { cn } from "@/lib/utils"
import { ATHENA_BLENDED, ATHENA_PRO, type Per10L } from "@/data/nutrients"
import { openAbout } from "@/components/hydro/source-info"
import { tertiary } from "@/components/hydro/styles"

/** Outils → Repères. Embedded in the Tools screen (hero hidden there). */
export function GuideScreen({ embedded }: { embedded?: boolean } = {}) {
  const { t, num, range, settings } = useSettings()
  const { nutrition } = useGrow()
  const conc = dosingToConc(nutrition.dosing) || 226
  const pro = proReferenceRows(conc)
  const phaseLabel = usePhaseLabel()
  const per = (v?: Per10L) => (v == null ? "—" : Array.isArray(v) ? range(v[0], v[1]) : num(v))
  const span = (lo: number, hi: number, d = 1) => (lo === hi ? num(lo, d) : range(lo, hi, d))
  const cleanse = blendedCleanse()
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
            <Section value="dosing" emoji="testTube" title={t("guide.dosing")} desc={t("guide.dosingD", { line: ATHENA_PRO.name })}>
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
              <Src>{t("guide.dosingNote")}</Src>
            </Section>

            {/* Lot 14a: the Blended line beside the Pro Line, read from its own catalog (p. 58). */}
            <Section value="blended" emoji="testTube" title={t("guide.blended")} desc={t("guide.blendedD", { line: ATHENA_BLENDED.name })}>
              <Table
                head={[t("guide.stage"), t("guide.colAB"), "PK", <span key="camg" className="normal-case">CaMg</span>, "EC"]}
                rows={blendedReferenceRows().map((r) => [
                  phaseLabel(r.phase),
                  r.ab != null ? per(r.ab) : r.fade != null ? <span key="f" className="whitespace-nowrap">Fade {per(r.fade)}</span> : "—",
                  per(r.pk),
                  per(r.camg),
                  num(r.ec, 1),
                ])}
              />
              <Src>{t("guide.blendedNote", { cleanse: per(cleanse) })}</Src>
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
              <Src>{t("guide.s1Note")}</Src>
            </Section>

            <Section value="manualBlended" emoji="droplet" title={t("guide.manualBlended")} desc={t("guide.manualBlendedD", { line: ATHENA_BLENDED.name })}>
              <Table
                head={[t("guide.stage"), t("guide.ecIn"), t("guide.ecRunoff"), t("today.dryback")]}
                rows={blendedManualRows().map((m) => [
                  m.stage === "veg"
                    ? t("guide.weekVeg")
                    : m.stage === "flush"
                      ? t("nut.ph_flush")
                      : m.weeks![0] === m.weeks![1]
                        ? t("guide.weekFlower", { w: m.weeks![0] })
                        : t("guide.weekFlowerRange", { a: m.weeks![0], b: m.weeks![1] }),
                  span(m.ecIn[0], m.ecIn[1]),
                  span(m.ecRunoff[0], m.ecRunoff[1]),
                  `${range(m.dryback[0], m.dryback[1])} %`,
                ])}
              />
              <Src>{t("guide.manualBlendedNote")}</Src>
            </Section>

            <Section value="notes" emoji="bulb" title={t("guide.notes")}>
              <ul className="flex flex-col gap-2 text-[0.8125rem] leading-[1.45] text-fg-2">
                {(["note1", "note2", "note3"] as const).map((n) => (
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
          </Accordion>
        </Card>
      </Reveal>
      {/* Lot 13: the sources of these tables are in À propos (and in the ⓘ beside the title). */}
      <div className="mt-1 flex justify-center">
        <button type="button" id="reperes-sources" className={tertiary} onClick={openAbout}>
          {t("info.all")}
        </button>
      </div>
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
