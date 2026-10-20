"""Lot 10k3 (Journal « calme ») in the browser, preview build (Thomas's grow, two spaces), FR / EN / DE, light and dark:
10k3a: the « + » of the tab bar opens a small sheet (Saisie du jour, Saisie rapide, Nouveau bidon, Événement), each row
opens its sheet and back closes it; no big buttons at the top of the Journal; one space only: no « Saisie rapide ».
10k3b (with the local build and the one-year simulation at 8 February): the Journal by weeks: the cycle on one line with
the search and the filters; one card per week, the running one open, the strip of 7 days coloured by state (today
outlined), the days that matter with their type icon, « + N jours sans souci »; a day of the strip opens its entry;
the search; another cycle; « Tous »: one card per week and per space; no drawers left; a year of entries opens fast.
10k3c: the week page (« Voir la semaine → », a day of the strip): title, dates, entries, « comparée à … », the verdict, one line
per key value (pH runoff « 4/5 j »), three day cards then the others; a card opens its entry; back returns.
Usage: npm run preview:build && npm run build:local && PYTHONPATH=scripts python3 scripts/e2e-10k3.py dist-preview/index.html <out dir> [fr,en,de] [dist-local <sim dir>]"""
import sys, json, pathlib, threading, http.server, functools, socketserver, re, time
from playwright.sync_api import sync_playwright
from fonts import serve_fonts
from entry_ui import when

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
LANGS = sys.argv[3].split(",") if len(sys.argv) > 3 else ["fr", "en", "de"]
errors, checks = [], {}

CUT = """() => [...document.querySelectorAll('button, [role=tab], [role=radio], label, h1, h2, h3, a')].filter((el) => {
  const r = el.getBoundingClientRect(); if (!r.width || el.closest('.truncate, [class*=truncate], [class*=line-clamp], [class*=sr-only], .overflow-x-auto, .no-scrollbar')) return false
  return el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible' || r.right > innerWidth + 0.5
}).map((el) => `${el.tagName} «${el.textContent.trim().slice(0, 30)}» ${Math.round(el.getBoundingClientRect().right)}`).slice(0, 8)"""

ADD = {"fr": ["Saisie du jour", "Saisie rapide", "Nouveau bidon", "Événement"], "en": ["Today's entry", "Quick entry", "New tank", "Event"], "de": ["Tageseintrag", "Schnelleintrag", "Neuer Ansatz", "Ereignis"]}


def context(b, lang, theme, w=390):
    ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme)
    ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))
    return ctx, pg


WEEK = {"fr": ("Végé S6", "en cours", "Cycle 2"), "en": ("Veg W6", "current", "Cycle 2"), "de": ("Wachstum W6", "läuft", "Cycle 2")}
JOURNAL = """() => {
  const w = document.querySelector('[data-week][data-open]')
  return {
    cycles: [...document.querySelectorAll('#journal-cycles button')].map((b) => [b.textContent, b.getAttribute('aria-pressed')]),
    weeks: document.querySelectorAll('[data-week]').length,
    open: w && { title: w.querySelector('button b').textContent, head: w.querySelector('button').textContent, states: [...w.querySelectorAll('[data-strip] button')].map((d) => d.dataset.state + (d.dataset.today ? '*' : '')),
      rows: [...w.querySelectorAll('[data-row]')].map((r) => r.dataset.row), quiet: !!w.querySelector('[data-quiet]'), summary: w.querySelector('[data-summary]').textContent, radius: getComputedStyle(w).borderRadius },
    drawers: /Événements ·|Bidons ·|Events ·|Tanks ·/.test(document.querySelector('main').innerText),
  }
}"""


