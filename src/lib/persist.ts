// Persistent storage (lot 10a): asked once a grow exists, its state shown in Sauvegarde. Browsers may clear
// non-persistent site data when space runs low; Safari on iPhone also clears a non-installed site after 7 days unused.

export type PersistState = "on" | "off" | "unknown"

export async function persistState(): Promise<PersistState> {
  try {
    if (!navigator.storage?.persisted) return "unknown"
    return (await navigator.storage.persisted()) ? "on" : "off"
  } catch {
    return "unknown"
  }
}

let asked = false
/** Asks once per page load (Firefox shows a prompt; Chrome decides on its own). Returns the new state. */
export async function askPersist(force = false): Promise<PersistState> {
  if (asked && !force) return persistState()
  asked = true
  try {
    if (!navigator.storage?.persist) return "unknown"
    if (await navigator.storage.persisted?.()) return "on"
    return (await navigator.storage.persist()) ? "on" : "off"
  } catch {
    return "unknown"
  }
}

/** iPhone / iPad (iPadOS reports a Mac with touch). */
export function isIos(): boolean {
  try {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  } catch {
    return false
  }
}

export function isInstalled(): boolean {
  try {
    return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  } catch {
    return false
  }
}
