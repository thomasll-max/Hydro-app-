// Bilan d'un cycle (lot 12a): one page in sections with their drawing (Résultat, Calendrier, Conduite, Bidons,
// Incidents, Dégustation et notes), « Comparer avec… », the CSV and a printable page. Opened from a harvested cycle
// (Journal, Réglages → cycles, Aujourd'hui after a harvest). Nothing new to type but the dry weight per plant and the note.
import { useMemo, useState, type ReactNode } from "react"
import { ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Emoji } from "@/components/hydro/emoji"
import { NumText } from "@/components/hydro/value"
import { SpaceDot } from "@/components/hydro/space-pill"
import { Sheet } from "@/components/hydro/form"
import { secondary, tertiary } from "@/components/hydro/styles"
import type { EmojiName } from "@/assets/emoji"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { goBack, navigate } from "@/app/nav"
import { todayIso } from "@/calc/stage"
import { comparable, compareRows, cycleReview, cycleSpaces, METRIC_UNIT, weeksDays, type CycleReview, type ReviewRow, type ReviewUnit } from "@/calc/review"
import { getCatalog } from "@/data/nutrients"
import { reviewCsv, reviewHtml, type ReviewText } from "@/lib/review-export"
import { saveFile } from "@/lib/download"
import type { Cycle, StageKey } from "@/model/types"
import type { MessageKey } from "@/i18n/types"
import { cn } from "@/lib/utils"
import { useWeekTitle } from "./journal-weeks"

/** The review of a cycle, computed once per change of the data. */
function useReview(cycle: Cycle | undefined): CycleReview | null {
  const { all, spaces, allSpaces, equipment, assignments } = useGrow()
  return useMemo(
    () => (cycle ? cycleReview({ cycle, entries: all.entries, mixes: all.mixes, spaces: allSpaces.length ? allSpaces : spaces, equipment, assignments }) : null),
    [cycle, all.entries, all.mixes, spaces, allSpaces, equipment, assignments],
  )
}

/** How a row reads in the app's language: its label, its value with the unit, « donnée manquante » without. */
function useRowText() {
  const { t, num, dmy } = useSettings()
  const unit = (u: ReviewUnit) => (u === "count" || u === "date" || u === "none" ? "" : t(`rv.u.${u}` as MessageKey))
  const label = (r: ReviewRow) => (r.label.startsWith("plant:") ? r.label.slice(6) : t(r.label as MessageKey))
  const value = (r?: ReviewRow) => {
    if (!r) return "—"
    if (r.date) return dmy(r.date)
    if (r.value == null) return t("rv.missing")
    if (r.id === "flowerDays") {
      const { w, d } = weeksDays(r.value)
      return t("rv.flowerReal", { w, d })
    }
    const u = unit(r.unit)
    return `${num(r.value, r.digits)}${u ? ` ${u}` : ""}`
  }
  return { unit, label, value }
}

/** A titled section with its small drawing (style of lot 10j). */
function Part({ id, emoji, title, children, side }: { id: string; emoji: EmojiName; title: string; children: ReactNode; side?: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5" id={id} aria-labelledby={`${id}-title`}>
      <div className="flex items-center gap-2.5">
        <Emoji name={emoji} size={30} />
        <h2 id={`${id}-title`} className="display min-w-0 flex-1 text-[1.1875rem] leading-tight">
          {title}
        </h2>
        {side}
      </div>
      {children}
    </section>
  )
}

/** One value of the result: label above, the number big, a short source line under it. */
function Big({ label, value, sub, missing, id }: { label: string; value: string; sub?: string; missing?: boolean; id: string }) {
  return (
    <div className="min-w-0 border-t border-line pt-2" data-result={id}>
      <span className="block truncate text-[0.75rem] text-fg-3">{label}</span>
      <b className={cn("mt-0.5 block font-num tracking-[-0.02em]", missing ? "text-[0.875rem] font-medium text-fg-3" : "text-[1.375rem] font-semibold")}>{value}</b>
      {sub && <span className="block truncate text-[0.75rem] text-fg-3">{sub}</span>}
    </div>
  )
}

