// Add / edit one equipment item: type, specs (all optional but the name), source, placements (historized).
import { useEffect, useMemo, useState } from "react"
import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AreaField, Grid, Group, NumField, Seg, Sheet, TextField } from "@/components/hydro/form"
import { Emoji } from "@/components/hydro/emoji"
import { SpaceDot } from "@/components/hydro/space-pill"
import { useSettings } from "@/app/settings-context"
import { newId, useGrow } from "@/app/grow-context"
import { SaveBar, useSaver, useShow } from "@/screens/sheets"
import { badNums, parseNum } from "@/calc/formulas"
import { todayIso } from "@/calc/stage"
import { cfmToM3h } from "@/equipment/calc"
import { EQUIPMENT_TYPES, GROW_SCHEMA, type Equipment, type EquipmentType } from "@/model/grow"
import { SCHEMA } from "@/model/types"
import type { MessageKey } from "@/i18n/types"
import { cn } from "@/lib/utils"
import { SwitchRow, TYPE_EMOJI } from "./equipment-shared"

type Field = { k: string; label: MessageKey; kind: "num" | "int" | "text" | "bool"; hint?: MessageKey }
type SpecKey = "lamp" | "reservoir" | "pump" | "container" | "extractor" | "capacity"

const SPEC_OF: Partial<Record<EquipmentType, SpecKey>> = {
  lamp: "lamp",
  reservoir: "reservoir",
  pump: "pump",
  container: "container",
  extractor: "extractor",
  fan: "capacity",
  dehumidifier: "capacity",
  humidifier: "capacity",
  heater: "capacity",
  ac: "capacity",
}

const FIELDS: Record<SpecKey, Field[]> = {
  lamp: [
    { k: "type", label: "equip.f.lampType", kind: "text" },
    { k: "watts", label: "equip.f.watts", kind: "num" },
    { k: "efficacy", label: "equip.f.efficacy", kind: "num" },
    { k: "ppf", label: "equip.f.ppf", kind: "num", hint: "equip.f.ppfHint" },
    { k: "coverageCm.l", label: "equip.f.covL", kind: "int" },
    { k: "coverageCm.w", label: "equip.f.covW", kind: "int" },
    { k: "dimmable", label: "equip.f.dimmable", kind: "text" },
    { k: "dimmerPct", label: "equip.f.dimmer", kind: "int" },
    { k: "spectrum", label: "equip.f.spectrum", kind: "text" },
    { k: "minHeightCm", label: "equip.f.minHeight", kind: "int" },
    { k: "dimensionsCm.l", label: "equip.f.lampL", kind: "int" },
    { k: "dimensionsCm.w", label: "equip.f.lampW", kind: "int" },
    { k: "dimensionsCm.h", label: "equip.f.lampH", kind: "int" },
    { k: "efficacyIsHypothesis", label: "equip.f.efficacyHyp", kind: "bool" },
  ],
  reservoir: [
    { k: "usableL", label: "equip.f.usable", kind: "num" },
    { k: "totalL", label: "equip.f.total", kind: "num" },
    { k: "kind", label: "equip.f.kind", kind: "text" },
    { k: "heater", label: "equip.f.heater", kind: "bool" },
    { k: "chiller", label: "equip.f.chiller", kind: "bool" },
    { k: "airstone", label: "equip.f.airstone", kind: "bool" },
    { k: "lid", label: "equip.f.lid", kind: "bool" },
  ],
  pump: [
    { k: "flowMlPerMin", label: "equip.f.flow", kind: "int" },
    { k: "outlets", label: "equip.f.outlets", kind: "int" },
    { k: "control", label: "equip.f.control", kind: "text" },
  ],
  container: [
    { k: "volumeL", label: "equip.f.volumeL", kind: "num" },
    { k: "count", label: "equip.f.count", kind: "int" },
    { k: "kind", label: "equip.f.kind", kind: "text" },
    { k: "substrate", label: "equip.f.substrate", kind: "text" },
    { k: "heightCm", label: "equip.f.potH", kind: "int" },
  ],
  extractor: [
    { k: "m3h", label: "equip.f.m3h", kind: "num" },
    { k: "cfm", label: "equip.f.cfm", kind: "num" },
    { k: "diameterMm", label: "equip.f.diameter", kind: "int" },
    { k: "speedPct", label: "equip.f.speed", kind: "int" },
    { k: "carbonFilter", label: "equip.f.carbon", kind: "bool" },
  ],
  capacity: [{ k: "capacity", label: "equip.f.capacity", kind: "text" }],
}

