"""Lot 11a (dicter le journal à Claude) in the browser, preview build with a fake Claude runtime (no real call): `sample`
answers what the test sets in `window.__reply`, the prompt sent is kept in `window.__sent`, the db is a small Map.
- « Dicter » next to « Reprendre hier » in the day's entry, only with Claude; the panel: text area, the browser's
  microphone (a fake recognition writes as it hears) or, without one, the word about the keyboard's microphone;
- no doubt: saved at once, merged with the day's entry, `source: "voice"` and the words apart, the toast « Journal rempli :
  4 valeurs » with « Annuler » for 10 s, « Annuler » puts the entry back exactly (or removes it);
- doubts (« pH 59 »): nothing saved, the sheet filled, the doubtful field marked with what was heard, typing it again
  clears the mark, saving keeps the trace; « Relire avant d'enregistrer » always goes through the sheet;
- an unreadable answer: nothing saved, the words stay; a tank said aloud: the day's tank made, removed by « Annuler »;
- the prompt carries the open space's fields and the words; FR / EN / DE captures of the panel.
Usage: npm run preview:build && PYTHONPATH=scripts python3 scripts/e2e-11a.py dist-preview/index.html <out dir>"""
import sys, pathlib, json, datetime
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
errors, checks = [], {}
TODAY = datetime.date.today().isoformat()

RUNTIME = """
  window.__sent = []; window.__reply = '{}';
  const fake = async (input) => { window.__sent.push(input); await new Promise((r) => setTimeout(r, 150)); return { text: window.__reply, truncated: false }; };
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
"""
# A recognition that "hears" two sentences, then stops (the browser's own needs a real microphone).
FAKE_MIC = """
  class FakeRec { constructor() { this.lang = ''; this.continuous = false; this.interimResults = false; }
    start() { window.__micLang = this.lang; const say = (t, fin, i) => this.onresult && this.onresult({ resultIndex: i, results: Object.assign([], { length: i + 1 }, Object.fromEntries([...Array(i + 1)].map((_, j) => [j, { isFinal: j < i || fin, 0: { transcript: j === 0 ? 'EC runoff quatre deux ' : t } }]))) });
      setTimeout(() => say('', true, 0), 50); setTimeout(() => say('pH cinq', false, 1), 100); setTimeout(() => say('pH cinq neuf', true, 1), 250); setTimeout(() => this.onend && this.onend(), 400); }
    stop() { this.onend && this.onend(); } abort() {} }
  window.webkitSpeechRecognition = FakeRec; window.SpeechRecognition = FakeRec;
"""
NO_MIC = "delete window.SpeechRecognition; delete window.webkitSpeechRecognition;"

LABELS = {"fr": ("Dicter", "Remplir le journal"), "en": ("Dictate", "Fill the journal"), "de": ("Diktieren", "Journal ausfüllen")}


def context(b, lang="fr", theme="light", w=390, mic=FAKE_MIC):
    ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme)
    ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
    ctx.add_init_script(RUNTIME)
    ctx.add_init_script(mic)
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))
    pg.goto(f"file://{page_file}"); pg.wait_for_timeout(3000)
    pg.get_by_role("group").first.get_by_role("button", name="Floraison").click(); pg.wait_for_timeout(800)
    return ctx, pg


def open_entry(pg):
    pg.click("#tab-plus"); pg.wait_for_timeout(500); pg.click("#add-entry"); pg.wait_for_selector("#e-when"); pg.wait_for_timeout(600)


def entry(pg):
    return pg.evaluate(f"() => {{ const e = window.__store.get('entries/{TODAY}_floraison'); return e ? structuredClone(e) : null }}")


