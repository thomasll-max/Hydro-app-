"""Lot 10k2 (Outils) in the browser, preview build (Thomas's grow), FR / EN / DE, light and dark, 390 and 360 px:
- three groups in this order, small capital titles: « Chaque jour » (Nutrition, Arrosage, pH, Calendrier), « Régler la
  pièce » (Lumière, Climat, Pulvérisation), « Mon installation » (Équipement, Repères Athena, Sauvegarde);
- rows of at least 54 px, line icons coloured by subject (« eau », « plante », neutral), no 3D drawing, no line between
  rows; Premiers pas and Réglages not listed, the line « … dans l'engrenage en haut. » at the bottom, no « Calculs testés »;
- the Calendar opens over Outils and back returns; #tools/start and #tools/settings still open; the gear menu opens
  Premiers pas;
- nothing wider than the screen, no label cut.
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
    "fr": [["Chaque jour", ["Nutrition", "Arrosage", "pH", "Calendrier"]], ["Régler la pièce", ["Lumière", "Climat", None]], ["Mon installation", ["Équipement", "Repères Athena", "Sauvegarde"]]],
    "en": [["Every day", ["Nutrition", "Irrigation", "pH", "Calendar"]], ["Set up the room", ["Light", "Climate", None]], ["My setup", ["Equipment", "Athena guide", "Backup"]]],
    "de": [["Jeden Tag", ["Düngung", "Bewässerung", "pH", "Kalender"]], ["Den Raum einstellen", ["Licht", "Klima", None]], ["Meine Ausstattung", ["Ausrüstung", "Athena-Richtwerte", "Backup"]]],
}
TONES = [["water", "water", "water", "neutral"], ["leaf", "leaf", "leaf"], ["neutral", "neutral", "neutral"]]
START = {"fr": "Premiers pas", "en": "Getting started", "de": "Erste Schritte"}

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
    b.close()

print(json.dumps(checks, ensure_ascii=False, indent=1)[:3000])
print("errors:", errors[:12])
print("OK" if not errors else "FAIL")
sys.exit(0 if not errors else 1)
