"""Lot 10e accessibility checks in the browser, preview build:
- contrast (axe-core « color-contrast », WCAG AA) on the five tabs and the entry sheet, light and dark;
- no visible text under 12 px; every tap target at least 44 px high (or a compact pill with the .hit area) and icon
  buttons at least 44 px wide;
- zoom 200 % (195 × 422 CSS px): nothing wider than the screen, entry fields not cut, tab bar + button under 30 % of
  the height.
Usage: npm run preview:build && PYTHONPATH=scripts python3 scripts/e2e-10e.py dist-preview/index.html <out dir> <axe.min.js>
(axe.min.js: `npm pack axe-core@4.10.2` then `tar xzf` it, outside the project.)"""
import sys, json, pathlib
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
axe = pathlib.Path(sys.argv[3]).read_text() if len(sys.argv) > 3 else None
errors, checks = [], {}
TABS = ["Aujourd'hui", "Journal", "Calendrier", "Graphiques", "Outils"]


def go(pg, tab):
    """A tab of the bar; the Calendar has no tab since lot 10h: « Tout le calendrier → » of Aujourd'hui."""
    if tab == "Calendrier":
        pg.get_by_role("tab", name="Aujourd'hui").click(); pg.wait_for_timeout(600)
        pg.click("#all-calendar")
    else:
        pg.get_by_role("tab", name=tab).click()

SMALL = """() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[aria-hidden=true], .sr-only') }
  const fonts = []
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue
    const px = parseFloat(getComputedStyle(el).fontSize)
    if (px < 11.95 && !el.closest('svg')) fonts.push(`${px}px «${el.textContent.trim().slice(0, 24)}»`)
  }
  const targets = []
  for (const el of document.querySelectorAll('button, a[href], [role=tab], [role=radio], [role=switch], [role=checkbox], input, select, textarea')) {
    if (!vis(el) || el.closest('.recharts-wrapper')) continue
    const r = el.getBoundingClientRect()
    const sq = el.classList.contains('hit-sq')
    const hit = el.classList.contains('hit') || sq
    const iconOnly = !el.textContent.trim()
    if ((r.height < 43.5 && !hit) || (iconOnly && r.width < 43.5 && !sq)) targets.push(`${Math.round(r.width)}×${Math.round(r.height)} ${el.tagName} «${(el.textContent.trim() || el.getAttribute('aria-label') || el.id || '').slice(0, 24)}»`)
  }
  return { fonts: [...new Set(fonts)].slice(0, 12), targets: [...new Set(targets)].slice(0, 20) }
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    for theme in ["light", "dark"]:
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme=theme)
        ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'fr',updatedAt:'2026-01-01T00:00:00Z'}}))")
        serve_fonts(ctx)
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
        pg.goto(f"file://{page_file}"); pg.wait_for_timeout(2500)
        res = {}
        for tab in TABS + ["entry"]:
            if tab == "entry":
                pg.get_by_role("tab", name="Aujourd'hui").click(); pg.wait_for_timeout(500)
                pg.click("#tab-plus"); pg.click("#add-entry"); pg.wait_for_timeout(600)
                if pg.get_by_role("button", name="Saisie complète").count():
                    pg.get_by_role("button", name="Saisie complète").first.click()
                pg.wait_for_selector("#e-when"); pg.wait_for_timeout(1500)
            else:
                go(pg, tab); pg.wait_for_timeout(1800)
            r = {}
            if axe:
                pg.add_script_tag(content=axe)
                v = pg.evaluate("""async () => { const r = await axe.run(document, { runOnly: ['color-contrast'] }); return r.violations.flatMap((v) => v.nodes.map((n) => `${n.any[0]?.data?.contrastRatio}:1 ${n.any[0]?.data?.fgColor} on ${n.any[0]?.data?.bgColor} «${n.target.join(' ').slice(-40)}»`)) }""")
                r["contrast"] = v[:10]
            r.update(pg.evaluate(SMALL))
            res[tab] = r
            if theme == "light": pg.screenshot(path=str(out / f"{theme}-{tab[:5]}.png"))
        checks[theme] = res
        ctx.close()

    # Zoom 200 %: half the CSS pixels.
    ctx = b.new_context(viewport={"width": 195, "height": 422}, device_scale_factor=4, color_scheme="light")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(f"file://{page_file}"); pg.wait_for_timeout(2500)
    zoom = {}
    for tab in TABS:
        go(pg, tab); pg.wait_for_timeout(1200)
        zoom[tab] = pg.evaluate("document.documentElement.scrollWidth")
    pg.get_by_role("tab", name="Aujourd'hui").click(); pg.wait_for_timeout(600)
    bars = pg.evaluate("""() => { const nav = document.querySelector('nav[aria-label]').getBoundingClientRect(); const fab = [...document.querySelectorAll('button')].find((b) => b.id === 'tab-plus').getBoundingClientRect(); return Math.round(((innerHeight - Math.min(nav.top, fab.top)) / innerHeight) * 100) }""")
    zoom["barsPct"] = bars
    pg.screenshot(path=str(out / "zoom-today.png"))
    pg.click("#tab-plus"); pg.click("#add-entry"); pg.wait_for_timeout(600)
    if pg.get_by_role("button", name="Saisie complète").count():
        pg.get_by_role("button", name="Saisie complète").first.click()
    pg.wait_for_selector("#e-when"); pg.wait_for_timeout(800)
    # The invisible 44 px tap areas (::after) are not content: left out of the overflow measure.
    pg.add_style_tag(content=".hit::after, .hit-sq::after { display: none !important }")
    zoom["entryOverflow"] = pg.evaluate("""() => [...document.querySelectorAll('[data-slot=drawer-content] *')].filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'auto' && getComputedStyle(el).overflowX !== 'scroll' && el.clientWidth > 0 && !el.closest('.truncate, [class*=truncate], [class*=sr-only]')).map((el) => `${el.tagName}.${String(el.className).slice(0, 40)} ${el.scrollWidth}>${el.clientWidth}`).slice(0, 8)""")
    zoom["entryInputs"] = pg.evaluate("""() => [...document.querySelectorAll('[data-slot=drawer-content] input')].filter((i) => { const w = i.getBoundingClientRect().width; return w > 0 && w < 60 }).length""")
    pg.screenshot(path=str(out / "zoom-entry.png"))
    checks["zoom200"] = zoom
    ctx.close()
    b.close()

print(json.dumps(checks, ensure_ascii=False, indent=1))
print("errors:", errors[:5])
flat = [x for th in ("light", "dark") for t in checks[th].values() for k in ("contrast", "fonts", "targets") for x in t.get(k, [])]
ok = not flat and all(v <= 195 for k, v in checks["zoom200"].items() if k in TABS) and checks["zoom200"]["barsPct"] < 30 and not checks["zoom200"]["entryOverflow"] and not checks["zoom200"]["entryInputs"] and not errors
print("OK" if ok else "FAIL")
sys.exit(0 if ok else 1)