const get = (o: unknown, path: string): unknown => path.split(".").reduce<unknown>((x, k) => (x && typeof x === "object" ? (x as Record<string, unknown>)[k] : undefined), o)
function put(o: Record<string, unknown>, path: string, v: unknown) {
  const ks = path.split(".")
  let cur = o
  ks.slice(0, -1).forEach((k) => (cur = (cur[k] ??= {}) as Record<string, unknown>))
  if (v === undefined || v === "") delete cur[ks.at(-1)!]
  else cur[ks.at(-1)!] = v
}

export type EquipInit = { item?: Equipment; type?: EquipmentType; spaceId?: string | null; library?: boolean }

export function EquipmentSheet({ open, onOpenChange, init }: { open: boolean; onOpenChange: (o: boolean) => void; init: EquipInit }) {
  const { t, dm } = useSettings()
  const { spaces, equipment, assignments, saveEquipment, deleteEquipment, addAssignment, unassign, saveEvent } = useGrow()
  const show = useShow()
  const [e, setE] = useState<Equipment>(() => blank("lamp"))
  const [txt, setTxt] = useState<Record<string, string>>({})
  const [where, setWhere] = useState<Set<string>>(new Set()) // space ids; empty = stock
  const [date, setDate] = useState(todayIso())
  const [toLib, setToLib] = useState(false)
  const { busy, run } = useSaver(() => onOpenChange(false))
  const editing = !!init.item
  const library = equipment.filter((x) => x.library && x.type === "lamp")
  const openHere = useMemo(() => (init.item ? assignments.filter((a) => a.equipmentId === init.item!.id && !a.to) : []), [assignments, init.item])

  function blank(type: EquipmentType): Equipment {
    const now = new Date().toISOString()
    return { schemaVersion: GROW_SCHEMA.equipment, id: newId("eq"), type, name: "", createdAt: now, updatedAt: now, ...(init.library ? { library: true } : {}) }
  }
  const load = (x: Equipment) => {
    setE(x)
    const spec = SPEC_OF[x.type]
    const st: Record<string, string> = { quantity: show(x.quantity) }
    if (spec) for (const f of FIELDS[spec]) if (f.kind !== "bool") st[f.k] = f.kind === "text" ? String(get(x[spec], f.k) ?? "") : show(get(x[spec], f.k) as number | undefined)
    st.flowDate = x.pump?.flowMeasuredAt ?? ""
    setTxt(st)
  }

  useEffect(() => {
    if (!open) return
    load(init.item ?? blank(init.type ?? "lamp"))
    setWhere(new Set(init.item ? openHere.filter((a) => a.spaceId).map((a) => a.spaceId!) : init.spaceId ? [init.spaceId] : []))
    setDate(todayIso())
    setToLib(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const spec = SPEC_OF[e.type]
  // Changing the type keeps what was typed (name, quantity, fields of the other type if one comes back to it), lot 10d.
  const setType = (type: EquipmentType) => setE((x) => ({ ...x, type }))
  const fromModel = (m: Equipment) => {
    const copy: Equipment = { ...e, brand: m.brand, model: m.model, name: e.name || m.name, lamp: structuredClone(m.lamp), source: m.source }
    load(copy)
  }
  const sv = (k: string) => (v: string) => setTxt((s) => ({ ...s, [k]: v }))
  const setBool = (k: string, v: boolean) =>
    setE((x) => {
      const o = structuredClone((spec && (x[spec] as Record<string, unknown>)) ?? {})
      put(o, k, v || undefined)
      return { ...x, [spec!]: o }
    })

  const build = (): Equipment => {
    const out: Equipment = { ...e, name: e.name.trim(), quantity: parseNum(txt.quantity) }
    if (!out.quantity) delete out.quantity
    for (const s of Object.values(SPEC_OF)) if (s !== spec) delete out[s as SpecKey]
    if (spec) {
      const o = structuredClone((e[spec] as Record<string, unknown>) ?? {})
      for (const f of FIELDS[spec]) if (f.kind !== "bool") put(o, f.k, f.kind === "text" ? txt[f.k]?.trim() || undefined : parseNum(txt[f.k]))
      if (spec === "pump") put(o, "flowMeasuredAt", txt.flowDate || undefined)
      for (const k of ["coverageCm"]) if (o[k] && !Object.keys(o[k] as object).length) delete o[k]
      if (Object.keys(o).length) (out as Record<string, unknown>)[spec] = o
      else delete out[spec]
    }
    return out
  }

  const save = () =>
    run(async () => {
      const numeric = ["quantity", ...(spec ? FIELDS[spec].filter((x) => x.kind === "num" || x.kind === "int").map((x) => x.k) : [])]
      if (badNums(txt, numeric).length) throw new Error(t("safe.fixFields"))
      const item = build()
      if (!item.name) throw new Error(t("equip.name"))
      await saveEquipment(item)
      if (toLib && item.type === "lamp" && !item.library) {
        const now = new Date().toISOString()
        await saveEquipment({ ...item, id: newId("lib"), library: true, quantity: undefined, createdAt: now, updatedAt: now })
      }
      if (item.library) return
      // Placements: close what was unticked, open what was ticked. Past periods stay as they were.
      const cur = new Map(openHere.map((a) => [a.spaceId, a]))
      let changed = false
      for (const [sid, a] of cur)
        if (sid && !where.has(sid)) {
          await unassign(a.id, date)
          changed = true
        }
      for (const sid of where)
        if (!cur.has(sid)) {
          await addAssignment({ schemaVersion: GROW_SCHEMA.assignment, id: newId("as"), equipmentId: item.id, spaceId: sid, from: date })
          changed = true
        }
      const stock = cur.get(null)
      if (where.size && stock) await unassign(stock.id, date)
      if (!where.size && !stock) await addAssignment({ schemaVersion: GROW_SCHEMA.assignment, id: newId("as"), equipmentId: item.id, spaceId: null, from: date })
      if (changed && editing)
        for (const sid of new Set([...where, ...[...cur.keys()].filter((k): k is string => !!k)]))
          await saveEvent({ schemaVersion: SCHEMA.event, id: newId("ev"), date, type: "equipment", equipmentId: item.id, spaceId: sid, note: item.name, createdAt: new Date().toISOString() })
    })

  const duplicate = () =>
    run(async () => {
      const item = build()
      const now = new Date().toISOString()
      const copy = { ...item, id: newId("eq"), name: t("equip.copyName", { name: item.name }), createdAt: now, updatedAt: now }
      await saveEquipment(copy)
      if (!copy.library)
        for (const a of openHere) await addAssignment({ schemaVersion: GROW_SCHEMA.assignment, id: newId("as"), equipmentId: copy.id, spaceId: a.spaceId, from: todayIso() })
      return t("equip.duplicated")
    })

  const history = init.item ? assignments.filter((a) => a.equipmentId === init.item!.id).sort((a, b) => b.from.localeCompare(a.from)) : []
  const cfm = parseNum(txt.cfm)
  const spaceName = (id: string | null) => (id ? (spaces.find((s) => s.id === id)?.name ?? id) : t("equip.stock"))

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? t("equip.edit") : e.library ? t("equip.library") : t("equip.new")}
      footer={<SaveBar busy={busy} onSave={save} onDelete={
        editing
          ? async () => {
              await deleteEquipment(init.item!.id)
              onOpenChange(false)
            }
          : undefined
      } />}
    >
      <Group title={t("equip.type")}>
        <div className="grid grid-cols-4 gap-1.5">
          {EQUIPMENT_TYPES.map((ty) => (
            <button
              key={ty}
              type="button"
              aria-pressed={e.type === ty}
              onClick={() => setType(ty)}
              className={cn(
                "flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-md border px-1 py-1.5 text-center text-[0.75rem] leading-tight font-semibold",
                e.type === ty ? "border-primary/45 bg-primary/10 text-fg" : "border-line bg-surface-2 text-fg-2",
              )}
            >
              <Emoji name={TYPE_EMOJI[ty]} size={24} />
              <span className="line-clamp-2">{t(`equip.types.${ty}`)}</span>
            </button>
          ))}
        </div>
      </Group>

      {e.type === "lamp" && !editing && !e.library && library.length > 0 && (
        <Group title={t("equip.fromLibrary")}>
          <div className="flex flex-wrap gap-1.5">
            {library.map((m) => (
              <button key={m.id} type="button" onClick={() => fromModel(m)} className="flex h-11 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3.5 text-[0.8125rem] font-semibold text-fg-2">
                <Emoji name="bulb" size={18} /> {m.name}
              </button>
            ))}
          </div>
        </Group>
      )}

      <Group title={t("equip.name")}>
        <div className="flex flex-col gap-2.5">
          <TextField id="eq-name" label={`${t("equip.name")} · ${t("common.required")}`} value={e.name} onChange={(v) => setE((x) => ({ ...x, name: v }))} />
          <Grid>
            <TextField id="eq-brand" label={t("equip.brand")} value={e.brand ?? ""} onChange={(v) => setE((x) => ({ ...x, brand: v || undefined }))} />
            <TextField id="eq-model" label={t("equip.model")} value={e.model ?? ""} onChange={(v) => setE((x) => ({ ...x, model: v || undefined }))} />
          </Grid>
          {!e.library && <NumField id="eq-qty" integer label={t("equip.quantity")} value={txt.quantity ?? ""} onChange={sv("quantity")} />}
        </div>
      </Group>

      {spec && (
        <Group title={t(`equip.types.${e.type}`)}>
          <Grid>
            {FIELDS[spec]
              .filter((f) => f.kind !== "bool")
              .map((f) =>
                f.kind === "text" ? (
                  <TextField key={f.k} id={`eq-${f.k}`} label={t(f.label)} value={txt[f.k] ?? ""} onChange={sv(f.k)} />
                ) : (
                  <NumField
                    key={f.k}
                    id={`eq-${f.k}`}
                    integer={f.kind === "int"}
                    label={t(f.label)}
                    hint={f.k === "cfm" && cfm ? t("equip.f.cfmHint", { v: String(Math.round(cfmToM3h(cfm))) }) : f.hint ? t(f.hint) : undefined}
                    value={txt[f.k] ?? ""}
                    onChange={sv(f.k)}
                  />
                ),
              )}
            {spec === "pump" && <TextField id="eq-flowdate" type="date" label={t("equip.f.flowDate")} value={txt.flowDate ?? ""} onChange={sv("flowDate")} />}
          </Grid>
          {spec === "reservoir" && (
            <div className="mt-2.5">
              <Seg<"dtw" | "recirc">
                label={t("equip.f.mode")}
                value={e.reservoir?.mode}
                onChange={(v) => setE((x) => ({ ...x, reservoir: { ...x.reservoir, mode: v } }))}
                options={[
                  { value: "dtw", label: t("equip.f.dtw") },
                  { value: "recirc", label: t("equip.f.recirc") },
                ]}
              />
            </div>
          )}
          {FIELDS[spec].some((f) => f.kind === "bool") && (
            <div className="mt-2 rounded-md border border-line bg-surface px-3">
              {FIELDS[spec]
                .filter((f) => f.kind === "bool")
                .map((f) => (
                  <SwitchRow key={f.k} id={`eq-${f.k}`} label={t(f.label)} checked={!!get(e[spec], f.k)} onChange={(v) => setBool(f.k, v)} />
                ))}
            </div>
          )}
        </Group>
      )}

      <Group title={t("equip.source")}>
        <Seg<NonNullable<Equipment["source"]>>
          label={t("equip.source")}
          value={e.source}
          onChange={(v) => setE((x) => ({ ...x, source: v }))}
          options={[
            { value: "maker", label: t("equip.srcMaker") },
            { value: "measured", label: t("equip.srcMeasured") },
            { value: "hypothesis", label: t("equip.srcHypothesis") },
            { value: "user", label: t("equip.srcUser") },
          ]}
        />
      </Group>

      {!e.library && (
        <Group title={t("equip.where")}>
          <p className="mb-2 text-[0.75rem] text-fg-3">{t("equip.whereD")}</p>
          <div className="flex flex-wrap gap-1.5">
            {spaces.map((s) => {
              const on = where.has(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setWhere((w) => (w.has(s.id) ? new Set([...w].filter((x) => x !== s.id)) : new Set([...w, s.id])))}
                  className={cn("flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-[0.8125rem] font-semibold", on ? "border-primary/45 bg-primary/12 text-fg" : "border-line bg-surface-2 text-fg-2")}
                >
                  <SpaceDot color={s.color} /> {s.name}
                </button>
              )
            })}
            <span className={cn("flex h-10 items-center rounded-full border border-dashed px-3.5 text-[0.8125rem] font-semibold", where.size ? "border-line text-fg-3" : "border-primary/45 text-fg")}>{t("equip.stock")}</span>
          </div>
          {editing && (
            <div className="mt-2.5">
              <TextField id="eq-date" type="date" label={t("equip.moveDate")} value={date} onChange={(v) => setDate(v || todayIso())} />
            </div>
          )}
        </Group>
      )}

      {e.type === "lamp" && !editing && !e.library && (
        <div className="mt-3 rounded-md border border-line bg-surface px-3">
          <SwitchRow id="eq-lib" label={t("equip.saveToLibrary")} hint={t("equip.libraryD")} checked={toLib} onChange={setToLib} />
        </div>
      )}

      <Group title={t("equip.notes")}>
        <AreaField id="eq-notes" label={t("equip.notes")} value={e.notes ?? ""} onChange={(v) => setE((x) => ({ ...x, notes: v || undefined }))} />
      </Group>

      {history.length > 0 && (
        <Group title={t("equip.history")}>
          <ul className="rounded-md border border-line bg-surface px-3 text-[0.8125rem]">
            {history.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 border-t border-line py-2 first:border-t-0">
                <span className="flex items-center gap-1.5 font-medium">
                  <SpaceDot color={spaces.find((s) => s.id === a.spaceId)?.color} /> {spaceName(a.spaceId)}
                </span>
                <span className="text-fg-3 tabular">{a.to ? t("equip.period", { from: dm(a.from), to: dm(a.to) }) : t("equip.since", { date: dm(a.from) })}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[0.75rem] text-fg-3">{t("equip.deleteHint")}</p>
        </Group>
      )}

      {editing && (
        <Button variant="outline" onClick={duplicate} disabled={busy} className="mt-4 h-11 w-full rounded-full border-line-strong text-[0.875rem] font-semibold">
          <Copy className="size-4" /> {t("equip.duplicate")}
        </Button>
      )}
    </Sheet>
  )
}
