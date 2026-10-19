"""Lot 7 (Athena + « mes produits ») in the browser, preview build, 390 px:
7a — Réglages → Gamme « Autre marque »: « Mes cibles (facultatif) » with nothing typed; Nutrition: the line is empty,
three products added with « Partir de l'étiquette » (2 mL per 1 L in veg and flowering S1–8; 4–6 mL per US gallon in veg;
1 g per 4 L in flowering S3–6); in veg for 40 L: water, 80 mL, 42,3–63,4 mL, not the flowering-only one; « ordre non
précisé » until a product is moved, then numbered in the new order; flowering S4: the third product appears; the tank
saved keeps the products and quantities; Today shows no EC / pH zone until targets are typed, then « cible 1,8 »;
the old free-text note of an « Autre marque » space shows above an empty recipe;
captures FR / EN / DE of Nutrition in « Autre marque » with the three products.
Usage: npm run preview:build && PYTHONPATH=scripts python3 scripts/e2e-7.py dist-preview/index.html <out dir>"""
import sys, json, pathlib
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
errors, checks = [], {}
OWN = "Autre marque / je dose moi-même"
MIXES = """() => new Promise((res) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => { const q = r.result.transaction('docs').objectStore('docs').getAll(); q.onsuccess = () => res(q.result.filter((d) => d && d.line === 'own' && d.volumeL)) } })"""
# The preview's grow has Thomas's own products (Proper…): taken away so the line starts empty.
OLD_NOTE = """() => new Promise((res) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => { const tx = r.result.transaction('docs', 'readwrite'); const s = tx.objectStore('docs'); s.getAllKeys().onsuccess = (e) => e.target.result.filter((k) => String(k).startsWith('customProducts/')).forEach((k) => s.delete(k)); s.put({ schemaVersion: 3, id: 'mix-old', date: '2026-10-01', spaceIds: ['colonne', 'floraison'], cycleId: 'cycle-1', volumeL: 40, line: 'own', recipe: 'Grow A 20 mL, Grow B 20 mL', items: [], createdAt: '2026-10-01T08:00:00Z' }, 'mixes/mix-old');
  // The cycle in veg (started 20 days ago, veg for 10), so that Today has the day's targets.
  const ago = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10)
  s.get('cycles/cycle-1').onsuccess = (e) => s.put({ ...e.target.result, germinationDate: ago(20), vegDate: ago(10) }, 'cycles/cycle-1'); tx.oncomplete = () => res(true) } })"""


def rows(pg):
    return [li.inner_text().replace("\n", " | ") for li in pg.locator("#own-recipe > li").all()]


