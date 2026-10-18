"""Lot 5b walk-through at 390 px: Lumière (EVO4 dimmer, PPFD/DLI estimate, reverse DLI, proportional layout for
Floraison 90×90 and Colonne 30×90, 3×3 PPFD map) and Climat (VPD, humidity to aim for, air renewal).
Usage: PYTHONPATH=scripts python3 scripts/e2e-5b.py dist-preview/index.html <out dir>"""
import sys, pathlib
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
errors, checks = [], {}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark")
    ctx.add_init_script("localStorage.setItem('hydro.ui', JSON.stringify({theme:'dark',lang:'fr',updatedAt:'2026-01-01T00:00:00Z'}))")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(f"file://{page_file}#light"); pg.wait_for_timeout(2500)
    checks["colonne-ratio"] = pg.get_attribute("#lgt-schema svg", "data-ratio")
    pg.get_by_role("button", name="Floraison").first.click(); pg.wait_for_timeout(1500)
    checks["floraison-ratio"] = pg.get_attribute("#lgt-schema svg", "data-ratio")
    pg.get_by_role("button", name="Réglages").first.click(); pg.wait_for_selector("#sp-dim-evo4")
    pg.fill("#sp-dim-evo4", "50")
    pg.get_by_role("button", name="Enregistrer").click(); pg.wait_for_selector("text=Enregistré", timeout=10000); pg.wait_for_timeout(1200)
    checks["ppfd"] = pg.inner_text("#lgt-ppfd").replace("\n", " | ")
    pg.fill("#l-dli", "40"); pg.wait_for_timeout(300)
    checks["inverse"] = pg.inner_text("#lgt-inverse").replace("\n", " | ")
    for i, v in enumerate([620, 700, 610, 680, 760, 690, 600, 650, 590]):
        pg.fill(f"#l-cell-{i}", str(v))
    pg.wait_for_timeout(300)
    checks["stats"] = pg.inner_text("#lgt-stats")
    pg.get_by_role("button", name="Enregistrer la carte").click()
    pg.wait_for_selector("text=Carte enregistrée", timeout=10000); pg.wait_for_timeout(600)
    checks["ppfd-measured"] = pg.inner_text("#lgt-ppfd").replace("\n", " | ")
    pg.screenshot(path=str(out / "01-light-floraison.png"), full_page=True)

    pg.goto(f"file://{page_file}#climate"); pg.wait_for_timeout(2500)
    pg.fill("#c-t", "25"); pg.fill("#c-rh", "60"); pg.fill("#c-off", "-2"); pg.wait_for_timeout(300)
    checks["vpd"] = pg.inner_text("#clim-vpd-v")
    checks["air"] = pg.inner_text("#clim-air").replace("\n", " | ")
    pg.screenshot(path=str(out / "02-climate-floraison.png"), full_page=True)
    b.close()
for k, v in checks.items(): print(k, "→", v)
print("\n".join(errors) if errors else "no console errors")
