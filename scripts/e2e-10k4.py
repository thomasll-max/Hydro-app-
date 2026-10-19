"""Lot 10k4 (Graphiques « calmes ») in the browser, local build with the one-year simulation at 8 February (Floraison),
FR / EN / DE, light and dark, 390 and 360 px:
- ready views in text tabs (Arrosage, Solution, Climat, Lumière, Plante), a view without data hidden (Séchage);
- the period on one line with « Comparer… »; « 7 j » starts the axis 6 days back;
- one chart per curve: name, target and unit on the left, the last value big on the right (38 %, 11 %, 4,0 as on the
  planche), straight segments, the missing 02/02 linked with a dotted segment, points out of target, tanks as dotted
  vertical lines, no recharts left in these charts; touching a day shows its date and values, touching again lets go;
- the legend on one line, « Choisir mes courbes » at the bottom: the full list in a sheet, the choice becomes « Perso »
  and stays after a reload; old preferences (17 pills, « Superposées ») become « Perso » overlaid;
- « Comparer… »: a sheet with the spaces, up to 4.
Usage: npm run build:local && npx -y tsx scripts/sim/build.ts <sim dir> && PYTHONPATH=scripts python3 scripts/e2e-10k4.py dist-local <sim dir> <out dir> [fr,en,de]"""
import sys, json, pathlib, threading, http.server, functools, socketserver, re
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

site = pathlib.Path(sys.argv[1]).resolve(); sim = pathlib.Path(sys.argv[2])
out = pathlib.Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
LANGS = sys.argv[4].split(",") if len(sys.argv) > 4 else ["fr", "en", "de"]
errors, checks = [], {}
LOAD = re.search(r'LOAD = """(.*?)"""', pathlib.Path("scripts/sim/browse.py").read_text(), re.S).group(1)

CUT = """() => [...document.querySelectorAll('button, [role=tab], [role=radio], label, h1, h2, h3, a')].filter((el) => {
  const r = el.getBoundingClientRect(); if (!r.width || el.closest('.truncate, [class*=truncate], [class*=line-clamp], [class*=sr-only], .overflow-x-auto, .no-scrollbar')) return false
  return el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible' || r.right > innerWidth + 0.5
}).map((el) => `${el.tagName} «${el.textContent.trim().slice(0, 30)}» ${Math.round(el.getBoundingClientRect().right)}`).slice(0, 8)"""

SCREEN = """() => ({
  views: [...document.querySelectorAll('#ch-views [data-view]')].map((b) => b.dataset.view + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')),
  period: [...document.querySelectorAll('#ch-period button')].map((b) => b.textContent),
  charts: [...document.querySelectorAll('[data-curve]')].map((c) => ({ curve: c.dataset.curve, name: c.querySelector('header b').textContent, sub: c.querySelector('header b + span').textContent,
    last: c.querySelector('[data-last]')?.textContent, dotted: c.querySelectorAll('[data-dotted]').length, solid: c.querySelectorAll('[data-solid]').length, off: c.querySelectorAll('[data-off]').length,
    tanks: c.querySelectorAll('[data-tank]').length, label: c.querySelector('svg[role=img]')?.getAttribute('aria-label') })),
  recharts: document.querySelectorAll('[data-curve] .recharts-wrapper').length,
  legend: [...document.querySelectorAll('#ch-legend > span')].map((s) => s.textContent),
  choose: !!document.querySelector('#ch-choose'),
  firstDate: [...document.querySelectorAll('[data-curve] svg text')].map((t) => t.textContent).find((t) => /^[0-9]{1,2}[/.][0-9]{1,2}[.]?$|^[A-Z][a-z]{2} [0-9]+$/.test(t)),
})"""

LAST = {"fr": ("38 %", "11 %", "4,0"), "en": ("38 %", "11 %", "4.0"), "de": ("38 %", "11 %", "4,0")}
TARGET = {"fr": "cible 25–50 · %", "en": "target 25–50 · %", "de": "Ziel 25–50 · %"}
LEGEND = {"fr": "nouveau bidon", "en": "new tank", "de": "neuer Ansatz"}
SEVEN = {"fr": "7 j", "en": "7 d", "de": "7 T"}
DRYING = {"fr": "Séchage", "en": "Séchage", "de": "Séchage"}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(site)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{httpd.server_address[1]}/"


