// Navigation in the browser history (lot 10d): tabs, tools and sheets each take a step, so the phone's back gesture
// closes the open sheet first, then goes back to the tool list, then to Today, and only then leaves the app.
// Routes live in the hash: "" (Today), #journal, #calendar, #calendar/2026-10-21, #charts, #tools, #tools/irrigation…
// A cycle's review: #journal/bilan/{cycleId}, compared: #journal/bilan/{cycleId}/{otherId} (lot 12a).
// The photos: #journal/photos[/{cycleId}], the strip of a cycle: #journal/frise/{cycleId}[/P2] (lot 12b).
// Since lot 10h the Calendar has no tab: it opens over the screen it came from (week strip, date of the top bar, Outils),
// and back returns there.
import { useSyncExternalStore } from "react"

export const TAB_IDS = ["today", "journal", "calendar", "charts", "tools"] as const
export type TabId = (typeof TAB_IDS)[number]
export const TOOL_IDS = ["start", "irrigation", "nutrition", "ph", "ipw", "light", "climate", "ask", "equipment", "data", "reperes", "settings"] as const
export type ToolId = (typeof TOOL_IDS)[number]
export type Route = {
  tab: TabId
  tool?: ToolId
  /** Calendar opened on a day; the day of a week page of the Journal (lot 10k3). */
  day?: string
  /** A week page of the Journal (lot 10k3): « spaceId/2026-02-02 » (its Monday). */
  week?: string
  /** The review of a cycle (lot 12a): its id; `vs` = the cycle it is compared with. */
  review?: string
  vs?: string
  /** The photo gallery (lot 12b): "all", or a cycle's id to open it filtered. */
  photos?: string
  /** The week-by-week strip of a cycle (lot 12b), and of one of its plants. */
  strip?: string
  plant?: string
}

const isTool = (s: string | undefined): s is ToolId => !!s && (TOOL_IDS as readonly string[]).includes(s)

