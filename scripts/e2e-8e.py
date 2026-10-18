"""Lot 8e: version number and update banner. The local build is served from a copy whose version.json is rewritten to
play a new deploy. Usage: npm run build:local && npm run preview:build &&
       PYTHONPATH=scripts python3 scripts/e2e-8e.py dist-local dist-preview/index.html <out dir>"""
import sys, json, shutil, pathlib, threading, http.server, functools, socketserver, tempfile
from datetime import datetime, timedelta, timezone
from playwright.sync_api import sync_playwright

src = pathlib.Path(sys.argv[1]).resolve()
preview = pathlib.Path(sys.argv[2]).resolve()
out = pathlib.Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
site = pathlib.Path(tempfile.mkdtemp()) / "site"
shutil.copytree(src, site)
own = json.loads((site / "version.json").read_text())
http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(site)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{httpd.server_address[1]}/"
errors, checks = [], {}

def deploy(delta_h):
    t = datetime.fromisoformat(own["builtAt"].replace("Z", "+00:00")) + timedelta(hours=delta_h)
    (site / "version.json").write_text(json.dumps({"commit": "a1b2c3d", "builtAt": t.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")}))

def foreground(pg):
    pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(800)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark")
    pg = ctx.new_page()
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(url); pg.wait_for_selector("#onb-skip", timeout=8000)
    pg.click("#onb-skip"); pg.wait_for_selector("#onboarding", state="detached", timeout=8000)
    pg.goto(url + "#settings"); pg.wait_for_selector("#app-version", timeout=8000)
    checks["version"] = pg.inner_text("#app-version")
    checks["versionHasCommit"] = own["commit"] in checks["version"]
    pg.locator("#app-version").scroll_into_view_if_needed(); pg.wait_for_timeout(300)
    pg.screenshot(path=str(out / "01-settings-version.png"))
    checks["bannerSameBuild"] = pg.locator("#update-banner").count()

    deploy(-5); foreground(pg)
    checks["bannerOlderBuild"] = pg.locator("#update-banner").count()

    deploy(+1); foreground(pg)
    checks["bannerNewBuild"] = pg.locator("#update-banner").count()
    checks["bannerText"] = pg.inner_text("#update-banner").replace("\n", " | ") if checks["bannerNewBuild"] else None
    pg.goto(url); pg.wait_for_timeout(1500)
    pg.screenshot(path=str(out / "02-banner.png"))

    # A form open: no update offered meanwhile.
    pg.get_by_role("button", name="Saisie du jour").click(); pg.wait_for_timeout(800)
    checks["bannerWhileForm"] = pg.locator("#update-banner").count()
    pg.keyboard.press("Escape"); pg.wait_for_timeout(700)
    checks["bannerAfterForm"] = pg.locator("#update-banner").count()

    pg.evaluate("window.__beforeUpdate = 1")
    pg.click("#update-now"); pg.wait_for_load_state("load"); pg.wait_for_timeout(1500)
    checks["reloaded"] = pg.evaluate("window.__beforeUpdate === undefined")
    (site / "version.json").write_text(json.dumps(own)); pg.reload(); pg.wait_for_timeout(1500)
    checks["bannerAfterUpdate"] = pg.locator("#update-banner").count()
    checks["swSkipsVersionJson"] = pg.evaluate("caches.open('hydro-v2').then(c => c.keys()).then(k => !k.some(r => r.url.includes('version.json')))")
    ctx.close()

    # Claude build: version shown, never a banner.
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="light")
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(preview.as_uri() + "#settings"); pg.wait_for_selector("#app-version", timeout=8000)
    checks["claudeVersion"] = pg.inner_text("#app-version")
    checks["claudeBanner"] = pg.locator("#update-banner").count()
    ctx.close()
    b.close()
httpd.shutdown()
for k, v in checks.items(): print(k, "→", v if isinstance(v, str) else json.dumps(v, ensure_ascii=False))
print("\n".join(errors) if errors else "no console errors")
