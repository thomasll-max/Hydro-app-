// Outils → Pulvérisation (lot 10k2b): IPW Athena (the protocol of lot 5, unchanged, its data keeps its ids) or « Mon
// mélange », a home spray or a stack described by the user and marked « perso, non vérifié ». No dose is proposed: the
// doses typed per litre are multiplied by the sprayer's litres. Both have a checklist and their next spray in the calendar.
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Check, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AreaField, NumField, Seg, Sheet, TextField } from "@/components/hydro/form"
import { Chip, Label, Reveal } from "@/components/hydro/primitives"
import { iconButton, secondary, tertiary } from "@/components/hydro/styles"
import { useSettings } from "@/app/settings-context"
import { newId, useGrow } from "@/app/grow-context"
import { parseNum } from "@/calc/formulas"
import { todayIso } from "@/calc/stage"
import { mixAmounts, mixFromDraft, nextMixSpray, validMixes, type MixDraft } from "@/calc/spray"
import { GROW_SCHEMA, type SprayMix } from "@/model/grow"
import { formatInput, locales } from "@/i18n/core"
import { cn } from "@/lib/utils"
import { SaveBar } from "../sheets"
import { IpwTool } from "./ipw"
import { StackSprayTool } from "./stack-spray"

type Kind = "ipw" | "mix" | "stack"
const KIND_KEY = "hydro.sprayKind"
const readKind = (): Kind | null => {
  try {
    const v = localStorage.getItem(KIND_KEY)
    return v === "ipw" || v === "mix" || v === "stack" ? v : null
  } catch {
    return null
  }
}

export function SprayTool() {
  const { t } = useSettings()
  const { grow, nutrition } = useGrow()
  // IPW first when it is switched on or no mix exists; the last choice is remembered on this phone.
  const [picked, setKind] = useState<Kind>(() => readKind() ?? (nutrition.addons.includes("ipw") || !validMixes(grow?.sprayMixes).length ? "ipw" : "mix"))
  // Stack (lot 14b) is offered when its add-on is on; otherwise a remembered « Stack » shows the IPW tool
  const stackOn = nutrition.addons.includes("stack")
  const kind: Kind = picked === "stack" && !stackOn ? "ipw" : picked
  const choose = (k: Kind) => {
    setKind(k)
    try {
      localStorage.setItem(KIND_KEY, k)
    } catch {
      /* private mode: the choice stays for this visit */
    }
  }
  return (
    <div className="flex flex-col gap-4" id="spray-tool">
      <Seg<Kind>
        label={t("spray.choice")}
        value={kind}
        onChange={choose}
        options={[
          { value: "ipw", label: t("spray.ipw") },
          ...(stackOn ? [{ value: "stack" as Kind, label: t("spray.stack") }] : []),
          { value: "mix", label: t("spray.mix") },
        ]}
      />
      {kind === "ipw" ? <IpwTool /> : kind === "stack" ? <StackSprayTool /> : <MixTool />}
    </div>
  )
}

