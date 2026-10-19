"""Ouvre la version locale à chaque date clé (horloge simulée), avec les données « telles qu'elles étaient ce matin-là »,
puis capture chaque écran et note les erreurs. Usage : python3 browse.py <dist-local> <out dir>"""
import sys, json, pathlib, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright

site = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); shots = out / "shots"; shots.mkdir(parents=True, exist_ok=True)
cps = json.loads((out / "checkpoints" / "index.json").read_text())
only = sys.argv[3:] or None

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(site)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{httpd.server_address[1]}/"

SCREENS = ["today", "journal", "calendar", "charts", "tools", "nutrition", "irrigation", "ph", "light", "climate", "equipment", "data", "settings"]
LOAD = """async (b) => {
  const db = await new Promise((ok, ko) => { const r = indexedDB.open('hydro', 1); r.onupgradeneeded = () => { r.result.createObjectStore('docs'); r.result.createObjectStore('photos') }; r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error) })
  const tx = db.transaction('docs', 'readwrite'); const s = tx.objectStore('docs'); s.clear()
  let n = 0
  for (const [c, docs] of Object.entries(b.collections)) for (const [id, d] of Object.entries(docs)) { s.put(d, c + '/' + id); n++ }
  await new Promise((ok) => { tx.oncomplete = ok })
  db.close(); return n
}"""
report = {}
with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
    for cp in cps:
        d = cp["date"]
        if only and d not in only: continue
        backup = json.loads((out / "checkpoints" / f"{d}.json").read_text())
        ctx = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark", timezone_id="Europe/Oslo", locale="fr-FR", service_workers="block")
        ctx.add_init_script("localStorage.setItem('hydro.ui', JSON.stringify({theme:'dark',lang:'fr',updatedAt:'2026-01-01T00:00:00Z'}))")
        pg = ctx.new_page()
        pg.clock.install(time=f"{d}T09:30:00+02:00"); pg.clock.resume()
        errs = []
        pg.on("console", lambda m: m.type == "error" and errs.append(m.text[:300]))
        pg.on("pageerror", lambda e: errs.append(f"PAGEERROR {str(e)[:300]}"))
        pg.goto(url); pg.wait_for_timeout(1500)
        n = pg.evaluate(LOAD, backup)
        rep = {"label": cp["label"], "docs": n, "screens": {}}
        for sc in SCREENS:
            pg.goto(url + ("" if sc == "today" else f"#{sc}")); pg.reload()
            pg.wait_for_timeout(3500)
            f = shots / f"{d}_{sc}.png"
            H = pg.evaluate("document.scrollingElement.scrollHeight")
            parts = []
            for i, y in enumerate(range(0, min(H, 4 * 700), 700)):
                pg.evaluate(f"window.scrollTo(0, {y})"); pg.wait_for_timeout(900)
                part = shots / f"_{d}_{sc}_{i}.png"; pg.screenshot(path=str(part)); parts.append((part, pg.evaluate("window.scrollY")))
            from PIL import Image
            ims = [(Image.open(pp), yy) for pp, yy in parts]
            top = ims[0][1]; total = ims[-1][1] - top + 844
            sheet = Image.new("RGB", (780, total * 2))
            for im, yy in ims: sheet.paste(im, (0, (yy - top) * 2))
            sheet.save(f)
            for pp, _ in parts: pp.unlink()
            pg.evaluate("window.scrollTo(0, 0)")
            txt = pg.inner_text("body")
            sw = pg.evaluate("document.documentElement.scrollWidth")
            bad = [w for w in ["NaN", "undefined", "Infinity", "[object Object]"] if w in txt]
            rep["screens"][sc] = {"chars": len(txt), "overflow": sw if sw > 390 else None, "bad": bad, "onboarding": "Bienvenue" in txt[:400]}
            (shots / f"{d}_{sc}.txt").write_text(txt)
        rep["errors"] = sorted(set(errs))
        report[d] = rep
        print(d, n, "docs", "errors:", len(rep["errors"]), [k for k, v in rep["screens"].items() if v["bad"] or v["overflow"] or v["onboarding"]], flush=True)
        ctx.close()
    br.close()
prev = json.loads((out / "browse.json").read_text()) if (out / "browse.json").exists() and only else {}
prev.update(report)
(out / "browse.json").write_text(json.dumps(prev, indent=1, ensure_ascii=False))
