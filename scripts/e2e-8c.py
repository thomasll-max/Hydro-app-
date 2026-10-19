"""Lot 8c: getting-started guide. Local build: the assistant ends on the guide, each line opens the right place and
ticks itself, the Today card can be hidden and brought back. Claude build: Thomas's grow shows what is missing.
Usage: npm run build:local && npm run preview:build &&
       PYTHONPATH=scripts python3 scripts/e2e-8c.py dist-local dist-preview/index.html <out dir>"""
import sys, json, pathlib, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright

root = pathlib.Path(sys.argv[1]).resolve()
preview = pathlib.Path(sys.argv[2]).resolve()
out = pathlib.Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(root)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{httpd.server_address[1]}/"
errors, checks = [], {}

def shot(pg, name, full=False):
    pg.wait_for_timeout(400)
    pg.screenshot(path=str(out / name), full_page=full)

def items(pg):
    return {el.get_attribute("id")[6:]: el.get_attribute("data-done") for el in pg.locator("#start-list li button").all()}

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark")
    pg = ctx.new_page()
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(url); pg.wait_for_selector("#onb-welcome", timeout=8000)
    pg.click("#onb-start"); pg.fill("#onb-name", "Grow de Sam"); pg.click("#onb-next")
    pg.fill("#onb-l-0", "100"); pg.fill("#onb-w-0", "100"); pg.fill("#onb-h-0", "200"); pg.click("#onb-next")
    pg.fill("#onb-lampw-0", "240"); pg.click("#onb-next")  # watts only: the lamp line stays open
    for _ in range(3): pg.click("#onb-next")
    pg.click("#onb-finish")
    pg.wait_for_selector("#start-list", timeout=10000)
    checks["landsOnGuide"] = pg.evaluate("location.hash")
    checks["count"] = pg.inner_text("#start-count")
    checks["items"] = items(pg)
    checks["overflow"] = pg.evaluate("document.documentElement.scrollWidth > innerWidth")
    shot(pg, "01-guide.png")
    pg.screenshot(path=str(out / "02-guide-full.png"), full_page=True)

    # Cycle line: a blank cycle form in the local version (no prefilled values from Thomas's grow).
    pg.click("#start-cycle"); pg.wait_for_selector("#c-name", timeout=5000)
    # Lot 10b: 4 fields; pots, lamps… folded and prefilled from the space's equipment (empty here: nothing guessed).
    pg.get_by_role("button", name="Arrosage et matériel").click(); pg.wait_for_timeout(400)
    checks["cycleForm"] = {k: pg.input_value(k) for k in ["#c-cult", "#c-pv", "#c-pc", "#c-lights"]}
    shot(pg, "03-cycle-form.png")
    pg.fill("#c-germ", "2026-10-15"); pg.fill("#c-pv", "18"); pg.fill("#c-pc", "2")
    pg.get_by_role("button", name="Enregistrer").click(); pg.wait_for_timeout(1200)
    checks["afterCycle"] = items(pg)

    # Pots line opens the space's watering settings; lamp line opens Equipment.
    pg.click("#start-pots"); pg.wait_for_selector("#sp-potL", timeout=5000)
    checks["potsOpensSheet"] = True
    pg.fill("#sp-potL", "18"); pg.fill("#sp-potN", "2")
    pg.get_by_role("button", name="Enregistrer").click(); pg.wait_for_timeout(1200)
    checks["afterPots"] = items(pg)
    pg.click("#start-lamp"); pg.wait_for_timeout(1200)
    checks["lampOpens"] = pg.evaluate("location.hash")

    # Today: the card, hidden, brought back from the guide.
    pg.goto(url); pg.wait_for_timeout(1500)
    checks["todayCard"] = pg.inner_text("#start-card").split("\n")[:2]
    shot(pg, "04-today-card.png")
    pg.get_by_role("button", name="Masquer").click(); pg.wait_for_timeout(300)
    checks["cardHidden"] = pg.locator("#start-card").count() == 0
    pg.goto(url + "#start"); pg.wait_for_selector("#start-list", timeout=5000)
    pg.get_by_role("button", name="Remettre la carte sur Aujourd'hui").click()
    pg.goto(url); pg.wait_for_timeout(1500)
    checks["cardBack"] = pg.locator("#start-card").count() == 1
    # English
    pg.goto(url + "#settings"); pg.wait_for_timeout(1500)
    pg.get_by_role("radio", name="EN").first.click(); pg.wait_for_timeout(500)
    pg.goto(url + "#start"); pg.wait_for_selector("#start-list", timeout=5000)
    checks["en"] = pg.inner_text("#start-list").split("\n")[:3]
    pg.locator("#start-how").get_by_role("button", name="Watering").click()
    shot(pg, "05-guide-en.png")
    ctx.close()

    # Claude build with Thomas's grow.
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="light")
    pg = ctx.new_page()
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(preview.as_uri()); pg.wait_for_timeout(2500)
    checks["claudeCard"] = pg.inner_text("#start-card").split("\n")[:2] if pg.locator("#start-card").count() else None
    shot(pg, "06-claude-today.png")
    pg.goto(preview.as_uri() + "#start"); pg.wait_for_selector("#start-list", timeout=8000)
    checks["claudeItems"] = items(pg)
    pg.locator("#start-how").get_by_role("button", name="Le cycle avance tout seul").click()
    shot(pg, "07-claude-guide.png")
    ctx.close()
    b.close()
httpd.shutdown()
for k, v in checks.items(): print(k, "→", v if isinstance(v, str) else json.dumps(v, ensure_ascii=False))
print("\n".join(errors) if errors else "no console errors")
