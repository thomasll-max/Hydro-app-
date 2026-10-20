"""Lot 10l2 (saisie du jour « calme ») in the browser, local build with the one-year simulation at 8 February, 08:30,
Floraison, FR / EN / DE, light and dark, 390 and 360 px, as on the planche « Les menus »:
10l2a — the header « Saisie · Floraison » and one line « dim. 8 févr. · 08:30 modifier · tout l'espace ▾ » (date and
time, space and plant behind them), « ⋯ » with « Enregistrer et ajouter un rappel » (and « Supprimer cette saisie » on
an existing entry); the band of results stuck under the header, announced, computed while typing (« — » until a value
is there, « plante » in target); « Reprendre hier » takes all the faint values, touching one faint value takes it alone;
the fields in order (Arrosage with the dryback target, Runoff with the pH target, Climat in 3 columns, the folded line
« Plante, réservoir, réglages »); one filled button « Enregistrer »; nothing saved that was not typed or taken; 200 %.
Usage: npm run build:local && npx -y tsx scripts/sim/build.ts <sim dir> && PYTHONPATH=scripts python3 scripts/e2e-10l2.py dist-local <sim dir> <out dir> [fr,en,de]"""
import sys, json, pathlib, threading, http.server, functools, socketserver, re
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

site = pathlib.Path(sys.argv[1]).resolve(); sim = pathlib.Path(sys.argv[2])
out = pathlib.Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
LANGS = sys.argv[4].split(",") if len(sys.argv) > 4 else ["fr", "en", "de"]
errors, checks = [], {}
LOAD = re.search(r'LOAD = """(.*?)"""', pathlib.Path("scripts/sim/browse.py").read_text(), re.S).group(1)

SHEET = """() => {
  const d = document.querySelector('[data-slot=drawer-content]')
  const band = document.querySelector('#e-band')
  return {
    title: d.querySelector('h2').textContent, head: document.querySelector('#e-head').innerText.replace(/\\s+/g, ' ').trim(),
    band: [...d.querySelectorAll('#e-band [data-band]')].map((b) => [b.dataset.band, b.querySelector('b').textContent, b.dataset.status || '']),
    live: band?.getAttribute('aria-live'), sticky: band && getComputedStyle(band).position,
    resume: !!document.querySelector('#e-resume'),
    sections: [...d.querySelectorAll('section[id^=e-sec-]')].map((s) => s.id), more: !!document.querySelector('#e-more'),
    asides: [...d.querySelectorAll('section[id^=e-sec-] h3 + span')].map((s) => s.textContent),
    ghosts: Object.fromEntries([...d.querySelectorAll('input[data-ghost]')].map((i) => [i.id, i.placeholder])),
    hints: [...d.querySelectorAll('#e-sec-water span.font-num')].map((s) => s.textContent),
    footer: [...d.querySelectorAll('[data-slot=drawer-footer] button')].map((b) => b.textContent),
    hidden: ['#e-date', '#e-time'].map((s) => !!document.querySelector(s)),
    sw: d.scrollWidth, cw: d.clientWidth,
  }
}"""
SAVED = """(id) => new Promise((res) => { const r = indexedDB.open('hydro'); r.onsuccess = () => { const g = r.result.transaction('docs').objectStore('docs').get('entries/' + id); g.onsuccess = () => res(g.result ?? null) } })"""

EXP = {
    "fr": dict(title="Saisie · Floraison", head="dim. 8 févr. · 08:30 modifier · tout l'espace ▾", asides=["cible dryback 25–50 %", "cible pH 5,8–6,2"], save="Enregistrer", remind="Enregistrer et ajouter un rappel", ghost="8,17", hint="hier 8,17", resume="Reprendre hier"),
    "en": dict(title="Entry · Floraison", head="Sun, Feb 8 · 08:30 change · whole space ▾", asides=["dryback target 25–50 %", "pH target 5.8–6.2"], save="Save", remind="Save and add a reminder", ghost="8.17", hint="yesterday 8.17", resume="Take yesterday's values"),
    "de": dict(title="Eintrag · Floraison", head="So., 8. Feb. · 08:30 ändern · ganzer Bereich ▾", asides=["Ziel Dryback 25–50 %", "Ziel pH 5,8–6,2"], save="Speichern", remind="Speichern und Erinnerung hinzufügen", ghost="8,17", hint="gestern 8,17", resume="Gestern übernehmen"),
}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(site)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{httpd.server_address[1]}/"


