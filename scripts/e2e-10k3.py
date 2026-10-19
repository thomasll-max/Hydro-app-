"""Lot 10k3 (Journal « calme ») in the browser, preview build (Thomas's grow, two spaces), FR / EN / DE, light and dark:
10k3a: the « + » of the tab bar opens a small sheet (Saisie du jour, Saisie rapide, Nouveau bidon, Événement), each row
opens its sheet and back closes it; no big buttons at the top of the Journal; one space only: no « Saisie rapide ».
Usage: npm run preview:build && PYTHONPATH=scripts python3 scripts/e2e-10k3.py dist-preview/index.html <out dir> [fr,en,de]"""
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

ADD = {"fr": ["Saisie du jour", "Saisie rapide", "Nouveau bidon", "Événement"], "en": ["Today's entry", "Quick entry", "New tank", "Event"], "de": ["Tageseintrag", "Schnelleintrag", "Neuer Ansatz", "Ereignis"]}


def context(b, lang, theme, w=390):
    ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme)
    ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))
    return ctx, pg


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
            for row, sel in [("entry", "#e-date"), ("quick", "input[id^=q-]"), ("mix", "[data-slot=drawer-content] input"), ("event", "[data-slot=drawer-content] input")]:
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
    b.close()

print(json.dumps(checks, ensure_ascii=False, indent=1)[:3000])
print("errors:", errors[:12])
print("OK" if not errors else "FAIL")
sys.exit(0 if not errors else 1)
