"""Lot 10d2 in the browser at 390 px, preview build, with seeded data (an old harvested cycle, a current one, entries
with a gap of three weeks, plant entries, a daily reminder):
- Graphiques: « Cycle » follows the current cycle (not the 2025 one), « Tout » goes back to the first value, a line
  breaks across the gap, each chart has a name for screen readers, the overlay shows one space with its own colours,
  the top selector wins over the spaces ticked below;
- Journal: labelled filter rows, the space entry before the plants, no stray « 0 », filters reset with the selector;
- Aujourd'hui: the daily reminder is listed once;
- Nutrition: the tank just saved is shown, pH labels say « avant / après Balance ».
Usage: npm run preview:build && PYTHONPATH=scripts python3 scripts/e2e-10d2.py dist-preview/index.html <out dir>"""
import sys, pathlib, json, datetime, subprocess
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
errors, checks = [], {}
today = datetime.date.today()
iso = lambda n: (today - datetime.timedelta(days=n)).isoformat()
# A full cycle document, from the app's own fixture (nothing typed by hand here).
base = json.loads(subprocess.check_output(["npx", "-y", "tsx", "-e", 'import { thomasGrow } from "./src/data/thomas-grow.ts"; console.log(JSON.stringify(thomasGrow("2026-10-19T06:00:00Z").cycles[0]))'], text=True).strip().splitlines()[-1])
docs = {
    "cycles/old-2025": {**base, "id": "old-2025", "name": "Vieux 2025", "spaceId": "floraison", "germinationDate": "2025-10-20", "flipDate": "2025-12-20", "harvestDate": "2026-02-15", "createdAt": "2025-10-20T08:00:00Z"},
    "cycles/cur": {**base, "id": "cur", "name": "Cycle en cours", "spaceId": "floraison", "germinationDate": iso(45), "vegDate": iso(31), "createdAt": f"{iso(45)}T08:00:00Z"},
    "reminders/water": {"schemaVersion": 2, "id": "water", "kind": "custom", "title": "Arroser à la main", "start": f"{iso(5)}T00:05", "rrule": "FREQ=DAILY", "spaceId": "floraison", "createdAt": "x"},
}
for n in list(range(45, 35, -1)) + list(range(14, -1, -1)):
    day = iso(n)
    docs[f"entries/{day}_floraison"] = {"schemaVersion": 2, "id": f"{day}_floraison", "date": day, "spaceId": "floraison", "cycleId": "cur", "createdAt": "x", "updatedAt": "x",
        "dryback": 30 + n % 9, "ecRunoff": round(3.4 + (n % 5) * 0.2, 1), "phRunoff": 6.0, "tempDay": 25, "rh": 60, "vpd": 1.1,
        "targets": {"stage": "veg", "dryback": {"lo": 25, "hi": 50}}}
for p in ["P2", "P1"]:
    docs[f"entries/{iso(0)}_floraison_{p}"] = {"schemaVersion": 2, "id": f"{iso(0)}_floraison_{p}", "date": iso(0), "spaceId": "floraison", "plantId": p, "cycleId": "cur", "heightCm": 40, "createdAt": "x", "updatedAt": "x"}
for n in range(3):
    day = iso(n)
    docs[f"entries/{day}_colonne"] = {"schemaVersion": 2, "id": f"{day}_colonne", "date": day, "spaceId": "colonne", "createdAt": "x", "updatedAt": "x", "tempDay": 24, "rh": 65, "observations": [{"tag": "claws", "severity": 1}]}
