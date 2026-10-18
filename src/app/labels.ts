import type { StageInfo } from "@/calc/stage"
import type { MessageKey } from "@/i18n/types"
import type { Vars } from "@/i18n/core"

type T = (k: MessageKey, v?: Vars) => string

/** "Floraison S3 · J17", "Végé S3 · J20", "Semis · J5"… */
export function stageLine(t: T, s: StageInfo): string {
  if (s.key === "notStarted") return t("stage.notStarted")
  if (s.key === "harvested") return t("stage.harvested")
  if (s.flowerWeek) return t("stage.lineFlower", { week: s.flowerWeek, day: s.flowerDay! })
  if (s.key === "veg") return t("stage.lineVeg", { week: s.week, day: s.day })
  return t("stage.lineSeedling", { day: s.day })
}
