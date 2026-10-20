// Quick multi-space entry (spec §4): one row per space — temperature, humidity, reservoir level —
// merged into each space's entry of the day. The full entry stays one tap away. Since lot 10l2b it looks like the day's
// entry: the date behind « modifier », yesterday's values faint (a tap takes one), « hier 25,4 » under the field.
import { useEffect, useMemo, useState } from "react"
import { ChevronRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Grid, NumField, Sheet, TextField } from "@/components/hydro/form"
import { SpaceDot } from "@/components/hydro/space-pill"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { blankEntry, entryId, previousEntry } from "@/model/entry"
import { badNums, parseNum } from "@/calc/formulas"
import { todayIso } from "@/calc/stage"
import { equipmentAt } from "@/equipment/calc"
import type { Entry } from "@/model/types"
import { tertiary } from "@/components/hydro/styles"

const FIELDS = ["tempDay", "rh", "reservoirL"] as const
type F = (typeof FIELDS)[number]

export function QuickSheet({
  open,
  onOpenChange,
  onFull,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** The full entry of a space, with what was already typed for it (lot 10d: nothing lost on the way). */
  onFull: (spaceId: string, date: string, values: Partial<Record<F, string>>) => void
}) {
  const { t, show, locale } = useSettings()
  const { spaces, all, cycleIn, equipment, assignments, saveEntry } = useGrow()
  const [date, setDate] = useState(todayIso())
  const [v, setV] = useState<Record<string, Partial<Record<F, string>>>>({})
  const [busy, setBusy] = useState(false)
  // Lot 10l2b, same look as the day's entry: the date behind « modifier », yesterday's values faint in the fields.
  const [whenOpen, setWhenOpen] = useState(false)

  const rows = useMemo(
    () =>
      spaces.map((s) => {
        const tank = equipmentAt(s.id, date, assignments).some((a) => equipment.find((e) => e.id === a.equipmentId && e.type === "reservoir" && e.reservoir?.kind !== "runoff"))
        const entries = all.entries.filter((e) => e.spaceId === s.id)
        return { s, tank, entries, existing: entries.find((e) => e.id === entryId(date, s.id)), prev: previousEntry(entries, date, undefined) }
      }),
    [spaces, all.entries, equipment, assignments, date],
  )

  useEffect(() => {
    if (!open) return
    setDate(todayIso())
    setWhenOpen(false)
  }, [open])
  useEffect(() => {
    if (!open) return
    const init: typeof v = {}
    for (const r of rows) init[r.s.id] = Object.fromEntries(FIELDS.map((k) => [k, show(r.existing?.[k] as number | undefined)]))
    setV(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date])

  const save = async () => {
    if (busy) return
    if (rows.some((r) => badNums(v[r.s.id] ?? {}).length)) return toast.error(t("safe.fixFields"))
    // Nothing typed: say so, the sheet stays open (no false success, lot 10d).
    if (!rows.some((r) => FIELDS.some((k) => parseNum(v[r.s.id]?.[k]) != null))) return toast.error(t("quick.nothing"))
    setBusy(true)
    try {
      let n = 0
      for (const r of rows) {
        const typed = FIELDS.filter((k) => parseNum(v[r.s.id]?.[k]) != null)
        if (!typed.length) continue
        const base: Entry = r.existing ?? blankEntry(date, { spaceId: r.s.id, cycle: cycleIn(r.s.id) }, r.prev)
        const e: Entry = { ...base }
        // A new entry of today gets the current time; an entry saved again keeps its own (lot 10d).
        if (!r.existing && date === todayIso()) {
          const d = new Date()
          e.time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
        }
        for (const k of FIELDS) {
          const x = parseNum(v[r.s.id]?.[k])
          if (x != null) e[k] = x
        }
        await saveEntry(e)
        n++
      }
      toast.success(t("quick.saved", { n }))
      onOpenChange(false)
    } catch (err) {
      toast.error(t("common.saveError", { reason: (err as Error)?.message ?? "?" }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("quick.title")}
      big
      head={
        <div className="mt-1 text-[0.8125rem] leading-snug text-fg-3" id="q-head">
          <span className="font-num font-medium">{new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`))}</span>{" "}
          <button
            type="button"
            id="q-when"
            aria-expanded={whenOpen}
            onClick={() => setWhenOpen((x) => !x)}
            className="hit font-semibold text-fg-2 underline decoration-water decoration-[1.5px] underline-offset-[3px] hover:text-fg"
          >
            {t("entry.edit")}
          </button>
          <span className="block">{t("quick.desc")}</span>
        </div>
      }
      footer={
        <Button onClick={save} disabled={busy} className="h-12 w-full">
          {busy && <Loader2 className="animate-spin" />}
          {t("common.save")}
        </Button>
      }
    >
      {whenOpen && <TextField id="q-date" type="date" label={t("entry.date")} value={date} onChange={(x) => setDate(x || todayIso())} />}
      <div className="flex flex-col">
        {rows.map(({ s, tank, prev }) => {
          const set = (k: F) => (x: string) => setV((cur) => ({ ...cur, [s.id]: { ...cur[s.id], [k]: x } }))
          const ghost = (k: F) => (prev?.[k] != null ? show(prev[k] as number) : undefined)
          const hint = (k: F) => (prev?.[k] != null ? t("entry.hint", { v: show(prev[k] as number) }) : undefined)
          return (
            <section key={s.id} className="mt-4 first:mt-1" data-quick={s.id}>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2">
                <h3 className="display flex items-center gap-2 text-[1.0625rem] leading-tight">
                  <SpaceDot color={s.color} className="size-2.5" /> {s.name}
                </h3>
                <button type="button" onClick={() => onFull(s.id, date, v[s.id] ?? {})} className={tertiary}>
                  {t("quick.full")} <ChevronRight className="size-4" />
                </button>
              </div>
              <Grid cols={tank ? 3 : 2}>
                {s.modules.climate && <NumField id={`q-${s.id}-t`} label={t("quick.temp")} value={v[s.id]?.tempDay ?? ""} onChange={set("tempDay")} ghost={ghost("tempDay")} hint={hint("tempDay")} hintMono />}
                {s.modules.climate && <NumField id={`q-${s.id}-rh`} label={t("quick.rh")} value={v[s.id]?.rh ?? ""} onChange={set("rh")} ghost={ghost("rh")} hint={hint("rh")} hintMono />}
                {tank && <NumField id={`q-${s.id}-res`} label={t("quick.reservoir")} value={v[s.id]?.reservoirL ?? ""} onChange={set("reservoirL")} ghost={ghost("reservoirL")} hint={hint("reservoirL")} hintMono />}
              </Grid>
            </section>
          )
        })}
      </div>
    </Sheet>
  )
}
