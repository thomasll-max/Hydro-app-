"""Lot 10k1 (Aujourd'hui « calme ») in the browser, local build with the one-year simulation at 8 February (3 spaces:
Floraison, Colonne, Séchage), FR / EN / DE, light and dark, 390 and 360 px:
- order: Premiers pas banner (thin, closable, progress bar « plante »), « Bonjour Thomas. », « Maintenant », À faire,
  Espaces; about 36 px between the sections; no week strip, no summary in lines, no cards with 4 readings;
- « Maintenant » is the only framed block (radius 18) and holds the only filled button; the space concerned is named;
- 3D drawings only in the banner, « Maintenant » and the tinted squares of the spaces;
- À faire: 3 lines at most, « + Rappel », « Tout le calendrier → »;
- one line per space (≥ 64 px): 40 px tinted square, name, stage, one state, chevron; tapping it opens the space;
- nothing wider than the screen, no label cut; captures of « Tous » and of a space.
Then (FR): an alert of the day (EC runoff far above its recorded target) comes first with « Ouvrir Floraison », the line
says « à corriger »; no entry for a week: « saisie il y a 7 j »; before the lights are on: no entry asked; a grow with one
space: no tabs on « Tous », its line opens the space and the tabs come back; × closes the banner for good.
Usage: npm run build:local && PYTHONPATH=scripts python3 scripts/e2e-10k1.py dist-local <sim dir> <out dir> [fr,en,de]"""
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

CALM = """() => {
  const q = (s) => document.querySelector(s)
  const top = (s) => { const el = q(s); return el ? Math.round(el.getBoundingClientRect().top + scrollY) : null }
  const bottom = (s) => { const el = q(s); return el ? Math.round(el.getBoundingClientRect().bottom + scrollY) : null }
  const cs = (el) => getComputedStyle(el)
  const main = q('main'), now = q('#now'), cta = now?.querySelector('button')
  const filled = cta ? [...document.querySelectorAll('main button, main a')].filter((b) => cs(b).backgroundColor === cs(cta).backgroundColor).length : 0
  const framed = [...main.querySelectorAll('*')].filter((el) => cs(el).borderTopWidth === '1px' && cs(el).borderLeftWidth === '1px' && parseFloat(cs(el).borderTopLeftRadius) >= 14 && el.getBoundingClientRect().height > 120)
  const lines = [...document.querySelectorAll('[data-space-line]')]
  const start = q('#start-card'), bar = start?.querySelector('[role=progressbar] > span')
  return {
    order: { start: top('#start-card'), hello: top('#hello'), now: top('#now'), upcoming: top('#upcoming'), spaces: top('#spaces') },
    gaps: [top('#upcoming') - bottom('#now'), top('#spaces') - bottom('#upcoming')],
    hello: q('#hello')?.textContent, helloFont: q('#hello') && cs(q('#hello')).fontFamily.split(',')[0],
    now: { kind: now?.dataset.kind, status: now?.dataset.status, text: now?.innerText.split('\\n').filter(Boolean), radius: now && cs(now).borderRadius, filled, cta: cta?.textContent },
    framed: framed.map((el) => el.id || el.tagName),
    stray: [...main.querySelectorAll('img')].filter((i) => !i.closest('#start-card, #now, [data-space-tile]')).length,
    altless: [...main.querySelectorAll('img')].filter((i) => i.getAttribute('alt') !== '').length,
    todo: [...document.querySelectorAll('#upcoming li')].map((li) => li.innerText.replace(/\\n/g, ' | ')),
    allCal: !!q('#all-calendar'), addReminder: !!q('#upcoming h2')?.parentElement.querySelector('button'),
    lines: lines.map((l) => { const t = l.querySelector('[data-space-tile]'); return { h: Math.round(l.getBoundingClientRect().height), tile: t && Math.round(t.getBoundingClientRect().width), state: l.dataset.state, text: l.innerText.replace(/\\n/g, ' | '), chevron: !!l.querySelector('svg') } }),
    start: start && { h: Math.round(start.getBoundingClientRect().height), text: start.innerText.replace(/\\n/g, ' | '), bar: bar && cs(bar).backgroundColor, leaf: cs(document.documentElement).getPropertyValue('--leaf').trim() },
    old: { week: !!q('#week-strip'), bonjour: !!q('#bonjour'), cards: document.querySelectorAll('[data-space-card]').length, backupLine: !!q('#backup-line') },
  }
}"""

NAMES = {"fr": ("Tous", "Bonjour Thomas."), "en": ("All", "Good morning Thomas."), "de": ("Alle", "Guten Morgen, Thomas.")}


