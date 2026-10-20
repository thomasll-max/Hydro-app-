"""Lot 10l1 (page d'un espace « calme ») in the browser, local build with the one-year simulation at 8 February, 09:30,
FR / EN / DE, light and dark, 390 and 360 px, as on the planche « Les menus »:
- Floraison: the header (48 px square, name, « Cycle 2 · Melonade Runtz », « Végé S6 · J41 » in a pill), the only framed
  block (« Tout est dans la cible », « Rien à corriger · saisie du 07/02 », the outlined « Passer en 12/12 · dans 2 j »
  without the consequence), Relevés (38 %, 4,0, 11 %, 6,0 with their target, then « VPD 0,96 · EC entrée 3,0 · DLI 31 ·
  25° / 59 % »), Arrosage du jour in two lines (« ✓ P1 · 5/5 doses faites », « 11:20 prochaine dose · P2 1/4 · 450 mL »),
  Réservoir (« 33 L sur 120 L », « ≈ 2 j · 12,5 L/jour »), À faire ici (3 at most, without the 12/12 nor the space's
  name), the sources in the ⓘ beside « Relevés » (lot 13); fixed order, no « Bonjour », no overflow, nothing cut; 200 % zoom (195 px) without overflow;
- the step in one tap, then « Annuler »; « Graphiques → » and « Programme → » open their screen;
- an entry out of target: the block says the correction, in « à surveiller » or « alerte »;
- Séchage: no state block nor pill, T°, HR, VPD and the day of drying; Colonne (propagation): its section only.
Usage: npm run build:local && npx -y tsx scripts/sim/build.ts <sim dir> && PYTHONPATH=scripts python3 scripts/e2e-10l1.py dist-local <sim dir> <out dir> [fr,en,de]"""
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

PAGE = """() => {
  const q = (s) => document.querySelector(s)
  const txt = (s) => q(s)?.innerText.split(String.fromCharCode(10)).filter((x) => x.trim()).join(' | ') ?? null
  const ids = ['space-head', 'space-status', 'propagation', 'readings', 'water-today', 'reservoir', 'space-todo']
  return {
    order: [...document.querySelectorAll(ids.map((i) => '#' + i).join(','))].map((e) => e.id),
    tile: q('#space-head [data-space-tile]')?.getBoundingClientRect().width,
    name: q('#space-head h1')?.textContent, sub: q('#space-head p')?.textContent, pill: q('#space-stage')?.textContent,
    status: q('#space-status')?.dataset.status, state: txt('#space-status b'), stateSub: txt('#space-status b + span'),
    step: q('#space-status button[id^=step-]') && [q('#space-status button[id^=step-]').id, q('#space-status button[id^=step-]').innerText.replace(/\\s+/g, ' ').trim(), getComputedStyle(q('#space-status button[id^=step-]')).borderTopWidth],
    readings: [...document.querySelectorAll('#readings .grid > div')].map((r) => r.innerText.split(String.fromCharCode(10)).join(' | ')),
    also: q('#readings-also')?.textContent ?? null, link: txt('#readings [data-section-link]'),
    water: [...document.querySelectorAll('#water-today [data-water]')].map((w) => w.textContent),
    reservoir: txt('#reservoir'), todo: [...document.querySelectorAll('#space-todo li')].map((l) => l.innerText.split(String.fromCharCode(10)).join(' | ')),
    sources: q('#info-space') ? (q('#info-space').getBoundingClientRect().width >= 44 ? 'ok' : 'small') : null,
    frames: [...document.querySelectorAll('main section, main [data-slot=card]')].filter((e) => getComputedStyle(e).borderTopWidth !== '0px' && e.id !== 'start-card').map((e) => e.id),
    filled: [...document.querySelectorAll('main button')].filter((b) => b.dataset.variant === 'default' || /\\bbg-primary\\b/.test(b.className)).length,
    hello: !!q('#hello, #bonjour'),
  }
}"""

