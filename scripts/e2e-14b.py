"""Lot 14b (Stack, Proper, Cuts) in the browser, FR / EN / DE (light 390, dark 360).
Local build with the one-year simulation:
- 8 February 2026 (Floraison in veg, 12/12 planned on the 10th: inside Stack's window): Réglages → the Stack add-on, its
  use (in the tank / by hand / sprayed); Nutrition: the Stack card, Stack last in the mixing order with the label's unit
  and the converted one; sprayed: Pulvérisation → Stack, 2 L → 3.7 mL, saved; IPW offers Stack in the same sprayer;
- 25 July 2026 (Floraison in flowering week 4): Stack sprayed is refused, with the reason.
Preview build (Thomas's grow): Proper without a dose is in no recipe, marked « dose non publiée par Athena »; Cuts is
offered only once the line is Blended.
Usage: npm run build:local && npm run preview:build && PYTHONPATH=scripts python3 scripts/e2e-14b.py dist-local <sim dir> dist-preview/index.html <out dir> [fr,en,de]"""
import sys, json, re, pathlib, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

site = pathlib.Path(sys.argv[1]).resolve(); sim = pathlib.Path(sys.argv[2]); preview = pathlib.Path(sys.argv[3]).resolve()
out = pathlib.Path(sys.argv[4]); out.mkdir(parents=True, exist_ok=True)
LANGS = sys.argv[5].split(",") if len(sys.argv) > 5 else ["fr", "en", "de"]
errors, checks = [], {}
LOAD = re.search(r'LOAD = """(.*?)"""', pathlib.Path("scripts/sim/browse.py").read_text(), re.S).group(1)

CUT = """() => [...document.querySelectorAll('button, [role=tab], [role=radio], label, h1, h2, h3, a')].filter((el) => {
  const r = el.getBoundingClientRect(); if (!r.width || el.closest('.truncate, [class*=truncate], [class*=line-clamp], [class*=sr-only], .overflow-x-auto, .no-scrollbar')) return false
  return el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible' || r.right > innerWidth + 0.5
}).map((el) => `${el.tagName} «${el.textContent.trim().slice(0, 30)}» ${Math.round(el.getBoundingClientRect().right)}`).slice(0, 8)"""

W = {
    "fr": {"sprayed": "Pulvérisé", "tank": "Dans le bidon", "kind": "Stack Athena", "perL": "0,26–0,53", "dose": "3,7 mL", "late": "Plus de Stack après la floraison S3.", "missing": "dose non publiée par Athena"},
    "en": {"sprayed": "Sprayed", "tank": "In the tank", "kind": "Athena Stack", "perL": "0.26–0.53", "dose": "3.7 mL", "late": "No more Stack after flowering week 3.", "missing": "dose not published by Athena"},
    "de": {"sprayed": "Gesprüht", "tank": "Im Ansatz", "kind": "Athena Stack", "perL": "0,26–0,53", "dose": "3,7 mL", "late": "Kein Stack mehr nach Blüte W3.", "missing": "Dosis von Athena nicht veröffentlicht"},
}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(site)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{httpd.server_address[1]}/"


def hook(pg):
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))


def open_sim(b, lang, theme, w, day):
    backup = json.loads((sim / "checkpoints" / f"{day}.json").read_text())
    backup["collections"]["settings"]["main"].update({"lang": lang, "theme": theme, "space": "floraison"})
    ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme, timezone_id="Europe/Oslo", locale="fr-FR", service_workers="block", reduced_motion="reduce")
    ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
    serve_fonts(ctx)
    pg = ctx.new_page(); hook(pg)
    pg.clock.install(time=f"{day}T09:30:00+01:00"); pg.clock.resume()
    pg.goto(url); pg.wait_for_timeout(1500); pg.evaluate(LOAD, backup); pg.reload(); pg.wait_for_timeout(2500)
    return ctx, pg


def go(pg, h, wait=1200):
    pg.evaluate(f"location.hash = '{h}'"); pg.wait_for_timeout(wait)


def stack_on(pg, use_label):
    """Réglages: the Stack add-on on, its use picked."""
    go(pg, "#tools/settings")
    btn = pg.locator("#g-nut button[aria-pressed]", has_text="Stack")
    if btn.get_attribute("aria-pressed") != "true": btn.click(); pg.wait_for_timeout(800)
    pg.locator("#g-stack").get_by_role("radio", name=use_label, exact=True).click(); pg.wait_for_timeout(800)