docs[f"entries/{iso(70)}_floraison"] = {"schemaVersion": 2, "id": f"{iso(70)}_floraison", "date": iso(70), "spaceId": "floraison", "createdAt": "x", "updatedAt": "x", "tempDay": 22}
docs[f"entries/{iso(2)}_floraison"]["observations"] = []  # an empty list once: never a stray « 0 »
docs[f"entries/{iso(2)}_floraison"]["actions"] = []

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark")
    ctx.add_init_script("localStorage.setItem('hydro.ui', JSON.stringify({theme:'dark',lang:'fr',updatedAt:'2026-01-01T00:00:00Z'}))")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(f"file://{page_file}#charts"); pg.wait_for_timeout(2500)
    pg.evaluate("""(docs) => new Promise((res, rej) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => { const tx = r.result.transaction('docs', 'readwrite'); const s = tx.objectStore('docs'); for (const [k, v] of Object.entries(docs)) s.put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error) } })""", docs)
    pg.reload(); pg.wait_for_timeout(3000)
    rng = lambda: pg.locator("text=/^du .* au /").first.inner_text()

    # Graphiques
    pg.get_by_role("radio", name="Cycle").click(); pg.wait_for_timeout(800)
    checks["cycleRange"] = rng()
    pg.get_by_role("radio", name="Tout").click(); pg.wait_for_timeout(800)
    checks["allRange"] = rng()
    # Only Floraison ticked: one space, its dryback line in two pieces (the gap).
    if pg.locator("#ch-spaces [aria-pressed=true]", has_text="Colonne").count():
        pg.locator("#ch-spaces button", has_text="Colonne").click(); pg.wait_for_timeout(600)
    checks["drybackLines"] = pg.locator("[data-curve=dryback] .recharts-line").count()
    checks["chartName"] = pg.locator("[data-curve=dryback] [role=img]").get_attribute("aria-label")
    pg.screenshot(path=str(out / "01-charts-all.png"), full_page=True)
    pg.locator("#ch-spaces button", has_text="Colonne").click(); pg.wait_for_timeout(500)
    pg.get_by_role("radio", name="Superposées").click(); pg.wait_for_timeout(800)
    checks["overlayPicker"] = pg.get_by_role("group", name="Espace superposé").count() + pg.locator("[aria-label='Espace superposé']").count()
    pg.screenshot(path=str(out / "02-overlay.png"), full_page=True)
    pg.get_by_role("radio", name="Un graphique par courbe").click(); pg.wait_for_timeout(300)
    # The top selector wins over the ticked spaces.
    pg.get_by_role("group", name="Espace affiché").get_by_role("button", name="Colonne").click(); pg.wait_for_timeout(800)
    checks["selectorWins"] = [b.inner_text().strip() for b in pg.locator("#ch-spaces [aria-pressed=true]").all()]
    pg.get_by_role("group", name="Espace affiché").get_by_role("button", name="Tous").click(); pg.wait_for_timeout(500)

    # Journal
    pg.get_by_role("tab", name="Journal").click(); pg.wait_for_timeout(1200)
    checks["filterLabels"] = [x for x in ["Espace", "Tag"] if pg.locator("[role=radiogroup] span", has_text=x).count()]
    pg.get_by_role("radiogroup", name="Espace").get_by_role("radio", name="Colonne").click(); pg.wait_for_timeout(300)
    pg.get_by_role("radiogroup", name="Tag").get_by_role("radio", name="Griffes").click(); pg.wait_for_timeout(300)
    checks["filteredRows"] = pg.locator("ul li button", has_text="Colonne").count()
    pg.get_by_role("group", name="Espace affiché").get_by_role("button", name="Floraison").click(); pg.wait_for_timeout(800)
    checks["afterSelector"] = pg.locator("text=Aucune saisie avec ces filtres").count() == 0 and pg.locator("text=Hauteur").count() > 0
    first = pg.locator("ul.mt-1 > li").first.inner_text()
    checks["roomFirst"] = "P1" not in first.split("\n")[0] and "P2" not in first.split("\n")[0]
    checks["noStrayZero"] = not any(t.strip() == "0" for t in pg.locator("ul.mt-1 > li button > div").all_inner_texts())
    pg.screenshot(path=str(out / "03-journal.png"), full_page=True)

    # Aujourd'hui: one line for the daily reminder.
    pg.get_by_role("tab", name="Aujourd'hui").click(); pg.wait_for_timeout(1500)
    # « À venir » rows carry a « Fait » button (the Bonjour card has its own « Rappel » line).
    checks["reminderLines"] = pg.locator("li", has_text="Arroser à la main").filter(has=pg.get_by_role("button", name="Fait")).count()
    checks["reminderLate"] = pg.locator("li", has_text="heure passée").count()
    pg.screenshot(path=str(out / "04-today.png"), full_page=True)

    # Nutrition
    pg.get_by_role("tab", name="Outils").click(); pg.wait_for_timeout(400)
    pg.get_by_role("button", name="Nutrition").first.click(); pg.wait_for_timeout(900)
    checks["phLabels"] = [pg.locator("label[for=n-phb]").inner_text(), pg.locator("label[for=n-pha]").inner_text()]
    if not pg.input_value("#n-vol"): pg.fill("#n-vol", "50")
    pg.get_by_role("button", name="Enregistrer ce bidon").last.click(); pg.wait_for_timeout(1200)
    checks["lastTank"] = pg.locator("#nut-last").inner_text() if pg.locator("#nut-last").count() else ""
    pg.locator("#nut-last").scroll_into_view_if_needed()
    pg.screenshot(path=str(out / "05-nutrition.png"))
    ctx.close()
    b.close()

print(json.dumps(checks, ensure_ascii=False, indent=1))
print("errors:", errors[:5])
ok = (
    checks["cycleRange"].startswith("du ") and "2025" not in checks["cycleRange"] and checks["allRange"] != checks["cycleRange"]
    and checks["drybackLines"] == 2 and "valeurs" in (checks["chartName"] or "") and checks["overlayPicker"] > 0
    and checks["selectorWins"] == ["Colonne"] and checks["filterLabels"] == ["Espace", "Tag"] and checks["filteredRows"] > 0
    and checks["afterSelector"] and checks["roomFirst"] and checks["noStrayZero"] and checks["reminderLines"] == 1
    and checks["phLabels"] == ["pH avant Balance", "pH après Balance"] and "enregistré à l'instant" in checks["lastTank"] and not errors
)
print("OK" if ok else "FAIL")
sys.exit(0 if ok else 1)
