// Outils → Réglages: display, grow, nutrition (line, add-ons, dosing), rooms, spaces, cycles and transfers.
import { useEffect, useState, type ReactNode } from "react"
import { ArrowRightLeft, Check, ChevronRight, CloudOff, Plus } from "lucide-react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Group, Seg, Sheet, TextField } from "@/components/hydro/form"
import { Label, Reveal } from "@/components/hydro/primitives"
import { LangSwitch, ThemeSwitch } from "@/components/hydro/top-bar"
import { SpaceDot } from "@/components/hydro/space-pill"
import { useSettings } from "@/app/settings-context"
import { newId, useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { navigate } from "@/app/nav"
import { SaveBar, useSaver } from "@/screens/sheets"
import { stageLine } from "@/app/labels"
import { stageOn, todayIso } from "@/calc/stage"
import { GROW_SCHEMA, type Site, type Space } from "@/model/grow"
import { groupBySite, transferCycle } from "@/model/grow-ops"
import { SCHEMA, type Cycle } from "@/model/types"
import { cn } from "@/lib/utils"
import { NutritionFields } from "./nutrition-settings"
import { RootProductsField, useRootProducts } from "@/screens/root-products"
import { SpaceSheet } from "./space-sheet"
import { SwitchRow } from "./equipment-shared"
import { ResetCard } from "./reset-card"
import { LockCard } from "./lock-card"
import { InstallTip } from "@/screens/install-tip"
import { TARGET } from "@/store"
import { CURRENT_BUILD, formatVersion } from "@/lib/version"
import { secondary, tertiary, toggle } from "@/components/hydro/styles"

export function SettingsTool() {
  const { t, dm, saveState, locale } = useSettings()
  const g = useGrow()
  const ed = useEditors()
  const [spaceSheet, setSpaceSheet] = useState<{ open: boolean; space?: Space }>({ open: false })
  const [siteSheet, setSiteSheet] = useState<{ open: boolean; site?: Site }>({ open: false })
  const [transfer, setTransfer] = useState<{ open: boolean; cycle?: Cycle }>({ open: false })
  const [name, setName] = useState(g.grow?.name ?? "")
  const [digest, setDigest] = useState(g.grow?.digestTime ?? "07:00")
  const [owner, setOwner] = useState(g.grow?.ownerName ?? "")
  useEffect(() => {
    setName(g.grow?.name ?? "")
    setDigest(g.grow?.digestTime ?? "07:00")
    setOwner(g.grow?.ownerName ?? "")
  }, [g.grow?.name, g.grow?.digestTime, g.grow?.ownerName])

  const saveGrow = async (patch: Parameters<typeof g.saveGrow>[0]) => {
    try {
      await g.saveGrow(patch)
    } catch (err) {
      toast.error(t("common.saveError", { reason: (err as Error)?.message ?? "?" }))
    }
  }
  const archived = g.allSpaces.filter((s) => s.archived)
  const spaceName = (id?: string) => g.allSpaces.find((s) => s.id === id)?.name ?? t("growSet.noSpace")

  return (
    <>
      <Reveal i={0} className="mb-3">
        <Card className="gap-3">
          <div className="flex items-center justify-between">
            <Label>
              {t("growSet.display")}
            </Label>
            {saveState !== "idle" && (
              <span className={cn("flex items-center gap-1 text-[0.75rem] font-semibold", saveState === "saved" ? "text-primary" : "text-fg-3")}>
                {saveState === "saved" ? <Check className="size-3.5" /> : <CloudOff className="size-3.5" />}
                {saveState === "saved" ? t("guide.saved") : t("guide.saveFailed")}
              </span>
            )}
          </div>
          <Row label={t("controls.theme")}>
            <ThemeSwitch />
          </Row>
          <Row label={t("controls.language")}>
            <LangSwitch />
          </Row>
        </Card>
      </Reveal>

      <Reveal i={1} className="mb-3">
        <Card className="gap-2.5">
          <Label>
            {t("growSet.grow")}
          </Label>
          <div onBlur={() => name.trim() && name !== g.grow?.name && saveGrow({ name: name.trim() })}>
            <TextField id="g-name" label={t("growSet.name")} value={name} onChange={setName} />
          </div>
          <div onBlur={() => owner.trim() !== (g.grow?.ownerName ?? "") && saveGrow({ ownerName: owner.trim() || undefined })}>
            <TextField id="g-owner" label={t("growSet.owner")} hint={t("growSet.ownerHint")} value={owner} onChange={setOwner} />
          </div>
          <div onBlur={() => digest && digest !== g.grow?.digestTime && saveGrow({ digestTime: digest })}>
            <TextField id="g-digest" type="time" label={t("growSet.digest")} hint={TARGET === "local" ? t("growSet.digestHintLocal") : t("growSet.digestHint")} value={digest} onChange={setDigest} />
          </div>
        </Card>
      </Reveal>

      <Reveal i={2} className="mb-3">
        <Card className="gap-2.5">
          <Label>
            {t("growSet.nutrition")}
          </Label>
          <NutritionFields value={g.grow?.nutrition ?? g.nutrition} onChange={(n) => saveGrow({ nutrition: n })} idPrefix="g" />
        </Card>
      </Reveal>

      <Reveal i={3} className="mb-3">
        <Card className="gap-1.5">
          <div className="flex items-center justify-between">
            <Label>
              {t("growSet.spaces")}
            </Label>
            <AddBtn onClick={() => setSpaceSheet({ open: true })}>{t("space.add")}</AddBtn>
          </div>
          {g.spaces.length === 0 && <p className="text-[0.78125rem] text-fg-3">{t("space.empty")}</p>}
          {groupBySite(g.spaces, g.sites).map((grp) => (
            <div key={grp.site?.id ?? "none"}>
              {grp.site && <div className="eyebrow mt-2 mb-0.5">{grp.site.name}</div>}
              <ul>
                {grp.spaces.map((s) => {
                  const c = g.cycles.find((x) => x.spaceId === s.id && !x.harvestDate && !x.archived)
                  const d = s.dimensionsCm
                  return (
                    <li key={s.id} className="border-t border-line first:border-t-0">
                      <button onClick={() => setSpaceSheet({ open: true, space: s })} className="flex min-h-14 w-full items-center gap-2.5 py-2 text-left">
                        <SpaceDot color={s.color} className="size-3" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.90625rem] font-semibold">{s.name}</span>
                          <span className="block truncate text-[0.75rem] text-fg-3">
                            {t(`template.${s.template}`)}
                            {d?.l && d.w && d.h ? ` · ${d.l}×${d.w}×${d.h} cm` : ""} · {c ? t("space.cycleIn", { name: c.name }) : t("space.noCycle")}
                          </span>
                        </span>
                        <ChevronRight className="size-4.5 shrink-0 text-fg-3" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          {archived.length > 0 && (
            <details className="mt-1 text-[0.8125rem]">
              <summary className="cursor-pointer py-2 font-semibold text-fg-2">
                {t("space.archived")} ({archived.length})
              </summary>
              <ul>
                {archived.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => setSpaceSheet({ open: true, space: s })} className="flex min-h-11 w-full items-center gap-2 text-left text-fg-3">
                      <SpaceDot color={s.color} /> {s.name}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      </Reveal>

      <Reveal i={4} className="mb-3">
        <Card className="gap-1.5">
          <div className="flex items-center justify-between">
            <Label>
              {t("site.title")}
            </Label>
            <AddBtn onClick={() => setSiteSheet({ open: true })}>{t("site.add")}</AddBtn>
          </div>
          {g.sites.length === 0 ? (
            <p className="text-[0.78125rem] text-fg-3">{t("site.empty")}</p>
          ) : (
            <ul>
              {g.sites.map((s) => (
                <li key={s.id} className="border-t border-line first:border-t-0">
                  <button onClick={() => setSiteSheet({ open: true, site: s })} className="flex min-h-12 w-full items-center justify-between gap-2 text-left">
                    <span className="text-[0.875rem] font-semibold">{s.name}</span>
                    <span className="text-[0.75rem] text-fg-3">{t("site.spaces", { n: String(g.spaces.filter((x) => x.siteId === s.id).length) })}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Reveal>

      <Reveal i={5} className="mb-3">
        <Card className="gap-1.5">
          <div className="flex items-center justify-between">
            <Label>
              {t("growSet.cycles")}
            </Label>
            <AddBtn onClick={() => ed.openCycle({ cycleId: "new" })}>{t("growSet.newCycle")}</AddBtn>
          </div>
          <ul>
            {g.cycles.map((c) => {
              const sp = g.allSpaces.find((s) => s.id === c.spaceId)
              const st = stageOn(c, todayIso())
              return (
                <li key={c.id} className="flex items-center gap-1 border-t border-line first:border-t-0">
                  <button
                    onClick={() => ed.openCycle({ cycleId: c.id })}
                    className="flex min-h-14 min-w-0 flex-1 items-center gap-2.5 py-2 text-left"
                  >
                    <SpaceDot color={sp?.color} className="size-3" />
                    <span className="min-w-0">
                      <span className="block truncate text-[0.90625rem] font-semibold">
                        {c.name}
                        {c.cultivars[0] ? <span className="font-normal text-fg-2"> · {c.cultivars[0]}</span> : null}
                      </span>
                      <span className="block truncate text-[0.75rem] text-fg-3">
                        {t("growSet.inSpace", { space: spaceName(c.spaceId) })} · {c.harvestDate ? t("growSet.harvested", { date: dm(c.harvestDate) }) : stageLine(t, st)}
                      </span>
                    </span>
                  </button>
                  {c.harvestDate && (
                    <button onClick={() => navigate({ tab: "journal", review: c.id }, { push: true })} className={secondary} data-review={c.id}>
                      {t("rv.open")}
                    </button>
                  )}
                  {!c.harvestDate && g.spaces.length > 1 && (
                    <button onClick={() => setTransfer({ open: true, cycle: c })} className={secondary} aria-label={t("growSet.transfer")}>
                      <ArrowRightLeft className="size-3.5" /> {t("growSet.transfer")}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      </Reveal>

      {TARGET === "local" && (
        <Reveal i={8} className="mb-3">
          <InstallTip />
        </Reveal>
      )}
      <LockCard i={9} />
      <ResetCard i={9} />
      {/* Lot 13: the last line, À propos (sources, credits, privacy). */}
      <Reveal i={10} className="mb-3">
        <Card className="py-1">
          <button type="button" id="settings-about" onClick={() => navigate({ tab: "tools", tool: "about" }, { push: true })} className="flex min-h-14 w-full items-center gap-2.5 text-left">
            <span className="min-w-0 flex-1">
              <span className="block text-[0.90625rem] font-semibold">{t("about.title")}</span>
              <span className="block text-[0.75rem] text-fg-3">{t("about.desc")}</span>
            </span>
            <ChevronRight aria-hidden="true" className="size-4.5 shrink-0 text-fg-3" />
          </button>
        </Card>
      </Reveal>
      <p className="mt-4 text-center text-[0.75rem] text-fg-3 tabular-nums" id="app-version">
        {t("growSet.version", { v: formatVersion(CURRENT_BUILD, locale) })}
      </p>
      <SpaceSheet open={spaceSheet.open} onOpenChange={(o) => setSpaceSheet((s) => ({ ...s, open: o }))} space={spaceSheet.space} />
      <SiteSheet open={siteSheet.open} onOpenChange={(o) => setSiteSheet((s) => ({ ...s, open: o }))} site={siteSheet.site} />
      <TransferSheet open={transfer.open} onOpenChange={(o) => setTransfer((s) => ({ ...s, open: o }))} cycle={transfer.cycle} />
    </>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[0.875rem] font-medium">{label}</span>
      {children}
    </div>
  )
}

function AddBtn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={tertiary}>
      <Plus className="size-4" /> {children}
    </button>
  )
}

function SiteSheet({ open, onOpenChange, site }: { open: boolean; onOpenChange: (o: boolean) => void; site?: Site }) {
  const { t } = useSettings()
  const { sites, saveSite } = useGrow()
  const [name, setName] = useState("")
  const { busy, run } = useSaver(() => onOpenChange(false))
  useEffect(() => {
    if (open) setName(site?.name ?? t("site.newName", { n: String(sites.length + 1) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={site ? site.name : t("site.add")}
      footer={
        <SaveBar
          busy={busy}
          onSave={() =>
            run(async () => {
              if (!name.trim()) throw new Error(t("site.name"))
              await saveSite(site ? { ...site, name: name.trim() } : { schemaVersion: GROW_SCHEMA.site, id: newId("site"), name: name.trim(), order: sites.length })
            })
          }
          onDelete={
            site
              ? async () => {
                  await saveSite({ ...site, archived: true })
                  onOpenChange(false)
                }
              : undefined
          }
        />
      }
    >
      <TextField id="site-name" label={t("site.name")} value={name} onChange={setName} />
    </Sheet>
  )
}

function TransferSheet({ open, onOpenChange, cycle }: { open: boolean; onOpenChange: (o: boolean) => void; cycle?: Cycle }) {
  const { t } = useSettings()
  const { spaces, saveCycle, saveEvent } = useGrow()
  const { setSpace } = useSettings()
  const others = spaces.filter((s) => s.id !== cycle?.spaceId)
  const [to, setTo] = useState("")
  const [date, setDate] = useState(todayIso())
  const [partial, setPartial] = useState(false)
  const [plants, setPlants] = useState<string[]>([])
  const { busy, run } = useSaver(() => onOpenChange(false))
  const rootState = useRootProducts(open, undefined, true)
  useEffect(() => {
    if (!open) return
    setTo(others[0]?.id ?? "")
    setDate(todayIso())
    setPartial(false)
    setPlants([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  if (!cycle) return null
  const labels = Array.from({ length: cycle.potCount ?? 4 }, (_, i) => `P${i + 1}`)
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("growSet.transferTitle", { name: cycle.name })}
      description={t("growSet.transferNote")}
      footer={
        <SaveBar
          busy={busy}
          onSave={() => {
            // A partial transfer moves the plants ticked below: at least one (lot 10d).
            if (partial && !plants.length) return void toast.error(t("growSet.pickPlant"))
            run(async () => {
              if (!to) return
              const next = transferCycle(cycle, to, date, new Date().toISOString(), partial ? { partial: true, plantIds: plants.map((p) => `${cycle.id}_${p}`) } : {})
              await saveCycle(next)
              await saveEvent({
                schemaVersion: SCHEMA.event,
                id: newId("ev"),
                date,
                type: "transfer",
                cycleId: cycle.id,
                spaceId: to,
                note: partial ? plants.join(", ") : undefined,
                ...(rootState.value.length ? { products: rootState.value } : {}),
                createdAt: new Date().toISOString(),
              })
              if (!partial) setSpace(to)
              return t("growSet.transferred")
            })
          }}
        />
      }
    >
      <Group title={t("growSet.transferTo")}>
        <Seg<string> label={t("growSet.transferTo")} value={to} onChange={setTo} options={others.map((s) => ({ value: s.id, label: s.name }))} />
      </Group>
      <Group title={t("growSet.transferDate")}>
        <TextField id="tr-date" type="date" label={t("growSet.transferDate")} value={date} onChange={(v) => setDate(v || todayIso())} />
      </Group>
      <RootProductsField state={rootState} />
      <div className="mt-3 border-y border-line">
        <SwitchRow id="tr-partial" label={t("growSet.partial")} hint={t("growSet.partialD")} checked={partial} onChange={setPartial} />
      </div>
      {partial && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {labels.map((p) => {
            const on = plants.includes(p)
            return (
              <button key={p} type="button" aria-pressed={on} onClick={() => setPlants((x) => (on ? x.filter((y) => y !== p) : [...x, p]))} className={toggle(on, "min-w-12 justify-center px-3")}>
                {p}
              </button>
            )
          })}
        </div>
      )}
    </Sheet>
  )
}
