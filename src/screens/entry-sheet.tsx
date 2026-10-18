import { useEffect, useMemo, useRef, useState } from "react"
import { AlarmClockPlus, Camera, Loader2, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { AreaField, Computed, Grid, Group, NumField, Seg, Sheet, TagChip, TextField } from "@/components/hydro/form"
import { ConfirmDelete } from "@/components/hydro/confirm"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { blankEntry, CARRIED, derive, drybackMethodOf, entryId, HINTED, previousEntry } from "@/model/entry"
import { ACTION_TAGS, OBS_TAGS, PLANT_IDS, type ActionTag, type Entry, type ObsTag, type PlantId, type Severity } from "@/model/types"
import { equipmentAt } from "@/equipment/calc"
import { SpaceDot } from "@/components/hydro/space-pill"
import { SwitchRow } from "@/screens/tools/equipment-shared"
import { parseNum } from "@/calc/formulas"
import { status } from "@/calc/advice"
import { addDays, todayIso } from "@/calc/stage"
import type { MessageKey } from "@/i18n/types"

export type EntryInit = { date?: string; plantId?: PlantId; spaceId?: string }

type NumKey = (typeof CARRIED)[number] | (typeof HINTED)[number]
const NUMS: NumKey[] = [...CARRIED.filter((k) => k !== "mixId"), ...HINTED] as NumKey[]

export function EntrySheet({ open, onOpenChange, init }: { open: boolean; onOpenChange: (o: boolean) => void; init: EntryInit }) {
  const { t, num, range, dm, settings } = useSettings()
  const ed = useEditors()
  const { spaces, space: curSpace, all, cycleIn, equipment, assignments, saveEntry, deleteEntry, targetsFor, uploadPhoto, photoUrl } = useGrow()
  const [spaceId, setSpaceId] = useState(init.spaceId ?? curSpace?.id ?? "")
  const space = spaces.find((x) => x.id === spaceId) ?? curSpace ?? null
  const cycle = space ? cycleIn(space.id) : null
  const on = (m: keyof NonNullable<typeof space>["modules"]) => !!space?.modules[m]
  // Dryback method of the space (setting): only its fields are shown.
  const method = drybackMethodOf(space)
  const bySensor = method === "acinfinity" || method === "sensor"
  const sensorLabel = method === "acinfinity" ? "AC Infinity" : space?.irrigation?.sensorName?.trim() || t("entry.sensorOther")
  const entries = useMemo(() => all.entries.filter((e) => e.spaceId === space?.id), [all.entries, space?.id])
  const mixes = useMemo(() => all.mixes.filter((m) => !m.spaceIds || (space && m.spaceIds.includes(space.id)) || (cycle && m.cycleId === cycle.id)), [all.mixes, space, cycle])
  const hasReservoir = useMemo(
    () => (space ? equipmentAt(space.id, todayIso(), assignments).some((a) => equipment.find((x) => x.id === a.equipmentId && x.type === "reservoir" && x.reservoir?.kind !== "runoff")) : false),
    [space, equipment, assignments],
  )
  const [domeOn, setDomeOn] = useState(false)
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
    setSpaceId(init.spaceId ?? curSpace?.id ?? spaces[0]?.id ?? "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, init.date, init.plantId, init.spaceId])

  // Load the entry for (date, plant) or prefill a new one from the previous entry.
  const prev = useMemo(() => previousEntry(entries, date, plantId), [entries, date, plantId])
  useEffect(() => {
    if (!open || !space || !date) return
    const found = entries.find((e) => e.id === entryId(date, space.id, plantId)) ?? null
    setExisting(found)
    const src = found ?? blankEntry(date, { spaceId: space.id, cycle }, prev, plantId)
    setDomeOn(!!src.domeOn)
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
  }, [open, date, plantId, space?.id, cycle?.id])

  const build = (): Entry => {
    const base: Entry = existing ?? blankEntry(date, { spaceId: space!.id, cycle }, undefined, plantId)
    const e: Entry = { ...base, id: entryId(date, space!.id, plantId), date, plantId, time: time || undefined }
    e.domeOn = on("propagation") ? domeOn : base.domeOn
    for (const k of NUMS) (e as Record<string, unknown>)[k] = parseNum(f[k])
    // Values of another method typed on an earlier day stay as they were; the method of the day is recorded.
    if (on("irrigation") && method !== "none") {
      e.drybackMethod = method
      e.sensorName = method === "sensor" ? space!.irrigation?.sensorName?.trim() || undefined : undefined
    }
    e.mixId = mixId || undefined
    e.observations = obs.length ? obs : undefined
    e.actions = acts.length ? acts : undefined
    e.photos = photos.length ? photos : undefined
    e.note = note.trim() || undefined
    return e
  }

  const tg = targetsFor(date, cycle)
  const live = space ? derive(build(), cycle?.leafOffsetC) : null
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

  /** "+ Rappel" saves the entry first, then opens a reminder for this space (next day by default). */
  const save = async (remind = false) => {
    if (!date || !space) return
    setBusy(true)
    try {
      await saveEntry(build())
      toast.success(t("entry.saved"))
      if (remind) ed.openReminder({ spaceId: space.id, date: addDays(date, 1) })
      else onOpenChange(false)
    } catch (err) {
      toast.error(t("common.saveError", { reason: (err as { message?: string })?.message ?? "?" }))
    } finally {
      setBusy(false)
    }
  }

  if (!space) return null
  const plantIds = PLANT_IDS.slice(0, Math.max(1, Math.min(PLANT_IDS.length, cycle?.potCount ?? 4)))
  const computed = [
    on("climate") && <Computed key="v" label={t("entry.vpd")} value={fmt(live?.vpd, 2)} status={st("vpd")} />,
    on("irrigation") && method === "weight" && <Computed key="d" label={t("entry.dryback")} value={fmt(live?.dryback, 0, " %")} status={st("dryback")} />,
    // Sensor scale: no status against Athena's weighing targets.
    on("irrigation") && bySensor && <Computed key="ds" label={t("entry.drybackSensor")} value={fmt(live?.drybackSensor, 0, " %")} />,
    on("irrigation") && <Computed key="r" label={t("entry.runoffPct")} value={fmt(live?.runoffPct, 0, " %")} status={st("runoffPct")} />,
    on("light") && <Computed key="l" label={t("entry.dli")} value={fmt(live?.dli, 1)} status={st("dli")} />,
  ].filter(Boolean)
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
          <Button
            variant="outline"
            onClick={() => save(true)}
            disabled={busy || !date || uploading > 0}
            className="h-12 rounded-full border-line-strong px-4 text-[14px] font-semibold"
            aria-label={`${t("common.save")} + ${t("cal.addShort")}`}
          >
            <AlarmClockPlus className="size-4.5" /> {t("cal.addShort")}
          </Button>
          <Button onClick={() => save()} disabled={busy || !date || uploading > 0} className="h-12 flex-1 rounded-full text-[15px] font-bold">
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
      {spaces.length > 1 && (
        <div className="mt-2.5">
          <Seg<string> label={t("entry.space")} value={space.id} onChange={setSpaceId} options={spaces.map((x) => ({ value: x.id, label: x.name }))} />
        </div>
      )}
      <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-fg-3">
        <SpaceDot color={space.color} /> {cycle ? t("entry.forCycle", { space: space.name, cycle: cycle.name }) : t("entry.noCycle", { space: space.name })}
      </p>
      {on("plants") && cycle && (
        <div className="mt-2.5">
          <Seg<string>
            label={t("entry.scope")}
            value={plantId ?? "room"}
            onChange={(v) => setPlantId(v === "room" ? undefined : (v as PlantId))}
            options={[{ value: "room", label: t("entry.wholeSpace") }, ...plantIds.map((p) => ({ value: p, label: p }))]}
          />
        </div>
      )}

      {computed.length > 0 && (
        <div className="sticky top-0 z-10 -mx-4 mt-3 bg-background/95 px-4 py-2 backdrop-blur">
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${computed.length}, minmax(0, 1fr))` }} aria-live="polite">
            {computed}
          </div>
        </div>
      )}

      {on("climate") && (
        <Group title={t("entry.climate")}>
          <Grid cols={3}>
            {nf("tempDay", "entry.tempDay")}
            {nf("tempNight", "entry.tempNight")}
            {nf("rh", "entry.rh")}
          </Grid>
        </Group>
      )}
      {on("propagation") && (
        <Group title={t("entry.propagation")}>
          <Grid>
            {nf("sownCount", "entry.sown", { integer: true })}
            {nf("germinatedCount", "entry.germinated", { integer: true })}
          </Grid>
          <div className="mt-2 rounded-md border border-line bg-surface px-3">
            <SwitchRow id="e-dome" label={t("entry.dome")} checked={domeOn} onChange={setDomeOn} />
          </div>
        </Group>
      )}
      {on("irrigation") && (
        <>
          <Group
            title={t("entry.irrigation")}
            aside={
              method === "weight" && tg?.dryback ? (
                <span className="text-[11px] text-fg-3">
                  {t("today.dryback")} {range(tg.dryback.lo, tg.dryback.hi)} %
                </span>
              ) : bySensor ? (
                <span className="text-[11px] text-fg-3">{sensorLabel}</span>
              ) : undefined
            }
          >
            <Grid>
              {method === "weight" && nf("weightMorningKg", "entry.weightMorning")}
              {method === "weight" && nf("weightPeakKg", "entry.weightPeak")}
              {bySensor && nf("sensorMorningPct", "entry.sensorMorning")}
              {bySensor && nf("sensorPeakPct", "entry.sensorPeak")}
              {nf("runoffMl", "entry.runoffMl", { integer: true })}
              {f.sensorPct ? nf("sensorPct", "entry.sensorPct") : null}
            </Grid>
            {bySensor && (
              <p className="mt-1.5 text-[11.5px] leading-snug text-fg-3" id="e-sensor-scale">
                {t("entry.sensorScale")}
              </p>
            )}
          </Group>
          <Group title={t("entry.runoffSection")} aside={tg?.phRunoff && <span className="text-[11px] text-fg-3">pH {range(tg.phRunoff.lo, tg.phRunoff.hi, 1)}</span>}>
            <Grid>
              {nf("ecRunoff", "entry.ecRunoff")}
              {nf("phRunoff", "entry.phRunoff")}
            </Grid>
          </Group>
        </>
      )}
      {(hasReservoir || on("plants")) && (
        <Group title={hasReservoir && on("plants") ? `${t("entry.plant")} · ${t("entry.reservoir")}` : hasReservoir ? t("entry.reservoir") : t("entry.plant")}>
          <Grid>
            {on("plants") && nf("heightCm", "entry.height")}
            {hasReservoir && nf("reservoirL", "entry.reservoirL")}
          </Grid>
        </Group>
      )}

      <Accordion type="single" collapsible className="mt-3 rounded-lg border border-line bg-surface px-3">
        <AccordionItem value="carried" className="border-0">
          <AccordionTrigger className="py-3 text-[13px] font-semibold hover:no-underline">{t("entry.carried")}</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3 pb-3">
            {(on("irrigation") || on("nutrition")) && (
              <Grid>
                {on("irrigation") && nf("volumePerPotMl", "entry.volumePerPot", { integer: true })}
                {on("irrigation") && nf("shots", "entry.shots", { integer: true })}
                {on("nutrition") && nf("ecIn", "entry.ecIn")}
                {on("nutrition") && nf("phIn", "entry.phIn")}
              </Grid>
            )}
            {on("nutrition") && <div className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-fg-2">{t("entry.mix")}</span>
              <Seg<string>
                label={t("entry.mix")}
                value={mixId || "none"}
                onChange={(v) => setMixId(v === "none" ? "" : v)}
                options={[{ value: "none", label: t("entry.noMix") }, ...mixes.slice(0, 3).map((m) => ({ value: m.id, label: `${dm(m.date)} · ${num(m.volumeL)} L` }))]}
              />
            </div>}
            <Grid>
              {on("light") && nf("lightPct", "entry.lightPct", { integer: true })}
              {on("light") && nf("lightHeightCm", "entry.lightHeight", { integer: true })}
              {on("light") && nf("ppfd", "entry.ppfd", { integer: true })}
              {on("light") && nf("photoperiodH", "entry.photoperiod")}
              {on("climate") && nf("leafOffsetC", "entry.leafOffset")}
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
