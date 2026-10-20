// Lot 14b: Stack in the Nutrition tool (official Stack page, read on 20/10/2026). How it is given (in the tank, last; by
// hand; sprayed), whether it may be given now (last week of veg → flowering week 3), the last time, its doses with the
// label's unit and the converted one, and a weekly reminder offered — never set by itself.
import { Card } from "@/components/ui/card"
import { Chip, Label, Notice, Reveal } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { useEditors } from "@/app/editors"
import { STACK, type StackUse } from "@/data/nutrients"
import { shownPerL, stackDrenchPerL, stackFoliarPerL, type StackWindow } from "@/calc/stack"
import { secondary } from "@/components/hydro/styles"
import { locales } from "@/i18n/core"
import type { IsoDate } from "@/model/types"

const USE_KEY = { tank: "nut.stackTank", hand: "nut.stackHand", foliar: "nut.stackFoliar" } as const

export function StackCard({ i, use, win, last, spaceId }: { i: number; use: StackUse; win: StackWindow; last?: IsoDate; spaceId?: string }) {
  const { t, num, range, settings } = useSettings()
  const ed = useEditors()
  const date = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(settings.lang === "en" ? "en-GB" : locales[settings.lang], { day: "numeric", month: "short" })
  const [lo, hi] = stackDrenchPerL()
  const gal = range(STACK.drench.mlPerGal[0], STACK.drench.mlPerGal[1])
  const perL = range(shownPerL(lo), shownPerL(hi), 2)
  return (
    <Reveal i={i}>
      <Card className="gap-2" id="nut-stack" data-use={use}>
        <div className="flex items-center justify-between gap-2">
          <Label>{t("nut.stackTitle")}</Label>
          <Chip tone={win.ok ? "primary" : "warn"}>{t(USE_KEY[use])}</Chip>
        </div>
        {win.ok ? (
          <p className="text-[0.8125rem] leading-[1.45] text-fg-2" id="nut-stack-window">
            {win.until ? t("nut.stackOkUntil", { date: date(win.until) }) : t("nut.stackOk")}
          </p>
        ) : (
          <Notice className="text-[0.8125rem]" id="nut-stack-window">
            {t(`nut.stackWhy_${win.reason}`)}
          </Notice>
        )}
        <p className="text-[0.78125rem] leading-[1.45] text-fg-2" id="nut-stack-dose">
          {use === "tank"
            ? t("nut.stackSub", { gal, perL })
            : use === "hand"
              ? t("nut.stackHandD", { gal, perL })
              : t("nut.stackFoliarD", { gal: num(STACK.foliar.mlPerGal), perL: num(shownPerL(stackFoliarPerL()), 2) })}
        </p>
        {last && <p className="text-[0.75rem] text-fg-3">{t("nut.stackWeek", { date: date(last) })}</p>}
        {use !== "tank" && <p className="text-[0.75rem] leading-[1.45] text-fg-3">{t("nut.stackShake")}</p>}
        <button
          type="button"
          id="nut-stack-reminder"
          className={secondary + " self-start"}
          onClick={() => ed.openReminder({ title: STACK.name, spaceId, repeat: "weekly", note: t("nut.stackReminderNote"), ...(win.ok && win.until ? { until: win.until } : {}) })}
        >
          {t("nut.stackReminder")}
        </button>
      </Card>
    </Reveal>
  )
}