/** Route of a hash. Old links (#irrigation, #guide) still open their tool. */
export function parseHash(hash: string): Route {
  const [a, b, c, d] = decodeURIComponent(hash.replace(/^#/, "")).split("/")
  if (a === "tools") return isTool(b) ? { tab: "tools", tool: b } : { tab: "tools" }
  const iso = (x?: string) => /^\d{4}-\d{2}-\d{2}$/.test(x ?? "")
  if (a === "journal" && b === "photos") return { tab: "journal", photos: c || "all" }
  if (a === "journal" && b === "frise" && c) return { tab: "journal", strip: c, ...(d ? { plant: d } : {}) }
  if (a === "journal" && b === "bilan" && c) return { tab: "journal", review: c, ...(d ? { vs: d } : {}) }
  if (a === "journal" && b && iso(c)) return { tab: "journal", week: `${b}/${c}`, ...(iso(d) ? { day: d } : {}) }
  if (a === "calendar") return /^\d{4}-\d{2}-\d{2}$/.test(b ?? "") ? { tab: "calendar", day: b } : { tab: "calendar" }
  if (isTool(a)) return { tab: "tools", tool: a }
  if (a === "guide") return { tab: "tools", tool: "reperes" }
  return (TAB_IDS as readonly string[]).includes(a) ? { tab: a as TabId } : { tab: "today" }
}

/** Hash of a route; Today has none. */
export function routeHash(r: Route): string {
  if (r.tab === "today") return ""
  if (r.tab === "calendar" && r.day) return `#calendar/${r.day}`
  if (r.tab === "journal" && r.photos) return `#journal/photos${r.photos !== "all" ? `/${encodeURIComponent(r.photos)}` : ""}`
  if (r.tab === "journal" && r.strip) return `#journal/frise/${encodeURIComponent(r.strip)}${r.plant ? `/${r.plant}` : ""}`
  if (r.tab === "journal" && r.review) return `#journal/bilan/${encodeURIComponent(r.review)}${r.vs ? `/${encodeURIComponent(r.vs)}` : ""}`
  if (r.tab === "journal" && r.week) return `#journal/${r.week}${r.day ? `/${r.day}` : ""}`
  return r.tab === "tools" && r.tool ? `#tools/${r.tool}` : `#${r.tab}`
}

/** What this app keeps in each history entry: how deep it is, and the hash of the entry below it. */
export type NavState = { depth: number; prev?: string }
export type NavAction = { kind: "push" | "replace"; hash: string } | { kind: "back"; then?: Route } | null

/**
 * How to go from one route to the next. The history never grows beyond Today → tab → tool: switching between tabs
 * replaces the entry, so back always leads to Today, then out (as Android's bottom navigation does).
 * `push` (the Calendar, « Tous les réglages » of the display menu, lot 10h) keeps the screen it came from: back returns there.
 */
export function planNav(cur: Route, next: Route, st: NavState, push = false): NavAction {
  const hash = routeHash(next)
  if (hash === routeHash(cur)) return null
  // Going back where we came from (the tool list, Today): a real step back.
  if (st.depth > 0 && hash === st.prev) return { kind: "back" }
  if (st.depth === 0 || push) return { kind: "push", hash }
  // Opening a tool from the list.
  if (cur.tab === "tools" && !cur.tool && next.tool) return { kind: "push", hash }
  // Leaving a tool for another tab: back to the list first, then switch.
  if (cur.tool && st.depth >= 2) return { kind: "back", then: next }
  return { kind: "replace", hash }
}

// ---- browser side -------------------------------------------------------------------------------------------------

type Entry = { hydro?: NavState; hydroSheet?: boolean } | null
const hasWindow = typeof window !== "undefined"
const entry = (): Entry => (hasWindow ? (history.state as Entry) : null)
const navState = (): NavState => entry()?.hydro ?? { depth: 0 }
const url = (hash: string) => (hash ? hash : location.pathname + location.search)
/** The history can be locked (sandboxed frame): the app then still works, without back steps. */
function safe(fn: () => void): boolean {
  try {
    fn()
    return true
  } catch {
    return false
  }
}

let route: Route = hasWindow ? parseHash(location.hash) : { tab: "today" }
/** The entry the app believes it is on (a link click adds one the app did not write). */
let here: { hash: string; depth: number } = { hash: routeHash(route), depth: 0 }
const subs = new Set<() => void>()
function setRoute(r: Route) {
  if (routeHash(r) === routeHash(route)) return
  route = r
  for (const s of subs) s()
}
let pending: Route | null = null

/** Go to a tab or a tool; `push` keeps the current screen under it (back returns to it). */
export function navigate(next: Route, opts: { push?: boolean } = {}) {
  const action = planNav(route, next, navState(), opts.push)
  if (!action) return
  if (action.kind === "back") {
    pending = action.then ?? null
    if (!safe(() => history.back())) {
      pending = null
      setRoute(action.then ?? parseHash(navState().prev ?? ""))
    }
    return
  }
  const cur = navState()
  const st: NavState = action.kind === "push" ? { depth: cur.depth + 1, prev: routeHash(route) } : cur
  const ok =
    action.kind === "push"
      ? safe(() => history.pushState({ hydro: st }, "", url(action.hash)))
      : safe(() => history.replaceState({ hydro: st }, "", url(action.hash)))
  if (!ok) safe(() => history.replaceState(null, "", url(action.hash)))
  here = { hash: action.hash, depth: ok ? st.depth : 0 }
  setRoute(next)
}

/** Back to the screen this one was opened from (the Calendar's back link); Today when there is none. */
export function goBack() {
  if (navState().depth > 0 && safe(() => history.back())) return
  navigate({ tab: "today" })
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => route,
  )
}

/** The page is on a new entry: a plain link (#data) or a typed hash gets its place in the app's history. */
function adopt() {
  const next = parseHash(location.hash)
  let st = entry()?.hydro
  if (!st) {
    const fresh: NavState = { depth: here.depth + 1, prev: here.hash }
    st = fresh
    safe(() => history.replaceState({ ...entry(), hydro: fresh }, "", url(routeHash(next))))
  }
  here = { hash: routeHash(next), depth: st.depth }
  setRoute(next)
}

// ---- sheets ---------------------------------------------------------------------------------------------------------

/** An open sheet: `onBack` closes it, or returns false when it asks first (unsaved changes). */
type Layer = { onBack: () => boolean }
const layers: Layer[] = []
let sheetPushed = false
/** Steps back the app took itself (closing a sheet from its buttons), not to be read as the back gesture. */
let ownBack = 0
let syncQueued = false

/** One history entry stands for all the open sheets; it is added and removed once React has settled. */
function syncSheets() {
  if (syncQueued || ownBack > 0) return
  syncQueued = true
  setTimeout(() => {
    syncQueued = false
    const want = layers.length > 0
    if (want && !sheetPushed) sheetPushed = safe(() => history.pushState({ ...entry(), hydroSheet: true }, "", location.href))
    else if (!want && sheetPushed) {
      sheetPushed = false
      if (entry()?.hydroSheet) {
        ownBack++
        if (!safe(() => history.back())) ownBack--
      }
    }
  }, 0)
}

/** Registers an open sheet so the back gesture closes it. */
export function addLayer(layer: Layer): () => void {
  layers.push(layer)
  syncSheets()
  return () => {
    const i = layers.indexOf(layer)
    if (i >= 0) layers.splice(i, 1)
    syncSheets()
  }
}

function onPop() {
  const onSheet = !!entry()?.hydroSheet
  if (ownBack > 0 && !onSheet) {
    ownBack--
    syncSheets()
  } else if (sheetPushed && !onSheet) {
    sheetPushed = false
    const top = layers[layers.length - 1]
    // The sheet asks before closing (unsaved changes): its step is put back.
    if (top && !top.onBack()) syncSheets()
  }
  adopt()
  if (pending) {
    const next = pending
    pending = null
    navigate(next)
  }
}

if (hasWindow) {
  // First load: old links become routes (#irrigation → #tools/irrigation); a sheet left open by a reload is gone.
  const st = entry()?.hydro ?? { depth: 0 }
  here = { hash: routeHash(route), depth: st.depth }
  safe(() => history.replaceState({ hydro: st }, "", url(routeHash(route))))
  window.addEventListener("popstate", onPop)
  window.addEventListener("hashchange", adopt)
}
