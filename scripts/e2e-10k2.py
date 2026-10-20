"""Lot 10k2 (Outils) in the browser, preview build (Thomas's grow), FR / EN / DE, light and dark, 390 and 360 px:
- three groups in this order, small capital titles: « Chaque jour » (Nutrition, Arrosage, pH, Calendrier), « Régler la
  pièce » (Lumière, Climat, Pulvérisation), « Mon installation » (Équipement, Repères (sans « Athena » depuis le lot 13), Variétés (lot 12c), Sauvegarde);
- rows of at least 54 px, line icons coloured by subject (« eau », « plante », neutral), no 3D drawing, no line between
  rows; Premiers pas and Réglages not listed, the line « … dans l'engrenage en haut. » at the bottom, no « Calculs testés »;
- the Calendar opens over Outils and back returns; #tools/start and #tools/settings still open; the gear menu opens
  Premiers pas;
- nothing wider than the screen, no label cut.
10k2b, Pulvérisation: « IPW Athena » (unchanged) or « Mon mélange »: the empty state, the form (name, products and doses
per litre as typed, frequency, own checklist), « perso, non vérifié », the amounts for the sprayer (only the doses typed,
« dose non saisie » otherwise), the checklist, the spray saved, the next one in the calendar and on Aujourd'hui, the
choice remembered; FR: edit (the past spray stays) and delete. FR 390 dark, EN and DE 360 light.
Usage: npm run preview:build && PYTHONPATH=scripts python3 scripts/e2e-10k2.py dist-preview/index.html <out dir> [fr,en,de]"""
import sys, json, pathlib
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

LIST = """() => {
  const cs = (el) => getComputedStyle(el)
  const root = cs(document.documentElement)
  const color = (v) => { const d = document.createElement('span'); d.style.color = root.getPropertyValue(v); document.body.append(d); const c = cs(d).color; d.remove(); return c }
  const tone = { [color('--water')]: 'water', [color('--leaf')]: 'leaf', [color('--fg-2')]: 'neutral' }
  return {
    groups: [...document.querySelectorAll('#tools-list section')].map((s) => ({
      id: s.dataset.group, title: s.querySelector('h2').textContent, upper: cs(s.querySelector('h2')).textTransform,
      rows: [...s.querySelectorAll('li button')].map((b) => ({ id: b.id, title: b.querySelector('b').textContent, desc: b.querySelector('b + span').textContent, h: Math.round(b.getBoundingClientRect().height), tone: tone[cs(b.querySelector('svg')).color] ?? cs(b.querySelector('svg')).color, line: cs(b.parentElement).borderBottomWidth !== '0px' || cs(b).borderBottomWidth !== '0px' })),
    })),
    foot: document.querySelector('#tools-foot')?.textContent,
    imgs: document.querySelectorAll('main img').length,
    text: document.querySelector('main').innerText,
  }
}"""

WANT = {
    "fr": [["Chaque jour", ["Nutrition", "Arrosage", "pH", "Calendrier"]], ["Régler la pièce", ["Lumière", "Climat", None]], ["Mon installation", ["Équipement", "Repères", "Variétés", "Sauvegarde"]]],
    "en": [["Every day", ["Nutrition", "Irrigation", "pH", "Calendar"]], ["Set up the room", ["Light", "Climate", None]], ["My setup", ["Equipment", "Reference guide", "Varieties", "Backup"]]],
    "de": [["Jeden Tag", ["Düngung", "Bewässerung", "pH", "Kalender"]], ["Den Raum einstellen", ["Licht", "Klima", None]], ["Meine Ausstattung", ["Ausrüstung", "Richtwerte", "Sorten", "Backup"]]],
}
TONES = [["water", "water", "water", "neutral"], ["leaf", "leaf", "leaf"], ["neutral", "neutral", "neutral", "neutral"]]
START = {"fr": "Premiers pas", "en": "Getting started", "de": "Erste Schritte"}
SPRAY = {
    "fr": {"title": "Pulvérisation", "mix": "Mon mélange", "mine": "perso, non vérifié", "noDose": "dose non saisie"},
    "en": {"title": "Spraying", "mix": "My mix", "mine": "custom, not verified", "noDose": "dose not entered"},
    "de": {"title": "Sprühen", "mix": "Meine Mischung", "mine": "eigene, nicht geprüft", "noDose": "Dosis nicht eingegeben"},
}

