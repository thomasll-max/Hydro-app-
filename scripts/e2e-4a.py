"""Lot 4a walk-through at 390 px: concentrate helper (0.9 kg → 4.0 L), Finition S8 (Fade, no Core, pH 6.0–6.4),
one tank for two spaces with pH before/after and Balance added, stock going down, Proper typed from the label.
Usage: PYTHONPATH=scripts python3 scripts/e2e-4a.py dist-preview/index.html <out dir>"""
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
    pg.goto(f"file://{page_file}#nutrition")
    pg.wait_for_timeout(3000)

    # Concentrate helper: Pro Bloom, whole 0.9 kg bag at 226 g/L → 4.0 L.
    pg.get_by_role("button", name="Nouveau concentré").click()
    pg.wait_for_selector("#c-bag")
    pg.get_by_role("radio", name="Pro Bloom").click()
    pg.fill("#c-bag", "0,9")
    pg.wait_for_timeout(300)
    checks["bag"] = pg.inner_text("#c-final")
    pg.screenshot(path=str(out / "01-concentrate-sheet.png"))
    pg.get_by_role("button", name="Enregistrer").click()
    pg.wait_for_selector("text=Enregistré", timeout=10000)
    pg.wait_for_timeout(800)

    # Finition S8–S9, 100 L at EC 3.0.
    pg.get_by_role("radio", name="Finition S8–S9").click()
    pg.fill("#n-vol", "100")
    pg.fill("#n-ec", "3")
    pg.wait_for_timeout(400)
    checks["order"] = [x.strip() for x in pg.locator("#nut-order li").all_inner_texts()]
    checks["ph"] = pg.inner_text("#nut-ph")
    pg.locator("#nut-order").screenshot(path=str(out / "02-finish-order.png"))

    # One tank for both spaces, pH before / Balance added / pH after.
    pg.get_by_role("button", name="Floraison").last.click()
    pg.fill("#n-phb", "7,1")
    pg.fill("#n-bala", "30")
    pg.fill("#n-pha", "6,1")
    pg.wait_for_timeout(300)
    checks["nextBalance"] = pg.locator("#nut-tank").inner_text()
    pg.locator("#nut-tank").screenshot(path=str(out / "03-tank-two-spaces.png"))
    pg.get_by_role("button", name="Enregistrer ce bidon").last.click()
    pg.wait_for_selector("text=Bidon enregistré pour 2 espaces", timeout=10000)
    pg.wait_for_timeout(1000)
    checks["stock"] = pg.locator("#nut-stocks").inner_text()
    pg.locator("#nut-stocks").screenshot(path=str(out / "04-stock.png"))

    # Proper: empty until typed from the label (test values typed here, browser storage only).
    pg.get_by_role("button", name="Proper").click()
    pg.wait_for_selector("#p-lo")
    pg.screenshot(path=str(out / "05-proper-empty.png"))
    pg.fill("#p-lo", "1"); pg.fill("#p-hi", "2"); pg.fill("#p-per", "4")
    pg.fill("#p-from", "4"); pg.fill("#p-to", "9")
    pg.wait_for_timeout(300)
    pg.screenshot(path=str(out / "06-proper-typed.png"))
    pg.get_by_role("button", name="Enregistrer").click()
    pg.wait_for_selector("text=Enregistré", timeout=10000)
    pg.wait_for_timeout(800)
    checks["properLine"] = pg.locator("#nut-order li[data-item=proper]").inner_text()
    pg.screenshot(path=str(out / "07-nutrition-after.png"), full_page=True)

    # Each space sees the tank in its journal.
    for sp in ["Floraison", "Colonne"]:
        pg.goto(f"file://{page_file}#journal"); pg.wait_for_timeout(1500)
        pg.get_by_role("button", name=sp).first.click(); pg.wait_for_timeout(1200)
        checks[f"journal-{sp}"] = "bidons · 1" in pg.inner_text("main").lower()
    b.close()
for k, v in checks.items(): print(k, "→", v)
print("\n".join(errors) if errors else "no console errors")
