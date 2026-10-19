// Outils → Équipement: inventory by space or by type, drag-and-drop reassignment, stock, "Mes lampes".
// The SVG front view of the space arrives with the Light tool (batch 5).
import { useMemo, useRef, useState } from "react"
import { motion, useDragControls, type DragControls } from "motion/react"
import { GripVertical, Plus } from "lucide-react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Seg } from "@/components/hydro/form"
import { Emoji } from "@/components/hydro/emoji"
import { LineIcon } from "@/components/hydro/line-icon"
import { Chip, Label, Reveal, SourceNote } from "@/components/hydro/primitives"
import { SpaceDot } from "@/components/hydro/space-pill"
import { useSettings } from "@/app/settings-context"
import { newId, useGrow } from "@/app/grow-context"
import { todayIso } from "@/calc/stage"
import { EQUIPMENT_TYPES, GROW_SCHEMA, type Equipment, type EquipmentAssignment, type Space } from "@/model/grow"
import { SCHEMA } from "@/model/types"
import { extractorM3h } from "@/equipment/calc"
import { cn } from "@/lib/utils"
import { CalcRow, CalcValue, spaceSummary, TYPE_EMOJI } from "./equipment-shared"
import { EquipmentSheet, type EquipInit } from "./equipment-sheet"
import { tertiary } from "@/components/hydro/styles"

type View = "space" | "type"