def weeks_pass(b):
    site = pathlib.Path(sys.argv[4]).resolve(); sim = pathlib.Path(sys.argv[5])
    LOAD = re.search(r'LOAD = """(.*?)"""', pathlib.Path("scripts/sim/browse.py").read_text(), re.S).group(1)

    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(site)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{httpd.server_address[1]}/"

    def open_sim(lang, theme, w, day="2026-02-08", space="floraison"):
        backup = json.loads((sim / "checkpoints" / f"{day}.json").read_text())
        backup["collections"]["settings"]["main"].update({"lang": lang, "theme": theme, "space": space})
        ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme, timezone_id="Europe/Oslo", locale="fr-FR", service_workers="block", reduced_motion="reduce")
        ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
        serve_fonts(ctx)
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
        pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))
        pg.clock.install(time=f"{day}T09:30:00+01:00"); pg.clock.resume()
        pg.goto(url); pg.wait_for_timeout(1500); pg.evaluate(LOAD, backup); pg.reload(); pg.wait_for_timeout(2500)
        pg.goto(url + "#journal"); pg.wait_for_selector("[data-week]", timeout=15000); pg.wait_for_timeout(600)
        return ctx, pg

    for lang in LANGS:
        for theme in ["dark", "light"]:
            for w in [390, 360]:
                tag = f"weeks/{lang}/{theme}/{w}"
                ctx, pg = open_sim(lang, theme, w)
                c = pg.evaluate(JOURNAL)
                o = c["open"]
                title, running, cyc = WEEK[lang]
                ok = (c["cycles"][:2] == [["Cycle 2", "true"], ["Cycle 1", "false"]] and o and o["title"] == title and running in o["head"] and o["radius"] == "14px"
                      and o["states"] == ["none", "ok", "ok", "warn", "ok", "ok", "none*"] and o["rows"] == ["action", "warn", "obs", "mix"] and o["quiet"] and "dryback" in o["summary"].lower() and not c["drawers"])
                if not ok: errors.append(f"{tag} {c}")
                sw = pg.evaluate("document.documentElement.scrollWidth")
                if sw > w: errors.append(f"{tag} overflow {sw}")
                cut = pg.evaluate(CUT)
                if cut: errors.append(f"{tag} cut {cut}")
                pg.screenshot(path=str(out / f"journal-{lang}-{theme}-{w}.png"), full_page=True)
                checks[tag] = {"open": o and {k: o[k] for k in ("title", "states", "rows")}, "weeks": c["weeks"]}
                # 10k3c: « Voir la semaine → » opens the week page; back returns to the Journal.
                pg.click("[data-week][data-open] [data-see-week]"); pg.wait_for_selector("#week-page", timeout=8000); pg.wait_for_timeout(400)
                wp = pg.evaluate("""() => ({ hash: location.hash, title: document.querySelector('#week-page h1').textContent, sub: document.querySelector('#week-sub').textContent,
                  verdict: document.querySelector('#week-verdict')?.textContent, metrics: [...document.querySelectorAll('[data-metric]')].map((m) => m.dataset.metric),
                  ph: document.querySelector('[data-metric=phRunoff]')?.innerText.split(String.fromCharCode(10)).pop(), days: document.querySelectorAll('[data-day]').length })""")
                if (wp["hash"] != "#journal/floraison/2026-02-02" or wp["title"] != title or wp["metrics"] != ["dryback", "runoffPct", "ecRunoff", "phRunoff", "vpd"] or not wp["verdict"]
                        or not re.match(r"^4/5 ", wp["ph"] or "") or wp["days"] != 3 or "S5" not in wp["sub"] and "W5" not in wp["sub"]):
                    errors.append(f"{tag} week page {wp}")
                sw = pg.evaluate("document.documentElement.scrollWidth")
                if sw > w: errors.append(f"{tag} week overflow {sw}")
                cut = pg.evaluate(CUT)
                if cut: errors.append(f"{tag} week cut {cut}")
                pg.screenshot(path=str(out / f"semaine-{lang}-{theme}-{w}.png"), full_page=True)
                checks[tag]["week"] = {k: wp[k] for k in ("verdict", "ph", "sub")}
                pg.click("#week-back"); pg.wait_for_selector("[data-week]", timeout=8000); pg.wait_for_timeout(300)
                if pg.evaluate("location.hash") != "#journal": errors.append(f"{tag} back from the week page {pg.evaluate('location.hash')}")
                if lang == "fr" and theme == "dark" and w == 390:
                    # A day of the strip opens the week page on its card; the card opens the entry; back, back.
                    pg.locator("[data-week][data-open] [data-strip] button").nth(4).click(); pg.wait_for_selector("#week-page", timeout=8000); pg.wait_for_timeout(500)
                    checks["stripHash"] = pg.evaluate("location.hash")
                    pg.click("[data-day='2026-02-06']"); pg.wait_for_selector("#e-when", timeout=8000)
                    checks["stripDay"] = when(pg) or pg.input_value("#e-date")
                    pg.go_back(); pg.wait_for_timeout(800); pg.go_back(); pg.wait_for_selector("[data-week]", timeout=8000); pg.wait_for_timeout(400)
                    # The other days of the week page unfold.
                    pg.click("[data-week][data-open] [data-see-week]"); pg.wait_for_selector("#week-more", timeout=8000)
                    pg.click("#week-more"); pg.wait_for_timeout(300)
                    checks["allDays"] = pg.locator("[data-day]").count()
                    pg.click("#week-back"); pg.wait_for_selector("[data-week]", timeout=8000); pg.wait_for_timeout(300)
                    pg.click("[data-week][data-open] [data-quiet]"); pg.wait_for_timeout(300)
                    checks["quietDays"] = pg.locator("[data-quiet-day]").count()
                    # Search in notes, observations, actions.
                    pg.click("#journal-search-btn"); pg.fill("#journal-search", "molles"); pg.wait_for_timeout(500)
                    checks["search"] = pg.inner_text("#journal-results").split("\n")[0]
                    pg.click("#journal-search-btn"); pg.wait_for_timeout(300)
                    # The other cycle: its own weeks.
                    pg.locator("#journal-cycles button").nth(1).click(); pg.wait_for_timeout(800)
                    checks["cycle1"] = [x.inner_text().split("\n")[0] for x in pg.locator("[data-week] > button[aria-expanded] b").all()[:2]]
                    if checks["stripHash"] != "#journal/floraison/2026-02-02/2026-02-06" or checks["allDays"] != 5 or checks["stripDay"] != "2026-02-06" or checks["quietDays"] != 1 or not checks["search"].startswith("1 ") or not all(re.match(r"^(Floraison|Séchage) S", x) for x in checks["cycle1"]): errors.append(f"interactions {checks}")
                ctx.close()
    # « Tous »: one card per week and per space, in the order of the spaces; a year of entries opens fast.
    ctx, pg = open_sim("fr", "dark", 390, "2026-10-19", "all")
    t0 = time.time(); pg.goto(url + "#journal"); pg.wait_for_selector("[data-week]", timeout=15000); dt = time.time() - t0
    heads = [x.inner_text().replace("\n", " ")[:40] for x in pg.locator("[data-week] > button[aria-expanded]").all()[:4]]
    checks["tous"] = {"heads": heads, "seconds": round(dt, 2)}
    if dt > 4 or not heads or not all(re.match(r"^(Floraison|Colonne|Séchage)", h) for h in heads): errors.append(f"tous {checks['tous']}")
    pg.screenshot(path=str(out / "journal-tous.png"), full_page=True)
    ctx.close()
    httpd.shutdown()


