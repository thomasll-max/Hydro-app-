"""Lot 4b walk-through at 390 px: pots and flow read from the space's equipment ("donnée manquante" when absent),
manual watering table of the line. Usage: PYTHONPATH=scripts python3 scripts/e2e-4b.py dist-preview/index.html <out dir>"""
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
    pg.goto(f"file://{page_file}#irrigation")
    pg.wait_for_timeout(3000)
    checks["colonne"] = pg.inner_text("#irr-equipment").replace("\n", " | ")
    pg.locator("#irr-equipment").screenshot(path=str(out / "01-colonne-missing.png"))

    pg.get_by_role("button", name="Floraison").first.click()
    pg.wait_for_timeout(1500)
    checks["floraison"] = pg.inner_text("#irr-equipment").replace("\n", " | ")
    pg.screenshot(path=str(out / "02-floraison-auto.png"), full_page=True)

    # Pot volume can be changed (lot 9: in the space's settings, opened from the tool): 11 L instead of 15 L.
    pg.locator("#irr-equipment").get_by_role("button", name="Réglages").click()
    pg.wait_for_selector("#sp-potL")
    pg.fill("#sp-potL", "11")
    pg.screenshot(path=str(out / "02a-space-settings.png"))
    pg.get_by_role("button", name="Enregistrer").click()
    pg.wait_for_selector("text=Enregistré", timeout=10000)
    pg.wait_for_timeout(1200)
    checks["pot11"] = pg.locator("#irr-equipment").inner_text().replace("\n", " | ")
    pg.locator("#irr-equipment").screenshot(path=str(out / "02b-pot-11.png"))

    # Manual watering table of the line: always shown (reference), the stage row highlighted.
    checks["manual-current"] = pg.locator("#irr-manual li[data-current]").inner_text().replace("\n", " | ")
    pg.locator("#irr-manual").screenshot(path=str(out / "03-manual-table.png"))
    pg.screenshot(path=str(out / "04-floraison-manual.png"), full_page=True)
    checks["pass-ml"] = "330 mL" in pg.inner_text("main")
    pg.goto(f"file://{page_file}#equipment"); pg.wait_for_timeout(2000)
    checks["equipment-has-11L"] = "11" in pg.inner_text("main")
    b.close()
for k, v in checks.items(): print(k, "→", v)
print("\n".join(errors) if errors else "no console errors")