with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in LANGS:
        for theme in ["dark", "light"]:
            for w in [390, 360]:
                tag = f"{lang}/{theme}/{w}"
                ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme)
                ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
                serve_fonts(ctx)
                pg = ctx.new_page()
                pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
                pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))
                pg.goto(f"file://{page_file}#tools"); pg.wait_for_timeout(2500)
                c = pg.evaluate(LIST)
                got = [[g["title"], [r["title"] for r in g["rows"]]] for g in c["groups"]]
                for (gt, rows), (wt, wrows) in zip(got, WANT[lang]):
                    if gt != wt or len(rows) != len(wrows) or any(x is not None and x != y for x, y in zip(wrows, rows)): errors.append(f"{tag} group {gt} {rows}")
                if len(got) != 3: errors.append(f"{tag} groups {got}")
                for g, tones in zip(c["groups"], TONES):
                    if g["upper"] != "uppercase": errors.append(f"{tag} group title case {g['upper']}")
                    for r, tn in zip(g["rows"], tones):
                        if r["h"] < 54 or r["tone"] != tn or r["line"]: errors.append(f"{tag} row {r}")
                if not c["foot"] or c["imgs"] or START[lang] in "\n".join(r["title"] for g in c["groups"] for r in g["rows"]) or "Calculs testés" in c["text"]: errors.append(f"{tag} foot/imgs/start {c['foot']} {c['imgs']}")
                sw = pg.evaluate("document.documentElement.scrollWidth")
                if sw > w: errors.append(f"{tag} overflow {sw}")
                cut = pg.evaluate(CUT)
                if cut: errors.append(f"{tag} cut {cut}")
                pg.screenshot(path=str(out / f"outils-{lang}-{theme}-{w}.png"), full_page=True)
                checks[tag] = got
                if lang == "fr" and w == 390:
                    # Calendar over Outils, back returns; old routes; the gear menu opens Premiers pas.
                    pg.click("#tool-calendar"); pg.wait_for_timeout(1200)
                    nav = [pg.evaluate("location.hash")]
                    pg.go_back(); pg.wait_for_timeout(1000); nav.append(pg.evaluate("location.hash"))
                    for h in ["#tools/start", "#tools/settings"]:
                        pg.goto(f"file://{page_file}{h}"); pg.wait_for_timeout(1500)
                        nav.append(pg.locator("main h1").first.inner_text())
                    pg.goto(f"file://{page_file}#tools"); pg.wait_for_timeout(1200)
                    pg.click("#display-menu"); pg.wait_for_timeout(400); pg.click("#menu-start"); pg.wait_for_timeout(1200)
                    nav.append(pg.evaluate("location.hash"))
                    checks[f"nav-{theme}"] = nav
                    if nav != ["#calendar", "#tools", "Premiers pas", "Réglages", "#tools/start"]: errors.append(f"{tag} navigation {nav}")
                ctx.close()

    # 10k2b, Pulvérisation: IPW Athena unchanged, or « Mon mélange » described by the user (no dose proposed). FR in
    # full (create, spray, reminder, edit, delete); EN and DE: the same screen at 360 px.
    for lang, theme, w in [("fr", "dark", 390), ("en", "light", 360), ("de", "light", 360)]:
        tag = f"spray/{lang}/{theme}/{w}"
        L = SPRAY[lang]
        ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme)
        ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
        serve_fonts(ctx)
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
        pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))
        pg.goto(f"file://{page_file}#tools/ipw"); pg.wait_for_timeout(2500)
        c = {"title": pg.locator("main h1").first.inner_text(), "radios": pg.locator("#spray-tool [role=radiogroup]").first.locator("[role=radio]").count(), "ipw": pg.locator("#ipw-window").count()}
        pg.screenshot(path=str(out / f"pulverisation-ipw-{lang}.png"), full_page=True)
        pg.get_by_role("radio", name=L["mix"]).click(); pg.wait_for_timeout(500)
        c["empty"] = pg.locator("#mix-empty").inner_text().replace("\n", " | ")
        pg.click("#mix-create"); pg.wait_for_timeout(800)
        pg.fill("#mix-name", "Spray maison"); pg.fill("#mix-p-0", "Silice"); pg.fill("#mix-d-0", "0,5" if lang != "en" else "0.5")
        pg.click("#mix-add-product"); pg.fill("#mix-p-1", "Extrait de prêle")
        pg.fill("#mix-every", "5"); pg.fill("#mix-check", "Lampes éteintes\nSecouer")
        cut = pg.evaluate(CUT)
        if cut: errors.append(f"{tag} sheet cut {cut}")
        pg.screenshot(path=str(out / f"pulverisation-feuille-{lang}.png"))
        pg.locator("[data-slot=drawer-footer] button").last.click(); pg.wait_for_timeout(1200)
        pg.fill("#mix-l", "2"); pg.wait_for_timeout(300)
        c["card"] = pg.inner_text("#mix-card").split("\n")
        c["amounts"] = pg.inner_text("#mix-amounts").split("\n")
        for x in pg.locator("#mix-checklist button").all(): x.click()
        pg.click("#mix-save"); pg.wait_for_timeout(1200)
        c["next"] = pg.inner_text("#mix-next"); c["history"] = pg.locator("#mix-history li").count()
        sw = pg.evaluate("document.documentElement.scrollWidth")
        if sw > w: errors.append(f"{tag} overflow {sw}")
        cut = pg.evaluate(CUT)
        if cut: errors.append(f"{tag} cut {cut}")
        pg.screenshot(path=str(out / f"pulverisation-melange-{lang}.png"), full_page=True)
        # Aujourd'hui shows the next spray of the mix; back in Pulvérisation, the choice is remembered (in-app navigation:
        # a reload right after the write can read the file:// storage before Chromium has committed it).
        pg.evaluate("location.hash = ''"); pg.wait_for_selector("#now", timeout=10000); pg.wait_for_timeout(500)
        c["today"] = "Spray maison" in pg.inner_text("#now") + pg.inner_text("#upcoming")
        pg.evaluate("location.hash = '#tools/ipw'"); pg.wait_for_selector("#mix-card, #ipw-window", timeout=10000); pg.wait_for_timeout(300)
        c["remembered"] = pg.locator("#mix-card").count()
        ok = (c["title"] == L["title"] and c["radios"] == 2 and c["ipw"] == 1 and L["mine"] in c["empty"] and c["card"][:2] == ["Spray maison", L["mine"]]
              and L["noDose"] in c["card"] and any(x.startswith("1") and "mL" in x for x in c["amounts"]) and L["noDose"] in c["amounts"]
              and c["history"] == 1 and c["next"] and c["remembered"] and c["today"])
        if not ok: errors.append(f"{tag} {c}")
        if lang == "fr":
            # Edit the mix: the past spray keeps its own copy; delete it: back to the empty state.
            pg.goto(f"file://{page_file}#tools/ipw"); pg.wait_for_timeout(2000)
            pg.click("#mix-edit"); pg.wait_for_timeout(700); pg.fill("#mix-name", "Spray maison 2")
            pg.locator("[data-slot=drawer-footer] button").last.click(); pg.wait_for_timeout(1200)
            c["renamed"] = pg.inner_text("#mix-card").split("\n")[0]
            c["historyAfterEdit"] = pg.locator("#mix-history li").count()
            pg.click("#mix-edit"); pg.wait_for_timeout(700)
            pg.locator("[data-slot=drawer-footer] button").first.click(); pg.wait_for_timeout(400)
            pg.get_by_role("alertdialog").get_by_role("button", name="Supprimer").click(); pg.wait_for_timeout(1200)
            c["deleted"] = pg.locator("#mix-empty").count()
            if c["renamed"] != "Spray maison 2" or c["historyAfterEdit"] != 1 or c["deleted"] != 1: errors.append(f"{tag} edit/delete {c}")
        checks[tag] = c
        ctx.close()
    b.close()

print(json.dumps(checks, ensure_ascii=False, indent=1)[:3000])
print("errors:", errors[:12])
print("OK" if not errors else "FAIL")
sys.exit(0 if not errors else 1)