with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in LANGS:
        for theme in ["dark", "light"]:
            tag = f"{lang}/{theme}"
            ctx, pg = context(b, lang, theme)
            pg.goto(f"file://{page_file}"); pg.wait_for_timeout(2500)
            pg.click("#tab-plus"); pg.wait_for_selector("#add-menu"); pg.wait_for_timeout(500)
            rows = [x.inner_text().split("\n")[0] for x in pg.locator("#add-menu li button").all()]
            if rows != ADD[lang]: errors.append(f"{tag} menu {rows}")
            cut = pg.evaluate(CUT)
            if cut: errors.append(f"{tag} cut {cut}")
            pg.screenshot(path=str(out / f"plus-{lang}-{theme}.png"))
            opened = {}
            for row, sel in [("entry", "#e-when"), ("quick", "input[id^=q-]"), ("mix", "[data-slot=drawer-content] input"), ("event", "[data-slot=drawer-content] input")]:
                pg.click(f"#add-{row}"); pg.wait_for_timeout(900)
                opened[row] = [pg.locator("#add-menu").count(), pg.locator(sel).count() > 0]
                pg.go_back(); pg.wait_for_timeout(900)
                opened[row].append(pg.locator("[data-slot=drawer-content]").count())
                if row != "event": pg.click("#tab-plus"); pg.wait_for_selector("#add-menu"); pg.wait_for_timeout(400)
            if any(v != [0, True, 0] for v in opened.values()): errors.append(f"{tag} rows open {opened}")
            pg.goto(f"file://{page_file}#journal"); pg.wait_for_timeout(2000)
            big = pg.evaluate("() => [...document.querySelectorAll('main button')].filter((x) => /Saisie rapide|Ajouter un événement|Nouveau bidon|Quick entry|New tank/.test(x.textContent)).length")
            if big: errors.append(f"{tag} big buttons still in the Journal {big}")
            checks[tag] = {"rows": rows, "opened": opened}
            ctx.close()
    # One space: no « Saisie rapide ».
    ctx, pg = context(b, "fr", "dark")
    pg.goto(f"file://{page_file}"); pg.wait_for_timeout(2500)
    pg.evaluate("""() => new Promise((res) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => { const tx = r.result.transaction('docs', 'readwrite'); const s = tx.objectStore('docs'); const q = s.getAllKeys(); q.onsuccess = () => { const sp = q.result.filter((k) => String(k).startsWith('spaces/')); sp.slice(1).forEach((k) => s.delete(k)); tx.oncomplete = () => res(sp) } } })""")
    pg.reload(); pg.wait_for_timeout(2500)
    pg.click("#tab-plus"); pg.wait_for_selector("#add-menu"); pg.wait_for_timeout(400)
    checks["oneSpace"] = [x.inner_text().split("\n")[0] for x in pg.locator("#add-menu li button").all()]
    if checks["oneSpace"] != ["Saisie du jour", "Nouveau bidon", "Événement"]: errors.append(f"one space {checks['oneSpace']}")
    ctx.close()

    if len(sys.argv) > 5:
        weeks_pass(b)
    b.close()

print(json.dumps(checks, ensure_ascii=False, indent=1)[:3000])
print("errors:", errors[:12])
print("OK" if not errors else "FAIL")
sys.exit(0 if not errors else 1)
