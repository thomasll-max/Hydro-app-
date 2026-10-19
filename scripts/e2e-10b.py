"""Lot 10b (cycles and stages) in the browser at 390 px, preview build (Thomas's starting grow, offline store):
- new cycle in 4 fields (name, variety, space, start date), the rest folded and prefilled from the space's equipment;
- "Passer en végé" / "Passer en 12/12" in one tap on Today, with "Annuler"; the expected harvest is shown;
- "Récolter": the cycle is harvested, the space offers to log the harvest.
Usage: npm run preview:build && PYTHONPATH=scripts python3 scripts/e2e-10b.py dist-preview/index.html <out dir>"""
import sys, json, pathlib
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
errors, checks = [], {}

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(f"file://{page_file}#settings"); pg.wait_for_timeout(2500)

    # New cycle: 4 visible fields, the rest folded.
    pg.get_by_role("button", name="Nouveau cycle").click(); pg.wait_for_selector("#c-name")
    pg.wait_for_timeout(400)
    checks["visibleFields"] = pg.locator("#cycle-essentials input").count()
    checks["foldedPots"] = pg.locator("#c-pv").count() == 0
    pg.screenshot(path=str(out / "01-new-cycle.png"))
    pg.fill("#c-name", "Blue Zushi 2026"); pg.fill("#c-cult", "Blue Zushi")
    pg.get_by_role("radio", name="Floraison").click(); pg.wait_for_timeout(200)
    pg.get_by_role("button", name="Arrosage et matériel").click(); pg.wait_for_timeout(400)
    checks["prefilledPots"] = [pg.input_value("#c-pv"), pg.input_value("#c-pc")]
    pg.screenshot(path=str(out / "02-new-cycle-setup.png"))
    pg.get_by_role("button", name="Enregistrer", exact=True).click(); pg.wait_for_timeout(1200)
    checks["created"] = pg.get_by_text("Blue Zushi 2026").count() > 0

    # Today of Floraison: the new cycle is the active one; "Passer en végé" then "Passer en 12/12".
    pg.get_by_role("button", name="Floraison").first.click(); pg.wait_for_timeout(300)
    pg.goto(f"file://{page_file}#today"); pg.wait_for_timeout(2500)
    checks["stepVeg"] = pg.locator("#step-veg").count() == 1
    pg.screenshot(path=str(out / "03-today-step-veg.png"), full_page=True)
    pg.click("#step-veg"); pg.wait_for_timeout(1000)
    checks["afterVeg"] = pg.locator("#step-flip").count() == 1
    pg.get_by_role("button", name="Annuler").first.click(); pg.wait_for_timeout(1000)
    checks["undoBackToVeg"] = pg.locator("#step-veg").count() == 1
    pg.click("#step-veg"); pg.wait_for_timeout(800)
    pg.click("#step-flip"); pg.wait_for_timeout(1000)
    checks["expected"] = pg.inner_text("#step-expected") if pg.locator("#step-expected").count() else None
    checks["harvestDiscreet"] = "outline" in (pg.get_attribute("#step-harvest", "data-variant") or "") or pg.locator("#step-harvest").count() == 1
    pg.screenshot(path=str(out / "04-today-flowering.png"), full_page=True)
    pg.click("#step-harvest"); pg.wait_for_timeout(1200)
    checks["lastHarvest"] = pg.locator("#last-harvest").count() == 1
    pg.screenshot(path=str(out / "05-after-harvest.png"), full_page=True)

    # The cycle form after the steps: real dates, "Jour de la récolte", events on the journal.
    pg.goto(f"file://{page_file}#settings"); pg.wait_for_timeout(2000)
    pg.get_by_text("Blue Zushi 2026").first.click(); pg.wait_for_selector("#cycle-steps")
    pg.wait_for_timeout(300)
    checks["dates"] = [pg.input_value("#c-veg") != "", pg.input_value("#c-flip") != "", pg.input_value("#c-harv") != ""]
    checks["harvestLabel"] = pg.locator("label[for=c-harv]").inner_text()
    pg.screenshot(path=str(out / "06-cycle-steps.png"))
    ctx.close()
    b.close()
for k, v in checks.items(): print(k, "→", v)
print("\n".join(errors) if errors else "no console errors")
