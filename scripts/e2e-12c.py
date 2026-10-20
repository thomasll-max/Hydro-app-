"""Lot 12c (fiche variété, photo pour Claude) in the browser.
A — local build with the one-year simulation at 19 October 2026 (cycle 3 written « blue zushi » on purpose, 6 photos
    in cycle 1): Outils → Variétés lists the three varieties, « écrite de 2 façons »; a variety's page: its cycles with
    the dry weight per plant (the cycle's weight ÷ pots when it grew alone, « donnée manquante » in a mixed cycle without
    plant weights, « en cours »), the flowering, « Bilan », the strip of its photos; « Fusionner » only when asked, then
    one spelling; notes and source saved in the grow and kept after a reload; the variety's card from the review and
    from a plant's sheet; FR / EN / DE, light and dark, 390 and 360.
B — preview build with a fake Claude runtime that may send images: « Ajouter une photo » in Demander à Claude, the
    photo sent as an image with the question and its rules; a photo of the gallery sent with « Demander à Claude »;
    without the image capability, no photo button anywhere.
Usage: npm run build:local && npm run preview:build && PYTHONPATH=scripts python3 scripts/e2e-12c.py dist-local <sim dir> dist-preview/index.html <out dir>"""
import sys, json, pathlib, threading, http.server, functools, socketserver, re, base64, struct, zlib
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

site = pathlib.Path(sys.argv[1]).resolve(); sim = pathlib.Path(sys.argv[2]); preview = pathlib.Path(sys.argv[3]).resolve()
out = pathlib.Path(sys.argv[4]); out.mkdir(parents=True, exist_ok=True)
errors, checks = [], {}
LOAD = re.search(r'LOAD = """(.*?)"""', pathlib.Path("scripts/sim/browse.py").read_text(), re.S).group(1)
DAY = "2026-10-19"
DOC = """(p) => new Promise((res) => { const r = indexedDB.open('hydro'); r.onsuccess = () => { const g = r.result.transaction('docs').objectStore('docs').get(p); g.onsuccess = () => res(g.result ?? null) } })"""

base = json.loads((sim / "checkpoints" / f"{DAY}.json").read_text())
C = base["collections"]
C["cycles"]["cycle-3"]["cultivars"] = ["blue zushi", "Melonade Runtz"]
E = C["entries"]
c1 = sorted([k for k, e in E.items() if e.get("cycleId") == "cycle-1" and not e.get("plantId")], key=lambda k: E[k]["date"])
PHOTOS = []
for i, k in enumerate(c1[::12][:6]):
    E[k]["photos"] = [f"local-v{i}"]
    PHOTOS.append(f"local-v{i}")
ADD = """async (ids) => {
  const db = await new Promise((ok, ko) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error) })
  const c = document.createElement('canvas'); c.width = 600; c.height = 450; const g = c.getContext('2d')
  for (let i = 0; i < ids.length; i++) {
    g.fillStyle = `hsl(${(i * 53) % 360} 45% 42%)`; g.fillRect(0, 0, 600, 450); g.fillStyle = '#fff'; g.font = 'bold 90px sans-serif'; g.fillText('S' + i, 40, 260)
    const b = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.7))
    await new Promise((ok) => { const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').put(b, ids[i]); tx.oncomplete = ok })
  }
  db.close(); return ids.length
}"""


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(site)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{httpd.server_address[1]}/"


def start(b, lang="fr", theme="light", w=390):
    backup = json.loads(json.dumps(base))
    backup["collections"]["settings"]["main"].update({"lang": lang, "theme": theme, "space": "floraison"})
    ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme, timezone_id="Europe/Oslo", locale="fr-FR", service_workers="block", reduced_motion="reduce")
    ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))
    pg.clock.install(time=f"{DAY}T08:30:00+02:00"); pg.clock.resume()
    pg.goto(url); pg.wait_for_timeout(1500); pg.evaluate(LOAD, backup); pg.evaluate(ADD, PHOTOS); pg.reload(); pg.wait_for_timeout(2500)
    return ctx, pg


def varieties(pg):
    pg.goto(f"{url}#tools"); pg.wait_for_timeout(800)
    pg.click("#tool-varieties"); pg.wait_for_selector("#varieties-list"); pg.wait_for_timeout(400)


