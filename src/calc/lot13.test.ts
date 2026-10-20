// Lot 13: the sources stay cited, but quietly: a small ⓘ beside a tool or its figures, and everything in À propos.
// No « Sources : » line left on screen, no word on Bonorum's table, the source names out of the labels.
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { fr } from "@/i18n/fr"
import { en } from "@/i18n/en"
import { de } from "@/i18n/de"
import { flattenKeys, lookup } from "@/i18n/core"
import type { Messages } from "@/i18n/types"
import { parseHash, routeHash } from "@/app/nav"
import { CREDITS } from "@/data/credits"
import { infoLines } from "@/components/hydro/source-info"

const read = (f: string) => readFileSync(f, "utf8")
const DICTS: Record<"fr" | "en" | "de", Messages> = { fr, en, de }
const keys = flattenKeys(fr) as Parameters<typeof lookup>[1][]
const all = (d: Messages) => keys.map((k) => [k as string, lookup(d, k)] as const)
const outsideAbout = (k: string) => !k.startsWith("about.") && !k.startsWith("info.")

describe("lot 13 — plus de ligne « Sources : »", () => {
  it("aucun texte « Sources : » / « Source: » / « Quellen: » hors de À propos, dans les trois langues", () => {
    for (const d of Object.values(DICTS)) {
      const hits = all(d).filter(([k, v]) => outsideAbout(k) && /\b(Sources?|Quellen?)\s?:/.test(v))
      expect(hits).toEqual([])
    }
  })

  it("les écrans n'affichent plus de ligne de sources ; chaque outil qui en avait une a son ⓘ", () => {
    for (const f of ["irrigation", "ipw", "ph-balance", "light", "climate", "nutrition"]) expect(read(`src/screens/tools/${f}.tsx`)).not.toMatch(/\.sources"|sourceLine/)
    const tools = read("src/screens/tools.tsx")
    expect(tools).toMatch(/export const INFO_TOOLS = \["irrigation", "nutrition", "ph", "ipw", "light", "climate", "reperes"\] as const/)
    expect(tools).toMatch(/info=\{info \? <SourceInfo id=\{open\} lines=\{infoLines\(info\)\} \/> : undefined\}/)
    expect(read("src/screens/calendar.tsx")).toMatch(/<SourceInfo id="calendar"/)
    expect(read("src/screens/calendar.tsx")).not.toMatch(/cal\.sources/)
    const space = read("src/screens/space-page.tsx")
    expect(space).toMatch(/<SourceInfo id="space" lines=\{sources\} \/>/)
    expect(space).not.toMatch(/id="space-sources"/)
    // Repères keeps its tables and sends to À propos for the sources.
    const guide = read("src/screens/guide.tsx")
    expect(guide).not.toMatch(/value="sources"|guide\.srcAthena/)
    expect(guide).toMatch(/id="reperes-sources"[^>]*onClick=\{openAbout\}/)
  })

  it("le texte de chaque ⓘ existe dans les trois langues, une source par ligne", () => {
    for (const d of Object.values(DICTS)) {
      for (const id of ["irrigation", "nutrition", "own", "ph", "ipw", "light", "climate", "calendar", "reperes"] as const) {
        const lines = infoLines(d.info[id])
        expect(lines.length, id).toBeGreaterThanOrEqual(2)
      }
      expect(d.info.all).toMatch(/→$/)
    }
    expect(infoLines(" a \n\n b ")).toEqual(["a", "b"])
  })

  it("ce qui change la lecture d'un chiffre reste visible : estimation du pH 70/30, débit à mesurer, échelle capteur", () => {
    const space = read("src/screens/space-page.tsx")
    expect(space).toMatch(/phEstimate=\{tg\?\.phRunoff\?\.src === "estimate"\}/)
    expect(space).toMatch(/note=\{phEstimate \? t\("nut\.estimate"\) : undefined\}/)
    expect(space).toMatch(/t\("today\.flowUnknown"\)/)
    expect(fr.entry.sensorScale).toMatch(/^Échelle capteur.*Les cibles Athena ne valent que pour la pesée\.$/)
  })

  it("l'ⓘ : 16 px, 44 px à toucher, une petite feuille, puis « Toutes les sources → »", () => {
    const c = read("src/components/hydro/source-info.tsx")
    expect(c).toMatch(/size-11/)
    expect(c).toMatch(/<Info aria-hidden="true" className="size-4"/)
    expect(c).toMatch(/aria-label=\{t\("info\.open"\)\}/)
    expect(c).toMatch(/dirty=\{false\}/)
    expect(c).toMatch(/id="info-all"/)
  })
})

describe("lot 13 — Bonorum", () => {
  it("plus de « facteur 10 » dans les trois langues ; sNote3 et note4 supprimées", () => {
    for (const d of Object.values(DICTS)) expect(all(d).filter(([, v]) => /facteur 10|factor of 10|Faktor 10/i.test(v))).toEqual([])
    expect(keys).not.toContain("irr.sNote3")
    expect(keys).not.toContain("guide.note4")
    expect(fr.irr.sFormula).toBe("Durées calculées avec la formule volume ÷ débit.")
    expect(read("src/calc/program.ts")).not.toMatch(/×10|off by/)
  })

  it("le nom Bonorum n'apparaît plus que dans l'ⓘ et dans À propos ; « Mode capteur » dans l'interface", () => {
    for (const d of Object.values(DICTS)) {
      expect(all(d).filter(([k, v]) => outsideAbout(k) && /Bonorum/.test(v))).toEqual([])
      expect(d.info.irrigation).toMatch(/Bonorum/)
      expect(d.about.sensor1).toMatch(/Crop Steering Light/)
    }
    expect(fr.irr.sensorD).not.toMatch(/Méthode|Bonorum/)
    expect(fr.about.sensor).toBe("Mode capteur")
  })
})

describe("lot 13 — les libellés disent ce que fait l'outil", () => {
  it("« Repères », sans le nom de la source ; les noms de produits Athena restent", () => {
    expect([fr.tools.reperes, en.tools.reperes, de.tools.reperes]).toEqual(["Repères", "Reference guide", "Richtwerte"])
    for (const d of Object.values(DICTS)) expect(`${d.tools.reperes} ${d.tools.reperesD}`).not.toMatch(/Athena|Handbook/)
    expect(fr.spray.ipw).toBe("IPW Athena")
  })
})

describe("lot 13 — À propos", () => {
  it("route #tools/about ; dans Réglages (dernière ligne) et dans le menu de l'engrenage, sous « Tous les réglages »", () => {
    expect(parseHash("#tools/about")).toEqual({ tab: "tools", tool: "about" })
    expect(routeHash({ tab: "tools", tool: "about" })).toBe("#tools/about")
    const settings = read("src/screens/tools/settings.tsx")
    expect(settings.indexOf('id="settings-about"')).toBeGreaterThan(settings.indexOf("<ResetCard"))
    const bar = read("src/components/hydro/top-bar.tsx")
    expect(bar.indexOf('id="menu-about"')).toBeGreaterThan(bar.indexOf('id="all-settings"'))
    expect(bar.indexOf('id="menu-about"')).toBeLessThan(bar.indexOf('id="menu-start"'))
    // Not listed among the tools (no group), like Réglages.
    expect(read("src/screens/tools.tsx")).toMatch(/\{ id: "about", emoji: "book", title: "about\.title", desc: "about\.desc" \},/)
  })

  it("chaque source, ce qui en est tiré et où ; Athena : pages et mention de marque", () => {
    const about = read("src/screens/tools/about.tsx")
    for (const id of ["athena", "sensor", "makers", "formulas", "common", "spec", "estimates", "yours"]) expect(about).toContain(`id: "${id}"`)
    expect(fr.about.athena1).toMatch(/p\. 23 et 26.*p\. 31.*p\. 37.*p\. 58/)
    expect(fr.about.athena2).toMatch(/Pro Line p\. 41, Blended p\. 60/)
    expect(fr.about.athena3).toMatch(/p\. 80 du PDF/)
    expect(fr.about.athenaMark).toBe("Athena est une marque d'Athena Ag. Hydro n'est pas affiliée à Athena.")
    expect(fr.about.common1).toMatch(/pas des sources officielles/)
    // No link to Bonorum's guide: no official address in the repository.
    expect(about).not.toMatch(/https?:\/\//)
  })

  it("crédits techniques : chaque licence est celle écrite dans le paquet", () => {
    for (const c of CREDITS) {
      const pkg = JSON.parse(read(`node_modules/${c.pkg}/package.json`)) as { license?: string }
      expect(pkg.license, c.pkg).toBe(c.license)
    }
    expect(CREDITS.filter((c) => c.kind === "font").map((c) => c.name)).toEqual(["Geologica", "Figtree", "Fraunces"])
  })

  it("vie privée selon la version ; avertissement court", () => {
    const about = read("src/screens/tools/about.tsx")
    expect(about).toMatch(/TARGET === "local"\s*\? \["about\.privacyAccount", "about\.privacyLocal", "about\.privacyNoClaude"/)
    expect(about).toMatch(/: \["about\.privacyAccount", "about\.privacyArtifact", "about\.privacyClaude", "about\.privacySpeech", "about\.privacyFonts"/)
    expect(fr.about.privacyClaude).toMatch(/seulement quand tu le demandes/)
    expect(fr.about.disclaimer1).toMatch(/respecter la loi de ton pays/)
  })
})