EXP = {
    "fr": dict(sub="Cycle 2 · Melonade Runtz", pill="Végé S6 · J41", ok="Tout est dans la cible", stateSub="Rien à corriger · saisie du 07/02", step="Passer en 12/12 dans 2 j",
               also="VPD 0,96 · EC entrée 3,0 · DLI 31 · 25° / 59 %", water=["✓ P1 · 5/5 doses faites", "11:20 prochaine dose · P2 1/4 · 450 mL · option"], res="33 L sur 120 L", link="07/02 · Graphiques →", drying="Séchage"),
    "en": dict(sub="Cycle 2 · Melonade Runtz", pill="Veg W6 · D41", ok="Everything is on target", stateSub="Nothing to fix · entry of Feb 7", step="Switch to 12/12 in 2 d",
               also="VPD 0.96 · EC in 3.0 · DLI 31 · 25° / 59 %", water=["✓ P1 · 5/5 shots done", "11:20 next shot · P2 1/4 · 450 mL · optional"], res="33 L of 120 L", link="Feb 7 · Charts →", drying="Séchage"),
    "de": dict(sub="Cycle 2 · Melonade Runtz", pill="Wachstum W6 · T41", ok="Alles im Zielbereich", stateSub="Nichts zu korrigieren · Eintrag vom 07.02.", step="Auf 12/12 umstellen in 2 T",
               also="VPD 0,96 · EC Zulauf 3,0 · DLI 31 · 25° / 59 %", water=["✓ P1 · 5/5 Gaben erledigt", "11:20 nächste Gabe · P2 1/4 · 450 mL · optional"], res="33 L von 120 L", link="07.02. · Diagramme →", drying="Séchage"),
}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(site)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{httpd.server_address[1]}/"


def open_sim(b, lang, theme, w, space="floraison", day="2026-02-08", alter=None, zoom=1):
    backup = json.loads((sim / "checkpoints" / f"{day}.json").read_text())
    backup["collections"]["settings"]["main"].update({"lang": lang, "theme": theme, "space": space})
    if alter: alter(backup)
    ctx = b.new_context(viewport={"width": int(w / zoom), "height": int(844 / zoom)}, device_scale_factor=2 * zoom, color_scheme=theme, timezone_id="Europe/Oslo", locale="fr-FR", service_workers="block", reduced_motion="reduce")
    ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))
    pg.clock.install(time=f"{day}T09:30:00+01:00"); pg.clock.resume()
    pg.goto(url); pg.wait_for_timeout(1500); pg.evaluate(LOAD, backup); pg.reload(); pg.wait_for_timeout(2500)
    pg.wait_for_selector("#space-page", timeout=15000); pg.wait_for_timeout(600)
    return ctx, pg


