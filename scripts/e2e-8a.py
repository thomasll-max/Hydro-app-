"""Lot 8a: local (friends') build served over HTTP. Service worker, offline reload, backup reminder, copy / paste
transfer, reset. Usage: npm run build:local && PYTHONPATH=scripts python3 scripts/e2e-8a.py dist-local <out dir>"""
import sys, pathlib, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

root = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
port = httpd.server_address[1]
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{port}/"
errors, checks = [], {}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark")
    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=url[:-1])
    pg = ctx.new_page()
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(url); pg.wait_for_timeout(2500)
    checks["sw"] = pg.evaluate("navigator.serviceWorker.ready.then(r => !!r.active)")
    checks["manifest"] = pg.evaluate("fetch('manifest.webmanifest').then(r => r.json()).then(m => m.name)")
    checks["googleFonts"] = pg.evaluate("[...document.querySelectorAll('link')].some(l => l.href.includes('googleapis'))")
    checks["fontLoaded"] = pg.evaluate("document.fonts.ready.then(() => document.fonts.check('600 16px Figtree'))")
    # A grow set up earlier with a space, so there is something to lose: the reminder appears (never backed up).
    pg.evaluate("""() => new Promise((res) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => { const tx = r.result.transaction('docs', 'readwrite'); tx.objectStore('docs').put({schemaVersion:1,id:'main',name:'Test',digestTime:'07:00',nutrition:{line:'athena-pro',addons:[],dosing:'conc226'},createdAt:'2026-10-01T08:00:00.000Z',updatedAt:'2026-10-01T08:00:00.000Z'}, 'grow/main'); tx.objectStore('docs').put({schemaVersion:1,id:'tente',name:'Tente',template:'flower',color:'emerald',order:0,modules:{climate:true,light:true,irrigation:true,nutrition:true,propagation:false,drying:false,plants:true},createdAt:'x',updatedAt:'x'}, 'spaces/tente'); tx.oncomplete = () => res(true) } })""")
    pg.reload(); pg.wait_for_timeout(2500)
    checks["reminder"] = pg.locator("#backup-reminder").count() == 1
    pg.screenshot(path=str(out / "01-today-reminder.png"))

    # Offline: the app still opens from the service worker cache.
    ctx.set_offline(True)
    pg.reload(); pg.wait_for_timeout(2500)
    checks["offlineTitle"] = pg.title()
    checks["offlineRenders"] = pg.locator("text=Tente").count() > 0
    pg.screenshot(path=str(out / "02-offline.png"))
    ctx.set_offline(False)

    # Copy the backup, reset, paste it back.
    pg.goto(url + "#data"); pg.wait_for_timeout(2000)
    pg.get_by_role("button", name="Copier la sauvegarde").click(); pg.wait_for_timeout(800)
    copied = pg.evaluate("navigator.clipboard.readText()")
    checks["copiedHasSpace"] = '"tente"' in copied
    pg.goto(url); pg.wait_for_timeout(1500)
    checks["reminderAfterBackup"] = pg.locator("#backup-reminder").count()
    pg.goto(url + "#settings"); pg.wait_for_timeout(2000)
    pg.get_by_role("button", name="Réinitialiser…").click(); pg.wait_for_timeout(400)
    pg.screenshot(path=str(out / "03-reset-confirm.png"))
    pg.click("#reset-confirm"); pg.wait_for_timeout(3500)
    checks["afterReset"] = pg.evaluate("""() => new Promise((res) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => { const q = r.result.transaction('docs').objectStore('docs').getAllKeys(); q.onsuccess = () => res(q.result) } })""")
    # Lot 8b: after a reset the first-launch assistant opens; the backup is pasted on its welcome screen.
    pg.goto(url); pg.wait_for_selector("#onb-welcome", timeout=10000)
    pg.click("#onb-paste-open"); pg.fill("#onb-paste", copied); pg.click("#onb-paste-read"); pg.wait_for_timeout(300)
    checks["pasteSummary"] = pg.inner_text("#onb-import-summary")
    pg.click("#onb-import-run"); pg.wait_for_selector("#onboarding", state="detached", timeout=15000)
    pg.goto(url); pg.wait_for_timeout(2000)
    checks["restored"] = pg.locator("text=Tente").count() > 0
    b.close()
httpd.shutdown()
for k, v in checks.items(): print(k, "→", v)
print("\n".join(errors) if errors else "no console errors")