def rgb(hex_):
    h = hex_.lstrip("#")
    return f"rgb({int(h[0:2], 16)}, {int(h[2:4], 16)}, {int(h[4:6], 16)})"


def open_page(b, lang, theme, w, bk, hm="09:30"):
    ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme, timezone_id="Europe/Oslo", locale="fr-FR", service_workers="block")
    ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))
    pg.clock.install(time=f"{DAY}T{hm}:00+01:00"); pg.clock.resume()
    # The simulation's settings carry its language and theme: those of this pass instead.
    bk = json.loads(json.dumps(bk)); bk["collections"]["settings"]["main"].update({"lang": lang, "theme": theme, "space": "all"})
    pg.goto(url); pg.wait_for_timeout(1500); pg.evaluate(LOAD, bk); pg.reload(); pg.wait_for_timeout(3000)
    return ctx, pg


def check_calm(pg, tag, lang, w, kind="entry"):
    c = pg.evaluate(CALM)
    o = c["order"]
    if not (o["start"] is not None and o["start"] < o["hello"] < o["now"] < o["upcoming"] < o["spaces"]): errors.append(f"{tag} order {o}")
    if any(not 30 <= g <= 40 for g in c["gaps"]): errors.append(f"{tag} gaps between sections {c['gaps']}")
    if c["hello"] != NAMES[lang][1] or "Geologica" not in (c["helloFont"] or ""): errors.append(f"{tag} hello {c['hello']} {c['helloFont']}")
    n = c["now"]
    if n["kind"] != kind or n["radius"] != "18px" or (n["cta"] and n["filled"] != 1): errors.append(f"{tag} now {n}")
    if kind in ("entry", "alert") and not any("Floraison" in x for x in n["text"]): errors.append(f"{tag} now without its space {n['text']}")
    if c["framed"] != ["now"]: errors.append(f"{tag} framed blocks {c['framed']}")
    if c["stray"] or c["altless"]: errors.append(f"{tag} drawings outside the banner / Maintenant / squares {c['stray']} {c['altless']}")
    if len(c["todo"]) > 3 or not c["allCal"] or not c["addReminder"]: errors.append(f"{tag} todo {c['todo']}")
    if len(c["lines"]) != 3 or any(l["h"] < 64 or l["tile"] != 40 or not l["state"] or not l["chevron"] for l in c["lines"]): errors.append(f"{tag} lines {c['lines']}")
    st = c["start"]
    if not st or st["h"] > 90 or st["bar"] != rgb(st["leaf"]): errors.append(f"{tag} banner {st}")
    if any(c["old"].values()): errors.append(f"{tag} old pieces {c['old']}")
    sw = pg.evaluate("document.documentElement.scrollWidth")
    if sw > w: errors.append(f"{tag} overflow {sw}")
    cut = pg.evaluate(CUT)
    if cut: errors.append(f"{tag} cut {cut}")
    return c


