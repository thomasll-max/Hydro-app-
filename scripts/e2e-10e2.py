"""Lot 10e2 in the browser at 390 px, preview build:
- the (i) next to VPD opens its definition; Repères has a Glossary;
- « 2 espaces » (no « espace(s) »), « EC runoff / pH runoff » (no « RO »);
- calendar days say what their dots mean; today is marked aria-current; tabs carry aria-current="page";
- the display button's name includes its visible « FR »; the reminder sheet has one « Note » and a titled repeat end;
- English: no French colon (« : ») in the equipment list or the charts tooltip text.
Usage: npm run preview:build && PYTHONPATH=scripts python3 scripts/e2e-10e2.py dist-preview/index.html <out dir>"""
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
    pg.goto(f"file://{page_file}"); pg.wait_for_timeout(2500)
    body = pg.inner_text("body")
    # No « (s) » anywhere (the plural rules are unit-tested; « 2 espaces » of the summary left Aujourd'hui in lot 10k1).
    checks["plural"] = "(s)" not in body and "Espaces" in body
    checks["tabCurrent"] = pg.locator("[role=tab][aria-current=page]").inner_text().strip()
    checks["displayName"] = pg.locator("#display-menu").get_attribute("aria-label")
    # Entry sheet: the (i) of VPD.
    pg.click("#tab-plus"); pg.click("#add-entry"); pg.wait_for_selector("#e-when"); pg.wait_for_timeout(500)
    pg.get_by_role("button", name="Qu'est-ce que VPD ?").first.click(); pg.wait_for_timeout(400)
    checks["vpdTip"] = pg.locator("[data-radix-popper-content-wrapper]").inner_text()[:60]
    pg.screenshot(path=str(out / "01-info.png"))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    pg.get_by_role("button", name="Fermer").first.click(); pg.wait_for_timeout(500)
    if pg.get_by_role("button", name="Abandonner").count(): pg.get_by_role("button", name="Abandonner").click(); pg.wait_for_timeout(400)
    # Repères → Glossaire.
    pg.goto(f"file://{page_file}#tools/reperes"); pg.wait_for_timeout(1200)
    pg.get_by_role("button", name="Glossaire").click(); pg.wait_for_timeout(500)
    checks["glossaryTerms"] = pg.locator("#glossary dt").count()
    pg.screenshot(path=str(out / "02-glossary.png"))
    # Calendar: a day with something due is described.
    pg.goto(f"file://{page_file}#calendar"); pg.wait_for_timeout(1500)  # no Calendar tab since lot 10h
    checks["todayCell"] = pg.locator("button[aria-current=date]").get_attribute("aria-label")
    checks["describedDays"] = pg.locator("button[aria-label*='échéance'], button[aria-label*='rappel']").count()
    # Reminder sheet: one « Note », a titled repeat end.
    pg.get_by_role("tab", name="Aujourd'hui").click(); pg.wait_for_timeout(800)
    pg.get_by_role("button", name="+ Rappel").first.click(); pg.wait_for_timeout(600)
    pg.get_by_role("radio", name="Semaine").click(); pg.wait_for_timeout(200)
    sheet = pg.locator("[data-slot=drawer-content]").inner_text()
    checks["noteOnce"] = sheet.count("Note") == 1
    checks["endTitled"] = "Fin de la répétition" in sheet
    pg.screenshot(path=str(out / "03-reminder.png"))
    ctx.close()

    # English: colons.
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="light")
    ctx.add_init_script("localStorage.setItem('hydro.ui', JSON.stringify({theme:'light',lang:'en',updatedAt:'2026-01-01T00:00:00Z'}))")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(f"file://{page_file}#tools/equipment"); pg.wait_for_timeout(2500)
    eq = pg.inner_text("main")
    checks["enNoFrenchColon"] = " : " not in eq
    checks["enSample"] = [l for l in eq.split("\n") if ":" in l][:3]
    ctx.close()
    b.close()

print(json.dumps(checks, ensure_ascii=False, indent=1))
print("errors:", errors[:5])
ok = (
    checks["plural"] and checks["tabCurrent"] == "Aujourd'hui" and (checks["displayName"] or "").startswith("FR")
    and checks["vpdTip"].startswith("VPD") and checks["glossaryTerms"] >= 9 and checks["todayCell"] and checks["noteOnce"]
    and checks["endTitled"] and checks["enNoFrenchColon"] and not errors
)
print("OK" if ok else "FAIL")
sys.exit(0 if ok else 1)
