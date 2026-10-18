"""Lot 5a walk-through at 390 px: two tanks saved with their Balance (Nutrition), then pH / Balance: prediction from
2 tanks, start at 80 %, one step of 1 mL per 4 L, reading on target, saved on the last tank; IPW: switched off by
default, switch on, dose 2 L × 24 mL/L, window, checklist.
Usage: PYTHONPATH=scripts python3 scripts/e2e-5a.py dist-preview/index.html <out dir>"""
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

    # Two tanks with their Balance (test values, browser storage only).
    for vol, bal in [("100", "30"), ("50", "15")]:
        pg.goto(f"file://{page_file}#nutrition"); pg.wait_for_timeout(2500)
        pg.fill("#n-vol", vol); pg.fill("#n-bala", bal); pg.fill("#n-pha", "6,0")
        pg.get_by_role("button", name="Enregistrer ce bidon").last.click()
        pg.wait_for_selector("text=Bidon enregistré", timeout=10000); pg.wait_for_timeout(1200)

    pg.goto(f"file://{page_file}#ph"); pg.wait_for_timeout(2500)
    checks["target"] = pg.inner_text("#phb-target")
    pg.fill("#b-vol", "100"); pg.fill("#b-before", "5,4"); pg.wait_for_timeout(400)
    checks["pred"] = pg.inner_text("#phb-pred").replace("\n", " | ")
    pg.get_by_role("button", name="Verser le départ").click(); pg.wait_for_timeout(1500)
    checks["afterStart"] = pg.inner_text("#phb-total").replace("\n", " ")
    pg.fill("#b-ph", "5,6"); pg.get_by_role("button", name="Noter").click(); pg.wait_for_timeout(300)
    pg.locator("#phb-step").click(); pg.wait_for_timeout(1500)
    checks["afterStep"] = pg.inner_text("#phb-total").replace("\n", " ")
    pg.fill("#b-ph", "5,9"); pg.get_by_role("button", name="Noter").click(); pg.wait_for_timeout(400)
    checks["status"] = pg.inner_text("#phb-status")
    pg.screenshot(path=str(out / "01-ph-titration.png"), full_page=True)
    pg.get_by_role("button", name="Enregistrer sur le bidon").click()
    pg.wait_for_selector("text=pH et Balance enregistrés", timeout=10000)
    pg.fill("#b-ph", "6,6"); pg.get_by_role("button", name="Noter").click(); pg.wait_for_timeout(400)
    checks["over"] = pg.inner_text("#phb-status")

    pg.goto(f"file://{page_file}#ipw"); pg.wait_for_timeout(2500)
    checks["off"] = pg.locator("#ipw-off").count() == 1
    pg.screenshot(path=str(out / "02-ipw-off.png"), full_page=True)
    pg.get_by_role("button", name="Activer IPW").click(); pg.wait_for_timeout(1200)
    checks["offAfterEnable"] = pg.locator("#ipw-off").count()
    pg.fill("#ipw-l", "2"); pg.wait_for_timeout(300)
    checks["dose"] = pg.inner_text("#ipw-dose").replace("\n", " ")
    checks["window"] = pg.inner_text("#ipw-window").replace("\n", " | ")
    pg.locator("#ipw-checklist button").first.click()
    pg.screenshot(path=str(out / "03-ipw.png"), full_page=True)
    b.close()
for k, v in checks.items(): print(k, "→", v)
print("\n".join(errors) if errors else "no console errors")
