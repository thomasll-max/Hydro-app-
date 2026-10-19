import { describe, expect, it } from "vitest"
import { DEFAULT_SETTINGS, newer, parseSettings, resolveTheme, SETTINGS_SCHEMA } from "./settings"

describe("réglages", () => {
  it("valeurs par défaut : français, thème système", () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS)
  })
  it("rejette les valeurs inconnues et pose le schemaVersion", () => {
    const s = parseSettings({ theme: "neon", lang: "it", schemaVersion: 99 })
    expect(s.theme).toBe("system")
    expect(s.lang).toBe("fr")
    expect(s.schemaVersion).toBe(SETTINGS_SCHEMA)
  })
  it("garde la version la plus récente", () => {
    const a = parseSettings({ theme: "dark", updatedAt: "2026-10-18T10:00:00Z" })
    const b = parseSettings({ theme: "light", updatedAt: "2026-10-18T11:00:00Z" })
    expect(newer(a, b).theme).toBe("light")
    expect(newer(b, a).theme).toBe("light")
  })
  it("résout le thème système", () => {
    expect(resolveTheme("system", true)).toBe("dark")
    expect(resolveTheme("system", false)).toBe("light")
    expect(resolveTheme("light", true)).toBe("light")
  })
})
