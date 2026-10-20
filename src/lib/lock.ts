// Verrouiller l'app (lot 12d): a privacy screen, not an encryption. A PIN of 4 to 6 digits, never kept in clear (PBKDF2,
// SHA-256, a random salt, Web Crypto), asked at opening and after some minutes in the background; five wrong PINs wait
// 30 s, then twice as long each time. Kept on this device only (`hydro.lock`): « Réinitialiser l'app » removes it, and
// that is the only way out of a forgotten PIN. In the installed local version, the fingerprint or the face (WebAuthn)
// can stand in for the PIN.
export const LOCK_KEY = "hydro.lock"
export const LOCK_DELAYS = [1, 5, 15] as const
export type LockDelay = (typeof LOCK_DELAYS)[number]
export const DEFAULT_DELAY: LockDelay = 5
const ITERATIONS = 150_000
export const MAX_FAILS = 5
export const FIRST_WAIT_S = 30

export type LockState = {
  v: 1
  salt: string
  hash: string
  iterations: number
  delayMin: LockDelay
  /** Wrong PINs since the last good one. */
  fails: number
  /** No PIN accepted before this time (ms since 1970). */
  until?: number
  /** The platform authenticator registered on this device (installed local version). */
  webauthn?: { id: string }
}

export const validPin = (pin: string) => /^\d{4,6}$/.test(pin)

const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b : new Uint8Array(b))))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

/** PBKDF2-SHA256 of the PIN with its salt, 256 bits, in base64. */
export async function derive(pin: string, salt: string, iterations = ITERATIONS): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"])
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unb64(salt), iterations }, key, 256)
  return b64(bits)
}

/** A new lock for a PIN: a random salt, the derived hash; never the PIN itself. */
export async function makeLock(pin: string, delayMin: LockDelay = DEFAULT_DELAY): Promise<LockState> {
  if (!validPin(pin)) throw new Error("pin")
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)))
  return { v: 1, salt, hash: await derive(pin, salt), iterations: ITERATIONS, delayMin, fails: 0 }
}

/** Same length, every character compared: no early way out on the first difference. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

/** The wait after a wrong PIN: none for the first four, then 30 s, 60 s, 120 s… (doubling at each new wrong PIN). */
export function waitAfter(fails: number): number {
  return fails < MAX_FAILS ? 0 : FIRST_WAIT_S * 2 ** (fails - MAX_FAILS) * 1000
}

export type TryResult = { ok: true; state: LockState } | { ok: false; state: LockState; waitMs: number }

/** Checks a PIN. While waiting, nothing is checked. A good PIN clears the count; a wrong one may start a wait. */
export async function tryPin(st: LockState, pin: string, now = Date.now()): Promise<TryResult> {
  if (st.until && now < st.until) return { ok: false, state: st, waitMs: st.until - now }
  const good = validPin(pin) && same(await derive(pin, st.salt, st.iterations), st.hash)
  if (good) {
    const { until: _u, ...rest } = st
    void _u
    return { ok: true, state: { ...rest, fails: 0 } }
  }
  const fails = st.fails + 1
  const wait = waitAfter(fails)
  return { ok: false, state: { ...st, fails, ...(wait ? { until: now + wait } : {}) }, waitMs: wait }
}

/** Locked again after the delay spent in the background (or another app on top). */
export const lockedAfter = (hiddenAt: number | null, now: number, delayMin: number) => hiddenAt != null && now - hiddenAt >= delayMin * 60_000

// ---- this device ---------------------------------------------------------------------------------------------------

export function readLock(): LockState | null {
  try {
    const raw = localStorage.getItem(LOCK_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as LockState
    return s && s.v === 1 && typeof s.salt === "string" && typeof s.hash === "string" ? s : null
  } catch {
    return null
  }
}

/** False when the device does not keep it (private mode, storage blocked): the lock can then not be turned on. */
export function writeLock(s: LockState | null): boolean {
  try {
    if (s) localStorage.setItem(LOCK_KEY, JSON.stringify(s))
    else localStorage.removeItem(LOCK_KEY)
    return true
  } catch {
    return false
  }
}

export function storageWorks(): boolean {
  try {
    localStorage.setItem("hydro.lockProbe", "1")
    localStorage.removeItem("hydro.lockProbe")
    return true
  } catch {
    return false
  }
}

// ---- fingerprint or face (installed local version) -----------------------------------------------------------------

/** The installed app (home screen), not a tab of the browser. */
export const installed = () => typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true)

export async function biometricsAvailable(): Promise<boolean> {
  try {
    const P = (window as { PublicKeyCredential?: { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> } }).PublicKeyCredential
    return !!P?.isUserVerifyingPlatformAuthenticatorAvailable && (await P.isUserVerifyingPlatformAuthenticatorAvailable())
  } catch {
    return false
  }
}

const challenge = () => crypto.getRandomValues(new Uint8Array(32))

/** Registers this device's fingerprint or face; the credential's id is kept, nothing else. */
export async function registerBiometrics(): Promise<{ id: string } | null> {
  try {
    const c = (await navigator.credentials.create({
      publicKey: {
        challenge: challenge(),
        rp: { name: "Hydro" },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "hydro", displayName: "Hydro" },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null
    return c ? { id: b64(c.rawId) } : null
  } catch {
    return null
  }
}

/** Asks the phone to check the fingerprint or the face for that credential. */
export async function unlockWithBiometrics(id: string): Promise<boolean> {
  try {
    const r = await navigator.credentials.get({ publicKey: { challenge: challenge(), allowCredentials: [{ type: "public-key", id: unb64(id) }], userVerification: "required", timeout: 60_000 } })
    return !!r
  } catch {
    return false
  }
}