with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in LANGS:
        for theme in ["dark", "light"]:
            for w in [390, 360]:
                tag = f"{lang}/{theme}/{w}"
                ctx, pg = open_page(b, lang, theme, w, backup)
                c = check_calm(pg, tag, lang, w)
                pg.screenshot(path=str(out / f"tous-{lang}-{theme}-{w}.png"), full_page=True)
                checks[tag] = {"now": c["now"]["text"], "todo": c["todo"], "lines": [l["text"] for l in c["lines"]], "start": c["start"]["text"]}
                # A line opens its space (the page of the space is redone in lot 10l).
                pg.click("[data-space-line=floraison]"); pg.wait_for_timeout(1500)
                sp = pg.evaluate("""() => ({ pressed: document.querySelector('[role=group] [aria-pressed=true]')?.textContent.trim(), readings: !!document.querySelector('#readings'), bonjour: !!document.querySelector('#bonjour, #hello'), titleDrawings: [...document.querySelectorAll('main h2')].filter((h) => h.parentElement.querySelector(':scope > img')).length })""")
                if sp["pressed"] != "Floraison" or not sp["readings"] or sp["bonjour"] or sp["titleDrawings"]: errors.append(f"{tag} space view {sp}")
                sw = pg.evaluate("document.documentElement.scrollWidth")
                if sw > w: errors.append(f"{tag} space overflow {sw}")
                cut = pg.evaluate(CUT)
                if cut: errors.append(f"{tag} space cut {cut}")
                pg.screenshot(path=str(out / f"espace-{lang}-{theme}-{w}.png"), full_page=True)
                ctx.close()

    # An alert of the day: the last entry of Floraison has its EC runoff far above the target it recorded.
    bk = json.loads(json.dumps(backup))
    bk["collections"]["entries"]["2026-02-07_floraison"]["ecRunoff"] = 8.5
    for theme in ["dark", "light"]:
        ctx, pg = open_page(b, "fr", theme, 390, bk)
        c = check_calm(pg, f"alert/{theme}", "fr", 390, "alert")
        flo = next(l for l in c["lines"] if l["text"].startswith("Floraison"))
        checks[f"alert-{theme}"] = {"now": c["now"], "line": flo}
        if c["now"]["status"] != "bad" or c["now"]["cta"] != "Ouvrir Floraison" or "EC du runoff trop haute" not in c["now"]["text"] or flo["state"] != "off" or "à corriger" not in flo["text"]: errors.append(f"alert {theme} {c['now']} {flo}")
        pg.screenshot(path=str(out / f"alerte-{theme}.png"), full_page=True)
        pg.get_by_role("button", name="Ouvrir Floraison").click(); pg.wait_for_timeout(1200)
        if pg.evaluate("document.querySelector('[role=group] [aria-pressed=true]')?.textContent.trim()") != "Floraison": errors.append(f"alert {theme}: the button does not open Floraison")
        ctx.close()

    # No entry in Floraison for a week: « saisie il y a 7 j », the entry of the day asked with the last date.
    bk = json.loads(json.dumps(backup))
    bk["collections"]["entries"] = {k: v for k, v in bk["collections"]["entries"].items() if not (v["spaceId"] == "floraison" and v["date"] >= "2026-02-01")}
    ctx, pg = open_page(b, "fr", "dark", 390, bk)
    c = check_calm(pg, "late", "fr", 390)
    flo = next(l for l in c["lines"] if l["text"].startswith("Floraison"))
    checks["late"] = {"now": c["now"]["text"], "line": flo}
    if flo["state"] != "late" or "saisie il y a 8 j" not in flo["text"] or not any("31/01" in x for x in c["now"]["text"]): errors.append(f"late {c['now']['text']} {flo}")
    pg.screenshot(path=str(out / "retard.png"), full_page=True)
    ctx.close()

    # Before the lights are on (06:00 in the simulation): no entry asked yet.
    ctx, pg = open_page(b, "fr", "dark", 390, backup, "05:00")
    c = check_calm(pg, "early", "fr", 390, "ok")
    checks["early"] = c["now"]["text"]
    if not any("Ensuite" in x for x in c["now"]["text"]): errors.append(f"early: no « Ensuite » {c['now']['text']}")
    # × closes the banner, and it stays closed.
    pg.get_by_role("button", name="Masquer").click(); pg.wait_for_timeout(400); pg.reload(); pg.wait_for_timeout(2500)
    if pg.locator("#start-card").count(): errors.append("banner back after ×")
    ctx.close()

    # « Y aller » opens the next step (here the backup: Outils → Sauvegarde).
    ctx, pg = open_page(b, "fr", "dark", 390, backup)
    pg.locator("#start-card").get_by_role("button", name="Y aller").click(); pg.wait_for_timeout(1200)
    checks["go"] = pg.evaluate("location.hash")
    if checks["go"] != "#tools/data": errors.append(f"Y aller → {checks['go']}")
    ctx.close()

    # One space: no tabs on « Tous »; its line opens it and the tabs come back to return.
    bk = json.loads(json.dumps(backup))
    c_ = bk["collections"]
    c_["spaces"] = {k: v for k, v in c_["spaces"].items() if k == "floraison"}
    c_["cycles"] = {k: v for k, v in c_["cycles"].items() if v.get("spaceId") == "floraison"}
    c_["entries"] = {k: v for k, v in c_["entries"].items() if v["spaceId"] == "floraison"}
    ctx, pg = open_page(b, "fr", "light", 390, bk)
    one = [pg.locator("[role=group] [aria-pressed]").count(), pg.locator("[data-space-line]").count()]
    pg.click("[data-space-line=floraison]"); pg.wait_for_timeout(1500)
    one.append(pg.locator("[role=group] [aria-pressed]").count())
    pg.locator("[role=group]").first.get_by_role("button", name="Tous").click(); pg.wait_for_timeout(1200)
    one.append(pg.locator("#now").count())
    checks["one"] = one
    if one != [0, 1, 2, 1]: errors.append(f"one space {one}")
    pg.screenshot(path=str(out / "un-espace.png"), full_page=True)
    ctx.close()
    b.close()
httpd.shutdown()

print(json.dumps(checks, ensure_ascii=False, indent=1)[:4000])
print("errors:", errors[:12])
print("OK" if not errors else "FAIL")
sys.exit(0 if not errors else 1)
