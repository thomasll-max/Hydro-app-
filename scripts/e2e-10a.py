"""Lot 10a (data safety) in the browser at 390 px:
- preview build: an empty entry is refused, a mistyped number is flagged and blocks the save, a malformed document in
  the store is left aside (the app still opens);
- Claude build with a fake runtime: a viewer who is not the owner sees "réservé au propriétaire", nothing is written;
- local build over HTTP: two tabs stay in sync (BroadcastChannel); an interrupted assistant (spaces without a grow,
  draft still on the phone) opens again instead of being "repaired" with an empty grow.
Usage: npm run preview:build && npm run build:local && PYTHONPATH=scripts python3 scripts/e2e-10a.py dist-preview/index.html dist-local <out dir>"""
import sys, json, pathlib, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
root = pathlib.Path(sys.argv[2]).resolve()
out = pathlib.Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(root)))
url = f"http://127.0.0.1:{httpd.server_address[1]}/"
threading.Thread(target=httpd.serve_forever, daemon=True).start()
errors, checks = [], {}
PUT = """([k, v]) => new Promise((res) => { const r = indexedDB.open('hydro', 1); r.onupgradeneeded = () => { r.result.createObjectStore('docs'); r.result.createObjectStore('photos') }; r.onsuccess = () => { const t = r.result.transaction('docs', 'readwrite'); t.objectStore('docs').put(v, k); t.oncomplete = () => res(true) } })"""
KEYS = """() => new Promise((res) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => { const q = r.result.transaction('docs').objectStore('docs').getAllKeys(); q.onsuccess = () => res(q.result) } })"""

with sync_playwright() as p:
    b = p.chromium.launch()

    # 1. Entry sheet: empty refused, bad number flagged.
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(f"file://{page_file}"); pg.wait_for_timeout(2500)
    pg.click("#tab-plus"); pg.click("#add-quick"); pg.wait_for_timeout(600)
    # Several spaces and "Tous" selected: the quick entry (from the « + » sheet since lot 10k3); its link opens the full entry.
    pg.get_by_role("button", name="Saisie complète").first.click(); pg.wait_for_selector("#e-when")
    pg.wait_for_timeout(400)
    pg.get_by_role("button", name="Enregistrer", exact=True).click(); pg.wait_for_timeout(600)
    checks["emptyRefused"] = pg.locator("text=Rien à enregistrer").count() > 0 and pg.locator("#e-when").count() == 1
    pg.screenshot(path=str(out / "01-empty-refused.png"))
    pg.fill("#e-tempDay", "2,4,5"); pg.wait_for_timeout(200)
    checks["badFlagged"] = pg.locator("#e-tempDay-err").inner_text()
    checks["ariaInvalid"] = pg.get_attribute("#e-tempDay", "aria-invalid")
    pg.get_by_role("button", name="Enregistrer", exact=True).click(); pg.wait_for_timeout(600)
    checks["badBlocked"] = pg.locator("#e-when").count() == 1
    pg.screenshot(path=str(out / "02-bad-number.png"))
    pg.fill("#e-tempDay", "24,5")
    pg.get_by_role("button", name="Enregistrer", exact=True).click()
    pg.wait_for_selector("#e-when", state="detached", timeout=5000)
    checks["goodSaved"] = True
    ctx.close()

    # 2. Not the owner: nothing shown, nothing written.
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="light")
    ctx.add_init_script("""
      window.__writes = 0;
      const ref = { get: async () => ({ exists: false, data: () => undefined, docs: [] }), set: async () => { window.__writes++ }, delete: async () => { window.__writes++ },
        onSnapshot: (n) => { queueMicrotask(() => n({ exists: false, data: () => undefined, docs: [] })); return () => {} } };
      const db = { doc: () => ref, collection: () => ref };
      const user = { id: async () => "someone", isOwner: async () => false };
      window.claude = { use: async (n) => (n === "db" ? db : n === "user" ? user : null) };
    """)
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(f"file://{page_file}"); pg.wait_for_timeout(2500)
    checks["ownerOnly"] = pg.locator("#owner-only").count() == 1
    checks["ownerWrites"] = pg.evaluate("window.__writes")
    pg.screenshot(path=str(out / "03-owner-only.png"))
    ctx.close()

    # 3. Local build: two tabs, and a malformed document.
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark")
    a = ctx.new_page(); a.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    a.goto(url); a.wait_for_selector("#onb-welcome", timeout=8000)
    c = ctx.new_page(); c.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    c.goto(url); c.wait_for_selector("#onb-welcome", timeout=8000)
    a.click("#onb-skip"); a.wait_for_timeout(1500)
    checks["tabBLeftWizard"] = c.locator("#onboarding").count() == 0
    a.evaluate(PUT, ["entries/2026-10-19_x", {"spaceId": 12}])  # malformed: no date, spaceId not a string
    a.goto(url + "#data"); a.reload(); a.wait_for_timeout(2500)  # a hash change is not a reload: the page must reread IndexedDB
    checks["malformedSkipped"] = a.locator("#data-skipped").count() == 1
    checks["appStillOpens"] = a.locator("main").count() > 0
    a.screenshot(path=str(out / "04-skipped.png"), full_page=True)
    ctx.close()

    # 4. Interrupted assistant: a space without grow/main and a draft on the phone → the assistant opens again.
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(url); pg.wait_for_selector("#onb-welcome", timeout=8000)
    pg.click("#onb-start"); pg.fill("#onb-name", "Grow coupé"); pg.click("#onb-next"); pg.wait_for_timeout(300)
    pg.evaluate(PUT, ["spaces/sp-orphan", {"id": "sp-orphan", "name": "Orphelin", "template": "flower", "color": "sky", "order": 0, "modules": {"climate": True}, "createdAt": "", "updatedAt": ""}])
    pg.reload(); pg.wait_for_timeout(2500)
    checks["wizardBack"] = pg.locator("#onboarding").count() == 1
    checks["noRepairGrow"] = "grow/main" not in pg.evaluate(KEYS)
    pg.screenshot(path=str(out / "05-interrupted.png"))
    ctx.close()
    b.close()
httpd.shutdown()
for k, v in checks.items(): print(k, "→", v)
print("\n".join(errors) if errors else "no console errors")
