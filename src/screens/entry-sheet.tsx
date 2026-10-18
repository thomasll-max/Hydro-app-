import { useEffect, useMemo, useRef, useState } from "react"
import { Camera, Loader2, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { AreaField, Computed, Grid, Group, NumField, Seg, Sheet, TagChip, TextField } from "@/components/hydro/form"
import { ConfirmDelete } from "@/components/hydro/confirm"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { blankEntry, CARRIED, derive, entryId, HINTED, previousEntry } from "@/model/entry"
import { ACTION_TAGS, OBS_TAGS, PLANT_IDS, type ActionTag, type Entry, type ObsTag, type PlantId, type Severity } from "@/model/types"
import { parseNum } from "@/calc/formulas"
import { status } from "@/calc/advice"
import { todayIso } from "@/calc/stage"
import type { MessageKey } from "@/i18n/types"

export type EntryInit = { date?: string; plantId?: PlantId }

type NumKey = (typeof CARRIED)[number] | (typeof HINTED)[number]
const NUMS: NumKey[] = [...CARRIED.filter((k) => k !== "mixId"), ...HINTED] as NumKey[]

export function EntrySheet({ open, onOpenChange, init }: { open: boolean; onOpenChange: (o: boolean) => void; init: EntryInit }) {
  const { t, num, range, dm, settings } = useSettings()
  const { cycle, entries, mixes, saveEntry, deleteEntry, targetsFor, uploadPhoto, photoUrl } = useGrow()
  const [date, setDate] = useState(init.date ?? todayIso())
  const [plantId, setPlantId] = useState<PlantId | undefined>(init.plantId)
  const [time, setTime] = useState("")
  const [f, setF] = useState<Partial<Record<NumKey, string>>>({})
  const [mixId, setMixId] = useState<string>("")
  const [obs, setObs] = useState<{ tag: ObsTag; severity: Severity }[]>([])
  const [acts, setActs] = useState<ActionTag[]>([])
  const [photos, setPhotos] = useState<string[]>([])
  const [note, setNote] = useState("")
  const [existing, setExisting] = useState<Entry | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const show = (v: number | undefined) => (v == null ? "" : settings.lang === "fr" ? String(v).replace(".", ",") : String(v))

  // Reset when opened.
  useEffect(() => {
    if (!open) return
    setDate(init.date ?? todayIso())
    setPlantId(init.plantId)
  }, [open, init.date, init.plantId])

  // Load the entry for (date, plant) or prefill a new one from the previous entry.
  const prev = useMemo(() => previousEntry(entries, date, plantId), [entries, date, plantId])
  useEffect(() => {
    if (!open || !cycle || !date) return
    const found = entries.find((e) => e.id === entryId(date, cycle.spaceId ?? "", plantId)) ?? null
    setExisting(found)
    const src = found ?? blankEntry(date, cycle, prev, plantId)
    const nf: Partial<Record<NumKey, string>> = {}
    for (const k of NUMS) nf[k] = show(src[k] as number | undefined)
    setF(nf)
    setMixId(src.mixId ?? (found ? "" : (mixes[0]?.id ?? "")))
    setObs(src.observations ?? [])
    setActs(src.actions ?? [])
    setPhotos(src.photos ?? [])
    setNote(src.note ?? "")
    const d = new Date()
    setTime(found?.time ?? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date, plantId, cycle?.id])

  const build = (): Entry => {
    const base: Entry = existing ?? blankEntry(date, cycle!, undefined, plantId)
    const e: Entry = { ...base, id: entryId(date, cycle!.spaceId ?? "", plantId), date, plantId, time: time || undefined }
    for (const k of NUMS) (e as Record<string, unknown>)[k] = parseNum(f[k])
    e.mixId = mixId || undefined
    e.observations = obs.length ? obs : undefined
    e.actions = acts.length ? acts : undefined
    e.photos = photos.length ? photos : undefined
    e.note = note.trim() || undefined
    return e
  }

  const tg = targetsFor(date)
  const live = cycle ? derive(build(), cycle.leafOffsetC) : null
  const st = (k: "vpd" | "dryback" | "runoffPct" | "dli") => {
    const v = live?.[k]
    const r = tg?.[k]
    return v != null && r ? status(v, r) : undefined
  }
  const fmt = (v: number | undefined, d: number, unit = "") => (v == null ? "—" : `${num(v, d)}${unit}`)

  const set = (k: NumKey) => (v: string) => setF((s) => ({ ...s, [k]: v }))
  const hint = (k: NumKey) => {
    const v = prev?.[k] as number | undefined
    return v == null ? undefined : t("entry.hint", { v: show(v) })
  }
  const nf = (k: NumKey, label: MessageKey, opts: { integer?: boolean } = {}) => (
    <NumField id={`e-${k}`} label={t(label)} value={f[k] ?? ""} onChange={set(k)} placeholder={(HINTED as readonly string[]).includes(k) ? show(prev?.[k] as number | undefined) : undefined} hint={(HINTED as readonly string[]).includes(k) ? hint(k) : undefined} integer={opts.integer} />
  )

  const cycleObs = (tag: ObsTag) =>
    setObs((list) => {
      const cur = list.find((o) => o.tag === tag)
      if (!cur) return [...list, { tag, severity: 1 }]
      if (cur.severity === 3) return list.filter((o) => o.tag !== tag)
      return list.map((o) => (o.tag === tag ? { ...o, severity: (o.severity + 1) as Severity } : o))
    })

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      setUploading((n) => n + 1)
      try {
        const id = await uploadPhoto(file)
        setPhotos((p) => [...p, id])
      } catch (err) {
        toast.error(t("common.saveError", { reason: (err as { message?: string })?.message ?? "photo" }))
      } finally {
        setUploading((n) => n - 1)
      }
    }
  }

  const save = async () => {
    if (!date || !cycle) return
    setBusy(true)
    try {
      await saveEntry(build())
      toast.success(t("entry.saved"))
      onOpenChange(false)
    } catch (err) {
      toast.error(t("common.saveError", { reason: (err as { message?: string })?.message ?? "?" }))
    } finally {
      setBusy(false)
    }
  }

  if (!cycle) return null
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("entry.title")}
      description={existing ? t("entry.existing") : undefined}
      footer={
        <div className="flex gap-2">
          {existing && (
            <ConfirmDelete
              onConfirm={async () => {
                await deleteEntry(existing.id)
                toast(t("common.deleted"))
                onOpenChange(false)
              }}
              trigger={
                <Button variant="outline" size="icon-lg" className="size-12 rounded-full border-line-strong" aria-label={t("entry.deleteEntry")}>
                  <Trash2 className="size-5 text-bad" />
                </Button>
              }
            />
          )}
          <Button onClick={save} disabled={busy || !date || uploading > 0} className="h-12 flex-1 rounded-full text-[15px] font-bold">
            {busy && <Loader2 className="animate-spin" />}
            {t("common.save")}
          </Button>
        </div>
      }
    >
      <Grid>
        <TextField id="e-date" type="date" label={`${t("entry.date")} · ${t("common.required")}`} value={date} onChange={setDate} />
        <TextField id="e-time" type="time" label={t("entry.time")} value={time} onChange={setTime} />
      </Grid>
      <div className="mt-2.5">
        <Seg<string>
          label={t("entry.scope")}
          value={plantId ?? "room"}
          onChange={(v) => setPlantId(v === "room" ? undefined : (v as PlantId))}
          options={[{ value: "room", label: t("common.room") }, ...PLANT_IDS.map((p) => ({ value: p, label: p }))]}
        />
      </div>

      <div className="sticky top-0 z-10 -mx-4 mt-3 bg-background/95 px-4 py-2 backdrop-blur">
        <div className="grid grid-cols-4 gap-1.5" aria-live="polite">
          <Computed label={t("entry.vpd")} value={fmt(live?.vpd, 2)} status={st("vpd")} />
          <Computed label={t("entry.dryback")} value={fmt(live?.dryback, 0, " %")} status={st("dryback")} />
          <Computed label={t("entry.runoffPct")} value={fmt(live?.runoffPct, 0, " %")} status={st("runoffPct")} />
          <Computed label={t("entry.dli")} value={fmt(live?.dli, 1)} status={st("dli")} />
        </div>
      </div>

      <Group title={t("entry.climate")}>
        <Grid cols={3}>
          {nf("tempDay", "entry.tempDay")}
          {nf("tempNight", "entry.tempNight")}
          {nf("rh", "entry.rh")}
        </Grid>
      </Group>
      <Group title={t("entry.irrigation")} aside={tg?.dryback && <span className="text-[11px] text-fg-3">{t("today.dryback")} {range(tg.dryback.lo, tg.dryback.hi)} %</span>}>
        <Grid>
          {nf("weightMorningKg", "entry.weightMorning")}
          {nf("weightPeakKg", "entry.weightPeak")}
          {nf("runoffMl", "entry.runoffMl", { integer: true })}
          {nf("sensorPct", "entry.sensorPct")}
        </Grid>
      </Group>
      <Group title={t("entry.runoffSection")} aside={tg?.phRunoff && <span className="text-[11px] text-fg-3">pH {range(tg.phRunoff.lo, tg.phRunoff.hi, 1)}</span>}>
        <Grid>
          {nf("ecRunoff", "entry.ecRunoff")}
          {nf("phRunoff", "entry.phRunoff")}
        </Grid>
      </Group>
      <Group title={t("entry.plant")}>
        <Grid>{nf("heightCm", "entry.height")}</Grid>
      </Group>

      <Accordion type="single" collapsible className="mt-3 rounded-lg border border-line bg-surface px-3">
        <AccordionItem value="carried" className="border-0">
          <AccordionTrigger className="py-3 text-[13px] font-semibold hover:no-underline">{t("entry.carried")}</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3 pb-3">
            <Grid>
              {nf("volumePerPotMl", "entry.volumePerPot", { integer: true })}
              {nf("shots", "entry.shots", { integer: true })}
              {nf("ecIn", "entry.ecIn")}
              {nf("phIn", "entry.phIn")}
            </Grid>
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-fg-2">{t("entry.mix")}</span>
              <Seg<string>
                label={t("entry.mix")}
                value={mixId || "none"}
                onChange={(v) => setMixId(v === "none" ? "" : v)}
                options={[{ value: "none", label: t("entry.noMix") }, ...mixes.slice(0, 3).map((m) => ({ value: m.id, label: `${dm(m.date)} · ${num(m.volumeL)} L` }))]}
              />
            </div>
            <Grid>
              {nf("lightPct", "entry.lightPct", { integer: true })}
              {nf("lightHeightCm", "entry.lightHeight", { integer: true })}
              {nf("ppfd", "entry.ppfd", { integer: true })}
              {nf("photoperiodH", "entry.photoperiod")}
              {nf("leafOffsetC", "entry.leafOffset")}
            </Grid>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Group title={t("entry.observations")} aside={<span className="text-[10.5px] text-fg-3">{t("entry.severityHint")}</span>}>
        <div className="flex flex-wrap gap-2">
          {OBS_TAGS.map((tag) => {
            const cur = obs.find((o) => o.tag === tag)
            return <TagChip key={tag} label={t(`obs.${tag}`)} on={!!cur} level={cur?.severity} onClick={() => cycleObs(tag)} />
          })}
        </div>
      </Group>
      <Group title={t("entry.actions")}>
        <div className="flex flex-wrap gap-2">
          {ACTION_TAGS.map((a) => (
            <TagChip key={a} label={t(`action.${a}`)} on={acts.includes(a)} onClick={() => setActs((l) => (l.includes(a) ? l.filter((x) => x !== a) : [...l, a]))} />
          ))}
        </div>
      </Group>
      <Group title={t("entry.photos")}>
        <div className="flex flex-wrap gap-2">
          {photos.map((id) => (
            <PhotoThumb key={id} id={id} url={photoUrl} onRemove={() => setPhotos((p) => p.filter((x) => x !== id))} />
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line-strong text-[11.5px] font-semibold text-fg-2"
          >
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
            {uploading ? t("entry.uploading") : t("entry.addPhoto")}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files).finally(() => (e.target.value = ""))} />
        </div>
      </Group>
      <Group title={t("entry.note")}>
        <AreaField id="e-note" label={t("entry.note")} value={note} onChange={setNote} placeholder={t("entry.notePlaceholder")} />
      </Group>
    </Sheet>
  )
}

export function PhotoThumb({ id, url, onRemove, size = 80 }: { id: string; url: (id: string) => Promise<string>; onRemove?: () => void; size?: number }) {
  const [src, setSrc] = useState("")
  useEffect(() => {
    let live = true
    url(id).then((u) => live && setSrc(u))
    return () => {
      live = false
    }
  }, [id, url])
  return (
    <div className="relative shrink-0 overflow-hidden rounded-md border border-line bg-surface-2" style={{ width: size, height: size }}>
      {src && <img src={src} alt="" className="size-full object-cover" loading="lazy" />}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="×" className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}
