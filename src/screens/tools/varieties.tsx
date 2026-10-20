// Outils → Variétés (lot 12c): every variety of the grow, from the strings the app already has (cycles, plants),
// grouped without case or extra spaces. A variety's page: Thomas's notes (a breeder's word only as a note with its
// source), the cycles where it grew with its dry weight per plant and its real flowering, the strip of its plants.
// Two spellings are merged only when Thomas asks (« Fusionner »), never silently.
import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { AreaField, Sheet, TextField } from "@/components/hydro/form"
import { Notice } from "@/components/hydro/primitives"
import { NumText } from "@/components/hydro/value"
import { secondary, tertiary } from "@/components/hydro/styles"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { navigate, whenSheetsClosed } from "@/app/nav"
import { mergeSpellings, varieties, varietyCycles, varietyKey, type Variety } from "@/calc/varieties"
import { galleryPhotos, weekStrip } from "@/calc/gallery"
import { weeksDays } from "@/calc/review"
import { StripThumb } from "@/screens/gallery"

const open = (key: string) => navigate({ tab: "tools", tool: "varieties", variety: key }, { push: true })

/** Opens a variety's page from any name of a variety (cycle, plant, review), after a sheet it came from is closed. */
export const openVariety = (name: string) => whenSheetsClosed(() => open(varietyKey(name)))

export function VarietiesTool({ variety }: { variety?: string }) {
  const { t } = useSettings()
  const { cycles, all } = useGrow()
  const list = useMemo(() => varieties(cycles, all.plants), [cycles, all.plants])
  const v = variety ? list.find((x) => x.key === variety) : undefined
  if (variety && v) return <VarietyPage v={v} />
  if (!list.length) return <p className="text-[0.875rem] text-fg-3">{t("vr.none")}</p>
  return (
    <ul className="flex flex-col" id="varieties-list">
      {list.map((x) => (
        <li key={x.key} className="border-t border-line first:border-t-0">
          <button type="button" onClick={() => open(x.key)} className="flex min-h-14 w-full items-center gap-3 py-2 text-left" data-variety={x.key}>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[0.9375rem] font-semibold">{x.name}</b>
              <span className="block text-[0.75rem] text-fg-3">
                <NumText quiet>{[t("vr.cycles", { n: x.cycleIds.length }), x.spellings.length > 1 ? t("vr.spellings", { n: x.spellings.length }) : null].filter(Boolean).join(" · ")}</NumText>
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-fg-3" />
          </button>
        </li>
      ))}
    </ul>
  )
}

