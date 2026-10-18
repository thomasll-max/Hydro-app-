// One place that opens the bottom sheets, from any screen (FAB, Today, Journal).
import * as React from "react"
import { EntrySheet, type EntryInit } from "@/screens/entry-sheet"
import { CycleSheet, EventSheet, MixSheet, PlantSheet } from "@/screens/sheets"
import { QuickSheet } from "@/screens/quick-sheet"
import { ReminderSheet, type ReminderInit } from "@/screens/reminder-sheet"
import type { GrowEvent, Mix, PlantId } from "@/model/types"
import { SpaceSheet, type SpaceSection } from "@/screens/tools/space-sheet"
import { useGrow } from "./grow-context"

type Editors = {
  openEntry: (init?: EntryInit) => void
  openCycle: (opts?: { harvestOnly?: boolean; cycleId?: string; spaceId?: string }) => void
  openPlant: (id: PlantId) => void
  openEvent: (e?: GrowEvent) => void
  openMix: (m?: Mix) => void
  openQuick: () => void
  openReminder: (init?: ReminderInit) => void
  /** Settings of a space, scrolled to a section (lot 9: one settings page per space). */
  openSpace: (spaceId: string, section?: SpaceSection) => void
  /** A form is open (entry, cycle…): no update reload is offered meanwhile (lot 8e). */
  editing: boolean
}
const Ctx = React.createContext<Editors | null>(null)

type State =
  | { kind: "entry"; init: EntryInit }
  | { kind: "cycle"; harvestOnly?: boolean; cycleId?: string; spaceId?: string }
  | { kind: "plant"; id: PlantId }
  | { kind: "event"; event?: GrowEvent }
  | { kind: "mix"; mix?: Mix }
  | { kind: "quick" }
  | { kind: "reminder"; init: ReminderInit }
  | { kind: "space"; spaceId: string; section?: SpaceSection }
  | null

export function EditorsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<State>(null)
  // Keep the last state while the sheet animates out.
  const [last, setLast] = React.useState<NonNullable<State>>({ kind: "entry", init: {} })
  const open = (s: NonNullable<State>) => {
    setLast(s)
    setState(s)
  }
  const close = (o: boolean) => !o && setState(null)
  const api = React.useMemo<Editors>(
    () => ({
      openEntry: (init = {}) => open({ kind: "entry", init }),
      openCycle: (o) => open({ kind: "cycle", harvestOnly: o?.harvestOnly, cycleId: o?.cycleId, spaceId: o?.spaceId }),
      openPlant: (id) => open({ kind: "plant", id }),
      openEvent: (event) => open({ kind: "event", event }),
      openMix: (mix) => open({ kind: "mix", mix }),
      openQuick: () => open({ kind: "quick" }),
      openReminder: (init = {}) => open({ kind: "reminder", init }),
      openSpace: (spaceId, section) => open({ kind: "space", spaceId, section }),
      editing: state != null,
    }),
    [state],
  )
  const is = (k: NonNullable<State>["kind"]) => state?.kind === k
  return (
    <Ctx.Provider value={api}>
      {children}
      <EntrySheet open={is("entry")} onOpenChange={close} init={last.kind === "entry" ? last.init : {}} />
      <CycleSheet
        open={is("cycle")}
        onOpenChange={close}
        harvestOnly={last.kind === "cycle" ? last.harvestOnly : false}
        cycleId={last.kind === "cycle" ? last.cycleId : undefined}
        spaceId={last.kind === "cycle" ? last.spaceId : undefined}
      />
      <PlantSheet open={is("plant")} onOpenChange={close} plantId={last.kind === "plant" ? last.id : "P1"} />
      <EventSheet open={is("event")} onOpenChange={close} event={last.kind === "event" ? last.event : undefined} />
      <MixSheet open={is("mix")} onOpenChange={close} mix={last.kind === "mix" ? last.mix : undefined} />
      <ReminderSheet open={is("reminder")} onOpenChange={close} init={last.kind === "reminder" ? last.init : {}} />
      <SpaceSettings open={is("space")} onOpenChange={close} spaceId={last.kind === "space" ? last.spaceId : undefined} section={last.kind === "space" ? last.section : undefined} />
      <QuickSheet open={is("quick")} onOpenChange={close} onFull={(spaceId) => open({ kind: "entry", init: { spaceId } })} />
    </Ctx.Provider>
  )
}

function SpaceSettings({ open, onOpenChange, spaceId, section }: { open: boolean; onOpenChange: (o: boolean) => void; spaceId?: string; section?: SpaceSection }) {
  const { allSpaces } = useGrow()
  const space = allSpaces.find((s) => s.id === spaceId)
  return space ? <SpaceSheet open={open} onOpenChange={onOpenChange} space={space} section={section} /> : null
}

export function useEditors() {
  const c = React.useContext(Ctx)
  if (!c) throw new Error("useEditors outside provider")
  return c
}
