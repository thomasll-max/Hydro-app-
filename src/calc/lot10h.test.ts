import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { SPACE_COLORS } from "@/model/grow"
import { safeSpaceColor } from "@/components/hydro/space-pill"
import { splitUnit } from "@/components/hydro/form"
import { translate } from "@/i18n/core"

const root = path.resolve(import.meta.dirname, "../..")
const read = (f: string) => fs.readFileSync(path.join(root, f), "utf8")
const css = read("src/index.css")

/** Tokens of one block of index.css: the light `:root {` and the explicit dark block (`.theme-dark {`). */
function tokens(start: string): Record<string, string> {
  const from = css.indexOf(start)
  const body = css.slice(from, css.indexOf("}", from))
  return Object.fromEntries([...body.matchAll(/--([\w-]+): (#[0-9a-f]{6});/g)].map((m) => [m[1], m[2]]))
}
const LIGHT = tokens(":root {\n  /* light")
const DARK = tokens(".theme-dark {")

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
/** OKLCH hue in degrees. */
const hue = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360
}

describe("lot 10h — palette harmonisée", () => {
  it("les valeurs du prompt, dans les deux thèmes (le bloc sombre est le même pour « système » et « sombre »)", () => {
    expect(LIGHT).toMatchObject({ page: "#f2f6f4", surface: "#ffffff", line: "#d5dcd8", fg: "#141d19", "fg-3": "#56605b", water: "#007653", leaf: "#4f7715", warn: "#a15b00", bad: "#b2392b", primary: "#007653" })
    expect(DARK).toMatchObject({ page: "#0d1310", surface: "#131c18", line: "#28302c", fg: "#eaf0ed", "fg-3": "#9ca8a2", water: "#56d1a3", leaf: "#aad56e", warn: "#eeb154", bad: "#ed7761", primary: "#56d1a3" })
    const media = tokens("@media (prefers-color-scheme: dark)")
    expect(media).toEqual(DARK)
  })

  it("contrastes : texte ≥ 4,5:1 et graphismes ≥ 3:1 sur le fond, la surface et la surface 2", () => {
    for (const [name, T] of [["clair", LIGHT], ["sombre", DARK]] as const) {
      const grounds = [T.page, T.surface, T["surface-2"]]
      for (const k of ["fg", "fg-2", "fg-3", "primary", "water-ink", "leaf-ink", "warn", "bad", "info", "phase-3"])
        for (const g of grounds) expect(ratio(T[k], g), `${name} ${k} sur ${g}`).toBeGreaterThanOrEqual(4.5)
      const graphics = ["water", "leaf", "warn", "bad", "line-strong", "track", ...SPACE_COLORS.map((c) => `space-${c}`)].filter((k) => k !== "track")
      for (const k of graphics) for (const g of grounds) expect(ratio(T[k], g), `${name} ${k} sur ${g}`).toBeGreaterThanOrEqual(3)
      // The main button: its text on « eau ».
      expect(ratio(T["on-primary"], T.primary), `${name} bouton principal`).toBeGreaterThanOrEqual(4.5)
      // A ticked check box: the tick on « plante ».
      expect(ratio(T.page, T.leaf), `${name} coche`).toBeGreaterThanOrEqual(3)
    }
  })

  it("couleurs d'espace : 8 teintes terreuses dans l'ordre du prompt, aucune verte, mêmes identifiants qu'avant", () => {
    expect(SPACE_COLORS).toEqual(["emerald", "sky", "violet", "amber", "rose", "teal", "orange", "slate"])
    expect(SPACE_COLORS.map((c) => DARK[`space-${c}`])).toEqual(["#d49a99", "#cea081", "#bfa878", "#74b8c0", "#82b1d3", "#9da8d8", "#b89fcc", "#cc99b5"])
    expect(SPACE_COLORS.map((c) => LIGHT[`space-${c}`])).toEqual(["#8b5050", "#865634", "#785f28", "#157079", "#34698c", "#565f91", "#715685", "#84506e"])
    // « Eau » and « plante » sit around 128–166° in OKLCH: no space colour comes near them.
    for (const T of [LIGHT, DARK]) for (const c of SPACE_COLORS) expect(Math.min(Math.abs(hue(T[`space-${c}`]) - 147), 360 - Math.abs(hue(T[`space-${c}`]) - 147))).toBeGreaterThan(40)
    // Stored ids keep their colour; an unknown one is still drawn (lot 10a).
    expect(safeSpaceColor("emerald")).toBe("emerald")
    expect(safeSpaceColor("vert-pomme")).toBe("slate")
    expect(translate("fr", "space.colorNames.emerald")).toBe("Brique")
    expect(translate("en", "space.colorNames.slate")).toBe("Rose")
  })

  it("logo : le point prend la couleur du texte ; l'icône d'app garde #3ecf8e ; démarrage sur le fond sombre", () => {
    const w = read("src/components/hydro/wordmark.tsx")
    expect(w).not.toMatch(/var\(--leaf\)/)
    expect(w).not.toMatch(/#[0-9a-f]{6}/i)
    expect(w).toMatch(/theme-dark/)
    expect(read("pwa/icon.svg")).toContain('fill="#3ecf8e"')
  })

  it("aucune couleur en dur dans les composants, plus de bouton vert pâle teinté ni de pilule hors filtres du Journal", () => {
    const files = fs.readdirSync(path.join(root, "src"), { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".tsx") && !f.includes("components/ui"))
    for (const f of files) {
      const src = read(`src/${f}`)
      // status.tsx keeps a fallback inside var(): its screen also shows when the styles did not load.
      expect(src.replace(/var\(--[\w-]+, #[0-9a-f]{6}\)/g, ""), f).not.toMatch(/["'`]#[0-9a-f]{3,6}["'`]/i)
      expect(src, f).not.toMatch(/bg-primary\/\d+[^"]*text-primary/)
    }
    const btn = read("src/components/ui/button.tsx")
    expect(btn).toMatch(/rounded-\[10px\]/)
    expect(btn).toMatch(/inset_0_-2px_0_rgba\(0,0,0,0\.25\)/)
    expect(btn).toMatch(/active:translate-y-px active:shadow-\[inset_0_2px_0_rgba\(0,0,0,0\.25\)\]/)
    // Focus: 2 px « eau », 2 px away, unlayered so that no library class removes it.
    expect(css).toMatch(/\n:focus-visible \{\n  outline: 2px solid var\(--water\);\n  outline-offset: 2px;/)
  })
})

describe("lot 10h — champs « instrument »", () => {
  it("l'unité écrite en fin de libellé passe dans le champ ; le reste du libellé ne bouge pas", () => {
    expect(splitUnit("T° jour (°C)")).toEqual(["T° jour", "°C"])
    expect(splitUnit("Pot témoin, matin (kg)")).toEqual(["Pot témoin, matin", "kg"])
    expect(splitUnit("Runoff du pot témoin (mL)")).toEqual(["Runoff du pot témoin", "mL"])
    expect(splitUnit("Fin (facultatif)")).toEqual(["Fin (facultatif)", undefined])
    expect(splitUnit("EC entrée")).toEqual(["EC entrée", undefined])
  })
  it("« hier 25,3 » sous le champ, bouton « Copier les valeurs d'hier »", () => {
    expect(translate("fr", "entry.hint", { v: "25,3" })).toBe("hier 25,3")
    expect(translate("en", "entry.hint", { v: "25.3" })).toBe("yesterday 25.3")
    expect(translate("fr", "entry.resume")).toBe("Copier les valeurs d'hier")
  })
})