function MixTool() {
  const { t, num, settings } = useSettings()
  const { grow, cycle, space, sprays, saveSpray } = useGrow()
  const mixes = validMixes(grow?.sprayMixes)
  const [sel, setSel] = useState<string | undefined>()
  const mix = mixes.find((m) => m.id === sel) ?? mixes[0]
  const [editing, setEditing] = useState<SprayMix | "new" | null>(null)
  const [litres, setLitres] = useState("")
  const [checked, setChecked] = useState<string[]>([])
  const today = todayIso()
  const mine = space && mix ? sprays.filter((s) => s.product === "mix" && s.mixId === mix.id && s.spaceIds.includes(space.id)) : []
  useEffect(() => {
    setLitres(mine[0] ? formatInput(settings.lang, mine[0].litres) : "")
    setChecked([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space?.id, mix?.id, mine.length])
  const L = parseNum(litres)
  const saving = useRef(false)
  const [busy, setBusy] = useState(false)
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(settings.lang === "en" ? "en-GB" : locales[settings.lang], { weekday: "short", day: "numeric", month: "short" })

  const save = async () => {
    if (!space || !mix || !L || L <= 0 || saving.current) return
    saving.current = true
    setBusy(true)
    try {
      await saveSpray({
        schemaVersion: GROW_SCHEMA.spray,
        id: newId("spray-"),
        date: today,
        spaceIds: [space.id],
        ...(cycle ? { cycleId: cycle.id } : {}),
        product: "mix",
        mixId: mix.id,
        mix: { name: mix.name, items: mix.items },
        litres: L,
        checked,
        createdAt: new Date().toISOString(),
      })
      toast.success(t("ipw.saved"))
      setChecked([])
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error).message }))
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  const sheet = <MixSheet mix={editing} onClose={() => setEditing(null)} onSaved={(id) => setSel(id)} />
  if (!mix)
    return (
      <>
        <Reveal i={0}>
          <Card className="gap-3" id="mix-empty">
            <div className="flex flex-wrap items-center gap-2">
              <Label>{t("spray.title")}</Label>
              <Chip tone="warn">{t("spray.mine")}</Chip>
            </div>
            <p className="text-[0.8125rem] leading-[1.45] text-fg-2">{t("spray.intro")}</p>
            <button type="button" onClick={() => setEditing("new")} className={cn(secondary, "self-start")} id="mix-create">
              {t("spray.create")}
            </button>
          </Card>
        </Reveal>
        {sheet}
      </>
    )

  const next = space ? nextMixSpray(sprays, mix, space.id) : null
  const amounts = L && L > 0 ? mixAmounts(mix, L) : null
  const points = mix.checklist ?? []
  return (
    <div className="flex flex-col gap-3">
      {mixes.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("spray.which")} id="mix-pick">
          {mixes.map((m) => (
            <button key={m.id} type="button" aria-pressed={m.id === mix.id} onClick={() => setSel(m.id)} className={cn("min-h-11 rounded-[10px] border px-3 text-[0.8125rem] font-semibold", m.id === mix.id ? "border-fg text-fg" : "border-line-strong text-fg-2")}>
              {m.name}
            </button>
          ))}
        </div>
      )}
      <Reveal i={0}>
        <Card className="gap-2.5" id="mix-card">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Label className="[overflow-wrap:anywhere]">{mix.name}</Label>
              <Chip tone="warn">{t("spray.mine")}</Chip>
            </div>
            <button type="button" onClick={() => setEditing(mix)} className={cn(tertiary, "-my-2 shrink-0")} id="mix-edit">
              {t("spray.edit")}
            </button>
          </div>
          <ul className="flex flex-col" id="mix-items">
            {mix.items.map((i, k) => (
              <li key={k} className="flex items-baseline justify-between gap-3 py-1 text-[0.875rem]">
                <span className="min-w-0 [overflow-wrap:anywhere]">{i.name}</span>
                <span className={cn("shrink-0", i.dose != null ? "font-num" : "text-fg-3")}>{i.dose != null ? t("spray.perL", { dose: num(i.dose, i.dose % 1 ? 1 : 0), unit: i.unit }) : t("spray.noDose")}</span>
              </li>
            ))}
          </ul>
          <p className="text-[0.8125rem] text-fg-2">{mix.everyDays ? t("spray.everyText", { n: mix.everyDays }) : t("spray.everyNone")}</p>
          {mix.note && <p className="text-[0.8125rem] leading-[1.45] whitespace-pre-line text-fg-2">{mix.note}</p>}
          <button type="button" onClick={() => setEditing("new")} className={cn(tertiary, "self-start")} id="mix-add">
            {t("spray.add")}
          </button>
        </Card>
      </Reveal>

      <Reveal i={1}>
        <Card className="gap-3">
          <NumField id="mix-l" label={t("ipw.litres")} value={litres} onChange={setLitres} />
          {amounts && (
            <div id="mix-amounts">
              <div className="mb-1 text-[0.75rem] font-medium text-fg-2">{t("spray.amounts")}</div>
              <ul className="flex flex-col">
                {amounts.map((a, k) => (
                  <li key={k} className="flex items-baseline justify-between gap-3 py-0.5 text-[0.875rem]">
                    <span className="min-w-0 [overflow-wrap:anywhere]">{a.name}</span>
                    <span className={cn("shrink-0", a.amount != null ? "font-num font-semibold" : "text-fg-3")}>{a.amount != null ? `${num(a.amount, a.amount % 1 ? 1 : 0)} ${a.unit}` : t("spray.noDose")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </Reveal>

      <Reveal i={2}>
        <Card className="gap-1">
          <Label>{t("ipw.checklist")}</Label>
          {points.length ? (
            <ul className="mt-1.5 flex flex-col" id="mix-checklist">
              {points.map((c) => {
                const on = checked.includes(c)
                return (
                  <li key={c}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setChecked((x) => (on ? x.filter((y) => y !== c) : [...x, c]))}
                      className="flex min-h-11 w-full items-center gap-3 border-t border-line py-2 text-left first:border-t-0"
                    >
                      <span className={cn("flex size-[22px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px]", on ? "border-leaf bg-leaf text-background" : "border-line-strong")}>
                        {on && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      <span className="text-[0.84375rem] leading-snug [overflow-wrap:anywhere]">{c}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-1 text-[0.78125rem] text-fg-3">{t("spray.checkNone")}</p>
          )}
          <Button onClick={save} disabled={!L || L <= 0 || !space || busy} className="mt-2 h-12" id="mix-save">
            {points.length && checked.length < points.length ? t("ipw.saveUnchecked", { n: checked.length, total: points.length }) : t("ipw.save")}
          </Button>
        </Card>
      </Reveal>

      <Reveal i={3}>
        <Card className="gap-1.5">
          <Label>{t("spray.history")}</Label>
          <p className="text-[0.78125rem] font-medium text-fg-2" id="mix-next">
            {next ? t("spray.next", { date: fmt(next) }) : mix.everyDays ? t("spray.none") : t("spray.nextNone")}
          </p>
          {mine.length > 0 && (
            <ul id="mix-history">
              {mine.slice(0, 10).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 border-t border-line py-2 text-[0.8125rem] first:border-t-0">
                  <span className="text-fg-2">{fmt(s.date)}</span>
                  <span className="font-num">{`${num(s.litres, s.litres % 1 ? 1 : 0)} L`}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Reveal>
      {sheet}
    </div>
  )
}

const emptyDraft = (): MixDraft => ({ name: "", items: [{ name: "", dose: "", unit: "mL" }], every: "", checklist: "", note: "" })

/** The mix as the user makes it: name, products and doses per litre, frequency, own checklist, notes. */
function MixSheet({ mix, onClose, onSaved }: { mix: SprayMix | "new" | null; onClose: () => void; onSaved: (id: string) => void }) {
  const { t, settings } = useSettings()
  const { grow, saveGrow, customProducts } = useGrow()
  const [d, setD] = useState<MixDraft>(emptyDraft)
  const [busy, setBusy] = useState(false)
  const [wasFor, setWasFor] = useState<typeof mix>(null)
  if (mix !== wasFor) {
    setWasFor(mix)
    if (mix && mix !== "new")
      setD({
        name: mix.name,
        items: mix.items.length ? mix.items.map((i) => ({ name: i.name, dose: i.dose != null ? formatInput(settings.lang, i.dose) : "", unit: i.unit, ...(i.productId ? { productId: i.productId } : {}) })) : emptyDraft().items,
        every: mix.everyDays ? String(mix.everyDays) : "",
        checklist: (mix.checklist ?? []).join("\n"),
        note: mix.note ?? "",
      })
    else if (mix === "new") setD(emptyDraft())
  }
  const setItem = (k: number, patch: Partial<MixDraft["items"][number]>) => setD((x) => ({ ...x, items: x.items.map((i, j) => (j === k ? { ...i, ...patch } : i)) }))
  const all = validMixes(grow?.sprayMixes)
  const save = async () => {
    const id = mix && mix !== "new" ? mix.id : newId("mix-")
    const next = mixFromDraft(id, d, parseNum)
    if (!next) {
      toast.error(t("spray.noName"))
      return
    }
    setBusy(true)
    try {
      await saveGrow({ sprayMixes: [...all.filter((m) => m.id !== id), next] })
      toast.success(t("spray.saved"))
      onSaved(id)
      onClose()
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error).message }))
    } finally {
      setBusy(false)
    }
  }
  const remove =
    mix && mix !== "new"
      ? async () => {
          // Past sprays keep their own copy of the mix (name and doses of that day).
          await saveGrow({ sprayMixes: all.filter((m) => m.id !== mix.id) })
          toast.success(t("spray.deleted"))
          onClose()
        }
      : undefined
  // Only the name and unit of « Mes produits » are taken: their doses are for the tank or the watering can, not a spray.
  const picks = customProducts.filter((p) => !d.items.some((i) => i.productId === p.id))
  return (
    <Sheet open={!!mix} onOpenChange={(o) => !o && onClose()} title={mix === "new" ? t("spray.title") : t("spray.titleEdit")} description={t("spray.desc")} footer={<SaveBar busy={busy} onSave={save} onDelete={remove} />}>
      <div className="flex flex-col gap-4" id="mix-form">
        <TextField id="mix-name" label={t("spray.name")} value={d.name} onChange={(v) => setD((x) => ({ ...x, name: v }))} placeholder={t("spray.namePh")} />
        <div className="flex flex-col gap-2">
          <div className="text-[0.75rem] font-medium text-fg-2">{t("spray.products")}</div>
          {d.items.map((i, k) => (
            <div key={k} className="grid grid-cols-[1fr_7rem_auto] items-end gap-2" data-mix-row={k}>
              <TextField id={`mix-p-${k}`} label={t("spray.product")} value={i.name} onChange={(v) => setItem(k, { name: v, productId: undefined })} />
              <NumField id={`mix-d-${k}`} label={t("spray.dose")} unit={`${i.unit}/L`} value={i.dose} onChange={(v) => setItem(k, { dose: v })} />
              <button type="button" aria-label={t("spray.removeProduct")} onClick={() => setD((x) => ({ ...x, items: x.items.filter((_, j) => j !== k) }))} className={iconButton}>
                <X className="size-4" />
              </button>
              <div className="col-span-3 -mt-1 flex gap-1.5">
                {(["mL", "g"] as const).map((u) => (
                  <button key={u} type="button" aria-pressed={i.unit === u} onClick={() => setItem(k, { unit: u })} className={cn("min-h-9 rounded-[8px] border px-2.5 font-num text-[0.75rem] font-semibold", i.unit === u ? "border-fg text-fg" : "border-line text-fg-3")}>
                    {`${u}/L`}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setD((x) => ({ ...x, items: [...x.items, { name: "", dose: "", unit: "mL" }] }))} className={cn(tertiary, "self-start")} id="mix-add-product">
            {t("spray.addProduct")}
          </button>
          {picks.length > 0 && (
            <div>
              <div className="mb-1 text-[0.75rem] text-fg-3">{t("spray.fromMine")}</div>
              <div className="flex flex-wrap gap-1.5" id="mix-from-mine">
                {picks.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setD((x) => {
                        const items = x.items.filter((i) => i.name.trim() || i.dose.trim())
                        return { ...x, items: [...items, { name: p.name, dose: "", unit: p.unit, productId: p.id }] }
                      })
                    }
                    className="min-h-9 rounded-[8px] border border-line-strong px-2.5 text-[0.8125rem] text-fg-2"
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <NumField id="mix-every" label={t("spray.every")} integer hint={t("spray.everyHint")} value={d.every} onChange={(v) => setD((x) => ({ ...x, every: v }))} />
        <AreaField id="mix-check" label={t("spray.checklist")} value={d.checklist} onChange={(v) => setD((x) => ({ ...x, checklist: v }))} />
        <AreaField id="mix-note" label={t("spray.note")} value={d.note} onChange={(v) => setD((x) => ({ ...x, note: v }))} />
      </div>
    </Sheet>
  )
}
