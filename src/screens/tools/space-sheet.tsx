// Add / edit a space: template, colour, room, inside dimensions (area, volume), modules, own nutrition settings.
import { useEffect, useState } from "react"
import { Archive, ArchiveRestore, Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Grid, Group, NumField, Seg, Sheet, TextField } from "@/components/hydro/form"
import { spaceColor } from "@/components/hydro/space-pill"
import { useSettings } from "@/app/settings-context"
import { newId, useGrow } from "@/app/grow-context"
import { SaveBar, useSaver, useShow } from "@/screens/sheets"
import { parseNum } from "@/calc/formulas"
import { todayIso } from "@/calc/stage"
import { areaM2, volumeM3 } from "@/equipment/calc"
import { MODULES, SPACE_COLORS, TEMPLATES, modulesFor, type Space, type TemplateId } from "@/model/grow"
import { archiveSpace, duplicateSpace, newSpace } from "@/model/grow-ops"
import { cn } from "@/lib/utils"
import { SwitchRow } from "./equipment-shared"
import { NutritionFields } from "./nutrition-settings"

export function SpaceSheet({ open, onOpenChange, space }: { open: boolean; onOpenChange: (o: boolean) => void; space?: Space }) {
  const { t, num } = useSettings()
  const { allSpaces, sites, grow, assignments, saveSpace, addAssignment } = useGrow()
  const show = useShow()
  const [s, setS] = useState<Space>(() => newSpace({ id: "x", name: "", template: "flower", order: 0, now: "" }))
  const [dims, setDims] = useState({ l: "", w: "", h: "" })
  const [own, setOwn] = useState(false)
  const { busy, run } = useSaver(() => onOpenChange(false))

  useEffect(() => {
    if (!open) return
    const base = space ?? newSpace({ id: newId("sp"), name: "", template: "flower", order: allSpaces.length, now: new Date().toISOString() })
    setS(base)
    setDims({ l: show(base.dimensionsCm?.l), w: show(base.dimensionsCm?.w), h: show(base.dimensionsCm?.h) })
    setOwn(!!base.nutrition && Object.keys(base.nutrition).length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const d = { l: parseNum(dims.l), w: parseNum(dims.w), h: parseNum(dims.h) }
  const area = areaM2(d)
  const vol = volumeM3(d)
  const build = (): Space => {
    const out: Space = { ...s, name: s.name.trim() }
    const dc = Object.fromEntries(Object.entries(d).filter(([, v]) => v != null))
    if (Object.keys(dc).length) out.dimensionsCm = dc
    else delete out.dimensionsCm
    if (!own) delete out.nutrition
    else out.nutrition = { ...(grow?.nutrition ?? {}), ...(s.nutrition ?? {}) }
    return out
  }
  const save = () =>
    run(async () => {
      const next = build()
      if (!next.name) throw new Error(t("space.name"))
      await saveSpace(next)
    })
  const duplicate = () =>
    run(async () => {
      const src = build()
      let n = 0
      const d2 = duplicateSpace(src, { id: newId("sp"), name: t("space.copyName", { name: src.name }), order: allSpaces.length, now: new Date().toISOString(), date: todayIso() }, assignments, () => `${newId("as")}${++n}`)
      await saveSpace(d2.space)
      for (const a of d2.assignments) await addAssignment(a)
      toast.success(t("space.duplicated"))
    })
  const archive = () =>
    run(async () => {
      await saveSpace(archiveSpace(build(), !s.archived, new Date().toISOString()))
      if (!s.archived) toast.success(t("space.archivedToast"))
    })

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={space ? t("space.edit") : t("space.new")} footer={<SaveBar busy={busy} onSave={save} />}>
      <Group title={t("space.name")}>
        <TextField id="sp-name" label={`${t("space.name")} · ${t("common.required")}`} value={s.name} onChange={(v) => setS((x) => ({ ...x, name: v }))} />
      </Group>
      <Group title={t("space.template")}>
        <div className="grid grid-cols-3 gap-1.5">
          {TEMPLATES.map((tp) => (
            <button
              key={tp}
              type="button"
              aria-pressed={s.template === tp}
              onClick={() => setS((x) => ({ ...x, template: tp as TemplateId, modules: space ? x.modules : modulesFor(tp) }))}
              className={cn("h-11 rounded-md border text-[13px] font-semibold", s.template === tp ? "border-primary/45 bg-primary/10 text-fg" : "border-line bg-surface-2 text-fg-2")}
            >
              {t(`template.${tp}`)}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11.5px] text-fg-3">{t("space.templateHint")}</p>
      </Group>
      <Group title={t("space.color")}>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("space.color")}>
          {SPACE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={s.color === c}
              aria-label={c}
              onClick={() => setS((x) => ({ ...x, color: c }))}
              className={cn("size-10 rounded-full border-2 transition-transform", s.color === c ? "scale-105 border-fg" : "border-transparent")}
              style={{ background: spaceColor(c) }}
            />
          ))}
        </div>
      </Group>
      {sites.length > 0 && (
        <Group title={t("space.site")}>
          <Seg<string>
            label={t("space.site")}
            value={s.siteId ?? "none"}
            onChange={(v) => setS((x) => ({ ...x, siteId: v === "none" ? undefined : v }))}
            options={[{ value: "none", label: t("space.noSite") }, ...sites.map((x) => ({ value: x.id, label: x.name }))]}
          />
        </Group>
      )}
      <Group title={t("space.dims")} aside={<span className="text-[11.5px] text-fg-3 tabular">{area.ok ? `${num(area.value, 2)} m²` : ""}{vol.ok ? ` · ${num(vol.value, 2)} m³` : ""}</span>}>
        <Grid cols={3}>
          <NumField id="sp-l" integer label={t("space.l")} value={dims.l} onChange={(v) => setDims((x) => ({ ...x, l: v }))} />
          <NumField id="sp-w" integer label={t("space.w")} value={dims.w} onChange={(v) => setDims((x) => ({ ...x, w: v }))} />
          <NumField id="sp-h" integer label={t("space.h")} value={dims.h} onChange={(v) => setDims((x) => ({ ...x, h: v }))} />
        </Grid>
      </Group>
      <Group title={t("space.modules")}>
        <div className="rounded-md border border-line bg-surface px-3">
          {MODULES.map((m) => (
            <SwitchRow key={m} id={`sp-m-${m}`} label={t(`module.${m}`)} checked={!!s.modules[m]} onChange={(v) => setS((x) => ({ ...x, modules: { ...x.modules, [m]: v } }))} />
          ))}
        </div>
        <p className="mt-1.5 text-[11.5px] text-fg-3">{t("space.modulesD")}</p>
      </Group>
      {s.modules.nutrition && (
        <Group title={t("space.nutrition")}>
          <Seg<"inherit" | "own">
            label={t("space.nutrition")}
            value={own ? "own" : "inherit"}
            onChange={(v) => setOwn(v === "own")}
            options={[
              { value: "inherit", label: t("space.inherit") },
              { value: "own", label: t("space.custom") },
            ]}
          />
          {own && (
            <div className="mt-2.5">
              <NutritionFields value={{ ...(grow?.nutrition ?? { line: "athena-pro", addons: [], dosing: "conc226" }), ...(s.nutrition ?? {}) }} onChange={(n) => setS((x) => ({ ...x, nutrition: n }))} idPrefix="sp" />
            </div>
          )}
        </Group>
      )}
      {space && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={duplicate} disabled={busy} className="h-11 rounded-full border-line-strong text-[13.5px] font-semibold">
            <Copy className="size-4" /> {t("space.duplicate")}
          </Button>
          <Button variant="outline" onClick={archive} disabled={busy} className="h-11 rounded-full border-line-strong text-[13.5px] font-semibold">
            {s.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />} {s.archived ? t("space.unarchive") : t("space.archive")}
          </Button>
        </div>
      )}
    </Sheet>
  )
}
