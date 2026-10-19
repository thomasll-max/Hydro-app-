import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "../..")
const read = (f: string) => fs.readFileSync(path.join(root, f), "utf8")
const walk = (dir: string): string[] =>
  fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : /\.(tsx?|css)$/.test(e.name) && !/\.test\./.test(e.name) ? [`${dir}/${e.name}`] : []))
const sources = walk("src")

describe("lot 10k1a — typographie droite", () => {
  it("Geologica pour les titres et les chiffres (jetons « titre » et « chiffres »), Figtree pour le texte", () => {
    const css = read("src/index.css")
    expect(css).toMatch(/--font-title: "Geologica"/)
    expect(css).toMatch(/--font-number: "Geologica"/)
    expect(css).toMatch(/--font-sans: "Figtree"/)
    expect(css).toMatch(/\.display \{\n\s+font-family: var\(--font-title\);\n\s+font-weight: 700;\n\s+letter-spacing: -0\.02em;/)
    expect(css).toMatch(/\.font-num,\n\s+\.tabular \{\n\s+font-family: var\(--font-number\);\n\s+font-variant-numeric: tabular-nums;/)
    expect(read("index.html")).toMatch(/family=Geologica:wght@500;600;700/)
    for (const w of [500, 600, 700]) expect(read("src/fonts-local.css")).toContain(`geologica-latin-${w}-normal.woff2`)
  })

  it("plus de JetBrains Mono du tout", () => {
    for (const f of ["index.html", "src/index.css", "src/fonts-local.css", "package.json", "scripts/fonts.py"]) expect(read(f), f).not.toMatch(/JetBrains|jetbrains/)
    for (const f of sources.filter((x) => x.endsWith(".tsx") || x.endsWith(".ts"))) expect(read(f), f).not.toMatch(/\bfont-mono\b/)
  })

  it("Fraunces seulement dans le logo « hydro. » (et l'écran de démarrage, qui l'affiche)", () => {
    const users = sources.filter((f) => /font-display|logo-font|Fraunces/.test(read(f)))
    expect(users.sort()).toEqual(["src/components/hydro/wordmark.tsx", "src/fonts-local.css", "src/index.css"])
    expect(read("src/components/hydro/wordmark.tsx")).toMatch(/logo-font inline-flex/)
  })

  it("une seule façon d'écrire une valeur : chiffres à chasse fixe, unité plus petite après une espace fine insécable", () => {
    const v = read("src/components/hydro/value.tsx")
    expect(v).toContain(`export const NNBSP = "\\u202f"`)
    expect(v).toMatch(/font-num font-semibold/)
    expect(v).toMatch(/text-\[1\.875rem\] leading-none tracking-\[-0\.02em\]/)
    expect(v).toMatch(/font-medium text-fg-3", size === "sm" \? "text-\[0\.85em\]" : "text-\[0\.5em\]"/)
    expect(read("src/components/hydro/reading.tsx")).toMatch(/<Value size=\{compact \? "md" : "lg"\}/)
  })
})
