"""Lot 2b walk-through at 390 px: full daily entry in under a minute, quick multi-space entry, Journal, Today.
Usage: PYTHONPATH=scripts python3 scripts/e2e-2b.py dist-preview/index.html <out dir>"""
import sys, time, pathlib, json
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark")
    ctx.add_init_script("localStorage.setItem('hydro.ui', JSON.stringify({theme:'dark',lang:'fr',updatedAt:'2026-01-01T00:00:00Z'}))")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(f"file://{page_file}")
    pg.wait_for_timeout(3000)
    pg.screenshot(path=str(out / "01-today-all.png"), full_page=True)

    # Full entry for the Colonne: select it, tap the FAB, fill, save — timed.
    pg.get_by_role("button", name="Colonne").first.click()
    pg.wait_for_timeout(800)
    t0 = time.time()
    pg.click("#tab-plus"); pg.click("#add-entry")
    pg.wait_for_selector("#e-tempDay")
    for sel, val in [("#e-tempDay", "25,5"), ("#e-tempNight", "21"), ("#e-rh", "68"), ("#e-sownCount", "4"), ("#e-germinatedCount", "3"),
                     ("#e-weightMorningKg", "1,2"), ("#e-weightPeakKg", "1,5"), ("#e-heightCm", "4")]:
        if pg.locator(sel).count():
            pg.fill(sel, val)
    pg.locator("#e-dome").click()
    pg.fill("#e-note", "Première levée")
    pg.screenshot(path=str(out / "02-entry-colonne.png"), full_page=False)
    pg.get_by_role("button", name="Enregistrer", exact=True).click()
    pg.wait_for_selector("text=Saisie enregistrée", timeout=10000)
    elapsed = time.time() - t0
    pg.wait_for_timeout(1200)
    pg.screenshot(path=str(out / "03-today-colonne.png"), full_page=True)

    # Quick multi-space entry from "Tous".
    pg.get_by_role("button", name="Tous").first.click()
    pg.wait_for_timeout(600)
    pg.click("#tab-plus"); pg.click("#add-quick")
    pg.wait_for_selector("#q-floraison-t")
    pg.fill("#q-floraison-t", "26")
    pg.fill("#q-floraison-rh", "60")
    pg.fill("#q-floraison-res", "60")
    pg.screenshot(path=str(out / "04-quick.png"))
    pg.get_by_role("button", name="Enregistrer", exact=True).click()
    pg.wait_for_selector("text=/espaces? enregistrés?/", timeout=10000)  # lot 10e: real plurals
    pg.wait_for_timeout(1200)
    pg.screenshot(path=str(out / "05-today-all-after.png"), full_page=True)

    # Journal (all spaces)
    pg.get_by_role("tab", name="Journal").click()
    pg.wait_for_timeout(1200)
    pg.screenshot(path=str(out / "06-journal.png"), full_page=True)
    rows = pg.locator("text=Première levée").count()

    # Floraison view
    pg.get_by_role("tab", name="Aujourd'hui").click()
    pg.get_by_role("button", name="Floraison").first.click()
    pg.wait_for_timeout(1200)
    pg.screenshot(path=str(out / "07-today-floraison.png"), full_page=True)
    sw = pg.evaluate("document.documentElement.scrollWidth")
    b.close()
print(json.dumps({"entry_seconds": round(elapsed, 1), "journal_rows_with_note": rows, "scrollWidth": sw, "errors": errors}, ensure_ascii=False))
