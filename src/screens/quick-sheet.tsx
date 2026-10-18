// Quick multi-space entry (spec §4): one row per space — temperature, humidity, reservoir level —
// merged into each space's entry of the day. The full entry stays one tap away.
import { useEffect, useMemo, useState } from "react"
import { ChevronRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Grid, NumField, Sheet, TextField } from "@/components/hydro/form"
import { SpaceDot } from "@/components/hydro/space-pill"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { blankEntry, entryId, previousEntry } from "@/model/entry"
import { parseNum } from "@/calc/formulas"
import { todayIso } from "@/calc/stage"
import { equipmentAt } from "@/equipment/calc"
import type { Entry } from "@/model/types"

const FIELDS = ["tempDay", "rh", "reservoirL"] as const
type F = (typeof FIELDS)[number]

export function QuickSheet({ open, onOpenChange, onFull }: { open: boolean; onOpenChange: (o: boolean) => void; onFull: (spaceId: string) => void }) {
  const { t, settings } = useSettings()
  const { spaces, all, cycleIn, equipment, assignments, saveEntry } = useGrow()
  const [date, setDate] = useState(todayIso())
  const [v, setV] = useState<Record<string, Partial<Record<F, string>>>>({})
  const [busy, setBusy] = useState(false)
  const show = (x?: number) => (x == null ? "" : settings.lang === "fr" ? String(x).replace(".", ",") : String(x))

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
  }, [open])
  useEffect(() => {
    if (!open) return
    const init: typeof v = {}
    for (const r of rows) init[r.s.id] = Object.fromEntries(FIELDS.map((k) => [k, show(r.existing?.[k] as number | undefined)]))
    setV(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date])

  const save = async () => {
    setBusy(true)
    try {
      let n = 0
      for (const r of rows) {
        const typed = FIELDS.filter((k) => parseNum(v[r.s.id]?.[k]) != null)
        if (!typed.length) continue
        const base: Entry = r.existing ?? blankEntry(date, { spaceId: r.s.id, cycle: cycleIn(r.s.id) }, r.prev)
        const e: Entry = { ...base }
        if (!e.time && date === todayIso()) {
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
      description={t("quick.desc")}
      footer={
        <Button onClick={save} disabled={busy} className="h-12 w-full rounded-full text-[15px] font-bold">
          {busy && <Loader2 className="animate-spin" />}
          {t("common.save")}
        </Button>
      }
    >
      <TextField id="q-date" type="date" label={t("entry.date")} value={date} onChange={(x) => setDate(x || todayIso())} />
      <div className="mt-3 flex flex-col gap-3">
        {rows.map(({ s, tank, prev }) => {
          const set = (k: F) => (x: string) => setV((cur) => ({ ...cur, [s.id]: { ...cur[s.id], [k]: x } }))
          const ph = (k: F) => show(prev?.[k] as number | undefined)
          return (
            <section key={s.id} className="rounded-lg border border-line bg-surface px-3 pt-2.5 pb-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[14.5px] font-semibold">
                  <SpaceDot color={s.color} className="size-2.5" /> {s.name}
                </span>
                <button type="button" onClick={() => onFull(s.id)} className="flex h-8 items-center gap-0.5 text-[12.5px] font-semibold text-primary">
                  {t("quick.full")} <ChevronRight className="size-4" />
                </button>
              </div>
              <Grid cols={tank ? 3 : 2}>
                {s.modules.climate && <NumField id={`q-${s.id}-t`} label={t("quick.temp")} value={v[s.id]?.tempDay ?? ""} onChange={set("tempDay")} placeholder={ph("tempDay")} />}
                {s.modules.climate && <NumField id={`q-${s.id}-rh`} label={t("quick.rh")} value={v[s.id]?.rh ?? ""} onChange={set("rh")} placeholder={ph("rh")} />}
                {tank && <NumField id={`q-${s.id}-res`} label={t("quick.reservoir")} value={v[s.id]?.reservoirL ?? ""} onChange={set("reservoirL")} placeholder={ph("reservoirL")} />}
              </Grid>
            </section>
          )
        })}
      </div>
    </Sheet>
  )
}
