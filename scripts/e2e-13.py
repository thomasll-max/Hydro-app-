"""Lot 13 (sources discrètes, À propos) in the browser, preview build (Thomas's grow), FR / EN / DE, light and dark, 390
and 360 px:
- no « Sources : » line left on the tools and the calendar; a small ⓘ beside the title of Arrosage, Nutrition, pH,
  Pulvérisation, Lumière, Climat, Repères and the calendar: a 16 px icon, 44 px to touch;
- the ⓘ opens a small sheet: one source per line (Arrosage: the Handbook, the sensor guide, the formula, the flow), then
  « Toutes les sources → » leads to À propos;
- À propos: version, the sources (Athena with its pages and the trademark line), the technical credits with their
  licences, the warning, privacy (the Claude version: what goes to Claude and when); from Réglages (last line) and the
  gear menu (under « Tous les réglages »); back returns;
- Repères: no « Sources » section, a « Toutes les sources → » link; no Bonorum anywhere outside the ⓘ and À propos;
- nothing wider than the screen, no label cut, no console error.
With the local build and the one-year simulation (8 February 2026): the page of a space has its ⓘ beside « Relevés » (the
targets of the day, the flow) and no « Sources : » line; À propos says the data stay on the phone and nothing goes to
Claude.
Usage: npm run preview:build && PYTHONPATH=scripts python3 scripts/e2e-13.py dist-preview/index.html <out dir> [fr,en,de] [dist-local <sim dir>]"""
import sys, re, json, pathlib, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
LANGS = sys.argv[3].split(",") if len(sys.argv) > 3 else ["fr", "en", "de"]
errors, checks = [], {}

CUT = """() => [...document.querySelectorAll('button, [role=tab], [role=radio], label, h1, h2, h3, a')].filter((el) => {
  const r = el.getBoundingClientRect(); if (!r.width || el.closest('.truncate, [class*=truncate], [class*=line-clamp], [class*=sr-only], .overflow-x-auto, .no-scrollbar')) return false
  return el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible' || r.right > innerWidth + 0.5
}).map((el) => `${el.tagName} «${el.textContent.trim().slice(0, 30)}» ${Math.round(el.getBoundingClientRect().right)}`).slice(0, 8)"""

INFO = """(id) => { const b = document.querySelector('#info-' + id); if (!b) return null; const r = b.getBoundingClientRect(); const i = b.querySelector('svg').getBoundingClientRect()
  return { w: Math.round(r.width), h: Math.round(r.height), icon: Math.round(i.width), label: b.getAttribute('aria-label'), wide: document.documentElement.scrollWidth > innerWidth } }"""

SOURCES_LINE = re.compile(r"\b(Sources?|Quellen?)\s?:")
TOOLS = ["irrigation", "nutrition", "ph", "ipw", "light", "climate", "reperes"]
WORDS = {
    "fr": {"about": "À propos", "mark": "Athena est une marque d'Athena Ag", "all": "Toutes les sources →"},
    "en": {"about": "About", "mark": "Athena is a trademark of Athena Ag", "all": "All sources →"},
    "de": {"about": "Über Hydro", "mark": "Athena ist eine Marke von Athena Ag", "all": "Alle Quellen →"},
}