def dictate(pg, text, reply):
    pg.evaluate("(r) => { window.__reply = r }", json.dumps(reply) if not isinstance(reply, str) else reply)
    if not pg.locator("#e-voice").count(): pg.click("#e-dictate"); pg.wait_for_selector("#e-voice")
    pg.fill("#e-voice-text", text)
    pg.click("#e-voice-fill"); pg.wait_for_timeout(900)


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx, pg = context(b)
    before = entry(pg)
    open_entry(pg)
    row = pg.evaluate("() => [...document.querySelectorAll('#e-resume, #e-dictate')].map((x) => [x.id, x.innerText.trim(), Math.round(x.getBoundingClientRect().width)])")
    pg.click("#e-dictate"); pg.wait_for_selector("#e-voice"); pg.wait_for_timeout(300)
    # The (fake) browser microphone writes as it hears, in the app's language.
    pg.click("#e-voice-mic"); pg.wait_for_timeout(700)
    heard = [pg.input_value("#e-voice-text"), pg.evaluate("window.__micLang")]
    if heard != ["EC runoff quatre deux pH cinq neuf", "fr-FR"] or not any(x[0] == "e-dictate" for x in row): errors.append(f"panel {row} {heard}")
    pg.screenshot(path=str(out / "panneau-fr.png"))
    checks["panel"] = {"row": row, "heard": heard}

    # 1. No doubt: saved at once, the toast with « Annuler »; « Annuler » puts the entry back exactly.
    dictate(pg, "EC runoff quatre deux, pH cinq neuf, runoff 380 millilitres, un peu de jaunissement",
            {"espace": None, "plante": None, "valeurs": {"ecRunoff": 4.2, "phRunoff": 5.9, "runoffMl": 380}, "observations": [{"tag": "yellowing", "gravite": 1}], "actions": [], "bidon": None, "note": "", "doutes": []})
    sent = pg.evaluate("window.__sent.at(-1)")
    saved = entry(pg)
    toast = pg.locator("[data-sonner-toast]").first.inner_text() if pg.locator("[data-sonner-toast]").count() else ""
    pg.screenshot(path=str(out / "toast-fr.png"))
    closed = pg.locator("[data-slot=drawer-content]").count() == 0
    if (not saved or saved.get("ecRunoff") != 4.2 or saved.get("phRunoff") != 5.9 or saved.get("source") != "voice" or "quatre deux" not in (saved.get("dictation") or "")
            or {"tag": "yellowing", "severity": 1} not in (saved.get("observations") or []) or "Journal rempli : 4 valeurs" not in toast or "Annuler" not in toast or not closed):
        errors.append(f"direct save {saved and {k: saved.get(k) for k in ('ecRunoff', 'phRunoff', 'source', 'dictation')}} {toast!r} closed={closed}")
    if not all(x in sent for x in ['"weightMorningKg"', '"ecRunoff"', "quatre deux", "UNIQUEMENT par un objet JSON"]) or '"sownCount"' in sent: errors.append("prompt " + sent[:300])
    pg.locator("[data-sonner-toast] button", has_text="Annuler").click(); pg.wait_for_timeout(800)
    undone = entry(pg)
    if undone != before: errors.append(f"undo {before and before.get('ecRunoff')} → {undone and undone.get('ecRunoff')}")
    checks["direct"] = {"toast": toast, "undoExact": undone == before}

    # 2. Doubts: nothing saved, the sheet filled, the doubtful field marked; typing it clears the mark; saved with the trace.
    open_entry(pg)
    dictate(pg, "température vingt-cinq quatre, pH cinquante-neuf", {"valeurs": {"tempDay": 25.4, "phRunoff": 59}, "observations": [], "actions": [], "note": "", "doutes": []})
    marked = pg.evaluate("() => ({ t: document.querySelector('#e-tempDay').value, doubt: document.querySelector('#e-phRunoff-doubt')?.textContent, line: !!document.querySelector('[data-doubt] #e-phRunoff'), open: !!document.querySelector('[data-slot=drawer-content]'), voice: !!document.querySelector('#e-voice') })")
    pg.evaluate("document.querySelector('#e-phRunoff').scrollIntoView({block: 'center'})"); pg.wait_for_timeout(200)
    pg.screenshot(path=str(out / "doutes-fr.png"))
    if marked != {"t": "25,4", "doubt": "entendu : 59 · hors plage (3 à 9)", "line": True, "open": True, "voice": False} or entry(pg) != before: errors.append(f"doubts {marked}")
    pg.fill("#e-phRunoff", "5,9"); pg.wait_for_timeout(200)
    cleared = pg.locator("#e-phRunoff-doubt").count() == 0
    pg.click("#e-save"); pg.wait_for_timeout(1200)
    after = entry(pg)
    if not cleared or not after or after.get("phRunoff") != 5.9 or after.get("tempDay") != 25.4 or after.get("source") != "voice" or "cinquante-neuf" not in (after.get("dictation") or ""): errors.append(f"doubts saved {cleared} {after and {k: after.get(k) for k in ('tempDay', 'phRunoff', 'source', 'dictation')}}")
    checks["doubts"] = marked

    # 3. « Relire avant d'enregistrer »: through the sheet even without a doubt. 4. An unreadable answer.
    open_entry(pg)
    pg.click("#e-dictate"); pg.wait_for_selector("#e-voice"); pg.click("#e-voice-review"); pg.wait_for_timeout(200)
    snap = entry(pg)
    dictate(pg, "humidité soixante", {"valeurs": {"rh": 60}, "doutes": []})
    review = [pg.input_value("#e-rh"), pg.locator("[data-slot=drawer-content]").count(), entry(pg) == snap]
    if review != ["60", 1, True]: errors.append(f"review {review}")
    pg.click("#e-dictate"); pg.wait_for_selector("#e-voice")
    dictate(pg, "blabla", "Désolé, je n'ai pas compris.")
    unreadable = [pg.locator("#e-voice-error").inner_text() if pg.locator("#e-voice-error").count() else None, pg.input_value("#e-voice-text")]
    if not unreadable[0] or "illisible" not in unreadable[0] or unreadable[1] != "blabla": errors.append(f"unreadable {unreadable}")
    pg.click("#e-voice-review"); pg.wait_for_timeout(200)  # the setting back off
    checks["review"] = review
    ctx.close()

    # 5. A tank said aloud: the day's tank made with the entry, removed by « Annuler ». 6. No microphone: the keyboard's.
    ctx, pg = context(b, mic=NO_MIC)
    open_entry(pg)
    pg.click("#e-dictate"); pg.wait_for_selector("#e-voice")
    nomic = [pg.locator("#e-voice-mic").count(), pg.locator("#e-voice-nomic").inner_text()]
    mixes0 = pg.evaluate("() => [...window.__store.keys()].filter((k) => k.startsWith('mixes/')).length")
    dictate(pg, "bidon de quarante litres, EC deux neuf, pH cinq huit", {"valeurs": {}, "bidon": {"volumeL": 40, "ec": 2.9, "ph": 5.8}, "doutes": []})
    mix = pg.evaluate(f"() => [...window.__store.entries()].filter(([k, v]) => k.startsWith('mixes/') && v.date === '{TODAY}' && v.volumeL === 40).map(([k, v]) => ({{ id: v.id, ec: v.ec, ph: v.ph, spaceIds: v.spaceIds }}))")
    pg.locator("[data-sonner-toast] button", has_text="Annuler").click(); pg.wait_for_timeout(800)
    mixes1 = pg.evaluate("() => [...window.__store.keys()].filter((k) => k.startsWith('mixes/')).length")
    if nomic[0] != 0 or "micro du clavier" not in nomic[1] or len(mix) != 1 or mix[0]["ec"] != 2.9 or mix[0]["spaceIds"] != ["floraison"] or mixes1 != mixes0: errors.append(f"tank / no mic {nomic} {mix} {mixes0}→{mixes1}")
    checks["mix"] = mix
    ctx.close()

    # Captures of the panel: EN / DE, light and dark, 390 / 360.
    for lang in ["en", "de"]:
        for theme, w in [("dark", 390), ("light", 360)]:
            ctx, pg = context(b, lang, theme, w)
            open_entry(pg)
            pg.click("#e-dictate"); pg.wait_for_selector("#e-voice"); pg.wait_for_timeout(300)
            labels = [pg.locator("#e-dictate").inner_text().strip(), pg.locator("#e-voice-fill").inner_text().strip()]
            sw = pg.evaluate("document.querySelector('[data-slot=drawer-content]').scrollWidth")
            if labels != list(LABELS[lang]) or sw > w: errors.append(f"{lang}/{theme}/{w} {labels} sw={sw}")
            pg.screenshot(path=str(out / f"panneau-{lang}-{theme}-{w}.png"))
            ctx.close()
    b.close()

print(json.dumps(checks, ensure_ascii=False, indent=1))
print("errors:", errors[:12])
print("OK" if not errors else "FAIL")
sys.exit(0 if not errors else 1)
