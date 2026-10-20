// Lot 12d: the app's lock — a PIN never kept in clear, waits after wrong PINs, locked again after the delay, honest words.
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { derive, FIRST_WAIT_S, lockedAfter, LOCK_DELAYS, LOCK_KEY, makeLock, MAX_FAILS, tryPin, validPin, waitAfter } from "@/lib/lock"
import { fr } from "@/i18n/fr"
import { en } from "@/i18n/en"
import { de } from "@/i18n/de"

describe("lot 12d — le PIN", () => {
  it("4 à 6 chiffres", () => {
    expect(["1234", "123456", "0000"].every(validPin)).toBe(true)
    expect(["123", "1234567", "12a4", "", " 1234"].some(validPin)).toBe(false)
  })

  it("jamais gardé en clair : un sel aléatoire, PBKDF2-SHA256", async () => {
    const a = await makeLock("246813")
    const b = await makeLock("246813")
    const json = JSON.stringify(a)
    expect(json).not.toContain("246813")
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
    expect(a).toMatchObject({ v: 1, fails: 0, delayMin: 5, iterations: 150_000 })
    expect(atob(a.hash)).toHaveLength(32)
    expect(await derive("246813", a.salt)).toBe(a.hash)
    await expect(makeLock("12")).rejects.toThrow()
  })

  it("cinq erreurs : 30 s d'attente, puis le double à chaque nouvelle erreur ; rien n'est vérifié pendant l'attente", async () => {
    expect([1, 2, 3, 4].map(waitAfter)).toEqual([0, 0, 0, 0])
    expect([5, 6, 7].map(waitAfter)).toEqual([30_000, 60_000, 120_000])
    expect(MAX_FAILS).toBe(5)
    expect(FIRST_WAIT_S).toBe(30)
    let st = await makeLock("1357")
    const t0 = 1_000_000
    for (let i = 1; i <= 4; i++) {
      const r = await tryPin(st, "0000", t0)
      expect(r.ok).toBe(false)
      st = r.state
      expect(st.fails).toBe(i)
      expect(st.until).toBeUndefined()
    }
    const fifth = await tryPin(st, "0000", t0)
    expect(fifth).toMatchObject({ ok: false, waitMs: 30_000, state: { fails: 5, until: t0 + 30_000 } })
    st = fifth.state
    // Even the right PIN waits.
    const during = await tryPin(st, "1357", t0 + 10_000)
    expect(during).toMatchObject({ ok: false, waitMs: 20_000, state: { fails: 5 } })
    const sixth = await tryPin(st, "9999", t0 + 31_000)
    expect(sixth).toMatchObject({ ok: false, waitMs: 60_000, state: { fails: 6, until: t0 + 31_000 + 60_000 } })
    const good = await tryPin(sixth.state, "1357", t0 + 92_000)
    expect(good.ok).toBe(true)
    expect(good.state.fails).toBe(0)
    expect(good.state.until).toBeUndefined()
  })

  it("verrouillée après 1, 5 ou 15 minutes en arrière-plan (5 par défaut)", () => {
    expect(LOCK_DELAYS).toEqual([1, 5, 15])
    expect(lockedAfter(null, 10_000_000, 5)).toBe(false)
    expect(lockedAfter(0, 4 * 60_000, 5)).toBe(false)
    expect(lockedAfter(0, 5 * 60_000, 5)).toBe(true)
    expect(lockedAfter(0, 60_000, 1)).toBe(true)
  })
})

describe("lot 12d — l'app", () => {
  it("le verrou couvre toute l'app (Aujourd'hui et son résumé du matin compris), l'app reste montée dessous", () => {
    const app = readFileSync("src/App.tsx", "utf8")
    expect(app).toMatch(/<LockGate>\s*<Shell \/>\s*<\/LockGate>/)
    const gate = readFileSync("src/app/lock.tsx", "utf8")
    expect(gate).toMatch(/el\.setAttribute\("inert", ""\)/)
    expect(gate).toMatch(/createPortal\(/)
    expect(gate).toMatch(/visibilitychange/)
  })

  it("PIN oublié : la seule issue est « Réinitialiser l'app », qui efface aussi le verrou ; empreinte ou visage seulement dans l'app installée", () => {
    expect(LOCK_KEY).toBe("hydro.lock")
    // The reset keeps only the display keys: hydro.lock goes.
    expect(readFileSync("src/lib/reset.ts", "utf8")).toMatch(/const KEEP = new Set\(\["hydro\.ui"\]\)/)
    expect(readFileSync("src/app/lock.tsx", "utf8")).toMatch(/resetData\(docs, photos\)/)
    expect(readFileSync("src/screens/tools/lock-card.tsx", "utf8")).toMatch(/TARGET === "local" && installed\(\)/)
  })

  it("dit honnêtement ce que c'est, et demande de noter le PIN (sauvegarde proposée)", () => {
    expect(fr.lk.honest).toMatch(/écran de confidentialité, pas un chiffrement/)
    expect(en.lk.honest).toMatch(/privacy screen, not encryption/)
    expect(de.lk.honest).toMatch(/Sichtschutz, keine Verschlüsselung/)
    for (const d of [fr, en, de]) for (const k of ["writeIt", "backupNow", "forgotD", "wait", "noStorage"] as const) expect(d.lk[k]).toBeTruthy()
    expect(readFileSync("src/screens/tools/lock-card.tsx", "utf8")).toMatch(/id="pin-backup"/)
  })
})
