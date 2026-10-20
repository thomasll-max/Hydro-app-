import { useEffect, useMemo, useRef, useState } from "react"
import { AlarmClockPlus, Camera, Loader2, MoreHorizontal, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { AreaField, Grid, Group, NumField, Seg, Sheet, TagChip, TextField } from "@/components/hydro/form"
import { ConfirmDelete } from "@/components/hydro/confirm"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { blankEntry, CARRIED, derive, drybackMethodOf, entryHasContent, entryId, HINTED, previousEntry, resumeFrom } from "@/model/entry"
import { ACTION_TAGS, OBS_TAGS, PLANT_IDS, type ActionTag, type Entry, type ObsTag, type PlantId, type Severity } from "@/model/types"
import { equipmentAt } from "@/equipment/calc"
import { SwitchRow } from "@/screens/tools/equipment-shared"
import { badNums, parseNum } from "@/calc/formulas"
import { bandCell, bandKeys, type BandKey } from "@/calc/entry-day"
import { NNBSP } from "@/components/hydro/value"
import { InfoTip, type Term } from "@/components/hydro/info"
import { iconButton } from "@/components/hydro/styles"
import { cn } from "@/lib/utils"
import { addDays, todayIso } from "@/calc/stage"
import type { MessageKey } from "@/i18n/types"

/** `values`: measurements already typed in the quick entry, carried into the full one (lot 10d). */
export type EntryInit = { date?: string; plantId?: PlantId; spaceId?: string; values?: Partial<Record<string, string>> }

type NumKey = (typeof CARRIED)[number] | (typeof HINTED)[number]
const NUMS: NumKey[] = [...CARRIED.filter((k) => k !== "mixId"), ...HINTED] as NumKey[]

/** The glossary entry of each result of the band (lot 10e2: the jargon keeps its explanation). */
const BAND_TERM: Record<BandKey, Term> = { dryback: "dryback", drybackSensor: "drybackSensor", runoffPct: "runoff", vpd: "vpd", dli: "dli" }

export function EntrySheet({ open, onOpenChange, init }: { open: boolean; onOpenChange: (o: boolean) => void; init: EntryInit }) {
  const { t, num, range, dm, show, locale } = useSettings()
  const ed = useEditors()
  const { spaces, space: curSpace, all, cycleIn, equipment, assignments, saveEntry, deleteEntry, targetsFor, uploadPhoto, photoUrl, deletePhotos } = useGrow()
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
  // Lot 10l2: date and time behind « modifier », space and plant behind « tout l'espace ▾ », Rappel and Supprimer in « ⋯ ».
  const [whenOpen, setWhenOpen] = useState(false)
  const [scopeOpen, setScopeOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [askDelete, setAskDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menuOpen) return
    const away = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("pointerdown", away)
    return () => document.removeEventListener("pointerdown", away)
  }, [menuOpen])
  const fileRef = useRef<HTMLInputElement>(null)
  // Photos sent during this visit: removed again if the sheet closes without saving (lot 10a, no orphan files).
  const fresh = useRef<Set<string>>(new Set())
  // What was typed or picked since the sheet opened: kept when the date, the plant or the space changes (lot 10d).
  const typed = useRef<Set<string>>(new Set())
  const opened = useRef(false)
  const touch = (k: string) => typed.current.add(k)
  useEffect(() => {
    if (open) return
    opened.current = false
    const left = [...fresh.current]
    fresh.current = new Set()
    if (left.length) deletePhotos(left)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps


  // Reset when opened.
  useEffect(() => {
    if (!open) return
    setDate(init.date ?? todayIso())
    setPlantId(init.plantId)
    setWhenOpen(false)
    setScopeOpen(false)
    setMenuOpen(false)
    setSpaceId(init.spaceId ?? curSpace?.id ?? spaces[0]?.id ?? "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, init.date, init.plantId, init.spaceId])

  // Load the entry for (date, plant) or prefill a new one from the previous entry.
  const prev = useMemo(() => previousEntry(entries, date, plantId), [entries, date, plantId])
  useEffect(() => {
    if (!open || !space || !date) return
    const carried = Object.entries(init.values ?? {}).filter(([k, v]) => (NUMS as string[]).includes(k) && v?.trim())
    if (!opened.current) {
      opened.current = true
      typed.current = new Set(carried.map(([k]) => k))
    }
    const keep = typed.current
    const found = entries.find((e) => e.id === entryId(date, space.id, plantId)) ?? null
    setExisting(found)
    const src = found ?? blankEntry(date, { spaceId: space.id, cycle }, prev, plantId)
    if (!keep.has("domeOn")) setDomeOn(!!src.domeOn)
    setF((cur) => {
      const nf: Partial<Record<NumKey, string>> = {}
      for (const k of NUMS) nf[k] = keep.has(k) ? cur[k] : show(src[k] as number | undefined)
      for (const [k, v] of carried) if (!cur[k as NumKey]) nf[k as NumKey] = v
      return nf
    })
    if (!keep.has("mixId")) setMixId(src.mixId ?? (found ? "" : (mixes[0]?.id ?? "")))
    if (!keep.has("obs")) setObs(src.observations ?? [])
    if (!keep.has("acts")) setActs(src.actions ?? [])
    if (!keep.has("photos")) setPhotos(src.photos ?? [])
    if (!keep.has("note")) setNote(src.note ?? "")
    // An entry saved again keeps its own time (or none); a new one of today takes the current time (lot 10d).
    const d = new Date()
    const now = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    if (!keep.has("time")) setTime(found ? (found.time ?? "") : date === todayIso() ? now : "")
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

  const set = (k: NumKey) => (v: string) => {
    touch(k)
    setF((s) => ({ ...s, [k]: v }))
  }
  // Fields on screen this render that show yesterday's value in grey: what "Reprendre hier" fills.
  const greyed: (typeof HINTED)[number][] = []
  const resume = () => {
    const r = resumeFrom(f as Partial<Record<(typeof HINTED)[number], string>>, prev, greyed, show)
    if (!r.filled.length) return
    r.filled.forEach(touch)
    setF((s) => ({ ...s, ...r.values }))
    toast(t("entry.resumed"))
  }
  const hint = (k: NumKey) => {
    const v = prev?.[k] as number | undefined
    return v == null ? undefined : t("entry.hint", { v: show(v) })
  }
  const nf = (k: NumKey, label: MessageKey, opts: { integer?: boolean } = {}) => {
    if ((HINTED as readonly string[]).includes(k) && prev?.[k] != null) greyed.push(k as (typeof HINTED)[number])
    const hinted = (HINTED as readonly string[]).includes(k)
    return (
      <NumField
        id={`e-${k}`}
        label={t(label)}
        value={f[k] ?? ""}
        onChange={set(k)}
        ghost={hinted && prev?.[k] != null ? show(prev[k] as number) : undefined}
        hint={hinted ? hint(k) : undefined}
        hintMono
        integer={opts.integer}
        unit={k === "ecIn" || k === "ecRunoff" ? "mS/cm" : undefined}
      />
    )
  }

  const cycleObs = (tag: ObsTag) => {
    touch("obs")
    setObs((list) => {
      const cur = list.find((o) => o.tag === tag)
      if (!cur) return [...list, { tag, severity: 1 }]
      if (cur.severity === 3) return list.filter((o) => o.tag !== tag)
      return list.map((o) => (o.tag === tag ? { ...o, severity: (o.severity + 1) as Severity } : o))
    })
  }

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      setUploading((n) => n + 1)
      try {
        const id = await uploadPhoto(file)
        fresh.current.add(id)
        touch("photos")
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
    if (!date || !space || busy) return
    if (badNums(f).length) return toast.error(t("safe.fixFields"))
    const e = build()
    if (!entryHasContent(e, blankEntry(date, { spaceId: space.id, cycle }, prev, plantId))) return toast.error(t(existing ? "safe.emptyEntryExisting" : "safe.emptyEntry"))
    setBusy(true)
    try {
      await saveEntry(e)
      // Photos taken off this entry are removed from the device / the artifact once the entry no longer lists them.
      const kept = new Set(e.photos ?? [])
      const dropped = [...(existing?.photos ?? []), ...fresh.current].filter((id) => !kept.has(id))
      fresh.current = new Set()
      if (dropped.length) deletePhotos(dropped)
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
  // The band of results, computed while typing (lot 10l2): « plante » in target, « à surveiller » out, « — » missing.
  const band = bandKeys(space.modules, method)
  const bandLabel: Record<BandKey, string> = { dryback: t("entry.dryback"), drybackSensor: t("entry.drybackSensor"), runoffPct: t("entry.runoffPct"), vpd: t("entry.vpd"), dli: t("entry.dli") }
  const bandText = (k: BandKey, v: number) => (k === "vpd" ? num(v, 2) : k === "dli" ? num(v, 1) : `${num(v)}${NNBSP}%`)
  const choose = spaces.length > 1 || (on("plants") && !!cycle)
  const dayLabel = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${date || todayIso()}T12:00:00`))
  // What the folded line holds, said on it (« hauteur · reste du bidon »).
  const moreList = [on("plants") && t("entry.moreHeight"), hasReservoir && t("entry.moreReservoir")].filter(Boolean).join(" · ") || t("entry.moreSettings")
  // The fields first: they list the faint values « Reprendre hier » can take.
  const fields = (
    <>
      {on("irrigation") && (
        <>
          <Group
            id="e-sec-water"
            title={t("entry.irrigation")}
            aside={
              method === "weight" && tg?.dryback ? (
                <span className="text-[0.78125rem] font-medium text-fg-3">{t("entry.targetDryback", { range: range(tg.dryback.lo, tg.dryback.hi) })}</span>
              ) : bySensor ? (
                <span className="text-[0.78125rem] font-medium text-fg-3">{sensorLabel}</span>
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
              <p className="mt-1.5 text-[0.75rem] leading-snug text-fg-3" id="e-sensor-scale">
                {t("entry.sensorScale")}
              </p>
            )}
          </Group>
          <Group id="e-sec-runoff" title={t("entry.runoffSection")} aside={tg?.phRunoff && <span className="text-[0.78125rem] font-medium text-fg-3">{t("entry.targetPh", { range: range(tg.phRunoff.lo, tg.phRunoff.hi, 1) })}</span>}>
            <Grid>
              {nf("ecRunoff", "entry.ecRunoff")}
              {nf("phRunoff", "entry.phRunoff")}
            </Grid>
          </Group>
        </>
      )}
      {on("climate") && (
        <Group id="e-sec-climate" title={t("entry.climate")}>
          <Grid cols={3}>
            {nf("tempDay", "entry.tempDay")}
            {nf("tempNight", "entry.tempNight")}
            {nf("rh", "entry.rh")}
          </Grid>
        </Group>
      )}
      {on("propagation") && (
        <Group id="e-sec-propagation" title={t("entry.propagation")}>
          <Grid>
            {nf("sownCount", "entry.sown", { integer: true })}
            {nf("germinatedCount", "entry.germinated", { integer: true })}
          </Grid>
          <div className="mt-2 border-y border-line">
            <SwitchRow
              id="e-dome"
              label={t("entry.dome")}
              checked={domeOn}
              onChange={(v) => {
                touch("domeOn")
                setDomeOn(v)
              }}
            />
          </div>
        </Group>
      )}

      {/* One folded line: the plant, the reservoir and the settings carried from the day before. */}
      <Accordion type="single" collapsible className="mt-5 border-y border-line">
        <AccordionItem value="more" className="border-0">
          <AccordionTrigger id="e-more" className="py-3 text-[0.90625rem] font-semibold hover:no-underline">
            <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
              <span>{t("entry.more")}</span>
              <span className="text-[0.78125rem] font-normal text-fg-3">{moreList}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3 pb-3">
            {(hasReservoir || on("plants")) && (
              <Grid>
                {on("plants") && nf("heightCm", "entry.height")}
                {hasReservoir && nf("reservoirL", "entry.reservoirL")}
              </Grid>
            )}
            {(on("irrigation") || on("nutrition")) && (
              <Grid>
                {on("irrigation") && nf("volumePerPotMl", "entry.volumePerPot", { integer: true })}
                {on("irrigation") && nf("shots", "entry.shots", { integer: true })}
                {on("nutrition") && nf("ecIn", "entry.ecIn")}
                {on("nutrition") && nf("phIn", "entry.phIn")}
              </Grid>
            )}
            {on("nutrition") && (
              <div className="flex flex-col gap-1">
                <span className="text-[0.75rem] font-medium text-fg-2">{t("entry.mix")}</span>
                <Seg<string>
                  label={t("entry.mix")}
                  value={mixId || "none"}
                  onChange={(v) => {
                    touch("mixId")
                    setMixId(v === "none" ? "" : v)
                  }}
                  options={[{ value: "none", label: t("entry.noMix") }, ...mixes.slice(0, 3).map((m) => ({ value: m.id, label: `${dm(m.date)} · ${num(m.volumeL)} L` }))]}
                />
              </div>
            )}
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

      <Group title={t("entry.observations")} aside={<span className="text-[0.75rem] text-fg-3">{t("entry.severityHint")}</span>}>
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
            <TagChip
              key={a}
              label={t(`action.${a}`)}
              on={acts.includes(a)}
              onClick={() => {
                touch("acts")
                setActs((l) => (l.includes(a) ? l.filter((x) => x !== a) : [...l, a]))
              }}
            />
          ))}
        </div>
      </Group>
      <Group title={t("entry.photos")}>
        <div className="flex flex-wrap gap-2">
          {photos.map((id) => (
            <PhotoThumb
              key={id}
              id={id}
              url={photoUrl}
              onRemove={() => {
                touch("photos")
                setPhotos((p) => p.filter((x) => x !== id))
              }}
            />
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line-strong text-[0.75rem] font-semibold text-fg-2"
          >
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
            {uploading ? t("entry.uploading") : t("entry.addPhoto")}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files).finally(() => (e.target.value = ""))} />
        </div>
      </Group>
      <Group title={t("entry.note")}>
        <AreaField
          id="e-note"
          label={t("entry.note")}
          value={note}
          onChange={(v) => {
            touch("note")
            setNote(v)
          }}
          placeholder={t("entry.notePlaceholder")}
        />
      </Group>
    </>
  )
  // « Reprendre hier » while a field on screen still shows yesterday's value faint.
  const ghostsLeft = greyed.some((k) => !(f[k] ?? "").trim())
  const link = "font-semibold text-fg-2 underline decoration-water decoration-[1.5px] underline-offset-[3px] hover:text-fg"
  return (
    <>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title={t("entry.titleFor", { space: space.name })}
        big
        // Values carried from the quick entry are not saved yet: closing asks first.
        dirty={Object.values(init.values ?? {}).some((x) => x?.trim()) || undefined}
        head={
          <div className="mt-1 text-[0.8125rem] leading-snug text-fg-3" id="e-head">
            <span className="font-num font-medium">{dayLabel}</span>
            {time && (
              <>
                {" · "}
                <span className="font-num font-medium">{time}</span>
              </>
            )}{" "}
            <button type="button" id="e-when" aria-expanded={whenOpen} onClick={() => setWhenOpen((x) => !x)} className={cn("hit", link)}>
              {t("entry.edit")}
            </button>
            {choose && (
              <>
                {" · "}
                <button type="button" id="e-scope" aria-expanded={scopeOpen} onClick={() => setScopeOpen((x) => !x)} className={cn("hit", link)}>
                  {plantId ?? t("entry.scopeAll")} ▾
                </button>
              </>
            )}
            {existing && <span className="block">{t("entry.existing")}</span>}
          </div>
        }
        actions={
          <div className="relative -mt-1" ref={menuRef}>
            <button type="button" id="e-menu" aria-label={t("entry.menu")} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((x) => !x)} className={iconButton}>
              <MoreHorizontal className="size-5" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute top-11 right-0 z-30 flex w-[244px] flex-col rounded-[14px] border border-line-strong bg-surface p-1.5 shadow-card">
                <button
                  type="button"
                  role="menuitem"
                  id="e-remind"
                  disabled={busy || !date || uploading > 0}
                  onClick={() => {
                    setMenuOpen(false)
                    save(true)
                  }}
                  className="flex min-h-11 items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[0.875rem] font-semibold hover:bg-surface-2 disabled:opacity-50"
                >
                  <AlarmClockPlus className="size-4.5 shrink-0" /> {t("entry.saveRemind")}
                </button>
                {existing && (
                  <button
                    type="button"
                    role="menuitem"
                    id="e-delete"
                    onClick={() => {
                      setMenuOpen(false)
                      setAskDelete(true)
                    }}
                    className="flex min-h-11 items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[0.875rem] font-semibold text-bad hover:bg-surface-2"
                  >
                    <Trash2 className="size-4.5 shrink-0" /> {t("entry.deleteEntry")}
                  </button>
                )}
              </div>
            )}
          </div>
        }
        footer={
          <Button id="e-save" onClick={() => save()} disabled={busy || !date || uploading > 0} className="h-12 w-full">
            {busy && <Loader2 className="animate-spin" />}
            {t("common.save")}
          </Button>
        }
      >
        {whenOpen && (
          <div className="mb-2" id="e-when-panel">
            <Grid>
              <TextField id="e-date" type="date" label={`${t("entry.date")} · ${t("common.required")}`} value={date} onChange={setDate} />
              <TextField
                id="e-time"
                type="time"
                label={t("entry.time")}
                value={time}
                onChange={(v) => {
                  touch("time")
                  setTime(v)
                }}
              />
            </Grid>
          </div>
        )}
        {scopeOpen && (
          <div className="mb-2 flex flex-col gap-2.5" id="e-scope-panel">
            {spaces.length > 1 && <Seg<string> label={t("entry.space")} value={space.id} onChange={setSpaceId} options={spaces.map((x) => ({ value: x.id, label: x.name }))} />}
            {on("plants") && cycle && (
              <Seg<string>
                label={t("entry.scope")}
                value={plantId ?? "room"}
                onChange={(v) => setPlantId(v === "room" ? undefined : (v as PlantId))}
                options={[{ value: "room", label: t("entry.wholeSpace") }, ...plantIds.map((p) => ({ value: p, label: p }))]}
              />
            )}
          </div>
        )}
        {band.length > 0 && (
          <div
            id="e-band"
            aria-live="polite"
            className="sticky top-0 z-10 -mx-4 grid gap-2 border-y border-line bg-surface px-4 py-2.5"
            style={{ gridTemplateColumns: `repeat(${band.length}, minmax(0, 1fr))` }}
          >
            {band.map((k) => {
              const c = bandCell(k, live, tg)
              return (
                <div key={k} className="flex min-w-0 flex-col gap-0.5" data-band={k} data-status={c.status}>
                  <span className="flex min-w-0 items-center gap-1 text-[0.75rem] text-fg-3">
                    <span className="truncate">{bandLabel[k]}</span>
                    <InfoTip term={BAND_TERM[k]} />
                  </span>
                  <b className={cn("font-num text-[1.125rem] leading-tight font-semibold tabular-nums", c.status === "ok" && "text-leaf-ink", c.status === "warn" && "text-warn", c.status === "bad" && "text-bad")}>
                    {c.value == null ? "—" : bandText(k, c.value)}
                  </b>
                </div>
              )
            })}
          </div>
        )}
        {ghostsLeft && (
          <Button type="button" variant="outline" id="e-resume" onClick={resume} className="mt-4 h-11 w-full text-[0.875rem] font-semibold">
            {t("entry.resume")}
          </Button>
        )}
        {fields}
      </Sheet>
      {existing && (
        <ConfirmDelete
          open={askDelete}
          onOpenChange={setAskDelete}
          onConfirm={async () => {
            await deleteEntry(existing.id)
            if (existing.photos?.length) deletePhotos(existing.photos)
            toast(t("common.deleted"))
            onOpenChange(false)
          }}
        />
      )}
    </>
  )
}

export function PhotoThumb({ id, url, onRemove, size = 80 }: { id: string; url: (id: string) => Promise<string>; onRemove?: () => void; size?: number }) {
  const { t } = useSettings()
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
        <button type="button" onClick={onRemove} aria-label={t("entry.removePhoto")} className="absolute top-0 right-0 flex size-11 items-start justify-end p-1">
          <span className="flex size-6 items-center justify-center rounded-full bg-black/60 text-white">
            <X className="size-3.5" />
          </span>
        </button>
      )}
    </div>
  )
}
