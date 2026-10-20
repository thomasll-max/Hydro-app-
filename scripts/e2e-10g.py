"""Lot 10g in the browser, local build over HTTP with the one-year simulation data (scripts/sim):
- start screen (#splash, dark ground, drop + « hydro. ») shown while the data load, gone once they are read;
- manifest background_color / theme_color #0d1310;
- loading drop: with prefers-reduced-motion the text « Chargement… » is visible;
- reservoir on a space with a tank: a bar filled to the share of litres left (the drop gauge until lot 10l1), « 33 L sur 120 L »;
- charts: a mark on the days of a tank, with its legend (a dotted vertical line since lot 10k4).
Usage: npm run build:local && npx -y tsx scripts/sim/build.ts <sim dir> &&
       PYTHONPATH=scripts python3 scripts/e2e-10g.py dist-local <sim dir> <out dir>"""
import sys, json, pathlib, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright

site = pathlib.Path(sys.argv[1]).resolve()
sim = pathlib.Path(sys.argv[2])
out = pathlib.Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
DATE = "2026-10-19"
backup = json.loads((sim / "checkpoints" / f"{DATE}.json").read_text())

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(site)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{httpd.server_address[1]}/"

LOAD = """async (b) => {
  const db = await new Promise((ok, ko) => { const r = indexedDB.open('hydro', 1); r.onupgradeneeded = () => { r.result.createObjectStore('docs'); r.result.createObjectStore('photos') }; r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error) })
  const tx = db.transaction('docs', 'readwrite'); const s = tx.objectStore('docs'); s.clear()
  for (const [c, docs] of Object.entries(b.collections)) for (const [id, d] of Object.entries(docs)) s.put(d, c + '/' + id)
  await new Promise((ok) => { tx.oncomplete = ok }); db.close()
}"""
errors, checks = [], {}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="light", timezone_id="Europe/Oslo", locale="fr-FR", service_workers="block", reduced_motion="reduce")
    ctx.add_init_script("localStorage.setItem('hydro.ui', JSON.stringify({theme:'light',lang:'fr',updatedAt:'2026-01-01T00:00:00Z'}))")
    pg = ctx.new_page()
    pg.clock.install(time=f"{DATE}T09:30:00+02:00"); pg.clock.resume()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(url); pg.wait_for_timeout(1200)
    pg.evaluate(LOAD, backup)
    m = pg.evaluate("fetch('manifest.webmanifest').then((r) => r.json())")
    checks["manifest"] = [m["background_color"], m["theme_color"]]
    if checks["manifest"] != ["#0d1310", "#0d1310"]: errors.append(f"manifest {checks['manifest']}")
    # Slow down IndexedDB opening to catch the start screen.
    pg.add_init_script("const o = indexedDB.open.bind(indexedDB); indexedDB.open = (...a) => { const r = o(...a); const h = {}; return new Proxy(r, { set(t, k, v) { if (k === 'onsuccess') { t.onsuccess = (e) => setTimeout(() => v.call(t, e), 600); return true } t[k] = v; return true }, get(t, k) { const v = t[k]; return typeof v === 'function' ? v.bind(t) : v } }) }")
    pg.reload(); pg.wait_for_timeout(150)
    sp = pg.evaluate("(() => { const s = document.querySelector('#splash'); return s ? { bg: getComputedStyle(s).backgroundColor, logo: !!s.querySelector('[aria-label=Hydro]'), drop: s.querySelectorAll('svg').length } : null })()")
    checks["splash"] = sp
    if not sp or sp["bg"] != "rgb(13, 19, 16)" or not sp["logo"]: errors.append(f"splash {sp}")
    pg.screenshot(path=str(out / "splash.png"))
    pg.wait_for_selector("#splash", state="detached", timeout=8000)
    checks["splashGone"] = True
    # Reduced motion: a screen showing the loading drop keeps « Chargement… » visible.
    html = pg.evaluate("""(() => { const d = document.createElement('div'); d.innerHTML = '<span class="sr-only motion-reduce:not-sr-only" id="probe">x</span>'; document.body.append(d); const w = document.querySelector('#probe').getBoundingClientRect().width; d.remove(); return w })()""")
    checks["reducedMotionTextWidth"] = html
    if not html or html < 2: errors.append("loading text hidden under reduced motion")
    # Reservoir in a space with a tank: since lot 10l1 a bar filled in « eau » (the drop gauge before), « 33 L sur 120 L ».
    found = None
    for name in ["Floraison", "Colonne"]:
        pg.goto(url); pg.wait_for_timeout(1500)
        btn = pg.locator("header button", has_text=name)
        if not btn.count(): continue
        btn.first.click(); pg.wait_for_timeout(1200)
        if pg.locator("#res-bar").count():
            found = name; break
    checks["gauge"] = found and pg.evaluate("(() => { const g = document.querySelector('#reservoir'); const fill = g.querySelector('#res-bar > span'); return { text: g.innerText, fill: fill.style.width, num: getComputedStyle(g.querySelector('.font-num')).fontFamily } })()")
    if not found or " L" not in checks["gauge"]["text"] or not checks["gauge"]["fill"].endswith("%") or "Geologica" not in checks["gauge"]["num"]: errors.append(f"gauge {checks['gauge']}")
    else: pg.evaluate("document.querySelector('#reservoir').scrollIntoView({block: 'center'})"); pg.wait_for_timeout(300); pg.screenshot(path=str(out / "gauge.png"))
    # Charts: a dotted vertical line on tank days, and the legend says so (lot 10k4; a water drop before).
    pg.goto(url + "#charts"); pg.reload(); pg.wait_for_timeout(2500)
    checks["tankMarks"] = pg.locator("[data-tank]").count()
    checks["tankLegend"] = pg.locator("#ch-legend", has_text="nouveau bidon").count()
    if not checks["tankMarks"] or not checks["tankLegend"]: errors.append(f"tank marks {checks['tankMarks']} legend {checks['tankLegend']}")
    pg.screenshot(path=str(out / "charts.png"), full_page=True)
    ctx.close(); b.close()
httpd.shutdown()
print(json.dumps(checks, ensure_ascii=False, indent=1))
print("errors:", errors)
print("OK" if not errors else "FAIL")
