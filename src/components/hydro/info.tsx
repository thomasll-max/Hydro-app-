// Jargon explained where it appears (lot 10e): a small (i) opens the definition; the whole list is in Outils → Repères.
import { Info } from "lucide-react"
import { Popover } from "radix-ui"
import { useSettings } from "@/app/settings-context"
import type { MessageKey } from "@/i18n/types"

export const TERMS = ["vpd", "dli", "ppfd", "dryback", "drybackSensor", "runoff", "ec", "phases", "steer"] as const
export type Term = (typeof TERMS)[number]

export function InfoTip({ term }: { term: Term }) {
  const { t } = useSettings()
  const name = t(`glossary.${term}T` as MessageKey)
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" aria-label={t("glossary.what", { term: name })} className="hit-sq inline-flex size-4 shrink-0 items-center justify-center rounded-full text-fg-3 hover:text-fg">
          <Info className="size-3.5" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="center"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 max-w-[min(18rem,calc(100vw-24px))] rounded-lg border border-line-strong bg-surface p-3 text-left text-[0.8125rem] leading-[1.45] text-fg-2 shadow-card"
        >
          <b className="block text-fg">{name}</b>
          {t(`glossary.${term}` as MessageKey)}
          <span className="mt-1.5 block text-[0.75rem] text-fg-3">{t("glossary.more")}</span>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** The whole glossary (Repères). */
export function Glossary() {
  const { t } = useSettings()
  return (
    <dl className="flex flex-col gap-2.5 text-[0.8125rem] leading-[1.45]" id="glossary">
      {TERMS.map((k) => (
        <div key={k}>
          <dt className="font-semibold text-fg">{t(`glossary.${k}T` as MessageKey)}</dt>
          <dd className="text-fg-2">{t(`glossary.${k}` as MessageKey)}</dd>
        </div>
      ))}
    </dl>
  )
}
