"""Lot 12a (bilan de récolte, comparaison de cycles) in the browser, local build with the one-year simulation at
19 October 2026 (four cycles harvested):
- the review opens from Réglages → cycles (« Bilan » on a harvested cycle) and from the Journal (cycle line);
- Résultat: dry and wet weight, g/W (the harvest's 300 W), g per plant (4 pots), g/m² (Floraison 90 × 90); a cycle
  without its dry weight shows « donnée manquante » for every value that needs it, never an estimate;
- the dry weight per plant typed in the harvest sheet: listed, their sum never replaces the dry weight typed, the gap
  shown as is; the review note;
- Calendrier (flowering 9 sem. 0 j, planned 9), Conduite per stage (averages, ranges, days in the target), Bidons,
  Incidents, Dégustation;
- « Comparer avec… »: filtered by variety, two columns, the gap B − A in mono; back to the review;
- the CSV (";" and the decimal comma) and the printable page are downloaded;
- FR / EN / DE, light and dark, 390 and 360, no sideways scrolling.
Usage: npm run build:local && npx -y tsx scripts/sim/build.ts <sim dir> && PYTHONPATH=scripts python3 scripts/e2e-12a.py dist-local <sim dir> <out dir>"""
import sys, json, pathlib, threading, http.server, functools, socketserver, re
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

site = pathlib.Path(sys.argv[1]).resolve(); sim = pathlib.Path(sys.argv[2])
out = pathlib.Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
errors, checks = [], {}
LOAD = re.search(r'LOAD = """(.*?)"""', pathlib.Path("scripts/sim/browse.py").read_text(), re.S).group(1)
DAY = "2026-10-19"


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(site)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{httpd.server_address[1]}/"


def start(b, lang="fr", theme="light", w=390, space="all", tweak=None):
    backup = json.loads((sim / "checkpoints" / f"{DAY}.json").read_text())
    backup["collections"]["settings"]["main"].update({"lang": lang, "theme": theme, "space": space})
    if tweak: tweak(backup["collections"])
    ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme, timezone_id="Europe/Oslo", locale="fr-FR", service_workers="block", reduced_motion="reduce", accept_downloads=True)
    ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))
    pg.clock.install(time=f"{DAY}T08:30:00+02:00"); pg.clock.resume()
    pg.goto(url); pg.wait_for_timeout(1500); pg.evaluate(LOAD, backup); pg.reload(); pg.wait_for_timeout(2500)
    return ctx, pg


def review(pg, cycle):
    pg.goto(f"{url}#tools/settings"); pg.wait_for_timeout(900)
    pg.locator(f"[data-review='{cycle}']").click(); pg.wait_for_selector("#review-page"); pg.wait_for_timeout(500)


def result(pg):
    return pg.evaluate("() => Object.fromEntries([...document.querySelectorAll('[data-result]')].map((d) => [d.dataset.result, [...d.children].map((x) => x.textContent.replace(/\\u202f/g, ' '))]))")


def width(pg):
    return pg.evaluate("() => document.documentElement.scrollWidth")


