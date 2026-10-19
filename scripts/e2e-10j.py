"""Lot 10j1 (clarté) in the browser, local build with the one-year simulation at 8 February (3 spaces: Floraison,
Colonne, Séchage), FR / EN / DE, light and dark, 390 and 360 px:
- order of « Tous »: guide line (one thin line for Premiers pas + backup), Bonjour, À faire, Espaces; no « Tous les
  espaces » title;
- Bonjour: « Bonjour Thomas. » then a small line « 3 espaces · dernière saisie … », short lines of at least 44 px with a
  drawing (alt="") and the value on the right; a line « à surveiller » colours its value only; an empty space is one
  quiet line;
- one frame per space (surface, 1 px line, radius 14), nothing framed inside, no coloured edge; a 42 px square tinted
  with the space colour with the stage drawing; the stage pill; up to 4 readings with a 15 px drawing;
- section titles of Aujourd'hui with their drawing; nothing wider than the screen, no label cut;
- captures of « Tous » and of a space;
10j2: the Journal filters behind « Filtres » (a sheet, the choices wrapping, nothing cut), the active ones in one line
with « Effacer »; drawings on the titles of the Journal, the charts and the Réglages groups; Outils unchanged.
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

ALL = """() => {
  const top = (sel) => { const el = document.querySelector(sel); return el ? Math.round(el.getBoundingClientRect().top + scrollY) : null }
  const rows = [...document.querySelectorAll('#bonjour li')]
  const warnRows = rows.filter((li) => li.dataset.warn)
  const cards = [...document.querySelectorAll('[data-space-card] [data-slot=card]')]
  const cs = (el) => getComputedStyle(el)
  return {
    order: { guide: top('#start-card') ?? top('#backup-line'), bonjour: top('#bonjour'), upcoming: top('#upcoming'), spaces: top('#spaces') },
    hello: document.querySelector('#bonjour h2').textContent, sub: document.querySelector('#bonjour-sub').textContent,
    rows: rows.map((li) => ({ h: Math.round(li.getBoundingClientRect().height), img: li.querySelector('img')?.getAttribute('alt'), text: li.textContent.trim().slice(0, 60) })),
    warn: warnRows.map((li) => { const spans = li.querySelectorAll(':scope > span'); return [cs(spans[0]).color, cs(spans[spans.length - 1]).color] }),
    cards: cards.map((c) => ({ radius: cs(c).borderRadius, border: cs(c).borderTopWidth, left: cs(c).borderLeftWidth, bg: cs(c).backgroundColor, inner: c.querySelectorAll('[data-slot=card]').length,
      tile: (() => { const t = c.querySelector('[data-space-tile]'); return t ? [Math.round(t.getBoundingClientRect().width), cs(t).backgroundColor !== 'rgba(0, 0, 0, 0)', t.querySelector('img')?.width] : null })(),
      pill: c.querySelector('.rounded-full')?.textContent, reads: c.querySelectorAll('.grid img').length, name: c.querySelector('.display')?.textContent })),
    titles: ['#upcoming', '#spaces'].map((s) => !!document.querySelector(`${s} h2`)?.parentElement.querySelector('img')),
    altless: [...document.querySelectorAll('main img')].filter((i) => i.getAttribute('alt') !== '').length,
    oldTitle: /Tous les espaces|All spaces|Alle Bereiche/.test(document.querySelector('main').textContent),
  }
}"""

SURFACE = {"dark": "rgb(19, 28, 24)", "light": "rgb(255, 255, 255)"}
WARN = {"dark": "rgb(238, 177, 84)", "light": "rgb(161, 91, 0)"}
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
                all_, hello, _ = NAMES[lang]
                pg.get_by_role("group").first.get_by_role("button", name=all_, exact=True).click(); pg.wait_for_timeout(1500)
                c = pg.evaluate(ALL)
                o = c["order"]
                if not (o["guide"] is not None and o["guide"] < o["bonjour"] < o["upcoming"] < o["spaces"]): errors.append(f"{tag} order {o}")
                if c["hello"] != hello: errors.append(f"{tag} hello {c['hello']}")
                if not re.match(r"^3 ", c["sub"]): errors.append(f"{tag} sub {c['sub']}")
                if not c["rows"] or any(r["h"] < 44 or r["img"] != "" for r in c["rows"]): errors.append(f"{tag} rows {c['rows'][:3]}")
                if any(t == WARN[theme] or v != WARN[theme] for t, v in c["warn"]): errors.append(f"{tag} warn colours {c['warn']}")
                if len(c["cards"]) != 3: errors.append(f"{tag} cards {len(c['cards'])}")
                for cd in c["cards"]:
                    if cd["radius"] != "14px" or cd["border"] != "1px" or cd["left"] != "1px" or cd["bg"] != SURFACE[theme] or cd["inner"] or not cd["tile"] or cd["tile"][0] != 42 or not cd["tile"][1] or cd["tile"][2] != 28 or not cd["pill"]: errors.append(f"{tag} card {cd}")
                if not all(c["titles"]): errors.append(f"{tag} section drawings {c['titles']}")
                if c["altless"]: errors.append(f"{tag} images without alt='' {c['altless']}")
                if c["oldTitle"]: errors.append(f"{tag} « Tous les espaces » still shown")
                sw = pg.evaluate("document.documentElement.scrollWidth")
                if sw > w: errors.append(f"{tag} overflow {sw}")
                cut = pg.evaluate(CUT)
                if cut: errors.append(f"{tag} cut {cut}")
                pg.screenshot(path=str(out / f"tous-{lang}-{theme}-{w}.png"), full_page=True)
                checks[tag] = {k: c[k] for k in ("sub", "warn")} | {"rows": len(c["rows"]), "pills": [x["pill"] for x in c["cards"]]}
                # One space: its tinted square in the title, the summary for it, À faire before the details.
                pg.get_by_role("group").first.get_by_role("button", name="Floraison").click(); pg.wait_for_timeout(1500)
                sp = pg.evaluate("""() => ({ tile: !!document.querySelector('main [data-space-tile]'), bonjour: document.querySelector('#bonjour')?.getBoundingClientRect().top, upcoming: document.querySelector('#upcoming')?.getBoundingClientRect().top, readings: document.querySelector('#readings')?.getBoundingClientRect().top })""")
                if not sp["tile"] or not (sp["bonjour"] < sp["upcoming"] < sp["readings"]): errors.append(f"{tag} space view {sp}")
                sw = pg.evaluate("document.documentElement.scrollWidth")
                if sw > w: errors.append(f"{tag} space overflow {sw}")
                cut = pg.evaluate(CUT)
                if cut: errors.append(f"{tag} space cut {cut}")
                pg.screenshot(path=str(out / f"espace-{lang}-{theme}-{w}.png"), full_page=True)
                # 10j2: Journal (all spaces), its filters in a sheet.
                pg.get_by_role("group").first.get_by_role("button", name=all_, exact=True).click(); pg.wait_for_timeout(800)
                pg.get_by_role("tab", name="Journal").click(); pg.wait_for_timeout(1500)
                pg.wait_for_selector("#journal-filters", timeout=10000); pg.wait_for_timeout(300)
                jr = pg.evaluate("""() => ({ rows: document.querySelectorAll('main [role=radiogroup]').length, button: !!document.querySelector('#journal-filters'), titles: [...document.querySelectorAll('main h2')].filter((h) => h.parentElement.querySelector(':scope > img')).length })""")
                if jr["rows"] or not jr["button"] or jr["titles"] < 3: errors.append(f"{tag} journal {jr}")
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
                # Charts and Réglages: a drawing on each chart title and group title.
                for name, hash_, least in [("charts", "#charts", 1), ("settings", "#tools/settings", 5)]:
                    pg.goto(url + hash_); pg.wait_for_timeout(1800)
                    count = """() => [...document.querySelectorAll('main h2')].filter((h) => h.parentElement.querySelector(':scope > img[alt=""]')).length"""
                    for _ in range(10):
                        n = pg.evaluate(count)
                        if n >= least: break
                        pg.wait_for_timeout(500)
                    if n < least: errors.append(f"{tag} {name} titles with a drawing {n}")
                    sw = pg.evaluate("document.documentElement.scrollWidth")
                    if sw > w: errors.append(f"{tag} {name} overflow {sw}")
                    cut = pg.evaluate(CUT)
                    if cut: errors.append(f"{tag} {name} cut {cut}")
                    if w == 390: pg.screenshot(path=str(out / f"{name}-{lang}-{theme}.png"), full_page=name == "settings")
                pg.goto(url + "#tools"); pg.wait_for_timeout(1200)
                if pg.evaluate("document.querySelectorAll('main h2 + img, main img + h2').length"): errors.append(f"{tag} Outils got drawings")
                ctx.close()
    # A line to watch: no entry in Floraison for a week; only its value takes « à surveiller ».
    for theme in ["dark", "light"]:
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme=theme, timezone_id="Europe/Oslo", locale="fr-FR", service_workers="block")
        serve_fonts(ctx)
        pg = ctx.new_page()
        pg.clock.install(time=f"{DAY}T09:30:00+01:00"); pg.clock.resume()
        bk = json.loads(json.dumps(backup)); bk["collections"]["settings"]["main"].update({"lang": "fr", "theme": theme, "space": "all"})
        bk["collections"]["entries"] = {k: v for k, v in bk["collections"]["entries"].items() if not (v["spaceId"] == "floraison" and v["date"] >= "2026-02-01")}
        pg.goto(url); pg.wait_for_timeout(1500); pg.evaluate(LOAD, bk); pg.reload(); pg.wait_for_timeout(3000)
        c = pg.evaluate(ALL)
        checks[f"warn-{theme}"] = c["warn"]
        if not c["warn"] or any(t == WARN[theme] or v != WARN[theme] for t, v in c["warn"]): errors.append(f"warn {theme} {c['warn']}")
        pg.locator("#bonjour").screenshot(path=str(out / f"bonjour-warn-{theme}.png"))
        ctx.close()
    b.close()
httpd.shutdown()

print(json.dumps(checks, ensure_ascii=False, indent=1)[:3000])
print("errors:", errors[:12])
print("OK" if not errors else "FAIL")
sys.exit(0 if not errors else 1)
