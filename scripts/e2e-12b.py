"""Lot 12b (galerie photo et frise) in the browser, local build with the one-year simulation at 19 October 2026 and
300 photos added to its journal (whole-space and plant entries of cycles 2 to 5), one of them missing on the device:
- « Photos · 301 » at the top of the Journal opens the gallery: groups by week of the cycle (« Floraison S9 »), the
  date in mono on each tile, the first thumbnails quickly, made once and kept (the same count after a reload);
- the missing photo shows a warning, not an empty tile;
- filters (cycle, plant, tag) with their summary;
- a photo full screen: « 1 sur N », a swipe to the next one, the day's values under it, tags saved at once (an
  observation tag and a free tag typed), « Photo de la semaine », the back gesture closes the viewer;
- the strip of a cycle: one photo per week with the slider, the chosen photo used for its week, a plant's strip;
- tags at capture: from a photo's thumbnail in the day's entry, saved with the entry;
- the review's « Photos » shortcut; FR / EN / DE, light and dark, 390 and 360, no sideways scrolling.
Usage: npm run build:local && npx -y tsx scripts/sim/build.ts <sim dir> && PYTHONPATH=scripts python3 scripts/e2e-12b.py dist-local <sim dir> <out dir>"""
import sys, json, pathlib, threading, http.server, functools, socketserver, re, time
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

site = pathlib.Path(sys.argv[1]).resolve(); sim = pathlib.Path(sys.argv[2])
out = pathlib.Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
errors, checks = [], {}
LOAD = re.search(r'LOAD = """(.*?)"""', pathlib.Path("scripts/sim/browse.py").read_text(), re.S).group(1)
DAY = "2026-10-19"

# 300 photos: whole-space entries of cycles 2–5 (one each, some two), plant entries (P2) for a plant's strip.
base = json.loads((sim / "checkpoints" / f"{DAY}.json").read_text())
E = base["collections"]["entries"]
room = sorted([k for k, e in E.items() if e.get("cycleId") in ("cycle-2", "cycle-3", "cycle-4", "cycle-5") and not e.get("plantId")], key=lambda k: E[k]["date"])
plant = sorted([k for k, e in E.items() if e.get("cycleId") in ("cycle-2", "cycle-3", "cycle-4", "cycle-5") and e.get("plantId")], key=lambda k: (E[k]["cycleId"] != "cycle-2" or E[k]["plantId"] != "P2", E[k]["date"]))
PHOTOS = []
n = 0
for k in room:
    if n >= 280: break
    ids = [f"local-p{n}"] + ([f"local-p{n + 1}"] if n % 9 == 0 else [])
    n += len(ids)
    E[k]["photos"] = ids
    PHOTOS += ids
for k in plant[:300 - n]:
    E[k]["photos"] = [f"local-p{n}"]
    PHOTOS.append(f"local-p{n}")
    n += 1
# A few tags already there, and one photo the device no longer has (the most recent entry of cycle 5).
first = room[0]
E[first]["photoTags"] = {E[first]["photos"][0]: {"free": ["trichomes"]}}
last5 = [k for k in room if E[k]["cycleId"] == "cycle-5"][-1]
E[last5]["photos"] = E[last5].get("photos", []) + ["local-missing"]
TOTAL = len(PHOTOS) + 1

ADD = """async (ids) => {
  const db = await new Promise((ok, ko) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error) })
  const c = document.createElement('canvas'); c.width = 800; c.height = 600; const g = c.getContext('2d')
  for (let i = 0; i < ids.length; i++) {
    g.fillStyle = `hsl(${(i * 37) % 360} 45% 45%)`; g.fillRect(0, 0, 800, 600)
    g.fillStyle = '#fff'; g.font = 'bold 120px sans-serif'; g.fillText(String(i), 60, 360)
    const b = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.7))
    await new Promise((ok) => { const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').put(b, ids[i]); tx.oncomplete = ok })
  }
  db.close(); return ids.length
}"""
THUMBS = """() => new Promise((res) => { const r = indexedDB.open('hydro-thumbs', 1); r.onupgradeneeded = () => r.result.createObjectStore('thumbs'); r.onsuccess = () => { const q = r.result.transaction('thumbs').objectStore('thumbs').count(); q.onsuccess = () => res(q.result) }; r.onerror = () => res(-1) })"""
DOC = """(p) => new Promise((res) => { const r = indexedDB.open('hydro'); r.onsuccess = () => { const g = r.result.transaction('docs').objectStore('docs').get(p); g.onsuccess = () => res(g.result ?? null) } })"""


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(site)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{httpd.server_address[1]}/"