with sync_playwright() as p:
    b = p.chromium.launch()

    # 1. Cycle 2 from Réglages: every section, the values from the simulated harvest (487 g, 300 W, 4 pots, 90 × 90).
    ctx, pg = start(b)
    review(pg, "cycle-2")
    head = [pg.locator("#review-page h1").inner_text(), pg.locator("#review-sub").inner_text()]
    res = result(pg)
    sections = pg.evaluate("() => [...document.querySelectorAll('#review-page section[id^=review-]')].map((s) => s.id)")
    cal = pg.evaluate("() => Object.fromEntries([...document.querySelectorAll('[data-cal]')].map((d) => [d.dataset.cal, d.innerText.replace(/\\s+/g, ' ').trim()]))")
    pg.screenshot(path=str(out / "bilan-fr.png"))
    if head[0] != "Bilan · Cycle 2" or "Melonade Runtz" not in head[1] or "Floraison" not in head[1] or "14/04/2026" not in head[1]: errors.append(f"head {head}")
    if sections != ["review-result", "review-calendar", "review-conduct", "review-tanks", "review-incidents", "review-notes"]: errors.append(f"sections {sections}")
    want = {"dry": "487 g", "wet": None, "gPerW": "1,62", "gPerPlant": "121,8 g", "gPerM2": "601 g"}
    for k, v in want.items():
        if k not in res or (v and res[k][1] != v): errors.append(f"result {k} {res.get(k)}")
    if "300 W" not in res["gPerW"][2] or "4 plantes" not in res["gPerPlant"][2] or "0,81 m²" not in res["gPerM2"][2]: errors.append(f"result subs {res}")
    if "9 sem. 0 j" not in cal.get("flowerDays", "") or "prévue 9 sem." not in cal["flowerDays"] or "10 j" not in cal.get("dryingDays", ""): errors.append(f"calendar {cal}")
    # Conduct: the stretch opened, its lines with ranges and days in the target.
    pg.locator("[data-stage=stretch] button").first.click(); pg.wait_for_timeout(400)
    lines = pg.evaluate("() => [...document.querySelectorAll('[data-stage=stretch] [data-metric]')].map((d) => [d.dataset.metric, d.querySelector('[data-in-target]').dataset.inTarget, d.innerText.replace(/\\s+/g, ' ')])")
    pg.locator("#review-conduct").scroll_into_view_if_needed(); pg.screenshot(path=str(out / "conduite-fr.png"))
    metrics = [x[0] for x in lines]
    if not {"ecRunoff", "phRunoff", "dryback", "runoffPct", "vpd"} <= set(metrics) or "drybackSensor" in metrics and "dryback" not in metrics or not all(re.match(r"^\d+/\d+$", x[1]) for x in lines if x[0] in ("ecRunoff", "phRunoff", "dryback")):
        errors.append(f"conduct {lines}")
    tank = pg.locator("#review-tank-line").inner_text()
    notes = pg.locator("[data-note=tasting]").inner_text() if pg.locator("[data-note=tasting]").count() else ""
    if not re.match(r"^\d+ bidons · [\d\u202f\u00a0 ]+ L$", tank) or "Simulation" not in notes or pg.locator("#review-incidents [data-week]").count() == 0 and "Aucune" not in pg.locator("#review-incidents").inner_text():
        errors.append(f"tanks/notes {tank!r} {notes!r}")
    checks["review"] = {"head": head, "result": res, "calendar": cal, "stretch": [x[:2] for x in lines], "tanks": tank}

    # 2. Dry weight per plant and the review note, typed in the harvest sheet: the sum never replaces 487 g.
    pg.click("#review-edit"); pg.wait_for_selector("#h-plants")
    for pid, v in [("P1", "120"), ("P2", "125"), ("P3", "118,5"), ("P4", "130")]: pg.fill(f"#h-p-{pid}", v)
    pg.fill("#h-review", "Meilleur cycle de l'année, à refaire."); pg.wait_for_timeout(200)
    pg.locator("[data-slot=drawer-content] [data-slot=drawer-footer] button").last.click(); pg.wait_for_timeout(1200)
    plants = pg.locator("#review-plants").inner_text().replace(" ", " ") if pg.locator("#review-plants").count() else ""
    gap = pg.locator("#review-gap").inner_text().replace(" ", " ") if pg.locator("#review-gap").count() else ""
    dry = result(pg)["dry"][1]
    note = pg.locator("[data-note=review]").inner_text() if pg.locator("[data-note=review]").count() else ""
    if plants != "Par plante : P1 120 g · P2 125 g · P3 118,5 g · P4 130 g" or gap != "Somme des plantes 493,5 g · écart +6,5 g avec le poids sec saisi" or dry != "487 g" or "Meilleur cycle" not in note:
        errors.append(f"per plant {plants!r} {gap!r} {dry!r} {note!r}")
    pg.locator("#review-result").scroll_into_view_if_needed(); pg.screenshot(path=str(out / "par-plante-fr.png"))
    checks["perPlant"] = {"plants": plants, "gap": gap, "dry": dry}

    # 3. Exports: the CSV (";" and the decimal comma) and the printable page.
    with pg.expect_download() as d: pg.click("#review-csv")
    csv = pathlib.Path(d.value.path()).read_text(encoding="utf-8-sig").splitlines()
    with pg.expect_download() as d2: pg.click("#review-print")
    html = pathlib.Path(d2.value.path()).read_text(encoding="utf-8")
    if csv[0] != "Section;Étape;Mesure;Valeur;Unité;Min;Max;Saisies;Dans la cible" or "Résultat;;Poids sec;487;g;;;;" not in csv or not any(l.startswith("Résultat;;g par watt;1,62") for l in csv) or not any(l.startswith("Conduite;Stretch;EC runoff;") for l in csv):
        errors.append(f"csv {csv[:6]}")
    if "<title>Bilan · Cycle 2</title>" not in html or "<script" in html or "Meilleur cycle" not in html or d.value.suggested_filename != "bilan-Cycle-2.csv" or d2.value.suggested_filename != "bilan-Cycle-2.html":
        errors.append(f"html {d.value.suggested_filename} {d2.value.suggested_filename} {html[:200]}")
    checks["export"] = {"csv": csv[:3], "files": [d.value.suggested_filename, d2.value.suggested_filename]}

    # 4. « Comparer avec… », filtered by variety, then two columns with the gap.
    pg.click("#review-compare"); pg.wait_for_selector("#compare-list")
    varieties = pg.locator("#compare-varieties button").all_inner_texts()
    pg.locator("#compare-varieties button", has_text="Blue Zushi").click(); pg.wait_for_timeout(300)
    offered = pg.evaluate("() => [...document.querySelectorAll('#compare-list [data-cycle]')].map((b) => b.dataset.cycle)")
    pg.screenshot(path=str(out / "comparer-choix-fr.png"))
    pg.click("#compare-list [data-cycle='cycle-1']"); pg.wait_for_selector("#compare-page"); pg.wait_for_timeout(500)
    dryRow = pg.locator("[data-row=dry]").inner_text().replace(" ", " ").split("\n")
    flower = pg.locator("[data-row=flowerDays] [data-diff]").inner_text()
    hashv = pg.evaluate("location.hash")
    pg.screenshot(path=str(out / "comparer-fr.png"))
    if varieties != ["Tous", "Blue Zushi", "Cherry Limeade", "Melonade Runtz"] or offered != ["cycle-3", "cycle-1"] or dryRow[1:] != ["487 g", "514 g", "+27"] or flower != "±0" or hashv != "#journal/bilan/cycle-2/cycle-1":
        errors.append(f"compare {varieties} {offered} {dryRow} {flower} {hashv}")
    pg.click("#review-back"); pg.wait_for_selector("#review-page"); pg.wait_for_timeout(300)
    if pg.locator("#compare-page").count(): errors.append("compare back")
    checks["compare"] = {"varieties": varieties, "offered": offered, "dry": dryRow}
    ctx.close()

    # 5. Missing data: a cycle without its dry weight; and the Journal's cycle line opens the review.
    def no_dry(c):
        c["cycles"]["cycle-3"]["harvest"].pop("dryG", None)
    ctx, pg = start(b, space="floraison", tweak=no_dry)
    pg.goto(f"{url}#journal"); pg.wait_for_timeout(1200)
    pg.locator("#journal-cycles button", has_text="Cycle 3").click(); pg.wait_for_timeout(500)
    pg.click("#journal-review"); pg.wait_for_selector("#review-page"); pg.wait_for_timeout(500)
    res = result(pg)
    missing = [k for k, v in res.items() if v[1] == "donnée manquante"]
    if sorted(missing) != ["dry", "gPerM2", "gPerPlant", "gPerW"] or not res["wet"][1].endswith(" g"): errors.append(f"missing {res}")
    pg.screenshot(path=str(out / "manquante-fr.png"))
    pg.click("#review-back"); pg.wait_for_timeout(600)
    if not pg.locator("#journal-bar").count(): errors.append("back to the Journal")
    checks["missing"] = missing
    ctx.close()

    # 6. EN / DE, dark, 360: the review and the comparison, no sideways scrolling.
    for lang, theme, w, title, dry in [("en", "dark", 360, "Review · Cycle 2", "Dry weight"), ("de", "light", 360, "Bilanz · Cycle 2", "Trockengewicht"), ("fr", "dark", 360, "Bilan · Cycle 2", "Poids sec"), ("de", "dark", 390, "Bilanz · Cycle 2", "Trockengewicht")]:
        ctx, pg = start(b, lang, theme, w)
        review(pg, "cycle-2")
        got = [pg.locator("#review-page h1").inner_text(), result(pg)["dry"][0]]
        pg.screenshot(path=str(out / f"bilan-{lang}-{theme}-{w}.png"))
        pg.locator("[data-stage=bulk] button").first.click(); pg.wait_for_timeout(300)
        pg.locator("#review-conduct").scroll_into_view_if_needed(); pg.screenshot(path=str(out / f"conduite-{lang}-{theme}-{w}.png"))
        sw = width(pg)
        pg.goto(f"{url}#journal/bilan/cycle-2/cycle-4"); pg.wait_for_selector("#compare-page"); pg.wait_for_timeout(500)
        pg.screenshot(path=str(out / f"comparer-{lang}-{theme}-{w}.png"))
        sw2 = width(pg)
        if got != [title, dry] or sw > w or sw2 > w: errors.append(f"{lang} {theme} {w} {got} sw={sw}/{sw2}")
        checks[f"{lang}-{theme}-{w}"] = got
        ctx.close()
    b.close()

print(json.dumps(checks, ensure_ascii=False, indent=1))
print("errors:", errors)
print("OK" if not errors else "FAIL")
