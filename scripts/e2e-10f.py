"""Lot 10f checks in the browser, preview build: titles in Geologica (lot 10k; Fraunces SOFT 100 until then), the « hydro. »
logo in Fraunces in the top bar,
the tokens --font-display / --water / --leaf, no horizontal overflow at 360 px and at zoom 200 % (195 px), FR/EN, light/dark.
Usage: npm run preview:build && PYTHONPATH=scripts python3 scripts/e2e-10f.py dist-preview/index.html <out dir>"""
import sys, json, pathlib
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
errors = []
TABS = ["today", "journal", "calendar", "charts", "tools"]

PROBE = """() => {
  const h1 = document.querySelector('main h1')
  const cs = h1 ? getComputedStyle(h1) : null
  const root = getComputedStyle(document.documentElement)
  const logo = document.querySelector('header [role=img][aria-label=Hydro]')
  return {
    h1: cs ? cs.fontFamily : null, soft: cs ? cs.fontVariationSettings : null,
    logo: !!logo, logoFont: logo ? getComputedStyle(logo).fontFamily : null,
    tokens: ['--font-display', '--water', '--leaf'].map((k) => root.getPropertyValue(k).trim()),
    fraunces: document.fonts.check('700 20px Fraunces'), geologica: document.fonts.check('700 20px Geologica'),
    sw: document.documentElement.scrollWidth, w: innerWidth,
  }
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    for theme in ["dark", "light"]:
        for lang in ["fr", "en"]:
            for w, h in [(360, 780), (195, 422)]:
                ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, color_scheme=theme)
                ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({json.dumps({'theme': theme, 'lang': lang, 'updatedAt': '2026-01-01T00:00:00Z'})}))")
                serve_fonts(ctx)
                pg = ctx.new_page()
                pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
                for tab in TABS:
                    pg.goto(f"file://{page_file}#{tab}"); pg.wait_for_timeout(1800)
                    r = pg.evaluate(PROBE)
                    tag = f"{theme}/{lang}/{w}/{tab}"
                    if r["sw"] > r["w"]: errors.append(f"{tag}: overflow {r['sw']}px")
                    if not r["logo"] or "Fraunces" not in (r["logoFont"] or ""): errors.append(f"{tag}: logo {r}")
                    # Lot 10k: titles in Geologica, upright; Fraunces only in the logo.
                    if r["h1"] and not r["h1"].startswith("Geologica"): errors.append(f"{tag}: h1 font {r['h1']}")
                    if r["h1"] and '"SOFT"' in (r["soft"] or ""): errors.append(f"{tag}: h1 SOFT {r['soft']}")
                    if not all(r["tokens"]) or not r["fraunces"] or not r["geologica"]: errors.append(f"{tag}: tokens/font {r}")
                    if w == 360 and tab in ("today", "tools"): pg.screenshot(path=str(out / f"{tab}-{theme}-{lang}-360.png"))
                ctx.close()
    b.close()
print("\n".join(errors) if errors else "10f: Geologica on titles, Fraunces logo in the top bar, tokens present, no overflow (360 px, 200 %)")
