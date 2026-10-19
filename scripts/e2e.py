"""End-to-end run on the local preview build (offline store = IndexedDB):
create cycle 1, add a tank, log 6 days of entries through the UI (timing the last one),
then capture Today / Journal / entry sheet at 390 px in dark+light x fr+en. Logs console errors.
Usage: python3 scripts/e2e.py <base url> <out dir>"""
import json, sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

base, out = sys.argv[1], pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
errors = []

DAYS = [  # date, tempDay, rh, morning, peak, runoffMl, ecRO, phRO, height
    ("2026-10-12", 26, 60, 8.9, 10.2, 20, 6.2, 6.0, 52),
    ("2026-10-13", 26.5, 58, 8.7, 10.3, 25, 6.8, 6.1, 55),
    ("2026-10-14", 25.5, 61, 8.6, 10.2, 18, 7.1, 6.2, 58),
    ("2026-10-15", 26, 59, 8.5, 10.3, 30, 7.4, 6.3, 61),
    ("2026-10-16", 26.2, 57, 8.4, 10.2, 22, 7.6, 6.4, 63),
    ("2026-10-17", 26, 58, 8.6, 10.3, 27, 7.8, 6.6, 66),
]

def fill_entry(pg, d):
    date, temp, rh, morning, peak, ro, ec, ph, h = d
    pg.click("#tab-plus"); pg.click("#add-entry")
    pg.wait_for_selector("#e-date")
    pg.fill("#e-date", date)
    pg.wait_for_timeout(150)
    for sel, v in [("#e-tempDay", temp), ("#e-rh", rh), ("#e-weightMorningKg", morning), ("#e-weightPeakKg", peak),
                   ("#e-runoffMl", ro), ("#e-ecRunoff", ec), ("#e-phRunoff", ph), ("#e-heightCm", h)]:
        pg.fill(sel, str(v).replace(".", ","))
    pg.get_by_role("button", name="Enregistrer", exact=True).click()
    pg.wait_for_selector("#e-date", state="detached", timeout=5000)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(base)
    pg.wait_for_timeout(1500)
    pg.screenshot(path=str(out / "0-empty-today.png"))

    # Cycle
    pg.get_by_role("button", name="Créer le cycle").first.click()
    pg.wait_for_selector("#c-germ")
    pg.fill("#c-germ", "2026-08-01"); pg.fill("#c-trans", "2026-08-15"); pg.fill("#c-flip", "2026-10-02"); pg.fill("#c-flow", "2000")
    pg.screenshot(path=str(out / "1-cycle-sheet.png"))
    pg.get_by_role("button", name="Enregistrer", exact=True).click()
    pg.wait_for_selector("#c-germ", state="detached")

    # Tank
    pg.get_by_role("tab", name="Journal").click(); pg.wait_for_timeout(400)
    pg.get_by_role("button", name="Nouveau bidon").click(); pg.wait_for_selector("#m-vol")
    pg.fill("#m-date", "2026-10-12"); pg.fill("#m-vol", "100"); pg.fill("#m-ec", "2,4"); pg.fill("#m-ph", "5,9")
    pg.get_by_role("button", name="Enregistrer", exact=True).click(); pg.wait_for_selector("#m-vol", state="detached")

    # Entries (first one also sets the carried settings)
    pg.get_by_role("tab", name="Aujourd'hui").click(); pg.wait_for_timeout(300)
    pg.click("#tab-plus"); pg.click("#add-entry"); pg.wait_for_selector("#e-date")
    pg.fill("#e-date", DAYS[0][0]); pg.wait_for_timeout(150)
    pg.get_by_role("button", name="Réglages repris de la veille").click()
    for sel, v in [("#e-volumePerPotMl", "2700"), ("#e-ecIn", "2,4"), ("#e-phIn", "5,9"), ("#e-lightPct", "80"), ("#e-ppfd", "850"), ("#e-photoperiodH", "12")]:
        pg.fill(sel, v)
    date, temp, rh, morning, peak, ro, ec, ph, h = DAYS[0]
    for sel, v in [("#e-tempDay", temp), ("#e-rh", rh), ("#e-weightMorningKg", morning), ("#e-weightPeakKg", peak), ("#e-runoffMl", ro), ("#e-ecRunoff", ec), ("#e-phRunoff", ph), ("#e-heightCm", h)]:
        pg.fill(sel, str(v).replace(".", ","))
    pg.get_by_role("button", name="Enregistrer", exact=True).click(); pg.wait_for_selector("#e-date", state="detached")

    for d in DAYS[1:-1]:
        fill_entry(pg, d)
    # Last one: check prefill and time it
    pg.click("#tab-plus"); pg.click("#add-entry"); pg.wait_for_selector("#e-date")
    pg.fill("#e-date", DAYS[-1][0]); pg.wait_for_timeout(200)
    prefill = pg.evaluate("['e-volumePerPotMl','e-ecIn','e-phIn','e-ppfd'].map(id => document.getElementById(id)?.value ?? '(closed)')")
    placeholder = pg.get_attribute("#e-tempDay", "placeholder")
    pg.get_by_role("button", name="Pointes brûlées").click()
    pg.get_by_role("button", name="Défoliation").click()
    pg.screenshot(path=str(out / "2-entry-sheet-dark-fr.png"))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(400)
    t0 = time.time()
    fill_entry(pg, DAYS[-1])
    elapsed = time.time() - t0

    # Lot 3: tools
    pg.get_by_role("tab", name="Outils").click(); pg.wait_for_timeout(500)
    pg.get_by_role("button", name="Arrosage", exact=False).first.click(); pg.wait_for_timeout(2200)
    pg.screenshot(path=str(out / "3-irrigation.png"), full_page=True)
    pg.get_by_role("button", name="Utiliser ces réglages pour le cycle").click(); pg.wait_for_timeout(600)
    pg.get_by_role("button", name="Outils").first.click(); pg.wait_for_timeout(400)
    pg.get_by_role("button", name="Nutrition", exact=False).first.click(); pg.wait_for_timeout(2200)
    pg.screenshot(path=str(out / "4-nutrition.png"), full_page=True)
    pg.get_by_role("button", name="Enregistrer ce bidon").click(); pg.wait_for_timeout(800)
    tanks = pg.evaluate("document.body.innerText.includes('Bidon enregistré')")

    # Captures in 4 combos
    for theme in ["dark", "light"]:
        for lang in ["fr", "en"]:
            pg.evaluate(f"localStorage.setItem('hydro.ui', JSON.stringify({json.dumps({'theme': theme, 'lang': lang, 'updatedAt': '2030-01-01T00:00:00Z'})}))")
            for tab in ["today", "journal", "tools"]:
                pg.goto(f"{base}#{tab}"); pg.reload(); pg.wait_for_timeout(4200)
                pg.screenshot(path=str(out / f"{tab}-{theme}-{lang}.png"), full_page=True)
                sw = pg.evaluate("document.documentElement.scrollWidth")
                if sw > 390: errors.append(f"{theme}/{lang}/{tab}: overflow {sw}")
    b.close()

print("tank saved toast:", tanks)
print(json.dumps({"prefill(volume,ecIn,phIn,ppfd)": prefill, "tempDay placeholder": placeholder, "scripted entry seconds": round(elapsed, 1), "fields typed": 8}, ensure_ascii=False))
print("\n".join(errors) if errors else "no console errors, no overflow")