export function EquipmentTool() {
  const { t, num } = useSettings()
  const { spaces, equipment, assignments, selection, unassign, addAssignment, saveEvent } = useGrow()
  const [view, setView] = useState<View>("space")
  const [sheet, setSheet] = useState<{ open: boolean; init: EquipInit }>({ open: false, init: {} })
  const today = todayIso()
  const open = (init: EquipInit) => setSheet({ open: true, init })

  const inventory = equipment.filter((e) => !e.library)
  const library = equipment.filter((e) => e.library)
  const live = (a: EquipmentAssignment) => a.from <= today && (!a.to || today < a.to)
  const placed = assignments.filter(live)
  const inStock = inventory.filter((e) => !placed.some((a) => a.equipmentId === e.id && a.spaceId))
  const shown = selection.kind === "space" ? spaces.filter((s) => s.id === selection.space.id) : selection.kind === "site" ? spaces.filter((s) => s.siteId === selection.site.id) : spaces

  /** Drop target under the pointer: a space id, "stock", or null. */
  const dropAt = (x: number, y: number): string | null => {
    for (const el of document.elementsFromPoint(x, y)) {
      const d = (el as HTMLElement).dataset?.drop
      if (d) return d
    }
    return null
  }
  const [over, setOver] = useState<string | null>(null)
  const move = async (a: EquipmentAssignment | null, item: Equipment, target: string) => {
    const from = a?.spaceId ?? "stock"
    if (target === from) return
    const toSpace = target === "stock" ? null : target
    if (toSpace && placed.some((x) => x.equipmentId === item.id && x.spaceId === toSpace)) return
    if (a) await unassign(a.id, today)
    const others = placed.filter((x) => x.equipmentId === item.id && x.id !== a?.id && x.spaceId)
    if (toSpace) {
      const stock = placed.find((x) => x.equipmentId === item.id && !x.spaceId)
      if (stock) await unassign(stock.id, today)
      await addAssignment({ schemaVersion: GROW_SCHEMA.assignment, id: newId("as"), equipmentId: item.id, spaceId: toSpace, from: today })
    } else if (!others.length) await addAssignment({ schemaVersion: GROW_SCHEMA.assignment, id: newId("as"), equipmentId: item.id, spaceId: null, from: today })
    for (const sid of [a?.spaceId, toSpace].filter((x): x is string => !!x))
      await saveEvent({ schemaVersion: SCHEMA.event, id: newId("ev"), date: today, type: "equipment", equipmentId: item.id, spaceId: sid, note: item.name, createdAt: new Date().toISOString() })
    toast.success(t("equip.moved"))
  }

  return (
    <>
      <Reveal i={0} className="mb-3">
        <div className="flex items-center gap-2">
          <Seg<View>
            label={t("equip.title")}
            value={view}
            onChange={setView}
            className="flex-1"
            options={[
              { value: "space", label: t("equip.bySpace") },
              { value: "type", label: t("equip.byType") },
            ]}
          />
          <Button onClick={() => open({ spaceId: selection.kind === "space" ? selection.space.id : undefined })} className="h-11 px-4 text-[0.875rem]">
            <Plus className="size-4" /> {t("equip.add")}
          </Button>
        </div>
        {view === "space" && inventory.length > 0 && <p className="mt-2 px-1 text-[0.75rem] text-fg-3">{t("equip.dragHint")}</p>}
      </Reveal>

      {!inventory.length && (
        <Reveal i={1} className="mb-3">
          <Card className="items-center text-center">
            <Emoji name="toolbox" size={56} />
            <p className="max-w-[32ch] text-[0.8125rem] text-fg-2">{t(spaces.length ? "equip.emptyAll" : "equip.noSpaces")}</p>
          </Card>
        </Reveal>
      )}

      {view === "space" ? (
        <>
          {shown.map((s, i) => (
            <Reveal key={s.id} i={i + 1} className="mb-3">
              <SpaceCard space={s} over={over === s.id} onOpen={open} onDrag={setOver} onDrop={move} dropAt={dropAt} />
            </Reveal>
          ))}
          <Reveal i={shown.length + 1} className="mb-3">
            <Card data-drop="stock" className={cn("gap-2 transition-colors", over === "stock" && "border-water")}>
              <div className="flex items-center justify-between">
                <Label emoji="toolbox">{t("equip.stock")}</Label>
                <span className="text-[0.75rem] text-fg-3">{t("equip.stockD")}</span>
              </div>
              {inStock.length ? (
                <ul>
                  {inStock.map((e) => (
                    <ItemRow key={e.id} item={e} assignment={placed.find((a) => a.equipmentId === e.id && !a.spaceId) ?? null} onOpen={open} onDrag={setOver} onDrop={move} dropAt={dropAt} />
                  ))}
                </ul>
              ) : (
                <p className="text-[0.78125rem] text-fg-3">{over === "stock" ? t("equip.drop") : "—"}</p>
              )}
            </Card>
          </Reveal>
        </>
      ) : (
        EQUIPMENT_TYPES.filter((ty) => inventory.some((e) => e.type === ty)).map((ty, i) => (
          <Reveal key={ty} i={i + 1} className="mb-3">
            <Card className="gap-1.5">
              <Label emoji={TYPE_EMOJI[ty]}>{t(`equip.types.${ty}`)}</Label>
              <ul>
                {inventory
                  .filter((e) => e.type === ty)
                  .map((e) => {
                    const where = placed.filter((a) => a.equipmentId === e.id && a.spaceId).map((a) => spaces.find((s) => s.id === a.spaceId)).filter((x): x is Space => !!x)
                    return (
                      <li key={e.id} className="border-t border-line first:border-t-0">
                        <button onClick={() => open({ item: e })} className="flex min-h-12 w-full items-center justify-between gap-2 py-2 text-left">
                          <span className="min-w-0">
                            <span className="block truncate text-[0.875rem] font-semibold">{e.name}</span>
                            <span className="block truncate text-[0.75rem] text-fg-3">{specLine(e, t, num)}</span>
                          </span>
                          <span className="flex shrink-0 flex-wrap justify-end gap-1">
                            {where.length ? (
                              where.map((s) => (
                                <span key={s.id} className="flex items-center gap-1 rounded-[6px] border border-line px-2 py-0.5 text-[0.75rem] font-semibold text-fg-2">
                                  <SpaceDot color={s.color} /> {s.name}
                                </span>
                              ))
                            ) : (
                              <Chip>{t("equip.stock")}</Chip>
                            )}
                          </span>
                        </button>
                      </li>
                    )
                  })}
              </ul>
            </Card>
          </Reveal>
        ))
      )}

      <Reveal i={spaces.length + 3} className="mb-3">
        <Card className="gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label emoji="bulb">{t("equip.library")}</Label>
            <button onClick={() => open({ type: "lamp", library: true })} className={tertiary}>
              <Plus className="size-4" /> {t("common.add")}
            </button>
          </div>
          <p className="text-[0.75rem] text-fg-3">{library.length ? t("equip.libraryD") : t("equip.libraryEmpty")}</p>
          {library.length > 0 && (
            <ul>
              {library.map((e) => (
                <li key={e.id} className="border-t border-line first:border-t-0">
                  <button onClick={() => open({ item: e })} className="flex min-h-11 w-full items-center gap-2.5 py-1.5 text-left">
                    <LineIcon name="bulb" size={22} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.875rem] font-semibold">{e.name}</span>
                      <span className="block truncate text-[0.75rem] text-fg-3">{specLine(e, t, num)}</span>
                    </span>
                    <Chip>{t("equip.libraryTag")}</Chip>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Reveal>
      <SourceNote>{t("equip.c.lossNote", { f: num(0.85, 2) })}</SourceNote>

      <EquipmentSheet open={sheet.open} onOpenChange={(o) => setSheet((s) => ({ ...s, open: o }))} init={sheet.init} />
    </>
  )
}

type Drag = { onOpen: (i: EquipInit) => void; onDrag: (target: string | null) => void; onDrop: (a: EquipmentAssignment | null, e: Equipment, target: string) => Promise<void>; dropAt: (x: number, y: number) => string | null }

function SpaceCard({ space, over, ...drag }: { space: Space; over: boolean } & Drag) {
  const { t, num } = useSettings()
  const { equipment, assignments } = useGrow()
  const sum = useMemo(() => spaceSummary(space, todayIso(), equipment, assignments), [space, equipment, assignments])
  const d = space.dimensionsCm
  const f0 = (v: number) => num(v, 0)
  return (
    <Card data-drop={space.id} className={cn("gap-2 transition-colors", over && "border-water")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[1rem] font-semibold">
            <SpaceDot color={space.color} className="size-2.5" /> {space.name}
          </div>
          <div className="mt-0.5 text-[0.75rem] text-fg-3 tabular">
            {d?.l && d?.w && d?.h ? `${d.l} × ${d.w} × ${d.h} cm` : t("equip.missing")}
            {sum.area.ok && ` · ${num(sum.area.value, 2)} m²`}
            {sum.volume.ok && ` · ${num(sum.volume.value, 2)} m³`}
          </div>
        </div>
        <Chip>{t(`template.${space.template}`)}</Chip>
      </div>

      {(sum.light || sum.air || sum.shot || sum.tank) && (
        <div className="border-y border-line">
          {sum.light && (
            <>
              <CalcRow label={t("equip.c.ppf")} sub={sum.light.names.join(" · ")}>
                <CalcValue c={sum.light.ppf} fmt={(v) => `${f0(v)} µmol/s`} />
              </CalcRow>
              <CalcRow label={t("equip.c.ppfd")} sub={t("equip.c.lossNote", { f: num(sum.loss, 2) })}>
                <CalcValue c={sum.light.ppfd} fmt={(v) => `≈ ${f0(v)} µmol/m²/s`} />
              </CalcRow>
              <CalcRow label={t("equip.c.wm2")}>
                <CalcValue c={sum.light.wPerM2} fmt={(v) => `${f0(v)} W/m²`} />
              </CalcRow>
            </>
          )}
          {sum.air && (
            <CalcRow label={t("equip.c.air")} sub={`${t("equip.c.airRef")}${sum.ext?.extractor?.carbonFilter ? ` · ${t("equip.c.carbonWarn")}` : ""}`}>
              <CalcValue c={sum.air} fmt={(v) => t("equip.c.airV", { s: f0(v) })} />
            </CalcRow>
          )}
          {sum.shot && (
            <CalcRow label={t("equip.c.shot")} sub={sum.potL ? t("equip.c.potsV", { n: String(sum.pots?.container?.count ?? sum.pots?.quantity ?? 1), l: num(sum.potL, 0) }) : undefined}>
              <CalcValue c={sum.shot} fmt={(v) => t("equip.c.shotV", { ml: f0((sum.potL ?? 0) * 30), s: num(v, 1) })} />
            </CalcRow>
          )}
          {sum.tank && (
            <CalcRow label={t("equip.c.tank")} sub={sum.tank.name}>
              {sum.tank.reservoir?.usableL ? <span className="font-semibold tabular">{t("equip.c.tankV", { l: num(sum.tank.reservoir.usableL, 0) })}</span> : <CalcValue c={{ ok: false, missing: ["volumeMl"] }} fmt={String} />}
            </CalcRow>
          )}
        </div>
      )}

      {sum.items.length ? (
        <ul>
          {sum.items.map(({ a, e }) => (
            <ItemRow key={a.id} item={e} assignment={a} {...drag} />
          ))}
        </ul>
      ) : (
        <p className="py-1 text-[0.78125rem] text-fg-3">{over ? t("equip.drop") : t("equip.emptySpace")}</p>
      )}
      <button onClick={() => drag.onOpen({ spaceId: space.id })} className={cn("-mb-1 self-start", tertiary)}>
        <Plus className="size-4" /> {t("equip.add")}
      </button>
    </Card>
  )
}

function ItemRow({ item, assignment, onOpen, onDrag, onDrop, dropAt }: { item: Equipment; assignment: EquipmentAssignment | null } & Drag) {
  const { t, num } = useSettings()
  const target = useRef<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const controls = useDragControls()
  return (
    <motion.li
      drag
      dragSnapToOrigin
      dragMomentum={false}
      dragListener={false}
      dragControls={controls}
      className={cn("relative border-t border-line first:border-t-0", dragging && "z-50 rounded-[10px] border border-water bg-surface shadow-card")}
      onDragStart={() => setDragging(true)}
      onDrag={(_, info) => {
        const d = dropAt(info.point.x - window.scrollX, info.point.y - window.scrollY)
        if (d !== target.current) {
          target.current = d
          onDrag(d)
        }
      }}
      onDragEnd={() => {
        setDragging(false)
        const d = target.current
        target.current = null
        onDrag(null)
        if (d) void onDrop(assignment, item, d)
      }}
      whileDrag={{ scale: 1.02 }}
    >
      <DragRow item={item} controls={controls} onOpen={() => onOpen({ item })} sub={specLine(item, t, num)} />
    </motion.li>
  )
}

/** The grip starts the drag (the rest of the row opens the sheet), so scrolling the page stays natural. */
function DragRow({ item, controls, onOpen, sub }: { item: Equipment; controls: DragControls; onOpen: () => void; sub: string }) {
  return (
    <div className="flex min-h-12 items-center gap-1">
      <span
        data-grip
        className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center text-fg-3 active:cursor-grabbing"
        onPointerDown={(e) => controls.start(e)}
      >
        <GripVertical className="size-4.5" />
      </span>
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2.5 py-1.5 text-left">
        <LineIcon name={TYPE_EMOJI[item.type]} size={22} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.875rem] font-semibold">
            {item.name}
            {item.quantity && item.quantity > 1 ? <span className="text-fg-3">{" × "}{item.quantity}</span> : null}
          </span>
          <span className="block truncate text-[0.75rem] text-fg-3">{sub}</span>
        </span>
      </button>
    </div>
  )
}

/** One-line summary of the specs actually filled in (never a guessed value). */
export function specLine(e: Equipment, t: ReturnType<typeof useSettings>["t"], num: ReturnType<typeof useSettings>["num"]): string {
  const p: string[] = []
  if (e.lamp) {
    if (e.lamp.watts) p.push(`${num(e.lamp.watts)} W`)
    if (e.lamp.ppf) p.push(`PPF ${num(e.lamp.ppf)}`)
    else if (e.lamp.efficacy) p.push(`${num(e.lamp.efficacy, 2)} µmol/J${e.lamp.efficacyIsHypothesis ? ` (${t("equip.hypothesis")})` : ""}`)
    if (e.lamp.spectrum) p.push(e.lamp.spectrum)
  }
  if (e.reservoir?.usableL) p.push(`${num(e.reservoir.usableL)} L`)
  if (e.reservoir?.mode) p.push(t(e.reservoir.mode === "dtw" ? "equip.f.dtw" : "equip.f.recirc"))
  if (e.pump) p.push(e.pump.flowMlPerMin ? `${num(e.pump.flowMlPerMin)} mL/min` : `${t("equip.f.flow")}${t("common.colon")}${t("equip.missing")}`)
  if (e.container?.volumeL) p.push(`${e.container.count ?? e.quantity ?? 1} × ${num(e.container.volumeL)} L`)
  if (e.container?.substrate) p.push(e.container.substrate)
  if (e.extractor) {
    const m = extractorM3h(e.extractor)
    p.push(m ? `${num(m)} m³/h` : `${t("equip.f.m3h")}${t("common.colon")}${t("equip.missing")}`)
    if (e.extractor.carbonFilter) p.push(t("equip.f.carbon"))
  }
  if (e.capacity?.capacity) p.push(e.capacity.capacity)
  if (!p.length) p.push([e.brand, e.model].filter(Boolean).join(" ") || t(`equip.types.${e.type}`))
  return p.join(" · ")
}
