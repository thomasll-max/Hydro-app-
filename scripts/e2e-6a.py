"""Lot 6a walk-through at 390 px: 40 days of test entries written straight into the local store (IndexedDB), then
Graphiques: 2 spaces compared, curves chosen, one chart per curve with target band and events, overlay view, periods.
Usage: PYTHONPATH=scripts python3 scripts/e2e-6a.py dist-preview/index.html <out dir>"""
import sys, pathlib, json, datetime
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
errors, checks = [], {}
today = datetime.date.today()
docs = {}
for sp, base in [("floraison", 0), ("colonne", 6)]:
    for d in range(40):
        day = (today - datetime.timedelta(days=39 - d)).isoformat()
        stage = "veg" if d < 20 else "stretch"
        docs[f"entries/{day}_{sp}"] = {
            "schemaVersion": 2, "id": f"{day}_{sp}", "date": day, "spaceId": sp, "createdAt": "x", "updatedAt": "x",
            "dryback": 28 + base + (d * 7) % 18, "ecRunoff": round(3.6 + (d % 9) * 0.2 + base / 10, 1), "phRunoff": round(5.9 + (d % 5) * 0.06, 2),
            "tempDay": 24 + (d % 4), "rh": 58 + (d % 7), "vpd": round(1.0 + (d % 6) * 0.07, 2),
            "targets": {"stage": stage, "dryback": {"lo": 25, "hi": 50} if stage == "veg" else {"lo": 40, "hi": 50}, "ecRunoff": {"lo": 3, "hi": 5} if stage == "veg" else {"lo": 4, "hi": 10}, "phRunoff": {"lo": 5.8, "hi": 6.2}, "vpd": {"lo": 0.8, "hi": 1.2}},
        }
flip = (today - datetime.timedelta(days=19)).isoformat()
docs["events/test-flip"] = {"schemaVersion": 2, "id": "test-flip", "date": flip, "type": "flip", "spaceId": "floraison", "createdAt": "x"}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark")
    ctx.add_init_script("localStorage.setItem('hydro.ui', JSON.stringify({theme:'dark',lang:'fr',updatedAt:'2026-01-01T00:00:00Z'}))")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(f"file://{page_file}#charts"); pg.wait_for_timeout(2500)
    pg.evaluate("""(docs) => new Promise((res, rej) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => { const tx = r.result.transaction('docs', 'readwrite'); const s = tx.objectStore('docs'); for (const [k, v] of Object.entries(docs)) s.put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error) } })""", docs)
    pg.reload(); pg.wait_for_timeout(3000)
    checks["spaces"] = pg.inner_text("#ch-spaces").replace("\n", " ")
    pg.get_by_role("radio", name="30 j").click(); pg.wait_for_timeout(1200)
    checks["charts"] = pg.locator("[data-curve]").count()
    checks["lines"] = pg.locator("[data-curve] .recharts-line").count()
    checks["bands"] = pg.locator("[data-curve] .recharts-area").count()
    checks["eventLines"] = pg.locator("[data-curve] .recharts-reference-line").count()
    pg.screenshot(path=str(out / "01-split-30d.png"), full_page=True)
    pg.get_by_role("button", name="VPD").click(); pg.wait_for_timeout(600)
    checks["chartsAfterVpd"] = pg.locator("[data-curve]").count()
    pg.get_by_role("radio", name="Superposées").click(); pg.wait_for_timeout(1200)
    checks["overlayLines"] = pg.locator(".recharts-line").count()
    pg.screenshot(path=str(out / "02-overlay.png"), full_page=True)
    pg.reload(); pg.wait_for_timeout(2500)
    checks["prefsKept"] = pg.get_by_role("radio", name="Superposées").get_attribute("aria-checked") or pg.get_by_role("radio", name="Superposées").get_attribute("data-state")
    b.close()
for k, v in checks.items(): print(k, "→", v)
print("\n".join(errors) if errors else "no console errors")
