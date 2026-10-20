"""Lot 12d (verrou) in the browser, local build with the one-year simulation at 19 October 2026:
- Réglages → Verrouiller l'app: the honest line; the PIN typed twice (a mismatch refused), « note-le » and the backup
  offered; the PIN never in clear on the device; the delay 1 / 5 / 15 min;
- at opening: the lock screen over everything (the app inert under it); four wrong PINs say how many tries are left,
  the fifth waits 30 s (keys off), then the right PIN opens; what was being typed is still there;
- back from the background after the delay: locked again;
- change the PIN (the current one asked), turn it off (with the PIN);
- « PIN oublié ? »: the only way out is the reset, which erases everything and the lock;
- the artifact (preview) keeps the PIN alone (no fingerprint switch); FR / EN / DE, light and dark, 390 and 360.
Usage: npm run build:local && npm run preview:build && PYTHONPATH=scripts python3 scripts/e2e-12d.py dist-local <sim dir> dist-preview/index.html <out dir>"""
import sys, json, pathlib, threading, http.server, functools, socketserver, re
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

site = pathlib.Path(sys.argv[1]).resolve(); sim = pathlib.Path(sys.argv[2]); preview = pathlib.Path(sys.argv[3]).resolve()
out = pathlib.Path(sys.argv[4]); out.mkdir(parents=True, exist_ok=True)
errors, checks = [], {}
LOAD = re.search(r'LOAD = """(.*?)"""', pathlib.Path("scripts/sim/browse.py").read_text(), re.S).group(1)
DAY = "2026-10-19"
# The page's visibility, driven by the test (a phone going to the background).
VIS = "window.__vis = 'visible'; Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__vis });"
base = json.loads((sim / "checkpoints" / f"{DAY}.json").read_text())


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(site)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{httpd.server_address[1]}/"


def start(b, lang="fr", theme="light", w=390):
    backup = json.loads(json.dumps(base))
    backup["collections"]["settings"]["main"].update({"lang": lang, "theme": theme, "space": "floraison"})
    ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme, timezone_id="Europe/Oslo", locale="fr-FR", service_workers="block", reduced_motion="reduce")
    ctx.add_init_script(f"if (!localStorage.getItem('hydro.ui')) localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
    ctx.add_init_script(VIS)
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))
    pg.clock.install(time=f"{DAY}T08:30:00+02:00"); pg.clock.resume()
    pg.goto(url); pg.wait_for_timeout(1500); pg.evaluate(LOAD, backup); pg.reload(); pg.wait_for_timeout(2500)
    return ctx, pg


def settings(pg):
    pg.goto(f"{url}#tools/settings"); pg.wait_for_selector("#lock-card"); pg.wait_for_timeout(400)
    pg.locator("#lock-card").scroll_into_view_if_needed()


def pin(pg, digits):
    for d in digits: pg.click(f"#lock-pad [data-key='{d}']")
    pg.click("#lock-pad [data-key='ok']"); pg.wait_for_timeout(700)


