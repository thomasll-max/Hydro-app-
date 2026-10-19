import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { DROP_PATH, LEAF_PATH, VEIN_PATH } from "@/components/hydro/wordmark"
import { curveTone } from "@/calc/series"

const root = path.resolve(import.meta.dirname, "../..")
const read = (f: string) => fs.readFileSync(path.join(root, f), "utf8")

describe("lot 10f — identité « hydro. »", () => {
  it("la goutte et sa feuille suivent le prompt (viewBox 0 0 100 125)", () => {
    expect(DROP_PATH).toBe("M50 4 C50 4 8 58 8 84 A42 42 0 0 0 92 84 C92 58 50 4 50 4 Z")
    expect(LEAF_PATH).toBe("M50 114 C29 101 29 72 50 54 C71 72 71 101 50 114 Z")
    expect(VEIN_PATH).toBe("M50 108 L50 64")
    const icon = read("pwa/icon.svg")
    for (const d of [DROP_PATH, LEAF_PATH, VEIN_PATH]) expect(icon).toContain(d)
    expect(icon).toContain('fill="#101613"')
    expect(icon).toContain('fill="#3ecf8e"')
  })

  it("Fraunces : token --font-display, axe SOFT, Google Fonts et version locale", () => {
    const css = read("src/index.css")
    expect(css).toMatch(/--font-display: "Fraunces"/)
    expect(css).toMatch(/font-variation-settings: "SOFT" 100/)
    expect(read("index.html")).toMatch(/family=Fraunces:opsz,wght,SOFT@9\.\.144,600\.\.700,100/)
    expect(read("src/fonts-local.css")).toMatch(/fontsource-variable\/fraunces\/files\/fraunces-latin-full-normal\.woff2/)
  })

  it("manifeste : icônes any et maskable ; les identifiants techniques ne bougent pas", () => {
    const m = JSON.parse(read("pwa/manifest.webmanifest"))
    expect(m.name).toBe("Hydro")
    const purposes = m.icons.map((i: { src: string; purpose: string }) => `${i.src}:${i.purpose}`)
    expect(purposes).toContain("icon-maskable-512.png:maskable")
    expect(purposes).toContain("icon-512.png:any")
    for (const f of ["icon-192.png", "icon-512.png", "apple-touch-icon.png", "icon-maskable-512.png", "favicon.svg", "favicon-32.png"]) expect(fs.existsSync(path.join(root, "pwa", f))).toBe(true)
    expect(read("pwa/sw.js")).toContain('const CACHE = "hydro-v2"')
  })
})

describe("lot 10f2 — direction visuelle", () => {
  it("plus de halo, de verre dépoli ni de lueur colorée", () => {
    const css = read("src/index.css")
    expect(css).not.toMatch(/--glow/)
    expect(css).not.toMatch(/backdrop-filter/)
    expect(read("src/App.tsx")).not.toMatch(/radial-gradient/)
    expect(read("src/components/hydro/tab-bar.tsx")).not.toMatch(/\bglass\b|shadow-card/)
    expect(read("src/components/hydro/fab.tsx")).not.toMatch(/color-mix\(in_srgb,var\(--primary\)/)
  })

  it("fonds teintés : vert-noir en sombre, blanc cassé verdâtre en clair (valeurs de la palette du lot 10h)", () => {
    const css = read("src/index.css")
    expect(css).toMatch(/--page: #f2f6f4;/)
    expect(css.match(/--page: #0d1310;/g)?.length).toBe(2)
    expect(css.match(/--surface: #131c18;/g)?.length).toBe(2)
    expect(css.match(/--line: #28302c;/g)?.length).toBe(2)
  })
})

describe("lot 10f2 — deux verts qui ont un sens", () => {
  it("courbes : eau en vert eau, plante en vert feuille, climat et lumière neutres", () => {
    for (const c of ["dryback", "ecRunoff", "phIn", "reservoir", "use"] as const) expect(curveTone(c)).toBe("water")
    for (const c of ["height", "germination"] as const) expect(curveTone(c)).toBe("leaf")
    for (const c of ["vpd", "temp", "dli"] as const) expect(curveTone(c)).toBe("neutral")
  })
})
