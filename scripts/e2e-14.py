"""Lot 14 (toute la gamme Athena) in the browser, preview build (Thomas's grow), FR / EN / DE, light and dark, 390 and
360 px.
14a: Réglages offers the two Athena lines and « Autre marque », one line of explanation under each; changing line while a
cycle runs asks first; once Blended: CaMg and PK among the add-ons, Nutrition makes a Blended recipe (A / B, never a Pro
product); Repères shows the Blended program (p. 58) and manual method (p. 60) beside the Pro Line; nothing cut, no
console error.
Usage: npm run preview:build && PYTHONPATH=scripts python3 scripts/e2e-14.py dist-preview/index.html <out dir> [fr,en,de]"""
import sys, pathlib
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
LANGS = sys.argv[3].split(",") if len(sys.argv) > 3 else ["fr", "en", "de"]
errors, checks = [], {}

CUT = """() => [...document.querySelectorAll('button, [role=tab], [role=radio], label, h1, h2, h3, a, td, th')].filter((el) => {
  const r = el.getBoundingClientRect(); if (!r.width || el.closest('.truncate, [class*=truncate], [class*=line-clamp], [class*=sr-only], .overflow-x-auto, .no-scrollbar')) return false
  return el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible' || r.right > innerWidth + 0.5
}).map((el) => `${el.tagName} «${el.textContent.trim().slice(0, 30)}» ${Math.round(el.getBoundingClientRect().right)}`).slice(0, 8)"""

# A text wider than its box (a centred word spilling on both sides is not caught by CUT).
TEXT_OUT = """(sel) => [...document.querySelectorAll(sel)].filter((b) => { const r = document.createRange(); r.selectNodeContents(b); const t = r.getBoundingClientRect(); const bb = b.getBoundingClientRect()
  return t.left < bb.left - 0.5 || t.right > bb.right + 0.5 }).map((b) => `text out «${b.textContent}»`)"""

LINES = """() => [...document.querySelectorAll('#g-lines [role=radio]')].map((b) => ({ line: b.dataset.line, on: b.getAttribute('aria-checked') === 'true',
  name: document.getElementById(b.getAttribute('aria-labelledby'))?.textContent, note: document.getElementById(b.getAttribute('aria-describedby'))?.textContent,
  h: Math.round(b.getBoundingClientRect().height) }))"""

WORDS = {
    "fr": {"blended": "Programme Blended", "manualBlended": "Arrosage manuel Blended"},
    "en": {"blended": "Blended programme", "manualBlended": "Manual watering, Blended"},
    "de": {"blended": "Blended-Programm", "manualBlended": "Manuelle Bewässerung Blended"},
}


def open_page(b, lang, theme, w, route):
    ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme)
    ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))
    pg.goto(f"file://{page_file}{route}"); pg.wait_for_timeout(2500)
    return ctx, pg


with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in LANGS:
        for theme in ["dark", "light"]:
            for w in [390, 360]:
                tag = f"{lang}/{theme}/{w}"
                first = theme == "dark" and w == 390
                shot = first or (theme == "light" and w == 360)
                ctx, pg = open_page(b, lang, theme, w, "#tools/settings")
                pg.evaluate("document.querySelector('#g-lines').scrollIntoView({block: 'center'})"); pg.wait_for_timeout(300)
                lines = pg.evaluate(LINES)
                if [x["line"] for x in lines] != ["athena-pro", "athena-blended", "own"] or not all(x["note"] and x["h"] >= 54 for x in lines) or not lines[0]["on"]: errors.append(f"{tag} lines {lines}")
                cut = pg.evaluate(CUT)
                if cut: errors.append(f"{tag} settings cut {cut}")
                if shot: pg.screenshot(path=str(out / f"gamme-{lang}-{theme}-{w}.png"))
                checks.setdefault("lines", {})[lang] = [(x["name"], x["note"]) for x in lines]

                # Blended while a cycle runs: asked first, then CaMg and PK among the add-ons.
                pg.click("#g-lines [data-line=athena-blended]"); pg.wait_for_timeout(500)
                asked = pg.locator("#g-line-switch").count()
                if not asked: errors.append(f"{tag} no confirmation")
                if first: pg.screenshot(path=str(out / f"gamme-confirm-{lang}.png"))
                pg.click("#line-switch-ok"); pg.wait_for_timeout(1000)
                now = [x for x in pg.evaluate(LINES) if x["on"]]
                addons = pg.locator("#g-nut button[aria-pressed]").all_inner_texts()
                if [x["line"] for x in now] != ["athena-blended"] or "CaMg" not in addons or "PK" not in addons: errors.append(f"{tag} after switch {now} {addons}")

                # Nutrition: a Blended recipe, never a Pro product.
                pg.evaluate("location.hash = '#tools/nutrition'"); pg.wait_for_timeout(1500)
                text = pg.locator("main").inner_text()
                if "Athena Blended" not in text or not any(x in text for x in ["Grow A", "Bloom A"]) or any(x in text for x in ["Pro Grow", "Pro Bloom", "Pro Core"]): errors.append(f"{tag} nutrition {text[:200]!r}")
                cut = pg.evaluate(CUT) + pg.evaluate(TEXT_OUT, "#nut-phases button")
                if cut: errors.append(f"{tag} nutrition cut {cut}")
                if shot: pg.screenshot(path=str(out / f"recette-blended-{lang}-{theme}-{w}.png"), full_page=True)

                # Repères: the Blended tables beside the Pro Line's.
                pg.evaluate("location.hash = '#tools/reperes'"); pg.wait_for_timeout(1000)
                for key in ["blended", "manualBlended"]:
                    trig = pg.get_by_role("button", name=WORDS[lang][key])
                    if not trig.count(): errors.append(f"{tag} reperes {key} missing"); continue
                    trig.first.click(); pg.wait_for_timeout(500)
                    rows = pg.locator("[data-state=open] table tbody tr").count()
                    want = 12 if key == "blended" else 10
                    if rows != want: errors.append(f"{tag} reperes {key} rows {rows}")
                    cut = pg.evaluate(CUT)
                    if cut: errors.append(f"{tag} reperes {key} cut {cut}")
                    if shot: pg.screenshot(path=str(out / f"reperes-{key}-{lang}-{theme}-{w}.png"))
                ctx.close()
    b.close()

print(checks)
print("errors:", errors[:40])
print("FAIL" if errors else "OK")