function Line({ label, value, sub, missing, attr }: { label: string; value: string; sub?: string; missing?: boolean; attr?: Record<string, string> }) {
  return (
    <div className="flex min-h-11 items-baseline gap-3 border-t border-line py-2" {...attr}>
      <span className="min-w-0 flex-1 text-[0.875rem]">{label}</span>
      <span className="text-right">
        <b className={cn("block font-num text-[0.9375rem] whitespace-nowrap", missing ? "font-medium text-fg-3" : "font-semibold")}>{value}</b>
        {sub && <small className="block font-num text-[0.75rem] text-fg-3">{sub}</small>}
      </span>
    </div>
  )
}

export function ReviewPage({ cycleId, vs }: { cycleId: string; vs?: string }) {
  const { t } = useSettings()
  const { cycles } = useGrow()
  const cycle = cycles.find((c) => c.id === cycleId)
  const other = vs ? cycles.find((c) => c.id === vs) : undefined
  if (!cycle)
    return (
      <div className="flex flex-col gap-4" id="review-page">
        <BackBar onBack={goBack} />
        <p className="text-[0.875rem] text-fg-3">{t("rv.notFound")}</p>
      </div>
    )
  return other ? <ComparePage a={cycle} b={other} /> : <Review cycle={cycle} />
}

function BackBar({ onBack, right }: { onBack: () => void; right?: ReactNode }) {
  const { t } = useSettings()
  return (
    <div className="-mt-1 flex items-center gap-2">
      <button type="button" onClick={onBack} className="-ml-1 flex h-11 items-center gap-1 rounded-[10px] pr-3 text-[0.9375rem] font-semibold text-fg" id="review-back">
        <ChevronLeft className="size-5" /> {t("rv.back")}
      </button>
      {right && <span className="ml-auto flex min-w-0 items-center gap-1.5 truncate text-[0.8125rem] text-fg-3">{right}</span>}
    </div>
  )
}

function useCycleSub() {
  const { t, dmy } = useSettings()
  const { allSpaces, spaces } = useGrow()
  return (c: Cycle, rv: CycleReview | null) => {
    const sp = (allSpaces.length ? allSpaces : spaces).find((s) => s.id === (rv?.spaceId ?? c.spaceId))
    return { space: sp, text: [c.cultivars.join(", "), sp?.name, c.harvestDate ? t("rv.harvestedOn", { date: dmy(c.harvestDate) }) : null].filter(Boolean).join(" · ") }
  }
}

