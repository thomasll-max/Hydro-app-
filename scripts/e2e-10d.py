"""Lot 10d (navigation and entry) in the browser at 390 px, preview build:
- the back gesture walks back through tabs and tools instead of leaving the app; re-tapping Outils shows the list;
- a sheet takes a step: back closes it, and asks first when something was typed (✕ as well);
- the quick entry's values follow into the full entry; an empty quick entry is refused;
- changing the date of an entry keeps what was typed; « Reprendre hier » fills the greyed values;
- changing the language keeps a form being filled;
- local build (optional 3rd argument): with a network that hangs, the service worker opens the app from the cache in ~3 s.
Usage: npm run preview:build && npm run build:local && PYTHONPATH=scripts python3 scripts/e2e-10d.py dist-preview/index.html <out dir> [dist-local]"""
import sys, json, pathlib, time, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
errors, checks = [], {}
h = lambda pg: pg.evaluate("location.hash")
tab = lambda pg: pg.locator("[role=tab][aria-selected=true]").inner_text().strip()

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    start = f"file://{page_file}"
    pg.goto(start); pg.wait_for_timeout(2500)

    # 1. Tabs and tools in the history.
    pg.get_by_role("tab", name="Journal").click(); pg.wait_for_timeout(400)
    pg.get_by_role("tab", name="Graphiques").click(); pg.wait_for_timeout(400)
    checks["chartsHash"] = h(pg)
    pg.go_back(); pg.wait_for_timeout(500)
    checks["backToToday"] = [h(pg), tab(pg)]
    pg.get_by_role("tab", name="Outils").click(); pg.wait_for_timeout(400)
    pg.get_by_role("button", name="Arrosage").first.click(); pg.wait_for_timeout(500)
    checks["toolHash"] = h(pg)
    pg.go_back(); pg.wait_for_timeout(500)
    checks["backToList"] = [h(pg), pg.locator("text=Choisis un outil").count() > 0 or pg.get_by_role("button", name="Arrosage").count() > 0]
    pg.get_by_role("button", name="Nutrition").first.click(); pg.wait_for_timeout(500)
    pg.get_by_role("tab", name="Outils").click(); pg.wait_for_timeout(500)
    checks["retapList"] = h(pg)
    pg.go_back(); pg.wait_for_timeout(500)
    checks["thenToday"] = [h(pg), tab(pg)]
    checks["stillInApp"] = pg.url.startswith(start)
    pg.goto(start + "#irrigation"); pg.wait_for_timeout(1500)
    checks["oldLink"] = h(pg)

    # 2. Quick entry: empty refused; values follow into the full entry.
    pg.goto(start); pg.wait_for_timeout(2000)
    pg.get_by_role("button", name="Saisie du jour").click(); pg.wait_for_timeout(700)
    pg.get_by_role("button", name="Enregistrer", exact=True).click(); pg.wait_for_timeout(500)
    checks["quickEmptyRefused"] = pg.locator("text=Rien à enregistrer").count() > 0
    first = pg.locator("input[id^=q-][id$=-t]").first
    first.fill("23,5")
    pg.get_by_role("button", name="Saisie complète").first.click(); pg.wait_for_selector("#e-date"); pg.wait_for_timeout(500)
    checks["carried"] = pg.input_value("#e-tempDay")
    pg.screenshot(path=str(out / "01-carried.png"))

    # 3. Back with typed values: asks first; « Continuer » keeps the sheet.
    pg.go_back(); pg.wait_for_timeout(600)
    checks["backAsks"] = [pg.locator("text=Abandonner la saisie ?").count() > 0, pg.locator("#e-date").count() == 1]
    pg.screenshot(path=str(out / "02-back-asks.png"))
    pg.get_by_role("button", name="Continuer").click(); pg.wait_for_timeout(400)
    checks["kept"] = pg.input_value("#e-tempDay")

    # 4. Date change keeps typed values.
    pg.fill("#e-rh", "61")
    d = pg.input_value("#e-date")
    pg.fill("#e-date", "2026-10-10"); pg.wait_for_timeout(500)
    checks["dateKeeps"] = [pg.input_value("#e-tempDay"), pg.input_value("#e-rh"), d != "2026-10-10"]
    pg.fill("#e-date", d); pg.wait_for_timeout(400)

    # 5. ✕ asks, « Abandonner » closes; back then stays in the app.
    pg.get_by_role("button", name="Fermer").first.click(); pg.wait_for_timeout(400)
    checks["closeAsks"] = pg.locator("text=Abandonner la saisie ?").count() > 0
    pg.get_by_role("button", name="Abandonner").click(); pg.wait_for_timeout(800)
    checks["closed"] = pg.locator("#e-date").count() == 0
    checks["afterCloseUrl"] = pg.url.startswith(start)

    # 6. Untouched sheet: back closes it at once.
    pg.get_by_role("button", name="Saisie du jour").click(); pg.wait_for_timeout(600)
    pg.go_back(); pg.wait_for_timeout(700)
    checks["backCloses"] = [pg.locator("text=Saisie rapide").count() == 0, pg.url.startswith(start)]

    # 7. « Reprendre hier » in a full entry: an entry the day before, then today's.
    pg.get_by_role("button", name="Saisie du jour").click(); pg.wait_for_timeout(600)
    pg.get_by_role("button", name="Saisie complète").first.click(); pg.wait_for_selector("#e-date"); pg.wait_for_timeout(500)
    today = pg.input_value("#e-date")
    yday = pg.evaluate("(d) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() - 1); return x.toISOString().slice(0, 10) }", today)
    pg.fill("#e-date", yday); pg.wait_for_timeout(300)
    pg.fill("#e-tempDay", "21"); pg.fill("#e-rh", "58")
    pg.get_by_role("button", name="Enregistrer", exact=True).click()
    pg.wait_for_selector("#e-date", state="detached", timeout=5000); pg.wait_for_timeout(600)
    checks["noDialogAfterSave"] = pg.locator("text=Abandonner la saisie ?").count() == 0
    pg.get_by_role("button", name="Saisie du jour").click(); pg.wait_for_timeout(600)
    pg.get_by_role("button", name="Saisie complète").first.click(); pg.wait_for_selector("#e-date"); pg.wait_for_timeout(500)
    resume = pg.get_by_role("button", name="Copier les valeurs d'hier")
    checks["resumeShown"] = resume.count() > 0
    if resume.count():
        before = pg.input_value("#e-tempDay")
        resume.click(); pg.wait_for_timeout(300)
        checks["resumed"] = [before, pg.input_value("#e-tempDay"), pg.get_attribute("#e-tempDay", "placeholder")]
    pg.screenshot(path=str(out / "03-resume.png"))
    pg.get_by_role("button", name="Fermer").first.click(); pg.wait_for_timeout(300)
    if pg.get_by_role("button", name="Abandonner").count():
        pg.get_by_role("button", name="Abandonner").click(); pg.wait_for_timeout(600)

    # 8. Language change keeps a form being filled (nutrition volume).
    pg.get_by_role("tab", name="Outils").click(); pg.wait_for_timeout(400)
    pg.get_by_role("button", name="Nutrition").first.click(); pg.wait_for_timeout(700)
    pg.fill("#n-vol", "77")
    pg.get_by_role("button", name="Affichage : langue et thème").click(); pg.wait_for_timeout(300)
    pg.get_by_role("radio", name="English").click(); pg.wait_for_timeout(600)
    pg.keyboard.press("Escape")
    checks["langKeeps"] = pg.input_value("#n-vol")
    pg.screenshot(path=str(out / "04-lang.png"))
    ctx.close()

    # 9. Local build: a hanging network falls back to the cache after 3 s.
    if len(sys.argv) > 3:
        root = pathlib.Path(sys.argv[3]).resolve()
        slow = {"on": False}
        class Slow(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *a): pass
            def end_headers(self):
                self.send_header("Cache-Control", "no-store")  # only the service worker may answer from a cache
                super().end_headers()
            def do_GET(self):
                if slow["on"]: time.sleep(8)
                return super().do_GET()
        Slow.extensions_map[".webmanifest"] = "application/manifest+json"
        socketserver.ThreadingTCPServer.allow_reuse_address = True
        httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), functools.partial(Slow, directory=str(root)))
        httpd.daemon_threads = True
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        url = f"http://127.0.0.1:{httpd.server_address[1]}/"
        ctx = b.new_context(viewport={"width": 390, "height": 844})
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
        pg.goto(url); pg.wait_for_timeout(2500)
        pg.evaluate("navigator.serviceWorker.ready.then(() => true)")
        pg.reload(); pg.wait_for_timeout(1500)  # the page is now controlled and cached
        slow["on"] = True
        t0 = time.time()
        pg.goto(url, wait_until="commit", timeout=20000)
        pg.wait_for_selector("#onb-welcome, [role=tablist]", timeout=15000)
        checks["swFallbackSeconds"] = round(time.time() - t0, 1)
        checks["swControlled"] = pg.evaluate("!!navigator.serviceWorker.controller")
        slow["on"] = False
        ctx.close()
        httpd.shutdown()
    b.close()

print(json.dumps(checks, ensure_ascii=False, indent=1))
print("errors:", errors[:5])
ok = (
    checks["chartsHash"] == "#charts" and checks["backToToday"][0] == "" and checks["toolHash"] == "#tools/irrigation"
    and checks["backToList"][0] == "#tools" and checks["retapList"] == "#tools" and checks["thenToday"][0] == ""
    and checks["stillInApp"] and checks["oldLink"] == "#tools/irrigation" and checks["quickEmptyRefused"]
    and checks["carried"] == "23,5" and all(checks["backAsks"]) and checks["kept"] == "23,5"
    and checks["dateKeeps"][:2] == ["23,5", "61"] and checks["closeAsks"] and checks["closed"] and checks["afterCloseUrl"]
    and all(checks["backCloses"]) and checks["noDialogAfterSave"] and checks["resumeShown"] and checks["resumed"][:2] == ["", "21"]
    and checks["langKeeps"] == "77" and 2.5 <= checks.get("swFallbackSeconds", 3) < 6 and not errors
)
print("OK" if ok else "FAIL")
sys.exit(0 if ok else 1)