with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in LANGS:
        w8 = W[lang]
        for theme, w in [("light", 390), ("dark", 360)]:
            tag = f"{lang}/{theme}/{w}"
            ctx, pg = open_sim(b, lang, theme, w, "2026-02-08")
            stack_on(pg, w8["tank"])
            if not pg.locator("#g-stack").count(): errors.append(f"{tag} no stack use")
            go(pg, "#tools/nutrition", 1500)
            card = pg.locator("#nut-stack")
            order = pg.evaluate("[...document.querySelectorAll('#nut-order li')].map((li) => [li.dataset.item, li.innerText])")
            last = order[-1] if order else None
            if not card.count() or card.get_attribute("data-use") != "tank": errors.append(f"{tag} stack card")
            if not last or last[0] != "stack" or "mL/gal" not in last[1] or w8["perL"] not in last[1]: errors.append(f"{tag} stack last {last}")
            cut = pg.evaluate(CUT)
            if cut: errors.append(f"{tag} nutrition cut {cut}")
            checks.setdefault("tank", {})[tag] = last
            pg.evaluate("document.querySelector('#nut-order').scrollIntoView({block: 'start'})"); pg.wait_for_timeout(300)
            pg.screenshot(path=str(out / f"stack-bidon-{lang}-{theme}-{w}.png"))

            # Sprayed: Pulvérisation → Stack.
            stack_on(pg, w8["sprayed"])
            go(pg, "#tools/nutrition", 1200)
            if "stack" in pg.evaluate("[...document.querySelectorAll('#nut-order li')].map((li) => li.dataset.item)"): errors.append(f"{tag} stack in the tank while sprayed")
            go(pg, "#tools/ipw", 1200)
            pg.get_by_role("radio", name=w8["kind"], exact=True).click(); pg.wait_for_timeout(800)
            pg.fill("#stack-l", "2"); pg.wait_for_timeout(300)
            dose = pg.inner_text("#stack-dose")
            if w8["dose"] not in dose or pg.locator("#stack-spray-blocked").count(): errors.append(f"{tag} spray dose {dose!r}")
            cut = pg.evaluate(CUT)
            if cut: errors.append(f"{tag} spray cut {cut}")
            pg.screenshot(path=str(out / f"stack-pulve-{lang}-{theme}-{w}.png"))
            pg.click("#stack-save"); pg.wait_for_timeout(1000)
            if pg.locator("#stack-history li").count() != 1: errors.append(f"{tag} spray not saved")
            # The IPW offers Stack in the same sprayer.
            pg.get_by_role("radio", name="IPW Athena" if lang == "fr" else "Athena IPW", exact=True).click(); pg.wait_for_timeout(800)
            if not pg.locator("#ipw-with-stack").count(): errors.append(f"{tag} ipw without stack switch")
            ctx.close()

        # Flowering week 4: refused, with the reason.
        ctx, pg = open_sim(b, lang, "light", 390, "2026-07-25")
        stack_on(pg, w8["sprayed"])
        go(pg, "#tools/ipw", 1200)
        pg.get_by_role("radio", name=w8["kind"], exact=True).click(); pg.wait_for_timeout(800)
        pg.fill("#stack-l", "2"); pg.wait_for_timeout(300)
        blocked = pg.locator("#stack-spray-blocked")
        if not blocked.count() or blocked.inner_text().strip() != w8["late"] or pg.locator("#stack-save").is_enabled(): errors.append(f"{lang} late not refused")
        if lang == "fr": pg.screenshot(path=str(out / "stack-refuse-fr.png"))
        ctx.close()

    # Preview (Thomas's grow): Proper without a dose; Cuts only with Blended.
    for lang in LANGS:
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="light")
        ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'light',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
        serve_fonts(ctx)
        pg = ctx.new_page(); hook(pg)
        pg.goto(f"file://{preview}#tools/nutrition"); pg.wait_for_timeout(2500)
        row = pg.locator("#nut-custom [data-product=proper]")
        if not row.count() or W[lang]["missing"] not in row.inner_text() or pg.locator("#nut-order [data-item=proper]").count(): errors.append(f"{lang} proper {row.inner_text() if row.count() else None}")
        if pg.locator("[data-label-only=cuts]").count(): errors.append(f"{lang} cuts with Pro")
        pg.evaluate("document.querySelector('#nut-custom').scrollIntoView({block: 'center'})"); pg.wait_for_timeout(300)
        pg.screenshot(path=str(out / f"proper-sans-dose-{lang}.png"))
        go(pg, "#tools/settings", 1200)
        pg.click("#g-lines [data-line=athena-blended]"); pg.wait_for_timeout(400)
        if pg.locator("#line-switch-ok").count(): pg.click("#line-switch-ok"); pg.wait_for_timeout(800)
        go(pg, "#tools/nutrition", 1500)
        if not pg.locator("[data-label-only=cuts]").count(): errors.append(f"{lang} cuts not offered with Blended")
        if pg.locator("#nut-order [data-item=cuts]").count(): errors.append(f"{lang} cuts in a recipe without a dose")
        if lang == "fr":
            pg.evaluate("document.querySelector('#nut-label-only').scrollIntoView({block: 'center'})"); pg.wait_for_timeout(300)
            pg.screenshot(path=str(out / "cuts-blended-fr.png"))
        ctx.close()
    b.close()
    httpd.shutdown()

print(json.dumps(checks, ensure_ascii=False)[:1500])
print("errors:", errors[:40])
print("FAIL" if errors else "OK")
