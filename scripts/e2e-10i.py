"""Lot 10i (German) in the browser:
- local build served over HTTP, a German phone (locale de-DE), nothing saved: the assistant opens in German and offers
  Français / English / Deutsch;
- preview build in German: tabs Heute, Journal, Diagramme, Werkzeuge; <html lang="de">; decimal comma; dates « 19.10. »;
  nothing wider than the screen and no button or tab label cut at 360 px (every screen, the entry and the reminder
  sheets, the display menu); Réglages offers FR / EN / DE;
- captures DE, light and dark, 390 and 360 px.
Usage: npm run preview:build && npm run build:local &&
       PYTHONPATH=scripts python3 scripts/e2e-10i.py dist-preview/index.html dist-local <out dir>"""
import sys, json, pathlib, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
local = pathlib.Path(sys.argv[2]).resolve()
out = pathlib.Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
errors, checks = [], {}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(local)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{httpd.server_address[1]}/"

# Elements whose text does not fit (a label cut by its box), not counting the ones meant to be truncated with « … ».
CUT = """() => [...document.querySelectorAll('button, [role=tab], [role=radio], label, h1, h2, h3, a')].filter((el) => {
  const r = el.getBoundingClientRect(); if (!r.width || el.closest('.truncate, [class*=truncate], [class*=line-clamp], [class*=sr-only], .overflow-x-auto, .no-scrollbar')) return false
  return el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible' || r.right > innerWidth + 0.5
}).map((el) => `${el.tagName} «${el.textContent.trim().slice(0, 30)}» ${Math.round(el.getBoundingClientRect().right)}`).slice(0, 8)"""


def ui(theme, w):
    return {"viewport": {"width": w, "height": 844}, "device_scale_factor": 2, "color_scheme": theme}


with sync_playwright() as p:
    b = p.chromium.launch()

    # First launch on a German phone (local build, nothing saved).
    ctx = b.new_context(**ui("light", 390), locale="de-DE", service_workers="block")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(url); pg.wait_for_selector("#onb-welcome", timeout=10000); pg.wait_for_timeout(800)
    checks["firstLaunch"] = {"lang": pg.evaluate("document.documentElement.lang"), "start": pg.locator("#onb-start").inner_text(), "langs": [x.get_attribute("aria-label") for x in pg.locator("[role=radiogroup] [role=radio]").all()]}
    fl = checks["firstLaunch"]
    if fl["lang"] != "de" or fl["langs"][:3] != ["Français", "English", "Deutsch"]: errors.append(f"first launch {fl}")
    pg.screenshot(path=str(out / "01-onboarding-de.png"))
    ctx.close()

    for theme in ["light", "dark"]:
        for w in [390, 360]:
            ctx = b.new_context(**ui(theme, w))
            ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'de',updatedAt:'2026-01-01T00:00:00Z'}}))")
            serve_fonts(ctx)
            pg = ctx.new_page()
            pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
            pg.goto(f"file://{page_file}"); pg.wait_for_timeout(2500)
            tag = f"{theme}/{w}"
            if theme == "light" and w == 390:
                checks["tabs"] = [x.inner_text().strip() for x in pg.locator("[role=tab]").all()]
                checks["lang"] = pg.evaluate("document.documentElement.lang")
                if checks["tabs"] != ["Heute", "Journal", "Diagramme", "Werkzeuge"] or checks["lang"] != "de": errors.append(f"tabs {checks['tabs']} lang {checks['lang']}")
            for name, hash_ in [("today", ""), ("journal", "#journal"), ("calendar", "#calendar"), ("charts", "#charts"), ("tools", "#tools"), ("settings", "#tools/settings"), ("nutrition", "#tools/nutrition"), ("irrigation", "#tools/irrigation"), ("data", "#tools/data")]:
                pg.goto(f"file://{page_file}{hash_}"); pg.reload(); pg.wait_for_timeout(1800)
                sw = pg.evaluate("document.documentElement.scrollWidth")
                cut = pg.evaluate(CUT)
                if sw > w: errors.append(f"{tag} {name}: overflow {sw}px")
                if cut: errors.append(f"{tag} {name}: cut {cut}")
                if name in ("today", "tools", "settings"): pg.screenshot(path=str(out / f"{name}-{theme}-{w}.png"), full_page=name != "today")
                if name == "settings" and theme == "light" and w == 390:
                    checks["settingsLangs"] = [x.inner_text().strip() for x in pg.locator("[role=radiogroup][aria-label=Sprache] [role=radio]").all()]
                    if checks["settingsLangs"] != ["FR", "EN", "DE"]: errors.append(f"settings languages {checks['settingsLangs']}")
            # The entry and reminder sheets, the display menu.
            pg.goto(f"file://{page_file}"); pg.reload(); pg.wait_for_timeout(1800)
            pg.click("#tab-plus"); pg.click("#add-entry"); pg.wait_for_timeout(700)
            full = pg.locator("[data-slot=drawer-content] button", has_text="Vollständiger Eintrag")
            if full.count(): full.first.click()
            pg.wait_for_selector("#e-date"); pg.wait_for_timeout(900)
            cut = pg.evaluate(CUT)
            if cut: errors.append(f"{tag} entry: cut {cut}")
            pg.fill("#e-tempDay", "24,5"); pg.wait_for_timeout(200)
            if theme == "light" and w == 360: pg.screenshot(path=str(out / "entry-de-360.png"))
            pg.keyboard.press("Escape"); pg.wait_for_timeout(400)
            if pg.locator("[role=alertdialog]").count(): pg.locator("[role=alertdialog] button").last.click(); pg.wait_for_timeout(400)
            pg.click("#display-menu"); pg.wait_for_timeout(500)
            cut = pg.evaluate(CUT)
            if cut: errors.append(f"{tag} display menu: cut {cut}")
            if theme == "dark" and w == 360: pg.screenshot(path=str(out / "display-menu-de-360.png"))
            ctx.close()

    # Numbers and dates in German: a seeded entry in the journal.
    ctx = b.new_context(**ui("light", 390))
    ctx.add_init_script("localStorage.setItem('hydro.ui', JSON.stringify({theme:'light',lang:'de',updatedAt:'2026-01-01T00:00:00Z'}))")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.goto(f"file://{page_file}#journal"); pg.wait_for_timeout(2500)
    pg.evaluate("""() => new Promise((res) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => { const tx = r.result.transaction('docs', 'readwrite'); tx.objectStore('docs').put({ schemaVersion: 2, id: '2026-10-19_floraison', date: '2026-10-19', spaceId: 'floraison', createdAt: 'x', updatedAt: 'x', ecRunoff: 3.4, dryback: 41 }, 'entries/2026-10-19_floraison'); tx.oncomplete = () => res(true) } })""")
    pg.reload(); pg.wait_for_timeout(2500)
    # Since lot 10k3: the running week is open; a day without anything off is among the quiet days.
    wk = pg.locator("[data-week][data-open]").first
    if wk.locator("[data-quiet]").count(): wk.locator("[data-quiet]").click(); pg.wait_for_timeout(300)
    row = wk.locator("[data-row], [data-quiet-day]").filter(has_text="3,4").first.inner_text()
    checks["journalRow"] = row
    if "Mo" not in row or "19" not in row or "3,4" not in row: errors.append(f"journal row in German {row!r}")
    ctx.close()
    b.close()
httpd.shutdown()

print(json.dumps(checks, ensure_ascii=False, indent=1))
print("errors:", errors[:12])
print("OK" if not errors else "FAIL")
sys.exit(0 if not errors else 1)