function Review({ cycle }: { cycle: Cycle }) {
  const { t, num, dm, dmy, settings } = useSettings()
  const { cycles, allSpaces, spaces, customProducts } = useGrow()
  const ed = useEditors()
  const rv = useReview(cycle)
  const txt = useRowText()
  const weekTitle = useWeekTitle()
  const sub = useCycleSub()(cycle, rv)
  const [pick, setPick] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!rv) return null
  const R = rv.result
  const C = rv.calendar
  const missing = t("rv.missing")
  const g = (v?: number, d = 0, u = "g") => (v != null ? `${num(v, d)} ${u}` : missing)
  const stageName = (s: StageKey) => t(`stage.${s}` as MessageKey)
  const productName = (p: CycleReview["tanks"]["products"][number]) => p.name ?? getCatalog(p.line).products.find((x) => x.id === p.id)?.name ?? customProducts.find((x) => x.id === p.id)?.name ?? p.id

  // Exports: the same rows as the page.
  const text: ReviewText = {
    lang: settings.lang,
    head: t("rv.csvHead"),
    section: (s) => t(`rv.${s === "conduct" ? "conduct" : s}` as MessageKey),
    stage: stageName,
    label: txt.label,
    unit: txt.unit,
    num: (v, d) => num(v, d),
    date: dmy,
  }
  const file = (ext: string) => `${t("rv.open").toLowerCase()}-${cycle.name.replace(/[^\p{L}\d]+/gu, "-").replace(/^-|-$/g, "") || "cycle"}.${ext}`
  const done = (res: Awaited<ReturnType<typeof saveFile>>) => {
    if (res === "saved" || res === "started") toast.success(t("data.saved"))
    else if (res === "declined") toast(t("data.declined"))
    else toast.error(t("data.unavailable"))
  }
  const exportCsv = async () => {
    setBusy(true)
    try {
      done(await saveFile(file("csv"), new Blob(["﻿" + reviewCsv(rv, text)], { type: "text/csv" })))
    } finally {
      setBusy(false)
    }
  }
  const exportHtml = async () => {
    setBusy(true)
    try {
      const html = reviewHtml(rv, text, {
        title: t("rv.title", { name: cycle.name }),
        sub: sub.text,
        foot: t("rv.printFoot", { date: dmy(todayIso()) }),
        missing,
        notes: [
          { label: t("cycleForm.tasting"), text: rv.notes.tasting ?? "" },
          { label: t("cycleForm.dryingNotes"), text: rv.notes.drying ?? "" },
          { label: t("rv.review"), text: rv.notes.review ?? "" },
        ],
        extra: [
          { title: t("rv.tanks"), lines: rv.tanks.products.map((p) => `${productName(p)} : ${num(p.qty, 1)} ${p.unit}${p.unknown ? ` (${t("rv.unknownDose", { n: p.unknown })})` : ""}`) },
          { title: t("rv.incidents"), lines: rv.incidents.map((w) => `${weekTitle(w.label, w.monday)} : ${[...w.obs.map((o) => `${t(`obs.${o.tag}` as MessageKey)} ×${o.days}`), ...w.actions.map((a) => `${t(`action.${a.tag}` as MessageKey)} ×${a.days}`)].join(", ")}`) },
        ],
      })
      done(await saveFile(file("html"), new Blob([html], { type: "text/html" })))
    } finally {
      setBusy(false)
    }
  }

  const wattsSub = R.watts != null ? `${num(R.watts)} W · ${t(R.wattsSrc === "harvest" ? "rv.wattsHarvest" : "rv.wattsEquipment")}` : undefined
  const flower = C.flowerDays != null ? weeksDays(C.flowerDays) : null
  const days = (n?: number) => (n != null ? `${num(n)} ${t("rv.u.days")}` : missing)
  const hasNotes = !!(rv.notes.tasting || rv.notes.drying || rv.notes.review)

  return (
    <div className="flex flex-col gap-7" id="review-page">
      <BackBar
        onBack={goBack}
        right={
          <>
            {sub.space && <SpaceDot color={sub.space.color} />}
            {sub.space?.name}
          </>
        }
      />
      <div>
        <h1 className="display text-[1.75rem] leading-tight [overflow-wrap:anywhere]">{t("rv.title", { name: cycle.name })}</h1>
        <p className="mt-1 text-[0.8125rem] text-fg-3" id="review-sub">
          <NumText quiet>{sub.text}</NumText>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={secondary} onClick={() => setPick(true)} id="review-compare">
            {t("rv.compare")}
          </button>
          <button type="button" className={secondary} onClick={exportCsv} disabled={busy} id="review-csv">
            {t("rv.csv")}
          </button>
          <button type="button" className={secondary} onClick={exportHtml} disabled={busy} id="review-print">
            {t("rv.print")}
          </button>
        </div>
      </div>

      <Part
        id="review-result"
        emoji="scales"
        title={t("rv.result")}
        side={
          <button type="button" className={tertiary} onClick={() => ed.openCycle({ cycleId: cycle.id, harvestOnly: true })} id="review-edit">
            {t("rv.editHarvest")}
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Big id="dry" label={t("rv.dry")} value={g(R.dryG)} missing={R.dryG == null} sub={R.drySrc === "plants" ? t("rv.drySum") : undefined} />
          <Big id="wet" label={t("rv.wet")} value={g(R.wetG)} missing={R.wetG == null} />
          <Big id="gPerW" label={t("rv.gPerW")} value={R.gPerW != null ? num(R.gPerW, 2) : missing} missing={R.gPerW == null} sub={wattsSub} />
          <Big id="gPerPlant" label={t("rv.gPerPlant")} value={g(R.gPerPlant, 1)} missing={R.gPerPlant == null} sub={R.plants ? `${R.plants} ${t("rv.plants").toLowerCase()}` : undefined} />
          <Big id="gPerM2" label={t("rv.gPerM2")} value={g(R.gPerM2)} missing={R.gPerM2 == null} sub={R.areaM2 != null ? `${num(R.areaM2, 2)} m²` : undefined} />
        </div>
        {R.perPlant.length > 0 && (
          <p className="text-[0.8125rem] text-fg-2" id="review-plants">
            <span className="font-semibold">{t("rv.perPlant")} : </span>
            <NumText>{R.perPlant.map((p) => `${p.id} ${num(p.g, p.g % 1 ? 1 : 0)} g`).join(" · ")}</NumText>
          </p>
        )}
        {R.gap != null && R.plantsSum != null && (
          <p className="text-[0.8125rem] text-warn" id="review-gap">
            <NumText>{t("rv.gap", { sum: `${num(R.plantsSum, R.plantsSum % 1 ? 1 : 0)} g`, gap: `${R.gap > 0 ? "+" : ""}${num(R.gap, R.gap % 1 ? 1 : 0)} g` })}</NumText>
          </p>
        )}
      </Part>

      <Part id="review-calendar" emoji="calendar" title={t("rv.calendar")}>
        <div className="flex flex-col">
          {(["germination", "veg", "flip", "harvest"] as const).map((k) => (
            <Line key={k} label={t(`rv.${k}`)} value={C[k] ? dmy(C[k]!) : missing} missing={!C[k]} attr={{ "data-cal": k }} />
          ))}
          <Line label={t("rv.propagationDays")} value={days(C.propagationDays)} missing={C.propagationDays == null} attr={{ "data-cal": "propagationDays" }} />
          {C.veg && <Line label={t("rv.vegDays")} value={days(C.vegDays)} missing={C.vegDays == null} attr={{ "data-cal": "vegDays" }} />}
          <Line
            label={t("rv.flowerDays")}
            value={flower ? t("rv.flowerReal", { w: flower.w, d: flower.d }) : missing}
            missing={!flower}
            sub={t("rv.plannedWeeks", { n: C.flowerWeeksPlanned })}
            attr={{ "data-cal": "flowerDays" }}
          />
          <Line label={t("rv.dryingDays")} value={days(C.dryingDays)} missing={C.dryingDays == null} sub={C.dryingSrc === "curing" ? t("rv.dryingCuring") : undefined} attr={{ "data-cal": "dryingDays" }} />
        </div>
      </Part>

      <Part id="review-conduct" emoji="testTube" title={t("rv.conduct")}>
        <p className="text-[0.78125rem] leading-snug text-fg-3">{t("rv.conductD")}</p>
        {rv.conduct.length === 0 ? (
          <p className="text-[0.875rem] text-fg-3">{t("rv.noEntries")}</p>
        ) : (
          <Accordion type="multiple" className="border-b border-line">
            {rv.conduct.map((s) => (
              <AccordionItem key={s.stage} value={s.stage} className="border-t border-line" data-stage={s.stage}>
                <AccordionTrigger className="min-h-12 py-2 hover:no-underline">
                  <span className="min-w-0 text-left">
                    <b className="block text-[0.9375rem] font-semibold">{stageName(s.stage)}</b>
                    <small className="block text-[0.75rem] font-normal text-fg-3">
                      <NumText quiet>{t("rv.stageLine", { n: s.entries, from: dm(s.from), to: dm(s.to) })}</NumText>
                    </small>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  {s.lines.map((l) => {
                    const d = METRIC_UNIT[l.metric].digits
                    const u = txt.unit(METRIC_UNIT[l.metric].unit)
                    return (
                      <div key={l.metric} className="flex min-h-11 items-baseline gap-3 border-t border-line py-2 first:border-t-0" data-metric={l.metric}>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.875rem]">{t(`jw.m.${l.metric}` as MessageKey)}</span>
                          <small className="block text-[0.75rem] text-fg-3">
                            <NumText quiet>{t("rv.lineSub", { min: num(l.min, d), max: num(l.max, d), n: l.n })}</NumText>
                          </small>
                        </span>
                        <span className="text-right">
                          <b className="block font-num text-[0.9375rem] font-semibold whitespace-nowrap">
                            {num(l.avg, d)}
                            {u ? ` ${u}` : ""}
                          </b>
                          <small className={cn("block font-num text-[0.75rem] whitespace-nowrap", l.withTarget ? (l.inTarget / l.withTarget >= 0.8 ? "text-leaf-ink" : "text-warn") : "text-fg-3")} data-in-target={l.withTarget ? `${l.inTarget}/${l.withTarget}` : ""}>
                            {l.withTarget ? t("rv.inTarget", { k: l.inTarget, n: l.withTarget }) : t("rv.noTarget")}
                          </small>
                        </span>
                      </div>
                    )
                  })}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </Part>

      <Part id="review-tanks" emoji="bucket" title={t("rv.tanks")}>
        {rv.tanks.count === 0 ? (
          <p className="text-[0.875rem] text-fg-3">{t("rv.noTanks")}</p>
        ) : (
          <>
            <p className="font-num text-[1rem] font-semibold" id="review-tank-line">
              {t("rv.tankLine", { n: rv.tanks.count, l: num(rv.tanks.litres) })}
            </p>
            <div className="flex flex-col">
              {rv.tanks.products.map((p) => (
                <Line key={`${p.line}|${p.id}|${p.unit}`} label={productName(p)} value={p.tanks ? `${num(p.qty, p.qty % 1 ? 1 : 0)} ${p.unit}` : missing} missing={!p.tanks} sub={p.unknown ? t("rv.unknownDose", { n: p.unknown }) : undefined} attr={{ "data-product": p.id }} />
              ))}
            </div>
          </>
        )}
      </Part>

      <Part id="review-incidents" emoji="warning" title={t("rv.incidents")}>
        {rv.incidents.length === 0 ? (
          <p className="text-[0.875rem] text-fg-3">{t("rv.noIncidents")}</p>
        ) : (
          <div className="flex flex-col">
            {rv.incidents.map((w) => (
              <div key={w.monday} className="flex flex-col gap-0.5 border-t border-line py-2" data-week={w.monday}>
                <b className="text-[0.875rem] font-semibold">{weekTitle(w.label, w.monday)}</b>
                <span className="text-[0.8125rem] leading-snug text-fg-2">
                  {w.obs.map((o, i) => (
                    <span key={o.tag}>
                      {i > 0 && " · "}
                      <span className={o.max >= 3 ? "font-semibold text-bad" : o.max === 2 ? "font-semibold text-warn" : undefined}>{t(`obs.${o.tag}` as MessageKey)}</span>
                      <span className="font-num text-fg-3"> ×{o.days}</span>
                    </span>
                  ))}
                  {w.obs.length > 0 && w.actions.length > 0 && " · "}
                  {w.actions.map((a, i) => (
                    <span key={a.tag}>
                      {i > 0 && " · "}
                      {t(`action.${a.tag}` as MessageKey)}
                      <span className="font-num text-fg-3"> ×{a.days}</span>
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        )}
      </Part>

      <Part
        id="review-notes"
        emoji="jar"
        title={t("rv.notes")}
        side={
          <button type="button" className={tertiary} onClick={() => ed.openCycle({ cycleId: cycle.id, harvestOnly: true })} id="review-note-edit">
            {t("rv.writeNote")}
          </button>
        }
      >
        {!hasNotes && <p className="text-[0.875rem] text-fg-3">{t("rv.noNotes")}</p>}
        {(
          [
            ["tasting", t("cycleForm.tasting")],
            ["drying", t("cycleForm.dryingNotes")],
            ["review", t("rv.review")],
          ] as const
        ).map(([k, label]) =>
          rv.notes[k] ? (
            <div key={k} className="border-t border-line pt-2" data-note={k}>
              <b className="block text-[0.8125rem] font-semibold text-fg-2">{label}</b>
              <p className="mt-0.5 text-[0.875rem] leading-[1.5] whitespace-pre-line">{rv.notes[k]}</p>
            </div>
          ) : null,
        )}
      </Part>

      <ComparePick open={pick} onOpenChange={setPick} cycle={cycle} cycles={cycles} spaces={allSpaces.length ? allSpaces : spaces} />
    </div>
  )
}

/** « Comparer avec… »: the other harvested cycles, filtered by variety or by space. */
function ComparePick({ open, onOpenChange, cycle, cycles, spaces }: { open: boolean; onOpenChange: (o: boolean) => void; cycle: Cycle; cycles: Cycle[]; spaces: { id: string; name: string; color: Parameters<typeof SpaceDot>[0]["color"] }[] }) {
  const { t, dmy } = useSettings()
  const [cultivar, setCultivar] = useState<string | undefined>()
  const [spaceId, setSpaceId] = useState<string | undefined>()
  const all = comparable(cycles, cycle)
  const list = comparable(cycles, cycle, { cultivar, spaceId })
  // Varieties written the same way but for case and spaces are one choice.
  const varieties = [...new Map(all.flatMap((c) => c.cultivars).map((v) => [v.toLowerCase().replace(/\s+/g, " ").trim(), v.trim()])).values()].filter(Boolean).sort((x, y) => x.localeCompare(y))
  const spaceIds = [...new Set(all.flatMap((c) => cycleSpaces(c)))].filter((id) => spaces.some((s) => s.id === id))
  const chip = (on: boolean) => cn("hit h-9 shrink-0 rounded-full border px-3 text-[0.75rem] font-semibold whitespace-nowrap", on ? "border-fg bg-fg text-background" : "border-line-strong text-fg-2")
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("rv.pickTitle")} dirty={false}>
      {all.length === 0 ? (
        <p className="pb-4 text-[0.875rem] text-fg-3" id="compare-none">
          {t("rv.pickNone")}
        </p>
      ) : (
        <div className="flex flex-col gap-3 pb-3">
          {varieties.length > 1 && (
            <div role="radiogroup" aria-label={t("rv.filterVariety")} className="flex flex-wrap items-center gap-2" id="compare-varieties">
              <span aria-hidden="true" className="w-full text-[0.8125rem] font-semibold text-fg-2">
                {t("rv.filterVariety")}
              </span>
              <button type="button" role="radio" aria-checked={!cultivar} className={chip(!cultivar)} onClick={() => setCultivar(undefined)}>
                {t("rv.all")}
              </button>
              {varieties.map((v) => (
                <button key={v} type="button" role="radio" aria-checked={cultivar === v} className={chip(cultivar === v)} onClick={() => setCultivar(v)}>
                  {v}
                </button>
              ))}
            </div>
          )}
          {spaceIds.length > 1 && (
            <div role="radiogroup" aria-label={t("rv.filterSpace")} className="flex flex-wrap items-center gap-2" id="compare-spaces">
              <span aria-hidden="true" className="w-full text-[0.8125rem] font-semibold text-fg-2">
                {t("rv.filterSpace")}
              </span>
              <button type="button" role="radio" aria-checked={!spaceId} className={chip(!spaceId)} onClick={() => setSpaceId(undefined)}>
                {t("rv.all")}
              </button>
              {spaceIds.map((id) => (
                <button key={id} type="button" role="radio" aria-checked={spaceId === id} className={chip(spaceId === id)} onClick={() => setSpaceId(id)}>
                  {spaces.find((s) => s.id === id)?.name}
                </button>
              ))}
            </div>
          )}
          {list.length === 0 && <p className="text-[0.875rem] text-fg-3">{t("rv.pickNoneFilter")}</p>}
          <ul id="compare-list">
            {list.map((c) => (
              <li key={c.id} className="border-t border-line first:border-t-0">
                <button
                  type="button"
                  className="flex min-h-14 w-full flex-col justify-center py-2 text-left"
                  data-cycle={c.id}
                  onClick={() => {
                    onOpenChange(false)
                    navigate({ tab: "journal", review: cycle.id, vs: c.id })
                  }}
                >
                  <b className="text-[0.90625rem] font-semibold">{c.name}</b>
                  <span className="text-[0.75rem] text-fg-3">{[c.cultivars.join(", "), spaces.find((s) => s.id === c.spaceId)?.name, c.harvestDate ? t("rv.harvestedOn", { date: dmy(c.harvestDate) }) : null].filter(Boolean).join(" · ")}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  )
}

/** Two cycles side by side: the same lines, the gap in mono (B − A). */
function ComparePage({ a, b }: { a: Cycle; b: Cycle }) {
  const { t, num } = useSettings()
  const ra = useReview(a)
  const rb = useReview(b)
  const txt = useRowText()
  const rows = useMemo(() => (ra && rb ? compareRows(ra, rb) : []), [ra, rb])
  if (!ra || !rb) return null
  const sections = ["result", "calendar", "conduct", "tanks"] as const
  const sectionOf = (r: (typeof rows)[number]) => (r.a ?? r.b)!.section
  const stageOf = (r: (typeof rows)[number]) => (r.a ?? r.b)!.stage
  return (
    <div className="flex flex-col gap-6" id="compare-page">
      <BackBar onBack={() => navigate({ tab: "journal", review: a.id })} />
      <div>
        <h1 className="display text-[1.75rem] leading-tight">{t("rv.compareTitle")}</h1>
        <div className="mt-3 grid grid-cols-2 gap-3" id="compare-heads">
          {[a, b].map((c, i) => (
            <div key={c.id} className="min-w-0 border-t-2 border-fg pt-1.5">
              <span className="font-num text-[0.75rem] text-fg-3">{i ? "B" : "A"}</span>
              <b className="block text-[0.9375rem] leading-tight font-semibold [overflow-wrap:anywhere]">{c.name}</b>
              <span className="block truncate text-[0.75rem] text-fg-3">{c.cultivars.join(", ")}</span>
            </div>
          ))}
        </div>
      </div>
      {sections.map((s) => {
        const list = rows.filter((r) => sectionOf(r) === s)
        if (!list.length) return null
        const stages = s === "conduct" ? [...new Set(list.map(stageOf))] : [undefined]
        return (
          <section key={s} className="flex flex-col" id={`compare-${s}`}>
            <h2 className="display mb-1 text-[1.1875rem] leading-tight">{t(`rv.${s}` as MessageKey)}</h2>
            {stages.map((st) => (
              <div key={st ?? "all"} className="flex flex-col">
                {st && <h3 className="mt-2 mb-0.5 text-[0.8125rem] font-semibold text-fg-2">{t(`stage.${st}` as MessageKey)}</h3>}
                {list
                  .filter((r) => !st || stageOf(r) === st)
                  .map((r) => {
                    const ref = (r.a ?? r.b)!
                    const digits = Math.max(ref.digits, 0)
                    return (
                      <div key={r.id} className="border-t border-line py-1.5" data-row={r.id}>
                        <span className="block text-[0.8125rem] text-fg-2">{txt.label(ref)}</span>
                        <span className="mt-0.5 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4.5rem] items-baseline gap-2 font-num text-[0.875rem]">
                          <b className={cn("min-w-0 font-semibold [overflow-wrap:anywhere]", r.a?.value == null && !r.a?.date && "font-medium text-fg-3")}>{txt.value(r.a)}</b>
                          <b className={cn("min-w-0 font-semibold [overflow-wrap:anywhere]", r.b?.value == null && !r.b?.date && "font-medium text-fg-3")}>{txt.value(r.b)}</b>
                          <span className={cn("text-right text-[0.8125rem]", r.diff == null ? "text-fg-3" : "text-fg")} data-diff>
                            {r.diff == null ? "—" : `${r.diff > 0 ? "+" : r.diff < 0 ? "−" : "±"}${num(Math.abs(r.diff), digits)}`}
                          </span>
                        </span>
                      </div>
                    )
                  })}
              </div>
            ))}
          </section>
        )
      })}
      <p className="text-[0.75rem] text-fg-3">
        {t("rv.diff")} = B − A
      </p>
    </div>
  )
}