function VarietyPage({ v }: { v: Variety }) {
  const { t, num, dmy } = useSettings()
  const { grow, cycles, all, saveGrow, saveCycle, savePlant } = useGrow()
  const kept = grow?.varietyNotes?.[v.key]
  const [notes, setNotes] = useState(kept?.notes ?? "")
  const [source, setSource] = useState(kept?.source ?? "")
  const [busy, setBusy] = useState(false)
  const [merge, setMerge] = useState<string | null>(null)
  useEffect(() => {
    setNotes(kept?.notes ?? "")
    setSource(kept?.source ?? "")
  }, [v.key]) // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => varietyCycles(v.key, cycles, all.plants), [v.key, cycles, all.plants])
  const photos = useMemo(() => galleryPhotos(all.entries), [all.entries])
  const changed = (notes.trim() || "") !== (kept?.notes ?? "") || (source.trim() || "") !== (kept?.source ?? "")

  const saveNotes = async () => {
    setBusy(true)
    try {
      const map = { ...(grow?.varietyNotes ?? {}) }
      if (notes.trim() || source.trim()) map[v.key] = { ...(notes.trim() ? { notes: notes.trim() } : {}), ...(source.trim() ? { source: source.trim() } : {}), updatedAt: new Date().toISOString() }
      else delete map[v.key]
      await saveGrow({ varietyNotes: Object.keys(map).length ? map : undefined })
      toast.success(t("vr.saved"))
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error)?.message ?? "?" }))
    } finally {
      setBusy(false)
    }
  }
  const others = merge ? v.spellings.filter((s) => s.name !== merge).map((s) => s.name) : []
  const plan = merge ? mergeSpellings(cycles, all.plants, others, merge) : { cycles: [], plants: [] }
  const doMerge = async () => {
    if (!merge) return
    setBusy(true)
    try {
      for (const c of plan.cycles) await saveCycle(c)
      for (const p of plan.plants) await savePlant(p)
      toast.success(t("vr.mergeDone"))
      setMerge(null)
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error)?.message ?? "?" }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6" id="variety-page">
      <div>
        <button type="button" onClick={() => navigate({ tab: "tools", tool: "varieties" })} className={tertiary} id="variety-all">
          <ChevronLeft className="size-4" /> {t("tools.varieties")}
        </button>
        <h2 className="display mt-1 text-[1.5rem] leading-tight [overflow-wrap:anywhere]" id="variety-name">
          {v.name}
        </h2>
        <p className="mt-0.5 text-[0.8125rem] text-fg-3">
          <NumText quiet>{t("vr.cycles", { n: rows.length })}</NumText>
        </p>
      </div>

      {v.spellings.length > 1 && (
        <section className="flex flex-col gap-2" id="variety-merge">
          <Notice tone="info">{t("vr.mergeHint", { list: v.spellings.map((s) => `« ${s.name} » (${s.n})`).join(", ") })}</Notice>
          <div className="flex flex-wrap gap-2">
            {v.spellings.map((s) => (
              <button key={s.name} type="button" className={secondary} onClick={() => setMerge(s.name)} data-merge-into={s.name}>
                {t("vr.mergeInto", { name: s.name })}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2.5" id="variety-notes">
        <h3 className="display text-[1.1875rem] leading-tight">{t("vr.notes")}</h3>
        <AreaField id="v-notes" label={t("vr.notesD")} value={notes} onChange={setNotes} placeholder={t("vr.notesPh")} />
        <TextField id="v-source" label={t("vr.source")} hint={t("vr.sourceD")} value={source} onChange={setSource} />
        <Button className="h-11 self-start" onClick={saveNotes} disabled={busy || !changed} id="v-save">
          {t("vr.save")}
        </Button>
        <p className="text-[0.75rem] leading-snug text-fg-3">{t("vr.noBreeder")}</p>
      </section>

      <section className="flex flex-col" id="variety-cycles">
        <h3 className="display mb-1 text-[1.1875rem] leading-tight">{t("vr.cyclesTitle")}</h3>
        {rows.map((r) => {
          const one = r.plants.length === 1 ? r.plants[0] : undefined
          const strip = weekStrip(photos, r.cycle, one ?? "all")
          const wd = r.flowerDays != null ? weeksDays(r.flowerDays) : null
          return (
            <div key={r.cycle.id} className="flex flex-col gap-1.5 border-t border-line py-2.5" data-cycle={r.cycle.id}>
              <div className="flex items-baseline justify-between gap-3">
                <b className="min-w-0 truncate text-[0.9375rem] font-semibold">
                  {r.cycle.name}
                  {one ? <span className="font-normal text-fg-2"> · {one}</span> : null}
                </b>
                <span className="shrink-0 font-num text-[0.75rem] text-fg-3">{r.harvestDate ? dmy(r.harvestDate) : t("vr.running")}</span>
              </div>
              <span className={r.gPerPlant != null ? "text-[0.8125rem] text-fg-2" : "text-[0.8125rem] text-fg-3"} data-per-plant>
                <NumText>
                  {[
                    r.gPerPlant != null ? t(r.gPerPlantSrc === "plants" ? "vr.perPlant" : "vr.perPlantCycle", { g: num(r.gPerPlant, r.gPerPlant % 1 ? 1 : 0) }) : t("vr.perPlantMissing"),
                    wd ? t("vr.flower", { w: wd.w, d: wd.d }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </NumText>
              </span>
              {strip.length > 0 && (
                <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4" data-strip>
                  {strip.slice(-8).map((w) => (
                    <StripThumb key={w.monday} w={w} on={false} onClick={() => navigate({ tab: "journal", strip: r.cycle.id, ...(one ? { plant: one } : {}) }, { push: true })} />
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-x-4">
                {r.harvestDate && (
                  <button type="button" className={tertiary} onClick={() => navigate({ tab: "journal", review: r.cycle.id }, { push: true })} data-review>
                    {t("vr.review")}
                  </button>
                )}
                {strip.length > 0 && (
                  <button type="button" className={tertiary} onClick={() => navigate({ tab: "journal", strip: r.cycle.id, ...(one ? { plant: one } : {}) }, { push: true })} data-strip-open>
                    {t("vr.strip")}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </section>

      <Sheet
        open={!!merge}
        onOpenChange={(o) => !o && setMerge(null)}
        title={t("vr.mergeTitle")}
        dirty={false}
        footer={
          <Button className="h-12 w-full" onClick={doMerge} disabled={busy} id="v-merge-ok">
            {t("vr.mergeOk")}
          </Button>
        }
      >
        {merge && <p className="pb-3 text-[0.875rem] leading-[1.5] text-fg-2" id="v-merge-text">{t("vr.mergeD", { n: plan.cycles.length + plan.plants.length, to: merge })}</p>}
      </Sheet>
    </div>
  )
}
