// The « + » of the tab bar (lot 10k3): a small sheet with what can be added, in place of the three big buttons that
// were at the top of the Journal. Saisie du jour, Saisie rapide (several spaces), Nouveau bidon, Événement.
import { CalendarPlus, ChevronRight, FlaskConical, Layers, NotebookPen } from "lucide-react"
import { Sheet } from "@/components/hydro/form"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { useEditors } from "@/app/editors"
import { todayIso } from "@/calc/stage"
import type { MessageKey } from "@/i18n/types"

export function AddSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useSettings()
  const { spaces, selection, cycle } = useGrow()
  const ed = useEditors()
  const spaceId = selection.kind === "space" ? selection.space.id : (cycle?.spaceId ?? spaces[0]?.id)
  const rows: { id: string; Icon: typeof Layers; title: MessageKey; desc: MessageKey; tone: string; run: () => void }[] = [
    { id: "entry", Icon: NotebookPen, title: "add.entry", desc: "add.entryD", tone: "text-water", run: () => ed.openEntry({ date: todayIso(), spaceId }) },
    ...(spaces.length > 1 ? [{ id: "quick", Icon: Layers, title: "add.quick" as MessageKey, desc: "add.quickD" as MessageKey, tone: "text-water", run: () => ed.openQuick() }] : []),
    { id: "mix", Icon: FlaskConical, title: "add.mix", desc: "add.mixD", tone: "text-water", run: () => ed.openMix() },
    { id: "event", Icon: CalendarPlus, title: "add.event", desc: "add.eventD", tone: "text-leaf", run: () => ed.openEvent() },
  ]
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("add.title")} dirty={false}>
      <ul className="flex flex-col pb-2" id="add-menu">
        {rows.map(({ id, Icon, title, desc, tone, run }) => (
          <li key={id}>
            <button
              type="button"
              id={`add-${id}`}
              onClick={() => {
                // Closed and the next sheet opened in the same tick: one step in the history (back closes the new one).
                onOpenChange(false)
                run()
              }}
              className="flex min-h-[58px] w-full items-center gap-3.5 py-1.5 text-left"
            >
              <Icon aria-hidden="true" className={`size-6 shrink-0 ${tone}`} strokeWidth={1.5} />
              <span className="min-w-0 flex-1">
                <b className="block text-[0.9375rem] font-semibold">{t(title)}</b>
                <span className="block text-[0.78125rem] leading-snug text-fg-3">{t(desc)}</span>
              </span>
              <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-fg-3" />
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
