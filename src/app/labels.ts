import type { StageInfo } from "@/calc/stage"
import type { Lang, MessageKey } from "@/i18n/types"
import { lowerWord, type Vars } from "@/i18n/core"

type T = (k: MessageKey, v?: Vars) => string

/** "Floraison S3 · J17", "Végé S3 · J20", "Semis · J5"… */
export function stageLine(t: T, s: StageInfo): string {
  if (s.key === "notStarted") return t("stage.notStarted")
  if (s.key === "harvested") return t("stage.harvested")
  if (s.flowerWeek) return t("stage.lineFlower", { week: s.flowerWeek, day: s.flowerDay! })
  if (s.key === "veg") return t("stage.lineVeg", { week: s.week, day: s.day })
  return t("stage.lineSeedling", { day: s.day })
}

/** Short stage of the digest: "Semis · J5", "Végé S2", "Floraison S6 · masse", "Rinçage" (lot 10b, one vocabulary). */
export function stageShort(t: T, s: StageInfo, lang: Lang = "fr"): string {
  if (s.key === "notStarted") return t("stage.notStarted")
  if (s.key === "harvested") return t("stage.harvested")
  if (s.key === "flush") return t("stage.flush")
  if (s.flowerWeek) return t("stage.lineFlowerPhase", { week: s.flowerWeek, phase: lowerWord(lang, t(`stage.${s.key}` as MessageKey)) })
  if (s.key === "veg") return t("stage.lineVegShort", { week: s.week })
  return t("stage.lineSeedling", { day: s.day })
}
