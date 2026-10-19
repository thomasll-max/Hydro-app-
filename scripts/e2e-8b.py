"""Lot 8b: first-launch assistant of the local (friends') build, served over HTTP. Welcome → 7 steps → Today; the draft
survives a reload; a reset brings the assistant back; a backup pasted on the welcome screen restores everything.
Usage: npm run build:local && PYTHONPATH=scripts python3 scripts/e2e-8b.py dist-local <out dir>"""
import sys, json, pathlib, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright

root = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
handler = functools.partial(Quiet, directory=str(root))
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
port = httpd.server_address[1]
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{port}/"
errors, checks = [], {}
KEYS = """() => new Promise((res) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => { const q = r.result.transaction('docs').objectStore('docs').getAllKeys(); q.onsuccess = () => res(q.result) } })"""
DOC = """(k) => new Promise((res) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => { const q = r.result.transaction('docs').objectStore('docs').get(k); q.onsuccess = () => res(q.result) } })"""

def overflow(pg):
    return pg.evaluate("document.documentElement.scrollWidth > innerWidth")

def shot(pg, name):
    pg.wait_for_timeout(350)
    pg.screenshot(path=str(out / name))

with sync_playwright() as p:
    b = p.chromium.launch()
    for scheme in ["dark", "light"]:
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme=scheme)
        pg = ctx.new_page()
        pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
        pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
        pg.goto(url); pg.wait_for_selector("#onb-welcome", timeout=8000)
        if scheme == "light":
            shot(pg, "light-01-welcome.png")
            pg.click("#onb-start"); pg.fill("#onb-name", "Test"); pg.click("#onb-next")
            shot(pg, "light-02-spaces.png")
            ctx.close()
            continue

        checks["wizardOnFirstLaunch"] = pg.locator("#onboarding").count() == 1
        checks["noDocsBeforeFinish"] = pg.evaluate(KEYS)
        shot(pg, "01-welcome.png")
        pg.get_by_role("radio", name="EN").click(); pg.wait_for_timeout(200)
        checks["welcomeEn"] = pg.inner_text("#onb-welcome")
        pg.get_by_role("radio", name="FR").click(); pg.wait_for_timeout(200)

        pg.click("#onb-start")
        checks["step1"] = pg.inner_text("#onb-count")
        # Lot 10e: nothing flagged before a try; tapping Next without a name says what is missing and stays.
        checks["noIssueBeforeTry"] = pg.locator("#onb-issue").count() == 0
        pg.click("#onb-next"); pg.wait_for_timeout(200)
        checks["issueNoName"] = pg.inner_text("#onb-issue")
        checks["stillStep1"] = pg.inner_text("#onb-count") == checks["step1"]
        pg.fill("#onb-name", "Grow de Léa")
        shot(pg, "02-name.png")
        pg.click("#onb-next")

        # Spaces: dimensions, duplicate, second one becomes a veg space.
        pg.fill("#onb-l-0", "80"); pg.fill("#onb-w-0", "80"); pg.fill("#onb-h-0", "160")
        pg.click("#onb-dup-0")
        pg.fill("#onb-sp-name-1", "Végé")
        pg.locator("#onb-space-1").get_by_role("button", name="Végé", exact=True).click()
        checks["spacesCount"] = pg.locator("[id^=onb-space-]").count()
        checks["dupDims"] = pg.input_value("#onb-h-1")
        shot(pg, "03-spaces.png")
        checks["overflowSpaces"] = overflow(pg)
        pg.click("#onb-next")

        # Equipment: only the flower space, partly.
        checks["equipLater"] = pg.inner_text("#onb-next")
        pg.fill("#onb-lamp-0", "SF-1000"); pg.fill("#onb-potl-0", "11"); pg.fill("#onb-potn-0", "4")
        checks["equipNext"] = pg.inner_text("#onb-next")
        shot(pg, "04-equipment.png")
        # The draft survives a reload.
        pg.reload(); pg.wait_for_selector("#onb-count", timeout=8000)
        checks["afterReloadStep"] = pg.inner_text("#onb-count")
        checks["afterReloadLamp"] = pg.input_value("#onb-lamp-0")
        pg.click("#onb-next")

        # Modules: no plants module in the veg space.
        pg.locator("#onb-m-" + pg.evaluate("JSON.parse(localStorage['hydro.onboarding']).draft.spaces[1].key") + "-plants").click()
        shot(pg, "05-modules.png")
        pg.click("#onb-next")

        # Nutrition: both lines in the local version; add Cleanse.
        checks["lines"] = pg.locator("#onb-nut").get_by_role("radio").all_inner_texts()[:2]
        pg.locator("#onb-nut").get_by_role("button", name="Cleanse").click()
        shot(pg, "06-nutrition.png")
        pg.click("#onb-next")

        # First cycle: pots come from the equipment step.
        pg.get_by_role("radio", name="Créer le premier cycle").click()
        checks["cyclePotsPrefilled"] = [pg.input_value("#onb-c-potl"), pg.input_value("#onb-c-potn")]
        pg.fill("#onb-c-cult", "Gelato")
        shot(pg, "07-cycle.png")
        checks["overflowCycle"] = overflow(pg)
        pg.click("#onb-next")

        pg.fill("#onb-digest", "08:30")
        checks["recap"] = pg.inner_text("#onb-recap").replace("\n", " | ")
        checks["installTip"] = pg.locator("#install-tip").count() == 1
        shot(pg, "08-digest.png")
        pg.click("#onb-finish")
        pg.wait_for_selector("#onboarding", state="detached", timeout=10000); pg.wait_for_timeout(1800)
        checks["todayAfter"] = pg.locator("text=Floraison").count() > 0 and pg.locator("text=Végé").count() > 0
        checks["noReminderOnSetupDay"] = pg.locator("#backup-reminder").count() == 0
        shot(pg, "09-today.png")
        grow = pg.evaluate(DOC, "grow/main")
        checks["grow"] = {k: grow.get(k) for k in ["name", "digestTime", "timeZone", "nutrition"]}
        keys = pg.evaluate(KEYS)
        checks["docs"] = sorted({k.split("/")[0] for k in keys})
        checks["draftCleared"] = pg.evaluate("localStorage.getItem('hydro.onboarding')")
        cyc = pg.evaluate(DOC, "cycles/cycle-1")
        checks["cycle"] = {k: cyc.get(k) for k in ["cultivars", "potVolumeL", "potCount", "lights", "nutrientLine"]}
        veg = [pg.evaluate(DOC, k) for k in keys if k.startswith("spaces/")]
        checks["vegPlantsOff"] = [s["modules"]["plants"] for s in sorted(veg, key=lambda s: s["order"])]

        # Settings (local): install tip; then reset → assistant again; paste the backup on the welcome screen.
        pg.goto(url + "#data"); pg.wait_for_timeout(1800)
        backup = pg.evaluate("""() => new Promise((res) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => { const st = r.result.transaction('docs').objectStore('docs'); const k = st.getAllKeys(), v = st.getAll(); v.onsuccess = () => { const c = {}; k.result.forEach((key, i) => { const [col, id] = key.split('/'); (c[col] ??= {})[id] = v.result[i] }); res(JSON.stringify({format:'hydro-backup',version:1,exportedAt:new Date().toISOString(),source:'local',collections:c})) } } })""")
        pg.goto(url + "#settings"); pg.wait_for_timeout(1800)
        checks["settingsInstallTip"] = pg.locator("#install-tip").count() == 1
        pg.get_by_role("button", name="Réinitialiser…").click(); pg.wait_for_timeout(300)
        pg.click("#reset-confirm")
        pg.wait_for_timeout(2500)  # the reset reloads the page after 600 ms
        pg.wait_for_selector("#onb-welcome", timeout=10000)
        checks["wizardAfterReset"] = True
        pg.click("#onb-paste-open"); pg.fill("#onb-paste", backup); pg.click("#onb-paste-read")
        checks["importSummary"] = pg.inner_text("#onb-import-summary")
        shot(pg, "10-import.png")
        pg.click("#onb-import-run")
        pg.wait_for_selector("#onboarding", state="detached", timeout=10000); pg.wait_for_timeout(1500)
        checks["restored"] = pg.evaluate(DOC, "grow/main")["name"]
        checks["restoredSpaces"] = len([k for k in pg.evaluate(KEYS) if k.startswith("spaces/")])

        # Skip: a fresh grow without spaces, straight into the app.
        pg.goto(url + "#settings"); pg.wait_for_timeout(1500)
        pg.get_by_role("button", name="Réinitialiser…").click(); pg.wait_for_timeout(300)
        pg.click("#reset-confirm"); pg.wait_for_timeout(2500); pg.wait_for_selector("#onb-welcome", timeout=10000)
        pg.click("#onb-skip")
        pg.wait_for_selector("#onboarding", state="detached", timeout=10000); pg.wait_for_timeout(1200)
        checks["skipGrow"] = pg.evaluate(DOC, "grow/main")["name"]
        shot(pg, "11-after-skip.png")
        ctx.close()
    b.close()
httpd.shutdown()
for k, v in checks.items(): print(k, "→", json.dumps(v, ensure_ascii=False) if not isinstance(v, str) else v)
print("\n".join(errors) if errors else "no console errors")