with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in LANGS:
        for theme in ["dark", "light"]:
            for w in [390, 360]:
                tag = f"{lang}/{theme}/{w}"
                first = theme == "dark" and w == 390
                ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme)
                ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
                serve_fonts(ctx)
                pg = ctx.new_page()
                pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
                pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))
                pg.goto(f"file://{page_file}#tools"); pg.wait_for_timeout(2500)

                # Each tool with sources: the ⓘ beside the title, no « Sources : » line, nothing cut.
                for tool in TOOLS + ["calendar"]:
                    pg.evaluate(f"location.hash = '{'#calendar' if tool == 'calendar' else '#tools/' + tool}'"); pg.wait_for_timeout(700)
                    i = pg.evaluate(INFO, tool)
                    text = pg.locator("main").inner_text()
                    cut = pg.evaluate(CUT)
                    if not i or i["w"] < 44 or i["h"] < 44 or i["icon"] != 16 or not i["label"] or i["wide"]: errors.append(f"{tag} {tool} info {i}")
                    if SOURCES_LINE.search(text): errors.append(f"{tag} {tool} sources line {SOURCES_LINE.search(text).group(0)}")
                    if "Bonorum" in text or re.search(r"facteur 10|factor of 10|Faktor 10", text): errors.append(f"{tag} {tool} Bonorum on screen")
                    if cut: errors.append(f"{tag} {tool} cut {cut}")
                    if tool == "reperes":
                        if pg.locator("#reperes-sources").inner_text() != WORDS[lang]["all"]: errors.append(f"{tag} reperes link")
                        if pg.locator("[data-state] >> text=/^(Sources|Quellen)$/").count(): errors.append(f"{tag} reperes sources section")

                # The sheet of the ⓘ (Arrosage), then « Toutes les sources → ».
                pg.evaluate("location.hash = '#tools/irrigation'"); pg.wait_for_timeout(700)
                pg.click("#info-irrigation"); pg.wait_for_selector("#info-irrigation-lines"); pg.wait_for_timeout(500)
                lines = pg.locator("#info-irrigation-lines li").all_inner_texts()
                if len(lines) != 4 or "Bonorum" not in lines[1] or "Athena" not in lines[0]: errors.append(f"{tag} info lines {lines}")
                if first or (w == 360 and theme == "light"): pg.screenshot(path=str(out / f"info-{lang}-{theme}-{w}.png"))
                checks.setdefault("lines", {})[lang] = lines
                pg.click("#info-all"); pg.wait_for_timeout(1200)
                if pg.evaluate("location.hash") != "#tools/about" or not pg.locator("#about").count() or pg.locator("[role=dialog]").count(): errors.append(f"{tag} info-all → {pg.evaluate('location.hash')}")

                # À propos.
                a = pg.evaluate("""() => ({ h1: document.querySelector('main h1')?.textContent, version: document.querySelector('#about-version')?.innerText,
                  sections: [...document.querySelectorAll('#about-sources section')].map((s) => s.id),
                  fonts: document.querySelector('[data-credits=font]')?.textContent, libs: document.querySelector('[data-credits=lib]')?.textContent,
                  privacy: document.querySelectorAll('#about-privacy li').length, text: document.querySelector('#about').innerText,
                  wide: document.documentElement.scrollWidth > innerWidth })""")
                want = ["about-athena", "about-sensor", "about-makers", "about-formulas", "about-common", "about-spec", "about-estimates", "about-yours"]
                if a["h1"] != WORDS[lang]["about"] or a["sections"] != want or "Geologica (SIL Open Font License 1.1)" not in (a["fonts"] or "") or "React (MIT)" not in (a["libs"] or "") or a["privacy"] != 6 or WORDS[lang]["mark"] not in a["text"] or a["wide"]: errors.append(f"{tag} about {dict(a, text=a['text'][:80])}")
                if "p. 37" not in a["text"] and "S. 37" not in a["text"]: errors.append(f"{tag} about pages")
                cut = pg.evaluate(CUT)
                if cut: errors.append(f"{tag} about cut {cut}")
                if first or (w == 360 and theme == "light"): pg.screenshot(path=str(out / f"about-{lang}-{theme}-{w}.png"), full_page=True)
                pg.go_back(); pg.wait_for_timeout(800)
                if pg.evaluate("location.hash") != "#tools/irrigation": errors.append(f"{tag} back from about → {pg.evaluate('location.hash')}")

                # From Réglages (last line) and from the gear menu (under « Tous les réglages »).
                pg.evaluate("location.hash = '#tools/settings'"); pg.wait_for_timeout(900)
                last = pg.evaluate("() => { const b = document.querySelector('#settings-about'); const cards = [...document.querySelectorAll('main [data-slot=card]')]; return { ok: !!b, last: cards.at(-1)?.contains(b) ?? false, h: b ? Math.round(b.getBoundingClientRect().height) : 0 } }")
                if not last["ok"] or not last["last"] or last["h"] < 44: errors.append(f"{tag} settings row {last}")
                pg.click("#settings-about"); pg.wait_for_timeout(900)
                if pg.evaluate("location.hash") != "#tools/about": errors.append(f"{tag} settings → about")
                # The gear menu from the list of tools, freshly opened: back returns to the list.
                pg.close(); pg = ctx.new_page()
                pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
                pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))
                pg.goto(f"file://{page_file}#tools"); pg.wait_for_timeout(2000)
                pg.click("#display-menu"); pg.wait_for_timeout(500)
                order = pg.evaluate("() => [...document.querySelectorAll('#all-settings, #menu-about, #menu-start')].map((x) => x.id)")
                if order != ["all-settings", "menu-about", "menu-start"]: errors.append(f"{tag} gear order {order}")
                if first: pg.screenshot(path=str(out / f"gear-{lang}.png"))
                pg.click("#menu-about"); pg.wait_for_timeout(900)
                if pg.evaluate("location.hash") != "#tools/about": errors.append(f"{tag} gear → about")
                pg.go_back(); pg.wait_for_timeout(700)
                if pg.evaluate("location.hash") != "#tools": errors.append(f"{tag} back from gear about → {pg.evaluate('location.hash')}")
                ctx.close()

    # The local build (installed version), with the simulation.
    if len(sys.argv) > 5:
        site = pathlib.Path(sys.argv[4]).resolve(); sim = pathlib.Path(sys.argv[5])
        LOAD = re.search(r'LOAD = """(.*?)"""', pathlib.Path("scripts/sim/browse.py").read_text(), re.S).group(1)

        class Quiet(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *a): pass

        http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
        socketserver.TCPServer.allow_reuse_address = True
        httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(site)))
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        url = f"http://127.0.0.1:{httpd.server_address[1]}/"
        PHONE = {"fr": "sur ce téléphone", "en": "on this phone", "de": "auf diesem Telefon"}
        for lang in LANGS:
            for theme, w in [("light", 390), ("dark", 360)]:
                tag = f"local/{lang}/{theme}/{w}"
                day = "2026-02-08"
                backup = json.loads((sim / "checkpoints" / f"{day}.json").read_text())
                backup["collections"]["settings"]["main"].update({"lang": lang, "theme": theme, "space": "floraison"})
                ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme, timezone_id="Europe/Oslo", locale="fr-FR", service_workers="block", reduced_motion="reduce")
                ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
                serve_fonts(ctx)
                pg = ctx.new_page()
                pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
                pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))
                pg.clock.install(time=f"{day}T09:30:00+01:00"); pg.clock.resume()
                pg.goto(url); pg.wait_for_timeout(1500); pg.evaluate(LOAD, backup); pg.reload(); pg.wait_for_timeout(2500)
                pg.wait_for_selector("#space-page", timeout=15000); pg.wait_for_timeout(600)
                i = pg.evaluate(INFO, "space")
                text = pg.locator("main").inner_text()
                if not i or i["w"] < 44 or i["icon"] != 16 or i["wide"]: errors.append(f"{tag} space info {i}")
                if SOURCES_LINE.search(text) or pg.locator("#space-sources").count(): errors.append(f"{tag} space sources line")
                pg.evaluate("document.querySelector('#readings').scrollIntoView({block: 'center'})")
                pg.click("#info-space"); pg.wait_for_selector("#info-space-lines"); pg.wait_for_timeout(500)
                lines = pg.locator("#info-space-lines li").all_inner_texts()
                if len(lines) < 2 or not any("Athena" in x for x in lines) or not any(re.search(r"L/min|débit|flow|Durchfluss", x, re.I) for x in lines): errors.append(f"{tag} space lines {lines}")
                checks.setdefault("space", {})[f"{lang}/{theme}"] = lines
                pg.screenshot(path=str(out / f"space-info-{lang}-{theme}-{w}.png"))
                pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
                pg.evaluate("location.hash = '#tools/about'"); pg.wait_for_timeout(1200)
                priv = pg.locator("#about-privacy li").all_inner_texts()
                ver = pg.locator("#about-version").inner_text()
                if len(priv) != 5 or PHONE[lang] not in " ".join(priv) or "claude.ai" in " ".join(priv) or "Google" in " ".join(priv): errors.append(f"{tag} local privacy {priv}")
                if "claude.ai" in ver: errors.append(f"{tag} local version {ver}")
                if theme == "light": pg.screenshot(path=str(out / f"about-local-{lang}.png"), full_page=True)
                ctx.close()
        httpd.shutdown()
    b.close()

print(checks)
print("errors:", errors[:40])
print("FAIL" if errors else "OK")
