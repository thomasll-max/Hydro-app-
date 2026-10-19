"""Screenshots at 390 px: every tab x {dark, light} x {fr, en, de}, plus the maquette. Logs console errors.
Usage: python3 scripts/shots.py <html file> <out dir> [maquette.html] [tabs...]"""
import json, sys, pathlib
from playwright.sync_api import sync_playwright

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
maquette = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3].endswith(".html") else None
tabs = [a for a in sys.argv[3:] if not a.endswith(".html")] or ["today", "journal", "charts", "tools", "guide"]

from fonts import serve_fonts

errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for theme in ["dark", "light"]:
        for lang in ["fr", "en", "de"]:
            ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme=theme)
            ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({json.dumps({'theme': theme, 'lang': lang, 'updatedAt': '2026-01-01T00:00:00Z'})}))")
            serve_fonts(ctx)
            pg = ctx.new_page()
            pg.on("console", lambda m: m.type == "error" and errors.append(f"{theme}/{lang}: {m.text}"))
            pg.on("pageerror", lambda e: errors.append(f"{theme}/{lang}: PAGEERROR {e}"))
            for tab in tabs:
                pg.goto(f"file://{page_file}#{tab}")
                pg.wait_for_timeout(4500)
                pg.screenshot(path=str(out / f"{tab}-{theme}-{lang}.png"), full_page=True)
                sw = pg.evaluate("document.documentElement.scrollWidth")
                if sw > 390: errors.append(f"{theme}/{lang}/{tab}: horizontal overflow {sw}px")
            ctx.close()
    if maquette:
        for theme in ["dark", "light"]:
            ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
            serve_fonts(ctx)
            pg = ctx.new_page(); pg.goto(f"file://{pathlib.Path(maquette).resolve()}")
            pg.evaluate(f"document.documentElement.dataset.theme='{theme}'")
            pg.wait_for_timeout(2400)
            pg.screenshot(path=str(out / f"maquette-{theme}.png"), full_page=True)
            ctx.close()
    b.close()
print("\n".join(errors) if errors else "no console errors, no overflow")
