import { useEffect, useMemo, useRef, useState } from "react"
import { AlarmClockPlus, Camera, Loader2, Mic, MoreHorizontal, Tag, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { AreaField, Grid, Group, NumField, Seg, Sheet, TagChip, TextField } from "@/components/hydro/form"
import { ConfirmDelete } from "@/components/hydro/confirm"
import { Notice } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { newId, useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { blankEntry, CARRIED, derive, drybackMethodOf, entryHasContent, entryId, HINTED, previousEntry, resumeFrom } from "@/model/entry"
import { ACTION_TAGS, OBS_TAGS, PLANT_IDS, SCHEMA, type ActionTag, type Entry, type Mix, type ObsTag, type PlantId, type Severity } from "@/model/types"
import type { Space } from "@/model/grow"
import { spaceNutrition } from "@/model/grow-ops"
import { mergeVoice, readVoiceReply, voiceCount, voiceKeys, voicePrompt, type VoiceDoubt, type VoiceKey, type VoiceResult, type VoiceSpace } from "@/calc/voice"
import { parseVoice } from "@/calc/voice-rules"
import { useSample, type SampleError } from "@/lib/sample"
import { VoicePanel } from "./voice-panel"
import { MissingPhoto } from "@/components/hydro/missing-photo"
import { TagsEditor } from "./photo-tags"
import { equipmentAt } from "@/equipment/calc"
import { SwitchRow } from "@/screens/tools/equipment-shared"
import { badNums, parseNum } from "@/calc/formulas"
import { bandCell, bandKeys, topTags, type BandKey } from "@/calc/entry-day"
import { NNBSP } from "@/components/hydro/value"
import { InfoTip, type Term } from "@/components/hydro/info"
import { iconButton, toggle } from "@/components/hydro/styles"
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
  const { t, num, range, dm, show, locale, settings } = useSettings()
  const ed = useEditors()
  const { grow, spaces, space: curSpace, all, cycleIn, equipment, assignments, saveEntry, deleteEntry, restoreEntry, saveMix, deleteMix, targetsFor, uploadPhoto, photoUrl, deletePhotos } = useGrow()
  const sample = useSample()
  const [spaceId, setSpaceId] = useState(init.spaceId ?? curSpace?.id ?? "")
  const space = spaces.find((x) => x.id === spaceId) ?? curSpace ?? null
  const cycle = space ? cycleIn(space.id) : null
  const on = (m: keyof NonNullable<typeof space>["modules"]) => !!space?.modules[m]
  // Dryback method of the space (setting): only its fields are shown.
  const method = drybackMethodOf(space)
  const bySensor = method === "acinfinity" || method === "sensor"
  const sensorLabel = method === "acinfinity" ? "AC Infinity" : space?.irrigation?.sensorName?.trim() || t("entry.sensorOther")
  const entries = useMemo(() => all.entries.filter((e) => e.spaceId === space?.id), [all.entries, space?.id])
  const usedObs = useMemo(() => all.entries.map((e) => (e.observations ?? []).map((o) => o.tag)), [all.entries])
  const usedActs = useMemo(() => all.entries.map((e) => e.actions ?? []), [all.entries])
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
  // Tags of the photos (lot 12b), saved with the entry; the photo whose tags are open.
  const [photoTags, setPhotoTags] = useState<NonNullable<Entry["photoTags"]>>({})
  const [tagging, setTagging] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [existing, setExisting] = useState<Entry | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(0)
  // Lot 10l2: date and time behind « modifier », space and plant behind « tout l'espace ▾ », Rappel and Supprimer in « ⋯ ».
  const [whenOpen, setWhenOpen] = useState(false)
  const [scopeOpen, setScopeOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [askDelete, setAskDelete] = useState(false)
  // Lot 10l2b: the chips used most first, the others behind « +N »; the note and the photos behind one line.
  const [allObs, setAllObs] = useState(false)
  const [allActs, setAllActs] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  // Lot 11: the dictation panel, what Claude doubted (kept until the field is typed again), the words and a tank said aloud.
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [voiceText, setVoiceText] = useState("")
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [voiceErr, setVoiceErr] = useState<string | null>(null)
  const [doubts, setDoubts] = useState<VoiceDoubt[]>([])
  const [dictated, setDictated] = useState("")
  const [voiceMix, setVoiceMix] = useState<VoiceResult["mix"]>()
  const [moreOpen, setMoreOpen] = useState("")
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menuOpen) return
    const away = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("pointerdown", away)
    return () => document.removeEventListener("pointerdown", away)
  }, [menuOpen])
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
    setAllObs(false)
    setAllActs(false)
    setNoteOpen(false)
    setVoiceOpen(false)
    setVoiceText("")
    setVoiceErr(null)
    setDoubts([])
    setDictated("")
    setVoiceMix(undefined)
    setMoreOpen("")
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
    if (!keep.has("photos")) {
      setPhotos(src.photos ?? [])
      setPhotoTags(src.photoTags ?? {})
    }
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
    const tags = Object.fromEntries(Object.entries(photoTags).filter(([id, x]) => photos.includes(id) && (x.obs?.length || x.free?.length)))
    e.photoTags = Object.keys(tags).length ? tags : undefined
    e.note = note.trim() || undefined
    // A dictation went into this entry (lot 11): its trace, the words apart from the note.
    if (dictated) {
      e.source = "voice"
      e.dictation = base.dictation?.trim() ? `${base.dictation.trim()}\n${dictated}` : dictated
    }
    return e
  }

  const tg = targetsFor(date, cycle)
  const live = space ? derive(build(), cycle?.leafOffsetC) : null

  const set = (k: NumKey) => (v: string) => {
    touch(k)
    setF((s) => ({ ...s, [k]: v }))
    // Typed again: the doubt about this field is answered.
    if (doubts.some((d) => d.field === k)) setDoubts((ds) => ds.filter((d) => d.field !== k))
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
  // What a dictation heard and why it is doubtful, in the app's language (the app's reasons are codes).
  const CODE = { space: "voice.codeSpace", plant: "voice.codePlant", number: "voice.codeNumber", unit: "voice.codeUnit", which: "voice.codeWhich", computed: "voice.codeComputed", otherSpace: "voice.codeOtherSpace" } as const
  const why = (d: VoiceDoubt) => (d.code === "range" ? t("voice.codeRange", { min: num(d.min ?? 0), max: num(d.max ?? 0) }) : d.code ? t(CODE[d.code]) : (d.why ?? ""))
  const doubtText = (d?: VoiceDoubt) => (d ? [d.heard ? t("voice.heard", { heard: d.heard }) : "", why(d)].filter(Boolean).join(" · ") : undefined)
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
        doubt={doubtText(doubts.find((d) => d.field === k))}
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
      if (voiceMix) {
        const saved = await saveVoiceMix(space, voiceMix)
        if (saved.created) e.mixId = saved.id
      }
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

  // ---- Dicter (lot 11) ----
  const voiceSpaceOf = (s: Space): VoiceSpace => {
    const c = cycleIn(s.id)
    const tank = equipmentAt(s.id, todayIso(), assignments).some((a) => equipment.find((x) => x.id === a.equipmentId && x.type === "reservoir" && x.reservoir?.kind !== "runoff"))
    return { id: s.id, name: s.name, modules: s.modules, method: drybackMethodOf(s), reservoir: tank, plants: s.modules.plants && c ? PLANT_IDS.slice(0, Math.max(1, Math.min(PLANT_IDS.length, c.potCount ?? 4))) : [] }
  }
  /** The tank of the day completed, or a new one when a volume was said; returns how to put things back. */
  const saveVoiceMix = async (target: Space, said: NonNullable<VoiceResult["mix"]>): Promise<{ id: string; created: boolean; undo: () => Promise<void> }> => {
    const day = all.mixes.find((m) => m.date === date && (m.spaceIds ?? []).includes(target.id))
    if (day) {
      await saveMix({ ...day, ...said })
      return { id: day.id, created: false, undo: () => saveMix(day) }
    }
    const c = cycleIn(target.id)
    const m: Mix = {
      schemaVersion: SCHEMA.mix,
      id: newId("mix"),
      date,
      spaceIds: [target.id],
      ...(c ? { cycleId: c.id } : {}),
      volumeL: said.volumeL!,
      ...(said.ec != null ? { ec: said.ec } : {}),
      ...(said.ph != null ? { ph: said.ph } : {}),
      line: spaceNutrition(grow, target).line,
      createdAt: new Date().toISOString(),
    }
    await saveMix(m)
    return { id: m.id, created: true, undo: () => deleteMix(m.id) }
  }
  /** No doubt: the day's entry is saved at once, merged; « Annuler » for 10 seconds puts everything back. */
  const saveVoice = async (r: VoiceResult, text: string, target: Space) => {
    const c = cycleIn(target.id)
    const id = entryId(date, target.id, r.plantId)
    const before = all.entries.find((e) => e.id === id) ?? null
    const base = before ?? blankEntry(date, { spaceId: target.id, cycle: c }, previousEntry(all.entries.filter((e) => e.spaceId === target.id), date, r.plantId), r.plantId)
    const merged = mergeVoice(base, r, text)
    if (!before && date === todayIso()) {
      const d = new Date()
      merged.time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    }
    const mix = r.mix ? await saveVoiceMix(target, r.mix) : null
    if (mix?.created) merged.mixId = mix.id
    await saveEntry(merged)
    onOpenChange(false)
    toast.success(t("voice.done", { n: voiceCount(r) }), {
      duration: 10_000,
      action: {
        label: t("step.undo"),
        onClick: () => {
          ;(before ? restoreEntry(before) : deleteEntry(id))
            .then(() => mix?.undo())
            .then(
              () => toast(t("voice.undone")),
              (e) => toast.error(t("common.saveError", { reason: (e as Error)?.message ?? "?" })),
            )
        },
      },
    })
  }
  /** Doubts, or « Relire avant d'enregistrer »: nothing is saved, the sheet is filled and the doubtful fields marked. */
  const prefillVoice = (r: VoiceResult, text: string) => {
    if (r.spaceId !== spaceId) setSpaceId(r.spaceId)
    if (r.plantId && r.plantId !== plantId) setPlantId(r.plantId)
    const vals = Object.entries(r.values) as [VoiceKey, number][]
    vals.forEach(([k]) => touch(k))
    if (vals.length) setF((cur) => ({ ...cur, ...Object.fromEntries(vals.map(([k, v]) => [k, show(v)])) }))
    if (r.observations.length) {
      touch("obs")
      setObs((cur) => [...cur.filter((o) => !r.observations.some((x) => x.tag === o.tag)), ...r.observations])
    }
    if (r.actions.length) {
      touch("acts")
      setActs((cur) => [...new Set([...cur, ...r.actions])])
    }
    if (r.note) {
      touch("note")
      setNote((cur) => (cur.trim() ? `${cur.trim()}\n${r.note}` : r.note!))
    }
    setDoubts(r.doubts)
    setVoiceMix(r.mix)
    setDictated(text)
    setVoiceOpen(false)
    // A value or a doubt in the folded line opens it.
    const folded = ["heightCm", "reservoirL", "volumePerPotMl", "shots", "ecIn", "phIn", "lightPct", "lightHeightCm", "ppfd", "photoperiodH"]
    if ([...vals.map(([k]) => k as string), ...r.doubts.map((d) => d.field ?? "")].some((k) => folded.includes(k))) setMoreOpen("more")
  }
  /** Without Claude (lot 11b): the rules read the simple forms; the sheet is always filled to check, never saved at once. */
  const fillByRules = () => {
    const text = voiceText.trim()
    if (!text || !space) return
    setVoiceErr(null)
    const known = spaces.map(voiceSpaceOf)
    const r = parseVoice(text, { open: known.find((v) => v.id === space.id)!, spaces: known, lang: settings.lang })
    if (!voiceCount(r) && !r.doubts.length) return setVoiceErr(t("voice.nothing"))
    prefillVoice(r, text)
  }
  const fillFromVoice = async () => {
    if (!sample) return fillByRules()
    const text = voiceText.trim()
    if (!text || !space || voiceBusy) return
    setVoiceBusy(true)
    setVoiceErr(null)
    const known = spaces.map(voiceSpaceOf)
    const open = known.find((v) => v.id === space.id)!
    try {
      const res = await sample(
        voicePrompt({
          text,
          date,
          open,
          spaces: spaces.map((s) => ({ id: s.id, name: s.name })),
          obsLabels: Object.fromEntries(OBS_TAGS.map((x) => [x, t(`obs.${x}`)])) as Record<ObsTag, string>,
          actionLabels: Object.fromEntries(ACTION_TAGS.map((x) => [x, t(`action.${x}`)])) as Record<ActionTag, string>,
        }),
        { cache: false },
      )
      const read = readVoiceReply(res.text, { open, spaces: known })
      if (!read.ok) return setVoiceErr(t("voice.unreadable"))
      const r = read.result
      const target = spaces.find((s) => s.id === r.spaceId) ?? space
      // A new tank needs its volume: without it, a doubt (nothing is made up).
      if (r.mix && r.mix.volumeL == null && !all.mixes.some((m) => m.date === date && (m.spaceIds ?? []).includes(target.id))) r.doubts.push({ field: "bidon.volumeL", why: t("voice.mixVolume") })
      if (!voiceCount(r) && !r.doubts.length) return setVoiceErr(t("voice.nothing"))
      // Something already typed in the sheet, or the review setting: always through the filled sheet.
      const typedHere = [...typed.current].some((k) => k !== "time")
      if (!r.doubts.length && !settings.voiceReview && !typedHere) await saveVoice(r, text, target)
      else prefillVoice(r, text)
    } catch (e) {
      const x = e as SampleError
      setVoiceErr(x.code === "not_granted" ? t("ask.notGranted") : x.code === "rate_limited" ? t("ask.rateLimited") : t("ask.error"))
    } finally {
      setVoiceBusy(false)
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
  // The 4 observations and the 4 actions used most in all the entries (the usual order on a tie, or without history),
  // plus those already ticked; the others behind « +N ».
  const obsTop = topTags(OBS_TAGS, usedObs)
  const actsTop = topTags(ACTION_TAGS, usedActs)
  const obsShown = allObs ? [...OBS_TAGS] : [...obsTop, ...OBS_TAGS.filter((x) => !obsTop.includes(x) && obs.some((o) => o.tag === x))]
  const actsShown = allActs ? [...ACTION_TAGS] : [...actsTop, ...ACTION_TAGS.filter((x) => !actsTop.includes(x) && acts.includes(x))]
  const obsMore = OBS_TAGS.length - obsShown.length
  const actsMore = ACTION_TAGS.length - actsShown.length
  const noteShown = noteOpen || !!note.trim() || photos.length > 0
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
      <Accordion type="single" collapsible value={moreOpen} onValueChange={setMoreOpen} className="mt-5 border-y border-line">
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

      {/* Ce que tu as vu ou fait (lot 10l2b): the 4 observations and the 4 actions used most, the others behind « +N »;
          then one line « Une note, une photo… » that opens the note and the photos. */}
      <Group id="e-sec-seen" title={t("entry.seen")}>
        <div role="group" aria-label={t("entry.observations")} className="flex flex-wrap gap-2" id="e-obs">
          {obsShown.map((tag) => {
            const cur = obs.find((o) => o.tag === tag)
            return <TagChip key={tag} label={t(`obs.${tag}`)} on={!!cur} level={cur?.severity} onClick={() => cycleObs(tag)} />
          })}
          {obsMore > 0 && (
            <button type="button" id="e-obs-more" onClick={() => setAllObs(true)} aria-label={t("entry.moreTags", { n: obsMore })} className={toggle(false, "border-dashed text-fg-3")}>
              +{obsMore}
            </button>
          )}
        </div>
        {obs.length > 0 && <p className="mt-1.5 text-[0.75rem] leading-snug text-fg-3">{t("entry.severityHint")}</p>}
        <div role="group" aria-label={t("entry.actions")} className="mt-2.5 flex flex-wrap gap-2" id="e-acts">
          {actsShown.map((a) => (
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
          {actsMore > 0 && (
            <button type="button" id="e-acts-more" onClick={() => setAllActs(true)} aria-label={t("entry.moreTags", { n: actsMore })} className={toggle(false, "border-dashed text-fg-3")}>
              +{actsMore}
            </button>
          )}
        </div>
        {!noteShown ? (
          <button type="button" id="e-note-open" onClick={() => setNoteOpen(true)} className="mt-3 flex min-h-[46px] w-full items-center gap-2.5 rounded-[10px] border border-line px-3 text-left text-[0.875rem] text-fg-3 hover:text-fg">
            <Camera className="size-[18px] shrink-0" strokeWidth={1.8} />
            {t("entry.notePhoto")}
          </button>
        ) : (
          <div className="mt-3 flex flex-col gap-3" id="e-note-box">
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
            <div className="flex flex-wrap gap-2">
              {photos.map((id) => (
                <PhotoThumb
                  key={id}
                  id={id}
                  url={photoUrl}
                  tagged={!!(photoTags[id]?.obs?.length || photoTags[id]?.free?.length)}
                  onOpen={() => setTagging(id)}
                  onRemove={() => {
                    touch("photos")
                    setPhotos((p) => p.filter((x) => x !== id))
                  }}
                />
              ))}
              {/* A label of the file field: touching it opens the phone's picker itself (lot 12c: a click sent by code is
                  not always let through in the Claude app). */}
              <label
                className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line-strong text-[0.75rem] font-semibold text-fg-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-water"
                id="e-photo-add"
              >
                {uploading ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
                {uploading ? t("entry.uploading") : t("entry.addPhoto")}
                <input id="e-photo-input" type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onFiles(e.target.files).finally(() => (e.target.value = ""))} />
              </label>
            </div>
          </div>
        )}
        {/* The tags of a photo, from its thumbnail (lot 12b): kept with the entry, saved with it. */}
        <Sheet open={!!tagging} onOpenChange={(o) => !o && setTagging(null)} title={t("ph.tagsOf")} dirty={false} footer={<Button className="h-12 w-full" onClick={() => setTagging(null)}>{t("common.close")}</Button>}>
          {tagging && (
            <div className="flex flex-col gap-3 pb-2">
              <PhotoThumb id={tagging} url={photoUrl} size={120} />
              <TagsEditor
                entry={build()}
                photoId={tagging}
                local={{
                  tags: photoTags[tagging] ?? {},
                  set: (x) => {
                    touch("photos")
                    setPhotoTags((m) => ({ ...m, [tagging]: x }))
                  },
                }}
              />
            </div>
          )}
        </Sheet>
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
        dirty={Object.values(init.values ?? {}).some((x) => x?.trim()) || !!dictated || undefined}
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
            {existing?.dictation && (
              <span className="mt-0.5 line-clamp-2 block" id="e-dictation">
                {t("voice.dictated", { text: existing.dictation })}
              </span>
            )}
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
        {/* « Reprendre hier » and « Dicter » side by side (lot 11: with Claude, or with the rules of lot 11b without it). */}
        <div className="mt-4 flex gap-2.5">
          {ghostsLeft && (
            <Button type="button" variant="outline" id="e-resume" onClick={resume} className="h-11 min-w-0 flex-1 text-[0.875rem] font-semibold">
              {t("entry.resume")}
            </Button>
          )}
          <Button type="button" variant="outline" id="e-dictate" aria-expanded={voiceOpen} onClick={() => setVoiceOpen((x) => !x)} className="h-11 min-w-0 flex-1 text-[0.875rem] font-semibold">
            <Mic className="size-4" /> {t("voice.dictate")}
          </Button>
        </div>
        {voiceOpen && <VoicePanel ai={!!sample} text={voiceText} onText={setVoiceText} busy={voiceBusy} error={voiceErr} onFill={fillFromVoice} />}
        {/* What a dictation left to check outside the fields (space, plant, tank, a field of another space). */}
        {(doubts.some((d) => !d.field || !(voiceKeys(voiceSpaceOf(space)) as string[]).includes(d.field)) || voiceMix) && (
          <div className="mt-4 flex flex-col gap-1.5" id="e-doubts">
            {doubts.some((d) => !d.field || !(voiceKeys(voiceSpaceOf(space)) as string[]).includes(d.field)) && (
              <Notice>
                {t("voice.doubts")}
                <ul className="mt-1 list-disc pl-4">
                  {doubts
                    .filter((d) => !d.field || !(voiceKeys(voiceSpaceOf(space)) as string[]).includes(d.field))
                    .map((d, i) => (
                      // The words heard say it for a space, a plant, a computed value: no key in front.
                      <li key={i}>{[d.code && ["space", "plant", "computed", "otherSpace"].includes(d.code) ? null : d.field, doubtText(d)].filter(Boolean).join(" : ")}</li>
                    ))}
                </ul>
              </Notice>
            )}
            {voiceMix && (
              <p className="text-[0.8125rem] text-fg-2" id="e-voice-mix">
                {t("voice.mixLine", {
                  parts: [voiceMix.volumeL != null ? `${num(voiceMix.volumeL)} L` : null, voiceMix.ec != null ? `EC ${num(voiceMix.ec, 1)}` : null, voiceMix.ph != null ? `pH ${num(voiceMix.ph, 1)}` : null]
                    .filter(Boolean)
                    .join(" · "),
                })}
              </p>
            )}
          </div>
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

export function PhotoThumb({ id, url, onRemove, onOpen, tagged, size = 80 }: { id: string; url: (id: string) => Promise<string>; onRemove?: () => void; onOpen?: () => void; tagged?: boolean; size?: number }) {
  const { t } = useSettings()
  const [src, setSrc] = useState("")
  // A photo the entry refers to but that cannot be read (partial backup, lot 12b): a warning instead of an empty frame.
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    let live = true
    setMissing(false)
    url(id).then((u) => {
      if (!live) return
      setSrc(u)
      if (!u) setMissing(true)
    })
    return () => {
      live = false
    }
  }, [id, url])
  return (
    <div className="relative shrink-0 overflow-hidden rounded-md border border-line bg-surface-2" style={{ width: size, height: size }} data-thumb={id}>
      {missing ? <MissingPhoto small /> : src && <img src={src} alt="" className="size-full object-cover" loading="lazy" onError={() => setMissing(true)} />}
      {/* Its tags (lot 12b): a corner of its own, away from « Retirer la photo ». */}
      {onOpen && !missing && (
        <button type="button" onClick={onOpen} aria-label={t("ph.tagsOf")} aria-pressed={!!tagged} className="absolute bottom-0 left-0 flex size-11 items-end justify-start p-1" data-tags-open>
          <span className={cn("flex size-6 items-center justify-center rounded-full text-white", tagged ? "bg-water" : "bg-black/60")}>
            <Tag className="size-3.5" />
          </span>
        </button>
      )}
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
