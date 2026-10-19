"""Lot 6b walk-through at 390 px: export the JSON backup (real download), change something, restore it with
"Remplacer" and check the change is gone; journal CSV; "Demander à Claude" hidden outside the Claude app.
Usage: PYTHONPATH=scripts python3 scripts/e2e-6b.py dist-preview/index.html <out dir>"""
import sys, pathlib, json
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
errors, checks = [], {}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark", accept_downloads=True)
    ctx.add_init_script("localStorage.setItem('hydro.ui', JSON.stringify({theme:'dark',lang:'fr',updatedAt:'2026-01-01T00:00:00Z'}))")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(f"file://{page_file}#tools"); pg.wait_for_timeout(2500)
    checks["askHidden"] = pg.get_by_text("Demander à Claude").count() == 0
    pg.goto(f"file://{page_file}#data"); pg.wait_for_timeout(2500)
    with pg.expect_download() as dl:
        pg.click("#data-export")
    f = out / dl.value.suggested_filename
    dl.value.save_as(str(f))
    backup = json.loads(f.read_text())
    checks["file"] = f.name
    checks["collections"] = {k: len(v) for k, v in backup["collections"].items()}
    pg.screenshot(path=str(out / "01-data.png"), full_page=True)

    # Change something: a new space.
    pg.goto(f"file://{page_file}#settings"); pg.wait_for_timeout(2000)
    pg.evaluate("""() => new Promise((res) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => { const tx = r.result.transaction('docs', 'readwrite'); tx.objectStore('docs').put({schemaVersion:1,id:'extra',name:'Espace en trop',template:'custom',color:'rose',order:9,modules:{climate:true,light:false,irrigation:false,nutrition:false,propagation:false,drying:false,plants:false},createdAt:'x',updatedAt:'x'}, 'spaces/extra'); tx.oncomplete = () => res(true) } })""")
    pg.reload(); pg.wait_for_timeout(2000)
    checks["extraBefore"] = pg.get_by_text("Espace en trop").count() > 0

    pg.goto(f"file://{page_file}#data"); pg.wait_for_timeout(2000)
    pg.set_input_files("#data-file", str(f)); pg.wait_for_timeout(600)
    checks["summary"] = pg.inner_text("#data-summary").split("\n")[0]
    pg.get_by_role("radio", name="Remplacer").click()
    pg.screenshot(path=str(out / "02-import-summary.png"), full_page=True)
    pg.get_by_role("button", name="Importer").click()
    # Lot 10a: "Remplacer" asks first, and saves a safety copy of the current data before anything changes.
    pg.wait_for_selector("#data-replace-confirm")
    pg.screenshot(path=str(out / "02b-replace-confirm.png"))
    with pg.expect_download() as dl2:
        pg.click("#data-replace-confirm")
    checks["safetyCopy"] = dl2.value.suggested_filename
    pg.wait_for_selector("text=Import terminé", timeout=20000)
    checks["toast"] = pg.locator("text=Import terminé").first.inner_text()
    pg.goto(f"file://{page_file}#settings"); pg.wait_for_timeout(2000)
    checks["extraAfter"] = pg.get_by_text("Espace en trop").count() > 0

    pg.goto(f"file://{page_file}#data"); pg.wait_for_timeout(1500)
    csv_btn = pg.get_by_role("button", name="Journal en CSV")
    checks["csvEnabled"] = csv_btn.is_enabled()
    # "Demander à Claude" with a fake `sample` runtime (no real call): the tool appears, streams, and sends the context.
    ctx2 = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="light")
    ctx2.add_init_script("localStorage.setItem('hydro.ui', JSON.stringify({theme:'light',lang:'fr',updatedAt:'2026-01-01T00:00:00Z'}))")
    ctx2.add_init_script("""
      window.__sent = [];
      const fake = async (input, opts) => {
        window.__sent.push(input);
        const answer = "Test : réponse factice (aucun appel réel). Vérifie d'abord le débit de la pompe, il manque.";
        let t = "";
        for (const w of answer.split(" ")) { t += (t ? " " : "") + w; opts && opts.onText && opts.onText({ text: t, delta: w }); await new Promise(r => setTimeout(r, 15)); }
        return { text: answer, truncated: false };
      };
      // Lot 10a: without a db the app stops on an error screen, so the fake runtime has a small in-memory db.
      const store = new Map(); const listeners = new Set();
      const snapDoc = (p) => ({ id: p.split("/").pop(), exists: store.has(p), data: () => (store.has(p) ? structuredClone(store.get(p)) : undefined) });
      const snapCol = (c) => ({ docs: [...store.keys()].filter((k) => k.slice(0, k.lastIndexOf("/")) === c).map(snapDoc) });
      const notify = () => listeners.forEach((f) => f());
      const watch = (f) => { listeners.add(f); queueMicrotask(f); return () => listeners.delete(f); };
      const db = {
        doc: (p) => ({ get: async () => snapDoc(p), set: async (d) => { store.set(p, structuredClone(d)); notify(); }, delete: async () => { store.delete(p); notify(); }, onSnapshot: (n) => watch(() => n(snapDoc(p))) }),
        collection: (c) => ({ get: async () => snapCol(c), onSnapshot: (n) => watch(() => n(snapCol(c))) }),
      };
      window.claude = { use: async (n) => (n === "sample" ? fake : n === "db" ? db : null) };
    """)
    serve_fonts(ctx2)
    pg2 = ctx2.new_page()
    pg2.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg2.goto(f"file://{page_file}#tools"); pg2.wait_for_timeout(3000)
    checks["askShown"] = pg2.get_by_text("Demander à Claude").count() > 0
    pg2.goto(f"file://{page_file}#ask"); pg2.wait_for_timeout(2500)
    pg2.get_by_role("button", name="Floraison").first.click(); pg2.wait_for_timeout(1000)
    pg2.get_by_role("button", name="Qu'est-ce que je devrais corriger").click()
    pg2.wait_for_selector("text=il manque", timeout=10000); pg2.wait_for_timeout(500)
    sent = pg2.evaluate("window.__sent[0][0].content")
    checks["sentHasContext"] = all(x in sent for x in ["Athena Pro Line", "Floraison", "débit de la pompe", "QUESTION"])
    pg2.fill("#ask-q", "Et pour le pH ?"); pg2.get_by_role("button", name="Demander", exact=True).click()
    pg2.wait_for_timeout(2500)
    checks["followUpTurns"] = pg2.evaluate("window.__sent[1].length")
    pg2.screenshot(path=str(out / "03-ask.png"), full_page=True)
    # Lot 10a: the Claude runtime without its database shows an error with "Réessayer" (no silent local store).
    ctx3 = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark")
    ctx3.add_init_script("window.claude = { use: async () => null };")
    serve_fonts(ctx3)
    pg3 = ctx3.new_page()
    pg3.goto(f"file://{page_file}"); pg3.wait_for_timeout(2500)
    checks["noDbScreen"] = pg3.locator("#load-problem").count() == 1 and pg3.locator("#load-retry").count() == 1
    pg3.screenshot(path=str(out / "05-no-db.png"))
    ctx3.close()
    b.close()
for k, v in checks.items(): print(k, "→", v)
print("\n".join(errors) if errors else "no console errors")