def open_entry(b, lang, theme, w, zoom=1, day="2026-02-08"):
    backup = json.loads((sim / "checkpoints" / f"{day}.json").read_text())
    backup["collections"]["settings"]["main"].update({"lang": lang, "theme": theme, "space": "floraison"})
    ctx = b.new_context(viewport={"width": int(w / zoom), "height": int(844 / zoom)}, device_scale_factor=2 * zoom, color_scheme=theme, timezone_id="Europe/Oslo", locale="fr-FR", service_workers="block", reduced_motion="reduce")
    ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))
    pg.clock.install(time=f"{day}T08:30:00+01:00"); pg.clock.resume()
    pg.goto(url); pg.wait_for_timeout(1500); pg.evaluate(LOAD, backup); pg.reload(); pg.wait_for_timeout(2500)
    pg.click("#tab-plus"); pg.wait_for_timeout(500); pg.click("#add-entry"); pg.wait_for_selector("#e-when"); pg.wait_for_timeout(700)
    return ctx, pg


def band(pg):
    return pg.evaluate("() => [...document.querySelectorAll('#e-band [data-band]')].map((b) => [b.dataset.band, b.querySelector('b').textContent.replace(/\\u202f/g, ' '), b.dataset.status || ''])")


with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in LANGS:
        e = EXP[lang]
        for theme in ["dark", "light"]:
            for w in [390, 360]:
                tag = f"{lang}/{theme}/{w}"
                ctx, pg = open_entry(b, lang, theme, w)
                c = pg.evaluate(SHEET)
                ok = (c["title"] == e["title"] and c["head"] == e["head"] and [x[0] for x in c["band"]] == ["dryback", "runoffPct", "vpd", "dli"]
                      and [x[1] for x in c["band"][:3]] == ["—", "—", "—"] and c["live"] == "polite" and c["sticky"] == "sticky" and c["resume"]
                      and c["sections"] == ["e-sec-water", "e-sec-runoff", "e-sec-climate"] and c["more"] and c["asides"] == e["asides"]
                      and c["ghosts"].get("e-weightMorningKg") == e["ghost"] and e["hint"] in c["hints"] and c["footer"] == [e["save"]] and c["hidden"] == [False, False] and c["sw"] <= c["cw"])
                if not ok: errors.append(f"{tag} {json.dumps(c, ensure_ascii=False)[:1200]}")
                pg.screenshot(path=str(out / f"saisie-{lang}-{theme}-{w}.png"))
                checks[tag] = {k: c[k] for k in ("title", "head", "band")}
                if theme == "dark" and w == 390:
                    # Typing: the band computes at once; touching one faint value takes it alone (selected).
                    pg.fill("#e-weightMorningKg", e["ghost"]); pg.fill("#e-weightPeakKg", "13" + ("." if lang == "en" else ",") + "11"); pg.wait_for_timeout(300)
                    after = band(pg)
                    pg.click("#e-runoffMl"); pg.wait_for_timeout(300)
                    taken = [pg.input_value("#e-runoffMl"), pg.evaluate("() => [document.activeElement.selectionStart, document.activeElement.selectionEnd]"), pg.input_value("#e-tempDay")]
                    runoff = band(pg)
                    if after[0][1] != "38 %" or after[0][2] != "ok" or taken[0] != "382" or taken[1] != [0, 3] or taken[2] != "" or runoff[1][1] == "—": errors.append(f"{tag} live {after} {taken} {runoff}")
                    # « Reprendre hier » takes the others on screen; then « ⋯ ».
                    pg.click("#e-resume"); pg.wait_for_timeout(400)
                    resumed = [pg.input_value("#e-tempDay"), pg.input_value("#e-rh"), pg.locator("#e-resume").count()]
                    if not resumed[0] or not resumed[1] or resumed[2]: errors.append(f"{tag} resume {resumed}")
                    pg.locator("[data-slot=drawer-content] .overflow-y-auto").evaluate("(el) => el.scrollTop = 600"); pg.wait_for_timeout(300)
                    pg.screenshot(path=str(out / f"saisie-defile-{lang}-{theme}.png"))
                    stuck = pg.evaluate("() => { const b = document.querySelector('#e-band').getBoundingClientRect(); const h = document.querySelector('[data-slot=drawer-content] .overflow-y-auto').getBoundingClientRect(); return Math.round(b.top - h.top) }")
                    if stuck != 0: errors.append(f"{tag} band not stuck {stuck}")
                    pg.click("#e-menu"); pg.wait_for_timeout(300)
                    menu = [x.inner_text() for x in pg.locator("[role=menu] [role=menuitem]").all()]
                    if menu != [e["remind"]]: errors.append(f"{tag} menu {menu}")
                    pg.screenshot(path=str(out / f"saisie-menu-{lang}-{theme}.png"))
                    pg.click("#e-menu"); pg.wait_for_timeout(200)
                    pg.click("#e-when"); pg.wait_for_timeout(300)
                    pg.click("#e-scope"); pg.wait_for_timeout(300)
                    panels = [pg.locator("#e-date").count(), pg.locator("#e-time").count(), pg.locator("#e-scope-panel [role=radiogroup]").count()]
                    if panels[0] != 1 or panels[1] != 1 or panels[2] < 1: errors.append(f"{tag} panels {panels}")
                    checks[tag]["live"] = [after, taken, resumed, menu, panels]
                ctx.close()

    # Nothing saved that was not typed or taken: close untouched → no entry; take one faint value → only that one saved.
    ctx, pg = open_entry(b, "fr", "light", 390)
    pg.get_by_role("button", name="Fermer").first.click(); pg.wait_for_timeout(800)
    none = pg.evaluate(SAVED, "2026-02-08_floraison")
    pg.click("#tab-plus"); pg.wait_for_timeout(500); pg.click("#add-entry"); pg.wait_for_selector("#e-when"); pg.wait_for_timeout(700)
    pg.click("#e-tempDay"); pg.wait_for_timeout(200)
    pg.click("#e-save"); pg.wait_for_timeout(1200)
    one = pg.evaluate(SAVED, "2026-02-08_floraison")
    hinted = ["tempDay", "tempNight", "rh", "weightMorningKg", "weightPeakKg", "runoffMl", "ecRunoff", "phRunoff", "heightCm", "reservoirL"]
    kept = {k: one.get(k) for k in hinted if one and one.get(k) is not None}
    if none is not None or kept != {"tempDay": 25.4}: errors.append(f"saved {none} → {kept}")
    checks["saved"] = kept
    # The saved entry: « ⋯ » offers « Supprimer cette saisie ».
    pg.click("#tab-plus"); pg.wait_for_timeout(500); pg.click("#add-entry"); pg.wait_for_selector("#e-when"); pg.wait_for_timeout(700)
    pg.click("#e-menu"); pg.wait_for_timeout(300)
    menu = [x.inner_text() for x in pg.locator("[role=menu] [role=menuitem]").all()]
    if menu != ["Enregistrer et ajouter un rappel", "Supprimer cette saisie"]: errors.append(f"existing menu {menu}")
    pg.click("#e-delete"); pg.wait_for_timeout(500)
    asked = pg.locator("[role=alertdialog]").count()
    pg.locator("[role=alertdialog] button").last.click(); pg.wait_for_timeout(1000)
    gone = pg.evaluate(SAVED, "2026-02-08_floraison")
    if not asked or gone is not None: errors.append(f"delete {asked} {gone}")
    ctx.close()

    # 200 %: 195 px wide, nothing wider than the sheet.
    for lang in LANGS:
        ctx, pg = open_entry(b, lang, "light", 390, zoom=2)
        c = pg.evaluate("""() => { const d = document.querySelector('[data-slot=drawer-content]'); return [...d.querySelectorAll('*')].filter((el) => el.getBoundingClientRect().right > innerWidth + 1 && !el.closest('.truncate, [class*=sr-only]')).map((el) => el.tagName + '.' + String(el.className).slice(0, 30)).slice(0, 6) }""")
        if c: errors.append(f"zoom 200 % {lang} {c}")
        if lang == "de": pg.screenshot(path=str(out / "saisie-zoom200-de.png"))
        ctx.close()
    b.close()
httpd.shutdown()

print(json.dumps(checks, ensure_ascii=False, indent=1))
print("errors:", errors[:12])
print("OK" if not errors else "FAIL")
sys.exit(0 if not errors else 1)