def rows(pg):
    return pg.evaluate("() => [...document.querySelectorAll('#variety-cycles [data-cycle]')].map((d) => [d.dataset.cycle, d.querySelector('[data-per-plant]').innerText.replace(/\\u202f/g, ' '), !!d.querySelector('[data-review]'), d.querySelectorAll('[data-strip] button').length])")


with sync_playwright() as p:
    b = p.chromium.launch()

    # A1. The list, a variety's page, its cycles and its photos.
    ctx, pg = start(b)
    varieties(pg)
    lst = pg.evaluate("() => [...document.querySelectorAll('[data-variety]')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())")
    pg.screenshot(path=str(out / "varietes-fr.png"))
    if lst != ["Blue Zushi 3 cycles · écrite de 2 façons", "Cherry Limeade 1 cycle", "Melonade Runtz 3 cycles"]: errors.append(f"list {lst}")
    pg.click("[data-variety='blue zushi']"); pg.wait_for_selector("#variety-page"); pg.wait_for_timeout(1500)
    r = rows(pg)
    dry1 = C["cycles"]["cycle-1"]["harvest"]["dryG"]
    want1 = f"{dry1 / 4:.1f}".replace(".", ",").replace(",0", "")
    pg.screenshot(path=str(out / "fiche-fr.png"))
    if [x[0] for x in r] != ["cycle-6", "cycle-3", "cycle-1"] or not r[2][1].startswith(f"{want1} g par plante (poids du cycle ÷ pots)") or "floraison 9 sem. 0 j" not in r[2][1] or "donnée manquante" not in r[1][1] or not r[2][2] or r[2][3] != 6 or r[0][2]:
        errors.append(f"rows {r} want {want1}")
    if "en cours" not in pg.locator("#variety-cycles [data-cycle='cycle-6']").inner_text(): errors.append("running")
    checks["page"] = r

    # A2. « Fusionner », only when asked: one spelling afterwards.
    pg.click("[data-merge-into='Blue Zushi']"); pg.wait_for_timeout(500)
    msg = pg.locator("#v-merge-text").inner_text()
    pg.screenshot(path=str(out / "fusion-fr.png"))
    pg.click("#v-merge-ok"); pg.wait_for_timeout(1200)
    cy3 = pg.evaluate(DOC, "cycles/cycle-3")
    if msg != "1 cycle ou plante sera réécrit en « Blue Zushi ». Rien d'autre ne change." or cy3["cultivars"] != ["Blue Zushi", "Melonade Runtz"] or pg.locator("#variety-merge").count():
        errors.append(f"merge {msg!r} {cy3['cultivars']}")
    checks["merge"] = [msg, cy3["cultivars"]]

    # A3. Notes and source, in the grow, kept after a reload.
    pg.fill("#v-notes", "Stretch ×2 en S2, odeur de melon dès S5."); pg.fill("#v-source", "Breeder : Exotic Genetix (fiche du sachet)")
    pg.click("#v-save"); pg.wait_for_timeout(1000)
    grow = pg.evaluate(DOC, "grow/main")
    note = (grow.get("varietyNotes") or {}).get("blue zushi") or {}
    pg.reload(); pg.wait_for_selector("#variety-page"); pg.wait_for_timeout(1200)
    kept = pg.input_value("#v-notes")
    if note.get("notes") != "Stretch ×2 en S2, odeur de melon dès S5." or note.get("source") != "Breeder : Exotic Genetix (fiche du sachet)" or kept != note.get("notes"): errors.append(f"notes {note} {kept!r}")
    checks["notes"] = note
    # The strip of its photos opens the cycle's strip.
    pg.locator("#variety-cycles [data-cycle='cycle-1'] [data-strip-open]").click(); pg.wait_for_selector("#strip-page"); pg.wait_for_timeout(600)
    if pg.locator("[data-strip-week]").count() != 6: errors.append("variety strip")

    # A4. The card from the review and from a plant's sheet.
    pg.goto(f"{url}#journal/bilan/cycle-2"); pg.wait_for_selector("#review-page"); pg.wait_for_timeout(500)
    pg.locator("#review-varieties [data-variety-link]").first.click(); pg.wait_for_selector("#variety-page"); pg.wait_for_timeout(500)
    from_review = pg.locator("#variety-name").inner_text()
    pg.goto(f"{url}#journal"); pg.wait_for_timeout(1000)
    pg.click("#journal-plants"); pg.wait_for_timeout(500)
    pg.locator("[data-slot=drawer-content] .grid button").first.click(); pg.wait_for_selector("#p-variety"); pg.wait_for_timeout(300)
    label = pg.locator("#p-variety").inner_text()
    pg.click("#p-variety"); pg.wait_for_selector("#variety-page"); pg.wait_for_timeout(500)
    from_plant = pg.locator("#variety-name").inner_text()
    if from_review != "Melonade Runtz" or not label.startswith("Fiche « ") or from_plant not in ("Blue Zushi", "Melonade Runtz"): errors.append(f"links {from_review} {label} {from_plant}")
    checks["links"] = [from_review, label, from_plant]
    ctx.close()

    # A5. EN / DE, dark, 360.
    for lang, theme, w, title in [("en", "dark", 360, "Varieties"), ("de", "light", 360, "Sorten"), ("de", "dark", 390, "Sorten"), ("fr", "dark", 360, "Variétés")]:
        ctx, pg = start(b, lang, theme, w)
        varieties(pg)
        got = pg.locator("h1").first.inner_text()
        pg.screenshot(path=str(out / f"varietes-{lang}-{theme}-{w}.png"))
        pg.click("[data-variety='melonade runtz']"); pg.wait_for_selector("#variety-page"); pg.wait_for_timeout(1200)
        pg.screenshot(path=str(out / f"fiche-{lang}-{theme}-{w}.png"))
        sw = pg.evaluate("() => document.documentElement.scrollWidth")
        if got != title or sw > w: errors.append(f"{lang} {theme} {w} {got} {sw}")
        ctx.close()

    # B. Demander à Claude with a photo: a fake runtime that may (or may not) send images.
    def runtime(images):
        lim = "{ images: { maxCount: 4, maxBytes: 5000000, mediaTypes: ['image/jpeg', 'image/png'] } }" if images else "{}"
        return """
  window.__sent = []; window.__images = []; window.__reply = 'Je vois des feuilles un peu jaunes. Peut-être une carence, à vérifier avec l EC du runoff.';
  const fake = async (input, opts) => { window.__sent.push(input); window.__images.push((opts && opts.images || []).map((b) => b.size)); await new Promise((r) => setTimeout(r, 150)); return { text: window.__reply, truncated: false } };
  fake.limits = async () => (LIM);
  const store = new Map(); window.__store = store; const listeners = new Set();
  const snapDoc = (p) => ({ id: p.split("/").pop(), exists: store.has(p), data: () => (store.has(p) ? structuredClone(store.get(p)) : undefined) });
  const snapCol = (c) => ({ docs: [...store.keys()].filter((k) => k.slice(0, k.lastIndexOf("/")) === c).map(snapDoc) });
  const notify = () => listeners.forEach((f) => f());
  const watch = (f) => { listeners.add(f); queueMicrotask(f); return () => listeners.delete(f); };
  const db = {
    doc: (p) => ({ get: async () => snapDoc(p), set: async (d) => { store.set(p, structuredClone(d)); notify(); }, delete: async () => { store.delete(p); notify(); }, onSnapshot: (n) => watch(() => n(snapDoc(p))) }),
    collection: (c) => ({ get: async () => snapCol(c), onSnapshot: (n) => watch(() => n(snapCol(c))) }),
  };
  window.claude = { use: async (n) => (n === "sample" ? fake : n === "db" ? db : null) };
""".replace("LIM", lim)

    def png():
        raw = b"".join(b"\x00" + bytes([40, 120, 60] * 64) for _ in range(48))
        def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
        return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 64, 48, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")

    for images in (True, False):
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        ctx.add_init_script("localStorage.setItem('hydro.ui', JSON.stringify({theme:'light',lang:'fr',updatedAt:'2026-01-01T00:00:00Z'}))")
        ctx.add_init_script(runtime(images))
        serve_fonts(ctx)
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
        pg.goto(f"file://{preview}"); pg.wait_for_timeout(3000)
        pg.get_by_role("group").first.get_by_role("button", name="Floraison").click(); pg.wait_for_timeout(600)
        pg.goto(f"file://{preview}#tools/ask"); pg.wait_for_timeout(1500)
        add = pg.locator("#ask-photo-add").count()
        if not images:
            # Add a photo to an entry, then: no « Demander à Claude » on it either.
            pg.goto(f"file://{preview}#journal"); pg.wait_for_timeout(800)
            pg.click("#tab-plus"); pg.wait_for_timeout(400); pg.click("#add-entry"); pg.wait_for_selector("#e-when"); pg.wait_for_timeout(500)
            if pg.locator("#e-note-open").count(): pg.click("#e-note-open"); pg.wait_for_timeout(200)
            with pg.expect_file_chooser(timeout=5000) as fc: pg.click("#e-photo-add")
            fc.value.set_files(files=[{"name": "p.png", "mimeType": "image/png", "buffer": png()}]); pg.wait_for_timeout(1500)
            pg.click("#e-save"); pg.wait_for_timeout(1000)
            pg.goto(f"file://{preview}#journal/photos"); pg.wait_for_selector("#gallery-page"); pg.wait_for_timeout(800)
            pg.locator("[data-photo]").first.click(); pg.wait_for_selector("#photo-viewer"); pg.wait_for_timeout(500)
            if add or pg.locator("#viewer-ask").count(): errors.append(f"photo buttons without the image capability: {add}")
            checks["noImages"] = {"askAdd": add, "viewerAsk": pg.locator("#viewer-ask").count()}
            ctx.close()
            continue
        # The photo added in the tool, sent as an image with the question and its rules.
        # A real tap on « Ajouter une photo » opens the picker (not only a field filled by the test).
        with pg.expect_file_chooser(timeout=5000) as fc: pg.click("#ask-photo-add")
        fc.value.set_files(files=[{"name": "feuille.png", "mimeType": "image/png", "buffer": png()}]); pg.wait_for_timeout(800)
        prev = pg.locator("#ask-photo").inner_text()
        pg.fill("#ask-q", "Pourquoi ces feuilles jaunissent ?")
        pg.screenshot(path=str(out / "claude-photo-fr.png"))
        pg.locator("button", has_text="Demander").last.click(); pg.wait_for_timeout(1500)
        sent = pg.evaluate("JSON.stringify(window.__sent.at(-1))")
        imgs = pg.evaluate("window.__images.at(-1)")
        thread = pg.locator("#ask-thread").inner_text()
        pg.screenshot(path=str(out / "claude-reponse-fr.png"))
        if not prev.startswith("Photo du ") or "PHOTO JOINTE (prise le" not in sent or "Ne présente jamais un diagnostic comme certain" not in sent or len(imgs) != 1 or imgs[0] <= 0 or "Photo du " not in thread or pg.locator("#ask-photo").count():
            errors.append(f"ask photo {prev!r} {imgs} {sent[:120]} {thread[:80]!r}")
        # A photo of the gallery, sent with « Demander à Claude ».
        pg.goto(f"file://{preview}#journal"); pg.wait_for_timeout(800)
        pg.click("#tab-plus"); pg.wait_for_timeout(400); pg.click("#add-entry"); pg.wait_for_selector("#e-when"); pg.wait_for_timeout(500)
        if pg.locator("#e-note-open").count(): pg.click("#e-note-open"); pg.wait_for_timeout(200)
        with pg.expect_file_chooser(timeout=5000) as fc: pg.click("#e-photo-add")
        fc.value.set_files(files=[{"name": "p.png", "mimeType": "image/png", "buffer": png()}]); pg.wait_for_timeout(1500)
        pg.click("#e-save"); pg.wait_for_timeout(1000)
        pg.goto(f"file://{preview}#journal/photos"); pg.wait_for_selector("#gallery-page"); pg.wait_for_timeout(800)
        pg.locator("[data-photo]").first.click(); pg.wait_for_selector("#viewer-ask"); pg.wait_for_timeout(300)
        pg.click("#viewer-ask"); pg.wait_for_selector("#ask-photo"); pg.wait_for_timeout(500)
        pg.fill("#ask-q", "Et celle-ci ?"); pg.locator("button", has_text="Demander").last.click(); pg.wait_for_timeout(1500)
        imgs2 = pg.evaluate("window.__images.at(-1)")
        sent2 = pg.evaluate("JSON.stringify(window.__sent.at(-1))")
        if len(imgs2) != 1 or "PHOTO JOINTE (prise le" not in sent2 or "espace « Floraison »" not in sent2: errors.append(f"gallery to Claude {imgs2} {sent2[-300:]}")
        checks["images"] = {"tool": imgs, "gallery": imgs2}
        ctx.close()
    b.close()

print(json.dumps(checks, ensure_ascii=False, indent=1))
print("errors:", errors)
print("OK" if not errors else "FAIL")
