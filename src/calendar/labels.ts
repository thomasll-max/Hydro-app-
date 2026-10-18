// Text of calendar items (FR/EN), shared by the screens, the Bonjour card and the .ics export.
import type { Lang } from "@/i18n/types"
import { formatNumber, translate } from "@/i18n/core"
import type { Deadline } from "./deadlines"
import type { CalItem } from "./agenda"

export function deadlineTitle(lang: Lang, d: Deadline): string {
  const v = { ...d.vars }
  if (d.kind === "tank") {
    if (v.litres === "" || v.litres == null) return translate(lang, "cal.dl.tankNoL", v)
    v.litres = formatNumber(lang, Number(v.litres))
  }
  return translate(lang, `cal.dl.${d.kind}`, v)
}

export function itemTitle(lang: Lang, i: CalItem): string {
  return i.type === "reminder" ? i.occ.reminder.title : deadlineTitle(lang, i.deadline)
}
