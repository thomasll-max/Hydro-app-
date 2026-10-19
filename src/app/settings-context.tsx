import * as React from "react"
import { getStores } from "@/store"
import {
  DEFAULT_SETTINGS,
  LOCAL_KEY,
  newer,
  parseSettings,
  resolveTheme,
  SETTINGS_PATH,
  type Settings,
  type ThemePref,
} from "@/lib/settings"
import { formatDate, formatDayMonth, formatInput, formatNumber, formatRange, locales, translate, type Vars } from "@/i18n/core"
import type { Lang, MessageKey } from "@/i18n/types"

export type SaveState = "idle" | "saved" | "local-only"

type Ctx = {
  settings: Settings
  resolvedTheme: "light" | "dark"
  setTheme: (t: ThemePref) => void
  setLang: (l: Lang) => void
  setActiveCycle: (id: string) => void
  setSpace: (sel: string) => void
  setConcentrate: (c: number) => void
  saveState: SaveState
  t: (key: MessageKey, vars?: Vars) => string
  num: (v: number, decimals?: number) => string
  range: (lo: number, hi: number, decimals?: number) => string
  dm: (iso: string) => string
  /** Day, month and year ("19/10/2026"). */
  dmy: (iso: string) => string
  /** A stored number in a form field ("2,4" in French). */
  show: (v?: number | null) => string
  locale: string
}

const SettingsContext = React.createContext<Ctx | null>(null)

function readLocal(): Settings {
  try {
    return parseSettings(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "null"))
  } catch {
    return DEFAULT_SETTINGS
  }
}
function writeLocal(s: Settings) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(s))
  } catch {
    /* private mode: the db copy still holds it */
  }
}

/** Host or OS preference, used when the app theme is "system". */
function useSystemDark(): boolean {
  const read = () => {
    const host = document.documentElement.getAttribute("data-theme")
    if (host === "dark") return true
    if (host === "light") return false
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
  }
  const [dark, setDark] = React.useState(read)
  React.useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)")
    const update = () => setDark(read())
    mq?.addEventListener("change", update)
    const mo = new MutationObserver(update)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
    return () => {
      mq?.removeEventListener("change", update)
      mo.disconnect()
    }
  }, [])
  return dark
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<Settings>(readLocal)
  // The latest settings, read by the writers below: no side effect inside a setState updater (lot 10d).
  const current = React.useRef(settings)
  const commit = React.useCallback((next: Settings) => {
    current.current = next
    setSettings(next)
  }, [])
  const [saveState, setSaveState] = React.useState<SaveState>("idle")
  const systemDark = useSystemDark()
  const resolvedTheme = resolveTheme(settings.theme, systemDark)

  // Apply theme + language on the root element.
  React.useEffect(() => {
    const root = document.documentElement
    if (settings.theme === "system") root.removeAttribute("data-app-theme")
    else root.setAttribute("data-app-theme", settings.theme)
    root.setAttribute("data-resolved-theme", resolvedTheme)
    root.lang = settings.lang
  }, [settings.theme, settings.lang, resolvedTheme])

  // Sync from db (settings/main): the newest copy wins.
  React.useEffect(() => {
    let unsub: (() => void) | undefined
    let cancelled = false
    getStores().then(({ docs }) => {
      if (cancelled) return
      unsub = docs.watchDoc(SETTINGS_PATH, (d) => {
        if (!d) return
        const remote = parseSettings(d)
        const local = current.current
        if (newer(local, remote) === remote) {
          writeLocal(remote)
          commit(remote)
        } else if (local.activeCycleId == null && remote.activeCycleId) commit({ ...local, activeCycleId: remote.activeCycleId })
      })
    })
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [commit])

  const update = React.useCallback(
    (patch: Partial<Pick<Settings, "theme" | "lang" | "activeCycleId" | "concentrate" | "space">>) => {
      const next: Settings = { ...current.current, ...patch, updatedAt: new Date().toISOString() }
      commit(next)
      writeLocal(next)
      getStores().then(async ({ docs }) => {
        try {
          await docs.set(SETTINGS_PATH, { ...next })
          setSaveState(docs.kind === "artifact" ? "saved" : "local-only")
        } catch {
          setSaveState("local-only")
        }
      })
    },
    [commit],
  )

  const value = React.useMemo<Ctx>(() => {
    const lang = settings.lang
    return {
      settings,
      resolvedTheme,
      setTheme: (theme) => update({ theme }),
      setLang: (l) => update({ lang: l }),
      setActiveCycle: (id) => update({ activeCycleId: id }),
      setSpace: (sel) => update({ space: sel }),
      setConcentrate: (c) => update({ concentrate: c }),
      saveState,
      t: (key, vars) => translate(lang, key, vars),
      num: (v, d = 0) => formatNumber(lang, v, d),
      // Whole-number bands read "4–10"; others keep the requested decimals ("5,8–6,2", "6,0–6,4").
      range: (lo, hi, d = 0) => {
        const dd = Number.isInteger(lo) && Number.isInteger(hi) ? 0 : d
        return lo === hi ? formatNumber(lang, lo, dd) : formatRange(lang, lo, hi, dd)
      },
      dm: (iso) => formatDayMonth(lang, new Date(`${iso}T12:00:00`)),
      dmy: (iso) => formatDate(lang, new Date(`${iso.slice(0, 10)}T12:00:00`)),
      show: (v) => formatInput(lang, v),
      locale: locales[lang],
    }
  }, [settings, resolvedTheme, saveState, update])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): Ctx {
  const ctx = React.useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>")
  return ctx
}
