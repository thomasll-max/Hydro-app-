"""Lot 10j in the browser, local build with the one-year simulation at 8 February, FR / EN / DE, light and dark, 390 and
360 px. Since lot 10k1 the checks of Aujourd'hui are in e2e-10k1.py (the summary in lines and the cards of the spaces
are gone); what stays of 10j:
10j2: the Journal filters behind « Filtres » (a sheet, the choices wrapping, nothing cut), the active ones in one line
with « Effacer »; since lot 10k (règle « calme » 3) no drawing on the titles of the Journal, the charts, the Réglages
groups and Outils.
Usage: npm run build:local && PYTHONPATH=scripts python3 scripts/e2e-10j.py dist-local <sim dir> <out dir>"""
import sys, json, pathlib, threading, http.server, functools, socketserver, re
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

site = pathlib.Path(sys.argv[1]).resolve()
sim = pathlib.Path(sys.argv[2])
out = pathlib.Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
DAY = "2026-02-08"
errors, checks = [], {}
LANGS = sys.argv[4].split(",") if len(sys.argv) > 4 else ["fr", "en", "de"]
LOAD = re.search(r'LOAD = """(.*?)"""', pathlib.Path("scripts/sim/browse.py").read_text(), re.S).group(1)
backup = json.loads((sim / "checkpoints" / f"{DAY}.json").read_text())


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(site)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{httpd.server_address[1]}/"

CUT = """() => [...document.querySelectorAll('button, [role=tab], [role=radio], label, h1, h2, h3, a')].filter((el) => {
  const r = el.getBoundingClientRect(); if (!r.width || el.closest('.truncate, [class*=truncate], [class*=line-clamp], [class*=sr-only], .overflow-x-auto, .no-scrollbar')) return false
  return el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible' || r.right > innerWidth + 0.5
}).map((el) => `${el.tagName} «${el.textContent.trim().slice(0, 30)}» ${Math.round(el.getBoundingClientRect().right)}`).slice(0, 8)"""

NAMES = {"fr": ("Tous", "Bonjour Thomas.", "Saisie du jour"), "en": ("All", "Good morning Thomas.", "Today's entry"), "de": ("Alle", "Guten Morgen, Thomas.", "Tageseintrag")}

with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in LANGS:
        for theme in ["dark", "light"]:
            for w in [390, 360]:
                tag = f"{lang}/{theme}/{w}"
                ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme, timezone_id="Europe/Oslo", locale="fr-FR", service_workers="block")
                ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
                serve_fonts(ctx)
                pg = ctx.new_page()
                pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
                pg.clock.install(time=f"{DAY}T09:30:00+01:00"); pg.clock.resume()
                # The simulation's settings carry its language and theme: those of this pass instead.
                bk = json.loads(json.dumps(backup)); bk["collections"]["settings"]["main"].update({"lang": lang, "theme": theme})
                pg.goto(url); pg.wait_for_timeout(1500); pg.evaluate(LOAD, bk); pg.reload(); pg.wait_for_timeout(3000)
                all_ = NAMES[lang][0]
                # 10j2: Journal (all spaces), its filters in a sheet.
                pg.get_by_role("group").first.get_by_role("button", name=all_, exact=True).click(); pg.wait_for_timeout(800)
                pg.get_by_role("tab", name="Journal").click(); pg.wait_for_timeout(1500)
                pg.wait_for_selector("#journal-filters", timeout=10000); pg.wait_for_timeout(300)
                jr = pg.evaluate("""() => ({ rows: document.querySelectorAll('main [role=radiogroup]').length, button: !!document.querySelector('#journal-filters'), titles: [...document.querySelectorAll('main h2')].filter((h) => h.parentElement.querySelector(':scope > img')).length })""")
                if jr["rows"] or not jr["button"] or jr["titles"]: errors.append(f"{tag} journal {jr}")
                pg.click("#journal-filters"); pg.wait_for_timeout(800)
                sheet = pg.evaluate("""() => { const d = document.querySelector('[data-slot=drawer-content]'); return { groups: d.querySelectorAll('[role=radiogroup]').length, scroll: [...d.querySelectorAll('[role=radiogroup]')].some((g) => g.scrollWidth > g.clientWidth + 1) } }""")
                if sheet["groups"] < 2 or sheet["scroll"]: errors.append(f"{tag} filters sheet {sheet}")
                cut = pg.evaluate(CUT)
                if cut: errors.append(f"{tag} filters cut {cut}")
                if w == 360: pg.screenshot(path=str(out / f"filtres-{lang}-{theme}.png"))
                pg.locator("[data-slot=drawer-content] [role=radiogroup]").first.get_by_role("radio").nth(1).click(); pg.wait_for_timeout(300)
                pg.locator("[data-slot=drawer-content] [data-slot=drawer-footer] button").last.click(); pg.wait_for_timeout(700)
                summ = pg.locator("#journal-filter-summary")
                if not summ.count() or not summ.inner_text().strip(): errors.append(f"{tag} filter summary missing")
                sw = pg.evaluate("document.documentElement.scrollWidth")
                if sw > w: errors.append(f"{tag} journal overflow {sw}")
                pg.screenshot(path=str(out / f"journal-{lang}-{theme}-{w}.png"))
                # Charts and Réglages: no drawing on the titles any more (lot 10k).
                for name, hash_ in [("charts", "#charts"), ("settings", "#tools/settings")]:
                    pg.goto(url + hash_); pg.wait_for_timeout(2500)
                    n = pg.evaluate("""() => [...document.querySelectorAll('main h2')].filter((h) => h.parentElement.querySelector(':scope > img')).length""")
                    if n: errors.append(f"{tag} {name} titles with a drawing {n}")
                    sw = pg.evaluate("document.documentElement.scrollWidth")
                    if sw > w: errors.append(f"{tag} {name} overflow {sw}")
                    cut = pg.evaluate(CUT)
                    if cut: errors.append(f"{tag} {name} cut {cut}")
                    if w == 390: pg.screenshot(path=str(out / f"{name}-{lang}-{theme}.png"), full_page=name == "settings")
                pg.goto(url + "#tools"); pg.wait_for_timeout(1200)
                if pg.evaluate("document.querySelectorAll('main h2 + img, main img + h2').length"): errors.append(f"{tag} Outils got drawings")
                ctx.close()
    b.close()
httpd.shutdown()

print(json.dumps(checks, ensure_ascii=False, indent=1)[:3000])
print("errors:", errors[:12])
print("OK" if not errors else "FAIL")
sys.exit(0 if not errors else 1)
