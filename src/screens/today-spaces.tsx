// The digests kept for the morning task (spec §3), and the owner's name. The « Tous » view is in today-calm.tsx (lot
// 10k1), the page of a space in space-page.tsx (lot 10l1).
import { useEffect, useMemo, useRef } from "react"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { todayIso } from "@/calc/stage"
import { changedDigestDocs, digestKey, digestWeek, type DigestData } from "@/calc/digest"
import type { Lang } from "@/i18n/types"

export function useDigestData(): DigestData {
  const { grow, spaces, sites, cycles, all, equipment, assignments, reminders, customProducts, concentrateStocks, sprays } = useGrow()
  return useMemo(
    () => ({ grow, spaces, sites, cycles, entries: all.entries, mixes: all.mixes, events: all.events, equipment, assignments, reminders, customProducts, concentrateStocks, sprays }),
    [grow, spaces, sites, cycles, all.entries, all.mixes, all.events, equipment, assignments, reminders, customProducts, concentrateStocks, sprays],
  )
}

/** Quiet time after the last change before the week of digests is computed and written. */
const DIGEST_DELAY_MS = 4000

/**
 * Keeps a week of digests current for the morning task (Claude version only). Grouped (lot 10d): computed and written
 * once things settle (4 s after the last entry, or when the app goes to the background / Today is left), and only the
 * docs whose text changed, in one batch. Old dated docs are pruned once a day.
 */
function usePersistDigest(data: DigestData, lang: Lang) {
  const { storeKind, saveDigestWeek } = useGrow()
  const written = useRef(new Map<string, string>())
  const prunedOn = useRef("")
  const pending = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (storeKind !== "artifact") return
    const run = () => {
      pending.current = null
      const today = todayIso()
      const week = digestWeek(data, today, lang)
      const only = changedDigestDocs(week, written.current)
      const prune = prunedOn.current !== today
      if (!only.length && !prune) return
      for (const [p, d] of only) written.current.set(p, digestKey(d))
      prunedOn.current = today
      void saveDigestWeek(week, { only, prune }).catch(() => {
        for (const [p] of only) written.current.delete(p)
        prunedOn.current = ""
      })
    }
    pending.current = run
    const timer = setTimeout(run, DIGEST_DELAY_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [data, lang, storeKind, saveDigestWeek])
  // Leaving Today or the app: what is pending is written now.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden") pending.current?.()
    }
    document.addEventListener("visibilitychange", flush)
    return () => {
      document.removeEventListener("visibilitychange", flush)
      pending.current?.()
    }
  }, [])
}

/** Keeps the week of digests written while Aujourd'hui is open (it was done by the summary card until lot 10k1). */
export function DigestKeeper() {
  const { settings } = useSettings()
  usePersistDigest(useDigestData(), settings.lang)
  return null
}

/** The first name of « Bonjour Thomas. »: the one set in Réglages, else the one in « Grow de Thomas » (lot 10h). */
export function ownerName(grow?: { name?: string; ownerName?: string } | null): string | undefined {
  if (grow?.ownerName?.trim()) return grow.ownerName.trim()
  // « Grow de Thomas (simulation 1 an) » → Thomas: what is in brackets is not a name; more than two words neither.
  const name = (grow?.name ?? "").replace(/\s*\(.*\)\s*$/, "").trim()
  const m = /^grow (?:de |d['’]\s*)(.+)$/i.exec(name) ?? /^(.+?)['’]s grow$/i.exec(name)
  const who = m?.[1]?.trim()
  return who && who.split(/\s+/).length <= 2 ? who : undefined
}