def add(pg, name, lo, hi, per, unit="mL", veg=False, frm=None, to=None):
    pg.click("#own-from-label"); pg.wait_for_selector("#own-label-form"); pg.wait_for_timeout(400)
    pg.fill("#lb-name", name)
    form = pg.locator("#own-label-form")
    if unit != "mL": form.get_by_role("radio", name=unit, exact=True).click()
    pg.fill("#lb-lo", lo)
    if hi: pg.fill("#lb-hi", hi)
    form.locator("[role=radiogroup]").nth(1).get_by_role("radio", name=per, exact=True).click()
    if veg: pg.click("#lb-veg")
    if frm: pg.fill("#lb-from", frm)
    if to: pg.fill("#lb-to", to)
    pg.wait_for_timeout(200)
    checks.setdefault("per10", []).append(form.locator("p.text-primary").inner_text() if form.locator("p.text-primary").count() else None)
    pg.locator("[data-slot=drawer-content] [data-slot=drawer-footer] button").last.click(); pg.wait_for_timeout(900)


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="light")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(f"file://{page_file}#tools/settings"); pg.wait_for_timeout(2500)
    pg.evaluate(OLD_NOTE)
    pg.locator("#g-nut").get_by_role("radio", name=OWN).click(); pg.wait_for_timeout(800)
    checks["targetsOffered"] = pg.locator("#g-own-targets input").count() == 6 and all(not x.input_value() for x in pg.locator("#g-own-targets input").all())
    pg.screenshot(path=str(out / "01-settings-own.png"), full_page=True)

    pg.goto(f"file://{page_file}#tools/nutrition"); pg.reload(); pg.wait_for_timeout(2000)
    checks["oldNote"] = pg.locator("#own-old-note").inner_text() if pg.locator("#own-old-note").count() else None
    if not checks["oldNote"] or "Grow A 20 mL" not in checks["oldNote"]: errors.append(f"old note {checks['oldNote']}")
    pg.get_by_role("radio", name="Végé", exact=True).click(); pg.wait_for_timeout(300)
    pg.fill("#own-vol", "40"); pg.wait_for_timeout(200)
    add(pg, "Base A", "2", "", "1 L", veg=True, frm="1", to="8")
    add(pg, "Base B", "4", "6", "1 gal US", veg=True)
    add(pg, "Bloom C", "1", "", "4 L", unit="g", frm="3", to="6")
    checks["oldNoteGone"] = pg.locator("#own-old-note").count() == 0
    checks["veg"] = rows(pg)
    want = ["Eau | 40 L", "Base A | perso, non vérifié | 80 mL", "Base B | perso, non vérifié | 42,3–63,4 mL"]
    if checks["veg"] != want: errors.append(f"veg recipe {checks['veg']}")
    checks["orderUnset"] = pg.locator("#own-order-unset").count() == 1
    if not checks["orderUnset"]: errors.append("« ordre non précisé » missing")
    pg.screenshot(path=str(out / "02-veg-unordered.png"), full_page=True)
    pg.get_by_role("button", name="Monter Base B").click(); pg.wait_for_timeout(900)
    checks["ordered"] = rows(pg)
    if checks["ordered"][:3] != ["1 | Eau | 40 L", "2 | Base B | perso, non vérifié | 42,3–63,4 mL", "3 | Base A | perso, non vérifié | 80 mL"] or pg.locator("#own-order-unset").count(): errors.append(f"ordered {checks['ordered']}")
    pg.get_by_role("radio", name="Floraison", exact=True).click(); pg.wait_for_timeout(300)
    pg.fill("#own-week", "4"); pg.wait_for_timeout(300)
    checks["flowerS4"] = rows(pg)
    if not any(r.startswith("3 | Bloom C") or "Bloom C" in r and "10 g" in r for r in checks["flowerS4"]) or any("Base B" in r for r in checks["flowerS4"]): errors.append(f"flower S4 {checks['flowerS4']}")
    pg.fill("#own-week", "7"); pg.wait_for_timeout(300)
    checks["flowerS7"] = rows(pg)
    if any("Bloom C" in r for r in checks["flowerS7"]): errors.append(f"flower S7 {checks['flowerS7']}")
    pg.fill("#own-week", "4"); pg.fill("#own-ec", "1,9"); pg.fill("#own-ph", "6,0"); pg.wait_for_timeout(200)
    pg.get_by_role("button", name="Enregistrer ce bidon").click(); pg.wait_for_timeout(1200)
    saved = [m for m in pg.evaluate(MIXES) if m["id"] != "mix-old"]
    checks["savedItems"] = [(i["name"], i.get("qty"), i.get("range")) for i in saved[0]["items"]] if saved else None
    if not saved or [x[0] for x in checks["savedItems"]] != ["Base A", "Bloom C"] or saved[0].get("phase") != "fl4": errors.append(f"saved tank {saved[:1]}")
    pg.screenshot(path=str(out / "03-flower-saved.png"), full_page=True)

    # Today: no zone without targets; « cible 1,8 » once typed (veg and flowering, whatever the stage today).
    pg.goto(f"file://{page_file}"); pg.wait_for_timeout(1800)
    pg.get_by_role("group").first.get_by_role("button", name="Colonne").click(); pg.wait_for_timeout(1200)
    ec_target = lambda: pg.evaluate("""() => [...document.querySelectorAll('#readings [data-status], #readings > div > div')].map((r) => r.textContent).filter((x) => /EC entrée/.test(x))""")
    checks["ecInBefore"] = ec_target()
    pg.goto(f"file://{page_file}#tools/settings"); pg.wait_for_timeout(1500)
    for ph in ["veg", "flower"]:
        pg.fill(f"#g-own-{ph}-ec", "1,8"); pg.fill(f"#g-own-{ph}-phlo", "5,8"); pg.fill(f"#g-own-{ph}-phhi", "6,2")
    pg.wait_for_timeout(1500)
    pg.goto(f"file://{page_file}"); pg.wait_for_timeout(1800)
    checks["ecInAfter"] = ec_target()
    checks["phInAfter"] = pg.evaluate("""() => [...document.querySelectorAll('#readings > div > div')].map((r) => r.textContent).filter((x) => /pH entrée|pH runoff/.test(x))""")
    if any("cible" in x for x in checks["ecInBefore"]) or not any("cible 1,8" in x for x in checks["ecInAfter"]): errors.append(f"EC targets {checks['ecInBefore']} → {checks['ecInAfter']}")
    pg.screenshot(path=str(out / "04-today-targets.png"), full_page=True)
    ctx.close()

    # Captures FR / EN / DE of Nutrition in « Autre marque » with the three products.
    for lang in ["fr", "en", "de"]:
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="light")
        ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'light',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
        serve_fonts(ctx)
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
        pg.goto(f"file://{page_file}#tools/settings"); pg.wait_for_timeout(2500)
        pg.evaluate("""() => new Promise((res) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => { const tx = r.result.transaction('docs', 'readwrite'); const s = tx.objectStore('docs'); const now = '2026-10-19T08:00:00Z';
          s.getAllKeys().onsuccess = (e) => e.target.result.filter((k) => String(k).startsWith('customProducts/')).forEach((k) => s.delete(k));
          const p = (id, name, unit, lo, hi, perL, gal, use, order) => s.put({ schemaVersion: 2, id, name, unit, application: 'tank', verified: false, source: 'label', createdAt: now, labelDose: { lo, hi, perL, ...(gal ? { gal: true } : {}) }, dosePer10L: { lo: Math.round(lo / perL * 1000) / 100, hi: Math.round(hi / perL * 1000) / 100 }, use, mixOrder: order }, 'customProducts/' + id)
          p('cp-a', 'Base A', 'mL', 2, 2, 1, false, { veg: true, flowerFrom: 1, flowerTo: 8 }, 1); p('cp-b', 'Base B', 'mL', 4, 6, 3.785, true, { veg: true }, 2); p('cp-c', 'Bloom C', 'g', 1, 1, 4, false, { flowerFrom: 3, flowerTo: 6 }, 3)
          s.get('grow/main').onsuccess = (e) => { const g = e.target.result; s.put({ ...g, nutrition: { ...g.nutrition, line: 'own', addons: [] } }, 'grow/main') }
          tx.oncomplete = () => res(true) } })""")
        pg.goto(f"file://{page_file}#tools/nutrition"); pg.reload(); pg.wait_for_timeout(2200)
        pg.locator("#own-tank [role=radiogroup] [role=radio]").first.click(); pg.wait_for_timeout(200)
        pg.fill("#own-vol", "40"); pg.wait_for_timeout(300)
        checks[f"rows-{lang}"] = rows(pg)
        sw = pg.evaluate("document.documentElement.scrollWidth")
        if sw > 390: errors.append(f"{lang} overflow {sw}")
        if len(checks[f"rows-{lang}"]) != 3: errors.append(f"{lang} rows {checks[f'rows-{lang}']}")
        pg.screenshot(path=str(out / f"nutrition-own-{lang}.png"), full_page=True)
        ctx.close()
    b.close()

print(json.dumps(checks, ensure_ascii=False, indent=1))
print("errors:", errors[:8])
print("OK" if not errors else "FAIL")
sys.exit(0 if not errors else 1)
