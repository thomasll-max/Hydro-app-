"""README captures (docs/screenshots/), preview build with a cycle and a few entries posed in the base:
apercu.png (Aujourd'hui, Journal, Calendrier, Graphiques, Outils in dark, side by side) and today / calendar / tools
in light. Usage: npm run preview:build && PYTHONPATH=scripts python3 scripts/readme-shots.py dist-preview/index.html"""
import sys, json, pathlib, datetime, subprocess
from playwright.sync_api import sync_playwright
from PIL import Image
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path("docs/screenshots"); out.mkdir(parents=True, exist_ok=True)
tmp = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else pathlib.Path("/tmp")
ago = lambda n: (datetime.date.today() - datetime.timedelta(days=n)).isoformat()
base = json.loads(subprocess.check_output(["npx", "-y", "tsx", "-e", 'import { thomasGrow } from "./src/data/thomas-grow.ts"; console.log(JSON.stringify(thomasGrow("2026-10-19T06:00:00Z").cycles[0]))'], text=True).strip().splitlines()[-1])
docs = {"cycles/cur": {**base, "id": "cur", "name": "Cycle 7", "spaceId": "floraison", "germinationDate": ago(70), "vegDate": ago(60), "flipDate": ago(38), "createdAt": f"{ago(70)}T08:00:00Z"}}
tg = {"stage": "bulk", "dryback": {"lo": 40, "hi": 50}, "ecRunoff": {"lo": 3, "hi": 4}, "phRunoff": {"lo": 6.0, "hi": 6.4}, "vpd": {"lo": 1.2, "hi": 1.6}}
for n in range(12, -1, -1):
    d = ago(n)
    docs[f"entries/{d}_floraison"] = {"schemaVersion": 2, "id": f"{d}_floraison", "date": d, "time": "08:10", "spaceId": "floraison", "cycleId": "cur", "createdAt": "x", "updatedAt": "x",
        "dryback": 38 + n % 9, "ecRunoff": round(3.2 + (n % 5) * 0.25, 1), "phRunoff": 6.2, "tempDay": 25, "rh": 58, "vpd": round(1.25 + (n % 4) * 0.08, 2), "targets": tg}
for pl, h in [("P1", 88), ("P2", 91)]:
    docs[f"entries/{ago(0)}_floraison_{pl}"] = {"schemaVersion": 2, "id": f"{ago(0)}_floraison_{pl}", "date": ago(0), "spaceId": "floraison", "plantId": pl, "cycleId": "cur", "heightCm": h, "createdAt": "x", "updatedAt": "x"}

SEED = """(docs) => new Promise((res, rej) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => { const tx = r.result.transaction('docs', 'readwrite'); const s = tx.objectStore('docs'); for (const [k, v] of Object.entries(docs)) s.put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error) } })"""


def shoot(theme, screens):
    files = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1, color_scheme=theme)
        ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'fr',updatedAt:'2026-01-01T00:00:00Z'}}))")
        serve_fonts(ctx)
        pg = ctx.new_page()
        pg.goto(f"file://{page_file}"); pg.wait_for_timeout(2000)
        pg.evaluate(SEED, docs); pg.reload(); pg.wait_for_timeout(2500)
        pg.get_by_role("group").first.get_by_role("button", name="Floraison").click(); pg.wait_for_timeout(800)
        # The « Premiers pas » card is the user's own progress: hidden for the README.
        if pg.locator("[aria-label='Masquer'], [aria-label='Masquer le guide']").count(): pg.locator("[aria-label='Masquer'], [aria-label='Masquer le guide']").first.click()
        for name, hash_ in screens:
            pg.goto(f"file://{page_file}{hash_}"); pg.reload(); pg.wait_for_timeout(2200)
            # The preview build stores on the device and says so: not part of the app's real look.
            pg.evaluate("() => [...document.querySelectorAll('p')].filter((p) => p.textContent.includes('sur ce téléphone uniquement')).forEach((p) => p.parentElement.remove())")
            pg.wait_for_timeout(200)
            f = tmp / f"readme-{name}-{theme}.png"
            pg.screenshot(path=str(f))
            files.append(f)
        b.close()
    return files


dark = shoot("dark", [("today", ""), ("journal", "#journal"), ("calendar", "#calendar"), ("charts", "#charts"), ("tools", "#tools")])
sheet = Image.new("RGB", (1740, 740), (13, 19, 16))
for i, f in enumerate(dark):
    im = Image.open(f).resize((348, 753)).crop((0, 0, 348, 740))
    sheet.paste(im, (i * 348, 0))
sheet.save(out / "apercu.png")
for f, name in zip(shoot("light", [("today", ""), ("calendar", "#calendar"), ("tools", "#tools")]), ["today", "calendar", "tools"]):
    Image.open(f).save(out / f"{name}-clair.png")
print("README captures:", sorted(x.name for x in out.iterdir()))