def background(pg, minutes):
    pg.evaluate("() => { window.__vis = 'hidden'; document.dispatchEvent(new Event('visibilitychange')) }")
    pg.clock.fast_forward(f"{minutes:02d}:05")
    pg.evaluate("() => { window.__vis = 'visible'; document.dispatchEvent(new Event('visibilitychange')) }")
    pg.wait_for_timeout(500)


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx, pg = start(b)

    # 1. Turn it on: the honest line, the PIN twice, « note-le », the backup offered; never in clear.
    settings(pg)
    honest = pg.locator("#lock-honest").inner_text()
    pg.screenshot(path=str(out / "reglage-fr.png"))
    pg.click("#lock-on"); pg.wait_for_selector("#pin-a")
    pg.fill("#pin-a", "2468"); pg.fill("#pin-b", "2469"); pg.click("#pin-save"); pg.wait_for_timeout(300)
    mism = pg.locator("#pin-err").inner_text()
    pg.fill("#pin-b", "2468"); pg.click("#pin-save"); pg.wait_for_selector("#pin-done"); pg.wait_for_timeout(300)
    done = pg.locator("#pin-done").inner_text()
    pg.screenshot(path=str(out / "pin-note-fr.png"))
    stored = pg.evaluate("localStorage.getItem('hydro.lock')")
    pg.click("#pin-close"); pg.wait_for_timeout(500)
    state = pg.locator("#lock-state").inner_text()
    pg.locator("#lock-card [role=radio]", has_text="1 min").click(); pg.wait_for_timeout(300)
    delay = json.loads(pg.evaluate("localStorage.getItem('hydro.lock')"))["delayMin"]
    if "pas un chiffrement" not in honest or mism != "Les deux PIN ne sont pas pareils." or "Réinitialiser l'app" not in done or "Faire une sauvegarde maintenant" not in done or "2468" in stored or state != "Verrou activé" or delay != 1:
        errors.append(f"turn on {honest!r} {mism!r} {done!r} {stored[:60]} {state!r} {delay}")
    checks["on"] = {"stored": {k: v for k, v in json.loads(stored).items() if k in ("v", "iterations", "delayMin", "fails")}}

    # 2. At opening: the lock screen; wrong PINs, the wait, the right PIN.
    pg.reload(); pg.wait_for_selector("#lock-screen"); pg.wait_for_timeout(500)
    inert = pg.evaluate("() => !!document.querySelector('#lock-screen') && [...document.querySelectorAll('[inert]')].length > 0")
    pg.screenshot(path=str(out / "verrou-fr.png"))
    for _ in range(4): pin(pg, "1111")
    left = pg.locator("#lock-msg").inner_text()
    pin(pg, "1111")
    wait = pg.locator("#lock-msg").inner_text()
    disabled = pg.locator("#lock-pad [data-key='1']").is_disabled()
    pg.screenshot(path=str(out / "attente-fr.png"))
    pg.clock.fast_forward("00:31"); pg.wait_for_timeout(800)
    pin(pg, "2468")
    open_ = pg.locator("#lock-screen").count() == 0
    if not inert or left != "PIN incorrect · encore 1 essai avant une attente" or not re.match(r"^Trop d'essais : réessaie dans (30|29) s$", wait) or not disabled or not open_:
        errors.append(f"lock screen inert={inert} {left!r} {wait!r} disabled={disabled} open={open_}")
    checks["wrong"] = [left, wait]

    # 3. Back from the background after the delay: locked again; what was typed is still there.
    pg.goto(f"{url}#journal"); pg.wait_for_timeout(800)
    pg.click("#tab-plus"); pg.wait_for_timeout(400); pg.click("#add-entry"); pg.wait_for_selector("#e-when"); pg.wait_for_timeout(500)
    pg.fill("#e-tempDay", "23,7")
    background(pg, 0)  # 5 s: not locked
    short = pg.locator("#lock-screen").count()
    background(pg, 2)
    relocked = pg.locator("#lock-screen").count()
    pin(pg, "2468")
    kept = pg.input_value("#e-tempDay") if pg.locator("#e-tempDay").count() else ""
    if short or not relocked or kept != "23,7": errors.append(f"background short={short} relocked={relocked} kept={kept!r}")
    # What was typed before the lock is saved after it.
    pg.click("#e-save"); pg.wait_for_timeout(1200)
    if pg.locator("[data-slot=drawer-content]").count(): errors.append("the entry did not save after unlocking")

    # 4. Change the PIN (the current one asked), then turn it off.
    settings(pg)
    pg.click("#lock-change"); pg.wait_for_selector("#pin-current")
    pg.fill("#pin-current", "0000"); pg.fill("#pin-a", "135790"); pg.fill("#pin-b", "135790"); pg.click("#pin-save"); pg.wait_for_timeout(500)
    bad_cur = pg.locator("#pin-err").inner_text()
    pg.fill("#pin-current", "2468"); pg.click("#pin-save"); pg.wait_for_timeout(800)
    pg.reload(); pg.wait_for_selector("#lock-screen"); pin(pg, "135790")
    changed = pg.locator("#lock-screen").count() == 0
    settings(pg)
    pg.click("#lock-off"); pg.wait_for_selector("#pin-current"); pg.fill("#pin-current", "135790"); pg.click("#pin-save"); pg.wait_for_timeout(800)
    off = pg.evaluate("localStorage.getItem('hydro.lock')")
    pg.reload(); pg.wait_for_timeout(2500)
    if bad_cur != "PIN incorrect" or not changed or off is not None or pg.locator("#lock-screen").count(): errors.append(f"change/off {bad_cur!r} changed={changed} off={off}")

    # 5. « PIN oublié ? »: the reset is the only way out; it erases everything and the lock.
    settings(pg)
    pg.click("#lock-on"); pg.wait_for_selector("#pin-a"); pg.fill("#pin-a", "4321"); pg.fill("#pin-b", "4321"); pg.click("#pin-save"); pg.wait_for_selector("#pin-done"); pg.click("#pin-close"); pg.wait_for_timeout(300)
    pg.reload(); pg.wait_for_selector("#lock-screen")
    pg.click("#lock-forgot"); pg.wait_for_selector("#lock-forgot-box")
    forgot = pg.locator("#lock-forgot-box").inner_text()
    pg.screenshot(path=str(out / "oublie-fr.png"))
    pg.click("#lock-reset"); pg.wait_for_timeout(5000)
    after = [pg.locator("#lock-screen").count(), pg.evaluate("localStorage.getItem('hydro.lock')"), pg.evaluate("""() => new Promise((res) => { const r = indexedDB.open('hydro'); r.onsuccess = () => { const q = r.result.transaction('docs').objectStore('docs').count(); q.onsuccess = () => res(q.result) } })""")]
    if "personne ne peut le retrouver" not in forgot or after[0] or after[1] is not None or after[2] > 2: errors.append(f"forgot {forgot!r} after={after}")
    checks["forgot"] = after
    ctx.close()

    # 6. The artifact keeps the PIN alone; EN / DE, light and dark, 390 and 360.
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    ctx.add_init_script("localStorage.setItem('hydro.ui', JSON.stringify({theme:'light',lang:'fr',updatedAt:'2026-01-01T00:00:00Z'}))")
    serve_fonts(ctx)
    pg = ctx.new_page(); pg.goto(f"file://{preview}#tools/settings"); pg.wait_for_selector("#lock-card"); pg.wait_for_timeout(500)
    pg.click("#lock-on"); pg.wait_for_selector("#pin-a"); pg.fill("#pin-a", "1234"); pg.fill("#pin-b", "1234"); pg.click("#pin-save"); pg.wait_for_selector("#pin-done"); pg.click("#pin-close"); pg.wait_for_timeout(300)
    if pg.locator("#lock-bio-on").count(): errors.append("fingerprint offered in the artifact")
    ctx.close()
    for lang, theme, w, title in [("en", "dark", 360, "Hydro is locked"), ("de", "light", 360, "Hydro ist gesperrt"), ("de", "dark", 390, "Hydro ist gesperrt"), ("fr", "dark", 360, "Hydro est verrouillé")]:
        ctx, pg = start(b, lang, theme, w)
        settings(pg)
        pg.screenshot(path=str(out / f"reglage-{lang}-{theme}-{w}.png"))
        pg.click("#lock-on"); pg.wait_for_selector("#pin-a"); pg.fill("#pin-a", "1234"); pg.fill("#pin-b", "1234"); pg.click("#pin-save"); pg.wait_for_selector("#pin-done"); pg.click("#pin-close"); pg.wait_for_timeout(300)
        pg.reload(); pg.wait_for_selector("#lock-screen"); pg.wait_for_timeout(400)
        got = pg.locator("#lock-title").inner_text()
        pg.screenshot(path=str(out / f"verrou-{lang}-{theme}-{w}.png"))
        sw = pg.evaluate("() => document.querySelector('#lock-screen').scrollWidth")
        if got != title or sw > w: errors.append(f"{lang} {theme} {w} {got} {sw}")
        ctx.close()
    b.close()

print(json.dumps(checks, ensure_ascii=False, indent=1))
print("errors:", errors)
print("OK" if not errors else "FAIL")
