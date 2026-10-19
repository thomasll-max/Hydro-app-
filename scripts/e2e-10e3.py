"""Lot 10e3 in the browser at 390 px, preview build: « Autre marque / je dose moi-même » (Thomas's decision).
- Réglages → Gamme: the option is offered; once picked, no add-ons nor dosing, a note says why;
- Nutrition: « Mon bidon » (volume, products as typed, EC and pH measured), no recipe; the saved tank shows (lot 7a:
  « Ma recette » from the grower's own products, the free text becomes the tank's note);
- pH / Balance: a note, no Balance titration; Today: no EC / pH target shown;
- back to Athena Pro Line: the recipe comes back (nothing mixed).
Usage: npm run preview:build && PYTHONPATH=scripts python3 scripts/e2e-10e3.py dist-preview/index.html <out dir>"""
import sys, json, pathlib
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
errors, checks = [], {}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="light")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(f"file://{page_file}#tools/settings"); pg.wait_for_timeout(2500)
    nut = pg.locator("#g-nut")
    checks["offered"] = nut.get_by_role("radio", name="Autre marque / je dose moi-même").count() == 1
    nut.get_by_role("radio", name="Autre marque / je dose moi-même").click(); pg.wait_for_timeout(800)
    checks["note"] = pg.inner_text("#g-line-note")[:40]
    checks["noAddons"] = nut.get_by_role("button", name="Fade").count() == 0
    pg.screenshot(path=str(out / "01-settings.png"))

    pg.goto(f"file://{page_file}#tools/nutrition"); pg.wait_for_timeout(1500)
    checks["ownForm"] = pg.locator("#own-tank").count() == 1 and pg.locator("#nut-phases").count() == 0
    pg.fill("#own-vol", "40"); pg.fill("#own-note", "Grow A 20 mL, Grow B 20 mL"); pg.fill("#own-ec", "1,8"); pg.fill("#own-ph", "6,0")
    pg.get_by_role("button", name="Enregistrer ce bidon").click(); pg.wait_for_timeout(1200)
    checks["saved"] = pg.inner_text("#nut-last")[:60]
    pg.screenshot(path=str(out / "02-own-tank.png"))

    pg.goto(f"file://{page_file}#tools/ph"); pg.wait_for_timeout(1200)
    checks["phNote"] = pg.locator("#own-ph").count() == 1

    pg.goto(f"file://{page_file}"); pg.wait_for_timeout(1500)
    checks["todayNoEcTarget"] = pg.locator("text=/cible .*mS|EC .*cible/").count() == 0
    pg.screenshot(path=str(out / "03-today.png"), full_page=True)

    # Back to Athena: the recipe is there again.
    pg.goto(f"file://{page_file}#tools/settings"); pg.wait_for_timeout(1500)
    pg.locator("#g-nut").get_by_role("radio", name="Athena Pro Line").click(); pg.wait_for_timeout(800)
    pg.goto(f"file://{page_file}#tools/nutrition"); pg.wait_for_timeout(1500)
    checks["backToAthena"] = pg.locator("#nut-phases").count() == 1 and pg.locator("#own-tank").count() == 0
    ctx.close()
    b.close()

print(json.dumps(checks, ensure_ascii=False, indent=1))
print("errors:", errors[:5])
ok = checks["offered"] and checks["note"].startswith("Ta propre gamme") and checks["noAddons"] and checks["ownForm"] and "Dernier bidon" in checks["saved"] and checks["phNote"] and checks["backToAthena"] and not errors
print("OK" if ok else "FAIL")
sys.exit(0 if ok else 1)