def open_sim(b, lang, theme, w, prefs=None, day="2026-02-08", space="floraison"):
    backup = json.loads((sim / "checkpoints" / f"{day}.json").read_text())
    backup["collections"]["settings"]["main"].update({"lang": lang, "theme": theme, "space": space})
    ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme, timezone_id="Europe/Oslo", locale="fr-FR", service_workers="block", reduced_motion="reduce")
    ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
    if prefs: ctx.add_init_script(f"localStorage.getItem('hydro.charts') || localStorage.setItem('hydro.charts', {json.dumps(json.dumps(prefs))})")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))
    pg.clock.install(time=f"{day}T09:30:00+01:00"); pg.clock.resume()
    pg.goto(url); pg.wait_for_timeout(1500); pg.evaluate(LOAD, backup); pg.reload(); pg.wait_for_timeout(2500)
    pg.goto(url + "#charts"); pg.wait_for_selector("#ch-period", timeout=15000); pg.wait_for_timeout(800)
    return ctx, pg


with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in LANGS:
        for theme in ["dark", "light"]:
            for w in [390, 360]:
                tag = f"{lang}/{theme}/{w}"
                ctx, pg = open_sim(b, lang, theme, w)
                c = pg.evaluate(SCREEN)
                ch = {x["curve"]: x for x in c["charts"]}
                d, r, e = LAST[lang]
                ok = (c["views"] == ["watering*", "solution", "climate", "light", "plant"] and list(ch) == ["dryback", "runoffPct", "ecRunoff"]
                      and (ch["dryback"]["last"] or "").replace(" ", " ") == d and (ch["runoffPct"]["last"] or "").replace(" ", " ") == r and ch["ecRunoff"]["last"] == e
                      and ch["dryback"]["sub"] == TARGET[lang] and all(x["dotted"] >= 1 and x["solid"] >= 2 and x["tanks"] >= 1 and x["label"] for x in c["charts"])
                      and ch["dryback"]["off"] >= 1 and c["recharts"] == 0 and len(c["legend"]) == 4 and LEGEND[lang] in " ".join(c["legend"]) and c["choose"] and len(c["period"]) == 5)
                if not ok: errors.append(f"{tag} {json.dumps(c, ensure_ascii=False)[:900]}")
                sw = pg.evaluate("document.documentElement.scrollWidth")
                if sw > w: errors.append(f"{tag} overflow {sw}")
                cut = pg.evaluate(CUT)
                if cut: errors.append(f"{tag} cut {cut}")
                pg.screenshot(path=str(out / f"charts-{lang}-{theme}-{w}.png"), full_page=True)
                checks[tag] = {k: (ch[k]["last"] or "").replace(" ", " ") for k in ch}
                # Touching a day: its date and values in the header; touching it again lets go.
                svg = pg.locator("[data-curve=dryback] svg")
                box = svg.bounding_box()
                svg.click(position={"x": box["width"] * 0.5, "y": box["height"] * 0.5}); pg.wait_for_timeout(300)
                picked = pg.evaluate("() => ({ d: document.querySelector('[data-curve=dryback] [data-last]').textContent, e: document.querySelector('[data-curve=ecRunoff] [data-last]').textContent, line: !!document.querySelector('[data-curve=ecRunoff] [data-picked]') })")
                svg.click(position={"x": box["width"] * 0.5, "y": box["height"] * 0.5}); pg.wait_for_timeout(300)
                back = pg.evaluate("() => document.querySelector('[data-curve=dryback] [data-last]').textContent")
                if not re.search(r"[0-9]{1,2}[/.][0-9]{1,2}|[A-Z][a-z]{2} [0-9]", picked["d"]) or not picked["line"] or back.replace(" ", " ") != d:
                    errors.append(f"{tag} touch {picked} then {back!r}")
                if lang == "fr" and theme == "dark" and w == 390: checks["touch"] = [picked, back]
                # « 7 j »: the axis starts 6 days back.
                pg.locator("#ch-period button", has_text=SEVEN[lang]).click(); pg.wait_for_timeout(500)
                first = pg.evaluate(SCREEN)["firstDate"]
                if not first or not re.search(r"0?2[/.]0?2|Feb 2", first): errors.append(f"{tag} 7 days start {first!r}")
                # A space without the view: Séchage has no watering curve, its tabs follow.
                pg.get_by_role("group").first.get_by_role("button", name=DRYING[lang]).click(); pg.wait_for_timeout(900)
                dry = pg.evaluate(SCREEN)
                if "watering" in " ".join(dry["views"]) or "solution" in " ".join(dry["views"]) or not dry["views"] or not dry["views"][0].endswith("*"): errors.append(f"{tag} drying views {dry['views']}")
                checks[tag + "/drying"] = dry["views"]
                ctx.close()

    # Sheets and preferences (FR, dark, 390).
    ctx, pg = open_sim(b, "fr", "dark", 390)
    pg.click("#ch-compare"); pg.wait_for_timeout(800)
    spaces = [(x.inner_text().strip(), x.get_attribute("aria-pressed")) for x in pg.locator("#ch-spaces button").all()]
    pg.screenshot(path=str(out / "sheet-comparer-fr.png"))
    pg.locator("#ch-spaces button", has_text="Colonne").click(); pg.wait_for_timeout(400)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(700)
    two = pg.evaluate("() => [...document.querySelectorAll('[data-curve=dryback] [data-series]')].map((g) => g.dataset.series)")
    pg.screenshot(path=str(out / "compare-fr.png"), full_page=True)
    if spaces[:2] != [("Floraison", "true"), ("Colonne", "false")] or two != ["floraison", "colonne"]: errors.append(f"compare {spaces} {two}")
    pg.click("#ch-compare"); pg.wait_for_timeout(700)
    pg.locator("#ch-spaces button", has_text="Colonne").click(); pg.wait_for_timeout(400)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(700)
    pg.click("#ch-choose"); pg.wait_for_timeout(800)
    chips = pg.locator("#ch-curves button").count()
    pg.locator("#ch-curves").get_by_role("button", name="VPD").click(); pg.wait_for_timeout(500)
    pg.screenshot(path=str(out / "sheet-courbes-fr.png"))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(700)
    perso = pg.evaluate(SCREEN)
    pg.reload(); pg.wait_for_timeout(2500)
    kept = pg.evaluate(SCREEN)
    if chips != 18 or perso["views"][-1] != "custom*" or [x["curve"] for x in perso["charts"]] != ["dryback", "runoffPct", "ecRunoff", "vpd"] or kept["views"] != perso["views"]:
        errors.append(f"perso chips={chips} {perso['views']} {[x['curve'] for x in perso['charts']]} kept {kept['views']}")
    checks["sheets"] = {"spaces": spaces, "chips": chips, "perso": perso["views"]}
    ctx.close()
    # Before lot 10k4: 17 pills and « Superposées » → « Perso » overlaid.
    ctx, pg = open_sim(b, "fr", "light", 390, prefs={"curves": ["dryback", "vpd"], "view": "overlay", "period": "7"})
    old = pg.evaluate("() => ({ views: [...document.querySelectorAll('#ch-views [data-view]')].map((b) => b.dataset.view + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')), overlay: !!document.querySelector('#ch-overlay'), lines: document.querySelectorAll('#ch-overlay .recharts-line').length })")
    pg.screenshot(path=str(out / "perso-superposees-fr.png"), full_page=True)
    if old["views"][-1] != "custom*" or not old["overlay"] or old["lines"] < 2: errors.append(f"old prefs {old}")
    checks["oldPrefs"] = old
    ctx.close()
    b.close()
httpd.shutdown()

print(json.dumps(checks, ensure_ascii=False, indent=1))
print("errors:", errors[:12])
print("OK" if not errors else "FAIL")
sys.exit(0 if not errors else 1)