def start(b, lang="fr", theme="light", w=390, space="all", photos=True):
    backup = json.loads(json.dumps(base))
    backup["collections"]["settings"]["main"].update({"lang": lang, "theme": theme, "space": space})
    ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme, timezone_id="Europe/Oslo", locale="fr-FR", service_workers="block", reduced_motion="reduce")
    ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.on("console", lambda m: m.type == "error" and "local-missing" not in m.text and errors.append(f"console {m.text}"))
    pg.clock.install(time=f"{DAY}T08:30:00+02:00"); pg.clock.resume()
    pg.goto(url); pg.wait_for_timeout(1500); pg.evaluate(LOAD, backup)
    if photos: pg.evaluate(ADD, PHOTOS)
    pg.reload(); pg.wait_for_timeout(2500)
    return ctx, pg


def gallery(pg):
    pg.goto(f"{url}#journal"); pg.wait_for_timeout(1200)
    pg.click("#journal-photos"); pg.wait_for_selector("#gallery-page")


def loaded(pg):
    return pg.evaluate("() => [...document.querySelectorAll('[data-photo] img')].filter((i) => i.complete && i.naturalWidth).length")


with sync_playwright() as p:
    b = p.chromium.launch()

    # 1. The gallery with 300 photos: quick first thumbnails, groups by cycle week, thumbnails made once.
    ctx, pg = start(b)
    pg.goto(f"{url}#journal"); pg.wait_for_timeout(1200)
    link = pg.locator("#journal-photos").inner_text()
    t0 = time.time()
    pg.click("#journal-photos"); pg.wait_for_selector("#gallery-page")
    pg.wait_for_function("() => [...document.querySelectorAll('[data-photo] img')].filter((i) => i.complete && i.naturalWidth).length >= 9", timeout=15000)
    first_ms = round((time.time() - t0) * 1000)
    sub = pg.locator("#photos-sub").inner_text()
    heads = pg.locator("#photos-weeks h2").all_inner_texts()[:3]
    tile = pg.locator("[data-photo]").nth(1).inner_text()
    missing = pg.locator("[data-missing]").count()
    pg.screenshot(path=str(out / "galerie-fr.png"))
    if TOTAL != 301 or link != f"Photos · {TOTAL}" or sub != f"{TOTAL} photos" or not heads or not heads[0].startswith("Floraison S") or not re.match(r"^\d{2}/\d{2}", tile) or missing < 1 or first_ms > 6000:
        errors.append(f"gallery {link!r} {sub!r} {heads} {tile!r} missing={missing} {first_ms} ms")
    # Every week shown (« Plus ancien »), every thumbnail made, then kept: same count after a reload.
    while pg.locator("#photos-older").count():
        pg.click("#photos-older"); pg.wait_for_timeout(200)
    tiles = pg.locator("[data-photo]").count()
    t1 = time.time()
    pg.evaluate("async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) } }")
    for _ in range(90):
        if pg.evaluate(THUMBS) >= TOTAL - 1: break
        pg.wait_for_timeout(1000)
    all_ms = round((time.time() - t1) * 1000)
    made = pg.evaluate(THUMBS)
    pg.reload(); pg.wait_for_selector("#gallery-page"); pg.wait_for_timeout(2500)
    again = pg.evaluate(THUMBS)
    if tiles != TOTAL or made != TOTAL - 1 or again != made: errors.append(f"thumbs tiles={tiles} made={made} again={again}")
    checks["gallery"] = {"link": link, "firstThumbsMs": first_ms, "allThumbsMs": all_ms, "tiles": tiles, "thumbsKept": [made, again], "heads": heads}

    # 2. Filters: cycle 2, then the tag « trichomes ».
    pg.click("#photos-filters"); pg.wait_for_timeout(400)
    pg.locator("[role=radiogroup][aria-label=Cycle] [role=radio]", has_text="Cycle 2").click(); pg.wait_for_timeout(200)
    pg.locator("[role=radiogroup][aria-label=Étiquette] [role=radio]", has_text="trichomes").click(); pg.wait_for_timeout(200)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
    fsum = pg.locator("#photos-filter-bar").inner_text().split("\n")[0]
    fcount = pg.locator("#photos-sub").inner_text()
    if fsum != "Cycle 2 · trichomes" or fcount != "1 photo": errors.append(f"filters {fsum!r} {fcount!r}")
    pg.locator("#photos-filter-bar button").click(); pg.wait_for_timeout(400)
    checks["filters"] = [fsum, fcount]

    # 3. Full screen: count, swipe, values, tags saved at once, photo of the week, back gesture.
    pg.locator("[data-photo]").nth(2).click(); pg.wait_for_selector("#photo-viewer"); pg.wait_for_timeout(500)
    c1 = pg.locator("#viewer-count").inner_text()
    box = pg.locator("#viewer-stage").bounding_box()
    pg.mouse.move(box["x"] + box["width"] * 0.8, box["y"] + box["height"] / 2); pg.mouse.down()
    pg.mouse.move(box["x"] + box["width"] * 0.2, box["y"] + box["height"] / 2, steps=6); pg.mouse.up(); pg.wait_for_timeout(500)
    c2 = pg.locator("#viewer-count").inner_text()
    vals = pg.locator("#viewer-values").inner_text()
    pg.screenshot(path=str(out / "plein-ecran-fr.png"))
    pid = pg.evaluate("() => document.querySelector('#viewer-img')?.src")
    pg.locator("#photo-tags [data-tag='obs:yellowing']").click(); pg.wait_for_timeout(500)
    pg.fill("#photo-tag-input", "Racines"); pg.click("#photo-tag-add"); pg.wait_for_timeout(600)
    pg.click("#viewer-week"); pg.wait_for_timeout(700)
    pressed = [pg.locator("#photo-tags [data-tag='obs:yellowing']").get_attribute("aria-pressed"), pg.locator("#photo-tags [data-tag='free:racines']").get_attribute("aria-pressed"), pg.locator("#viewer-week").get_attribute("aria-pressed")]
    pg.locator("#viewer-panel").evaluate("(e) => e.scrollTo(0, 9999)"); pg.screenshot(path=str(out / "etiquettes-fr.png"))
    # Which photo is it: the 4th tile of the gallery's order.
    photo4 = pg.evaluate("() => document.querySelectorAll('[data-photo]')[3].dataset.photo")
    owner = next(k for k, e in E.items() if photo4 in (e.get("photos") or []))
    doc = pg.evaluate(DOC, f"entries/{owner}")
    cyc = pg.evaluate(DOC, f"cycles/{E[owner]['cycleId']}")
    tags = (doc.get("photoTags") or {}).get(photo4)
    if c1 != f"3 sur {TOTAL}" or c2 != f"4 sur {TOTAL}" or not vals.strip() or pressed != ["true", "true", "true"] or tags != {"obs": ["yellowing"], "free": ["racines"]} or photo4 not in (cyc.get("weekPhotos") or {}).values():
        errors.append(f"viewer {c1} {c2} {vals!r} {pressed} {tags} {cyc.get('weekPhotos')}")
    pg.evaluate("history.back()"); pg.wait_for_timeout(600)
    if pg.locator("#photo-viewer").count() or not pg.locator("#gallery-page").count(): errors.append("back gesture does not close the viewer")
    checks["viewer"] = {"count": [c1, c2], "values": vals, "tags": tags}

    # 4. The strip of cycle 2 (the photo of the week chosen above belongs to some cycle: use its cycle).
    cid = E[owner]["cycleId"]
    pg.goto(f"{url}#journal/frise/{cid}"); pg.wait_for_selector("#strip-page"); pg.wait_for_timeout(1200)
    weeks = pg.locator("[data-strip-week]").count()
    last = pg.locator("#strip-week").inner_text()
    pg.fill("#strip-slider", "0"); pg.wait_for_timeout(500)
    firstw = pg.locator("#strip-week").inner_text()
    pg.screenshot(path=str(out / "frise-fr.png"))
    # Go to the week of the chosen photo: its date says « photo choisie ».
    k = pg.evaluate(f"""() => {{ const d = '{E[owner]['date']}'; const ws = [...document.querySelectorAll('[data-strip-week]')].map((b) => b.dataset.stripWeek); let i = 0; ws.forEach((m, j) => {{ if (m <= d) i = j }}); return i }}""")
    pg.fill("#strip-slider", str(k)); pg.wait_for_timeout(500)
    chosen = pg.locator("#strip-date").inner_text()
    img_ok = pg.evaluate("() => { const i = document.querySelector('#strip-img'); return !!i && i.complete && i.naturalWidth > 0 }")
    if weeks < 8 or not firstw.startswith(("Semis", "Végé", "Floraison")) or "photo choisie" not in chosen or not img_ok: errors.append(f"strip weeks={weeks} {last!r} {firstw!r} {chosen!r} img={img_ok}")
    pg.goto(f"{url}#journal/frise/cycle-2/P2"); pg.wait_for_selector("#strip-page"); pg.wait_for_timeout(800)
    p2 = pg.locator("[data-strip-week]").count()
    if p2 < 1 or pg.locator("#strip-plants [aria-checked=true]").inner_text() != "P2": errors.append(f"plant strip {p2}")
    checks["strip"] = {"weeks": weeks, "first": firstw, "last": last, "chosen": chosen, "P2": p2}
    ctx.close()

    # 5. Tags at capture: the day's entry of a photo, its thumbnail, the tag sheet, saved with the entry.
    ctx, pg = start(b, space="floraison")
    pg.goto(f"{url}#journal/photos"); pg.wait_for_selector("#gallery-page"); pg.wait_for_timeout(1200)
    pg.locator("[data-photo]").nth(1).click(); pg.wait_for_selector("#photo-viewer"); pg.wait_for_timeout(300)
    photo2 = pg.evaluate("() => document.querySelectorAll('[data-photo]')[1].dataset.photo")
    owner2 = next(k for k, e in E.items() if photo2 in (e.get("photos") or []))
    pg.click("#viewer-entry"); pg.wait_for_selector("#e-when"); pg.wait_for_timeout(600)
    if not pg.locator("#e-note-box").count() and pg.locator("#e-note-open").count(): pg.click("#e-note-open"); pg.wait_for_timeout(300)
    pg.locator(f"[data-thumb='{photo2}'] [data-tags-open]").click(); pg.wait_for_selector("#photo-tags"); pg.wait_for_timeout(300)
    pg.locator("#photo-tags [data-tag='obs:claws']").click(); pg.wait_for_timeout(200)
    pg.screenshot(path=str(out / "saisie-etiquettes-fr.png"))
    pg.locator("[data-slot=drawer-content]").last.locator("[data-slot=drawer-footer] button").click(); pg.wait_for_timeout(500)
    pg.click("#e-save"); pg.wait_for_timeout(1200)
    doc2 = pg.evaluate(DOC, f"entries/{owner2}")
    if (doc2.get("photoTags") or {}).get(photo2) != {"obs": ["claws"]}: errors.append(f"tags at capture {doc2.get('photoTags')}")
    checks["capture"] = (doc2.get("photoTags") or {}).get(photo2)
    # The review's shortcut.
    pg.goto(f"{url}#journal/bilan/cycle-2"); pg.wait_for_selector("#review-page"); pg.wait_for_timeout(500)
    sc = pg.locator("#review-photos").inner_text() if pg.locator("#review-photos").count() else ""
    pg.click("#review-photos"); pg.wait_for_selector("#gallery-page"); pg.wait_for_timeout(600)
    if not sc.startswith("Photos · ") or "Cycle 2" not in pg.locator("#photos-filter-bar").inner_text(): errors.append(f"review shortcut {sc!r}")
    ctx.close()

    # 6. EN / DE, dark, 360: gallery, viewer, strip; no sideways scrolling.
    for lang, theme, w, title in [("en", "dark", 360, "Photos"), ("de", "light", 360, "Fotos"), ("de", "dark", 390, "Fotos"), ("fr", "dark", 360, "Photos")]:
        ctx, pg = start(b, lang, theme, w)
        gallery(pg); pg.wait_for_timeout(1500)
        got = pg.locator("#gallery-page h1").inner_text()
        pg.screenshot(path=str(out / f"galerie-{lang}-{theme}-{w}.png"))
        sw = pg.evaluate("() => document.documentElement.scrollWidth")
        pg.locator("[data-photo]").first.click(); pg.wait_for_selector("#photo-viewer"); pg.wait_for_timeout(600)
        pg.screenshot(path=str(out / f"plein-ecran-{lang}-{theme}-{w}.png"))
        pg.click("#viewer-close"); pg.wait_for_timeout(300)
        pg.goto(f"{url}#journal/frise/cycle-3"); pg.wait_for_selector("#strip-page"); pg.wait_for_timeout(1000)
        pg.screenshot(path=str(out / f"frise-{lang}-{theme}-{w}.png"))
        sw2 = pg.evaluate("() => document.documentElement.scrollWidth")
        if got != title or sw > w or sw2 > w: errors.append(f"{lang} {theme} {w} {got} {sw}/{sw2}")
        ctx.close()
    b.close()

print(json.dumps(checks, ensure_ascii=False, indent=1))
print("errors:", errors)
print("OK" if not errors else "FAIL")
