import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { CURRENT_BUILD, formatVersion, isNewerBuild, parseBuildInfo } from "@/lib/version"

const root = path.resolve(import.meta.dirname, "../..")
const cur = { commit: "3cdf83c", builtAt: "2026-10-18T19:40:00.000Z" }

describe("lot 8e — numéro de version", () => {
  it("le build injecte le commit court et la date", () => {
    expect(CURRENT_BUILD.commit).toMatch(/^([0-9a-f]{7}|dev)$/)
    expect(Number.isNaN(Date.parse(CURRENT_BUILD.builtAt))).toBe(false)
  })

  it("s'affiche « commit · date heure », avec « + » pour un build fait avant le commit", () => {
    expect(formatVersion(cur, "fr-FR", "UTC")).toBe("3cdf83c · 18/10/2026 19:40")
    expect(formatVersion({ ...cur, dirty: true }, "fr-FR", "Europe/Oslo")).toBe("3cdf83c+ · 18/10/2026 21:40")
    expect(formatVersion({ commit: "dev", builtAt: "" }, "fr-FR")).toBe("dev")
  })
})

describe("lot 8e — nouvelle version disponible", () => {
  it("version.json : seul un build plus récent propose la mise à jour", () => {
    expect(isNewerBuild(cur, parseBuildInfo({ commit: "a1b2c3d", builtAt: "2026-10-19T08:00:00.000Z" }))).toBe(true)
    expect(isNewerBuild(cur, parseBuildInfo({ ...cur }))).toBe(false) // same build
    expect(isNewerBuild(cur, parseBuildInfo({ commit: "0000000", builtAt: "2026-10-17T08:00:00.000Z" }))).toBe(false) // older (stale cache)
    expect(isNewerBuild({ commit: "dev", builtAt: "" }, parseBuildInfo({ commit: "a1b2c3d", builtAt: "2026-10-19T08:00:00.000Z" }))).toBe(false)
  })

  it("un version.json abîmé est ignoré", () => {
    for (const bad of [null, "x", {}, { commit: "", builtAt: "2026-10-19" }, { commit: "a", builtAt: "pas une date" }]) expect(parseBuildInfo(bad)).toBeNull()
    expect(isNewerBuild(cur, null)).toBe(false)
  })

  it("version.json n'est jamais mis en cache (service worker et Netlify)", () => {
    const sw = fs.readFileSync(path.join(root, "pwa/sw.js"), "utf8")
    expect(sw).toMatch(/pathname\.endsWith\("\/version\.json"\)\) return/)
    const toml = fs.readFileSync(path.join(root, "netlify.toml"), "utf8")
    expect(toml).toMatch(/for = "\/version\.json"\s+\[headers\.values\]\s+Cache-Control = "no-cache, no-store"/)
    expect(fs.readFileSync(path.join(root, "vite.config.ts"), "utf8")).toMatch(/fileName: "version\.json"/)
  })
})