with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in LANGS:
        e = EXP[lang]
        for theme in ["dark", "light"]:
            for w in [390, 360]:
                tag = f"{lang}/{theme}/{w}"
                ctx, pg = open_sim(b, lang, theme, w)
                c = pg.evaluate(PAGE)
                rd = c["readings"]
                ok = (c["order"] == ["space-head", "space-status", "readings", "water-today", "reservoir", "space-todo"] and c["tile"] == 48 and c["name"] == "Floraison"
                      and c["sub"] == e["sub"] and (c["pill"] or "").replace(" ", " ") == e["pill"] and c["status"] == "ok" and c["state"] == e["ok"] and c["stateSub"] == e["stateSub"]
                      and c["step"] and c["step"][0] == "step-flip" and c["step"][1] == e["step"] and c["step"][2] == "1px" and "→" not in c["step"][1]
                      and len(rd) == 4 and rd[0].split(" | ")[1].replace(" ", " ") == "38 %" and rd[1].split(" | ")[1] in ("4,0", "4.0") and rd[3].split(" | ")[1] in ("6,0", "6.0")
                      and (c["also"] or "").replace(" ", " ") == e["also"] and c["water"] == e["water"] and c["reservoir"] and e["res"] in c["reservoir"].replace(" ", " ")
                      and 1 <= len(c["todo"]) <= 3 and not any("12/12" in x or "Floraison" in x for x in c["todo"]) and c["sources"] == "ok" and c["link"] == e["link"]
                      and c["frames"] == ["space-status"] and c["filled"] == 0 and not c["hello"])
                if not ok: errors.append(f"{tag} {json.dumps(c, ensure_ascii=False)[:1500]}")
                sw = pg.evaluate("document.documentElement.scrollWidth")
                if sw > w: errors.append(f"{tag} overflow {sw}")
                cut = pg.evaluate(CUT)
                if cut: errors.append(f"{tag} cut {cut}")
                pg.screenshot(path=str(out / f"espace-{lang}-{theme}-{w}.png"), full_page=True)
                checks[tag] = {k: c[k] for k in ("pill", "state", "step", "water")}
                if theme == "dark" and w == 390:
                    # Séchage: no state block nor pill; T°, HR, VPD, the day of drying.
                    pg.get_by_role("group").first.get_by_role("button", name=e["drying"]).click(); pg.wait_for_timeout(1200)
                    d = pg.evaluate(PAGE)
                    if "space-status" in d["order"] or d["pill"] or len(d["readings"]) != 4 or not re.search(r"[JDT]7", d["readings"][3]) or "/10" not in d["readings"][3]: errors.append(f"{tag} drying {d}")
                    pg.screenshot(path=str(out / f"sechage-{lang}-{theme}.png"), full_page=True)
                    pg.get_by_role("group").first.get_by_role("button", name="Colonne").click(); pg.wait_for_timeout(1200)
                    col = pg.evaluate(PAGE)
                    if col["order"] != ["space-head", "propagation"]: errors.append(f"{tag} colonne {col['order']}")
                    pg.screenshot(path=str(out / f"colonne-{lang}-{theme}.png"), full_page=True)
                    checks[f"{lang}/drying"] = d["readings"]
                ctx.close()

    # The step in one tap, « Annuler »; the links (FR, light, 390).
    ctx, pg = open_sim(b, "fr", "light", 390)
    pg.click("#step-flip"); pg.wait_for_timeout(1200)
    after = pg.evaluate(PAGE)
    pg.get_by_role("button", name="Annuler").first.click(); pg.wait_for_timeout(1200)
    undone = pg.evaluate(PAGE)
    if after["pill"] is None or "Floraison" not in after["pill"] or after["step"] or not undone["step"] or undone["step"][0] != "step-flip": errors.append(f"step {after['pill']} {after['step']} → {undone['step']}")
    checks["step"] = [after["pill"], undone["step"]]
    pg.click("#readings [data-section-link]"); pg.wait_for_timeout(1000)
    charts = pg.evaluate("location.hash")
    pg.go_back(); pg.wait_for_timeout(1000)
    pg.click("#water-title + button"); pg.wait_for_timeout(1000)
    prog = pg.evaluate("location.hash")
    if charts != "#charts" or prog != "#tools/irrigation": errors.append(f"links {charts} {prog}")
    ctx.close()

    # An entry out of target: the block says the correction.
    def off(backup):
        for k, v in backup["collections"]["entries"].items():
            if v.get("spaceId") == "floraison" and v.get("date") == "2026-02-07" and not v.get("plantId"): v["dryback"] = 64
    ctx, pg = open_sim(b, "fr", "dark", 390, alter=off)
    a = pg.evaluate(PAGE)
    if a["status"] not in ("warn", "bad") or a["state"] == EXP["fr"]["ok"] or not a["stateSub"]: errors.append(f"alert {a['status']} {a['state']} {a['stateSub']}")
    checks["alert"] = [a["status"], a["state"], a["stateSub"]]
    pg.screenshot(path=str(out / "espace-alerte-fr.png"), full_page=True)
    ctx.close()

    # 200 % zoom: 195 px wide, nothing wider than the screen.
    for lang in LANGS:
        ctx, pg = open_sim(b, lang, "light", 390, zoom=2)
        sw = pg.evaluate("document.documentElement.scrollWidth")
        if sw > 195: errors.append(f"zoom 200 % {lang} overflow {sw}")
        if lang == "de": pg.screenshot(path=str(out / "espace-zoom200-de.png"), full_page=True)
        ctx.close()
    b.close()
httpd.shutdown()

print(json.dumps(checks, ensure_ascii=False, indent=1))
print("errors:", errors[:12])
print("OK" if not errors else "FAIL")
sys.exit(0 if not errors else 1)
