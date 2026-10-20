"""Lot 8d: dryback method per space. the Colonne switched to the AC Infinity sensor: the entry form shows only the sensor
fields, the sensor dryback has no Athena status, the journal / Today / charts show it apart; then another sensor (named),
none, and back to weighing. Usage: npm run preview:build && PYTHONPATH=scripts python3 scripts/e2e-8d.py dist-preview/index.html <out dir>"""
import sys, json, pathlib
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
errors, checks = [], {}
SPACE = "Colonne"  # the space with the running cycle (Today shows its gauges)

def shot(pg, name, full=False):
    pg.wait_for_timeout(450)
    pg.screenshot(path=str(out / name), full_page=full)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark")
    ctx.add_init_script("localStorage.setItem('hydro.ui', JSON.stringify({theme:'dark',lang:'fr',updatedAt:'2026-01-01T00:00:00Z'}))")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))

    def open_settings(method_label, name=None):
        pg.goto(f"file://{page_file}#irrigation"); pg.wait_for_timeout(2200)
        pg.get_by_role("button", name=SPACE).first.click(); pg.wait_for_timeout(800)
        pg.locator("#irr-equipment").get_by_role("button", name="Réglages").click()
        pg.wait_for_selector("#sp-dryback")
        pg.locator("#sp-dryback").get_by_role("button", name=method_label, exact=True).click()
        if name: pg.fill("#sp-sensor-name", name)
        return pg.inner_text("#sp-dryback").replace("\n", " | ")

    def open_entry():
        pg.goto(f"file://{page_file}"); pg.wait_for_timeout(2000)
        pg.get_by_role("button", name=SPACE).first.click(); pg.wait_for_timeout(600)
        pg.click("#tab-plus"); pg.click("#add-entry"); pg.wait_for_selector("#e-when")
        pg.wait_for_timeout(500)

    def ids():
        return {k: pg.locator(f"#e-{k}").count() for k in ["weightMorningKg", "weightPeakKg", "sensorMorningPct", "sensorPeakPct", "sensorPct"]}

    # Default: weighing, as before.
    open_entry()
    checks["defaultFields"] = ids()
    pg.keyboard.press("Escape"); pg.wait_for_timeout(400)

    checks["settingAc"] = open_settings("Capteur AC Infinity")
    shot(pg, "01-space-setting.png")
    pg.get_by_role("button", name="Enregistrer").click(); pg.wait_for_timeout(1200)

    open_entry()
    checks["acFields"] = ids()
    checks["scaleNote"] = pg.inner_text("#e-sensor-scale")
    pg.fill("#e-sensorPeakPct", "40"); pg.fill("#e-sensorMorningPct", "30"); pg.fill("#e-runoffMl", "")
    pg.wait_for_timeout(300)
    tiles = pg.locator("div[aria-live=polite]").inner_text().replace("\n", " | ")
    checks["computed"] = tiles
    # No colour judgment on the sensor tile (green / orange / red classes).
    checks["sensorTileColoured"] = pg.evaluate("""() => { const tile = [...document.querySelectorAll('div[aria-live=polite] > div')].find(d => d.textContent.includes('Dryback capteur')); return !!tile && /text-(primary|warn|bad)/.test(tile.innerHTML) }""")
    pg.locator("#e-sensor-scale").scroll_into_view_if_needed()
    shot(pg, "02-entry-ac.png")
    pg.get_by_role("button", name="Enregistrer", exact=True).click(); pg.wait_for_timeout(1500)

    # Stored apart, with the method.
    stored = pg.evaluate("""() => new Promise((res) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => { const q = r.result.transaction('docs').objectStore('docs').getAll(); q.onsuccess = () => res(q.result.filter(d => d && d.sensorPeakPct != null)) } })""")
    checks["stored"] = [{k: e.get(k) for k in ["sensorPeakPct", "sensorMorningPct", "drybackSensor", "dryback", "drybackMethod", "runoffPct"]} for e in stored]

    pg.goto(f"file://{page_file}"); pg.wait_for_timeout(2000)
    pg.get_by_role("button", name=SPACE).first.click(); pg.wait_for_timeout(1800)
    checks["todayGauge"] = pg.locator("text=Dryback capteur").count() > 0 and pg.locator("text=échelle capteur").count() > 0
    shot(pg, "03-today.png")
    pg.goto(f"file://{page_file}#journal"); pg.wait_for_timeout(1800)
    checks["journal"] = pg.locator("text=Dryback capteur").count() > 0
    pg.goto(f"file://{page_file}#charts"); pg.wait_for_timeout(1800)
    # Since lot 10k4 the view « Arrosage » shows the sensor dryback on its own chart when there is one.
    checks["chartChip"] = pg.locator("[data-curve=drybackSensor]", has_text="Dryback capteur (échelle capteur)").count() > 0
    if not checks["chartChip"]: errors.append("no sensor dryback chart in « Arrosage »")
    shot(pg, "04-charts.png", full=True)

    # Another sensor, named.
    checks["settingOther"] = open_settings("Autre capteur", "TEROS 12")
    pg.get_by_role("button", name="Enregistrer").click(); pg.wait_for_timeout(1200)
    open_entry()
    checks["otherFields"] = ids()
    checks["otherName"] = pg.locator("text=TEROS 12").count() > 0
    pg.keyboard.press("Escape"); pg.wait_for_timeout(400)

    # None: no dryback field at all.
    open_settings("Aucune")
    pg.get_by_role("button", name="Enregistrer").click(); pg.wait_for_timeout(1200)
    open_entry()
    checks["noneFields"] = ids()
    checks["noneTiles"] = pg.locator("div[aria-live=polite]").inner_text().replace("\n", " | ")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(400)

    # Back to weighing.
    open_settings("Pesée")
    pg.get_by_role("button", name="Enregistrer").click(); pg.wait_for_timeout(1200)
    open_entry()
    checks["weightAgain"] = ids()
    checks["overflow"] = pg.evaluate("document.documentElement.scrollWidth > innerWidth")
    b.close()
for k, v in checks.items(): print(k, "→", v if isinstance(v, str) else json.dumps(v, ensure_ascii=False))
print("\n".join(errors) if errors else "no console errors")
