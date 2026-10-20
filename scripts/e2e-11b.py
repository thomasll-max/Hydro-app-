"""Lot 11b (dicter sans IA) in the browser, local build (no Claude) with the one-year simulation at 8 February, 08:30,
Floraison:
- « Dicter » next to « Reprendre hier » in the version without Claude; the panel says what the rules read, has no
  « Relire avant d'enregistrer » (always to check) and « Remplir la saisie »; the (fake) browser microphone in fr-FR;
- the rules fill the sheet, nothing is saved until « Enregistrer »: EC / pH runoff, runoff in mL, the morning weight,
  the rest in the note with the words said; saved with the trace (source « voice », the dictated text);
- doubts: « pH 59 » marked out of range and not filled (the field keeps yesterday's carried value), « EC 2,8 » filled in the solution and marked « sans préciser »,
  « runoff 15 % » and « VPD 1,2 » left in the note and listed; typing a marked field clears its mark;
- nothing understood: a short message; no browser microphone: the keyboard's;
- EN and DE dictations; captures FR / EN / DE, light and dark, 390 and 360.
Usage: npm run build:local && npx -y tsx scripts/sim/build.ts <sim dir> && PYTHONPATH=scripts python3 scripts/e2e-11b.py dist-local <sim dir> <out dir>"""
import sys, json, pathlib, threading, http.server, functools, socketserver, re
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

site = pathlib.Path(sys.argv[1]).resolve(); sim = pathlib.Path(sys.argv[2])
out = pathlib.Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
errors, checks = [], {}
LOAD = re.search(r'LOAD = """(.*?)"""', pathlib.Path("scripts/sim/browse.py").read_text(), re.S).group(1)
DAY = "2026-02-08"
SAVED = """(id) => new Promise((res) => { const r = indexedDB.open('hydro'); r.onsuccess = () => { const g = r.result.transaction('docs').objectStore('docs').get('entries/' + id); g.onsuccess = () => res(g.result ?? null) } })"""
# A recognition that "hears" two pieces, then stops (the browser's own needs a real microphone).
FAKE_MIC = """
  class FakeRec { constructor() { this.lang = ''; }
    start() { window.__micLang = this.lang; const say = (i, t, fin) => this.onresult && this.onresult({ resultIndex: i, results: Object.assign([], { length: i + 1 }, Object.fromEntries([...Array(i + 1)].map((_, j) => [j, { isFinal: j < i || fin, 0: { transcript: j === 0 ? 'EC runoff 4,2 ' : t } }]))) });
      setTimeout(() => say(0, '', true), 50); setTimeout(() => say(1, 'pH 5', false), 100); setTimeout(() => say(1, 'pH 5,9', true), 250); setTimeout(() => this.onend && this.onend(), 400); }
    stop() { this.onend && this.onend(); } abort() {} }
  window.webkitSpeechRecognition = FakeRec; window.SpeechRecognition = FakeRec;
"""
NO_MIC = "delete window.SpeechRecognition; delete window.webkitSpeechRecognition;"

EXP = {
    "fr": dict(dictate="Dicter", fill="Remplir la saisie", hint="L'app reconnaît les mesures simples", nomic="micro du clavier"),
    "en": dict(dictate="Dictate", fill="Fill the entry", hint="The app picks up the simple measurements", nomic="keyboard"),
    "de": dict(dictate="Diktieren", fill="Eintrag ausfüllen", hint="Die App erkennt einfache Messwerte", nomic="Tastatur"),
}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(site)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{httpd.server_address[1]}/"


def open_entry(b, lang="fr", theme="light", w=390, mic=FAKE_MIC):
    backup = json.loads((sim / "checkpoints" / f"{DAY}.json").read_text())
    backup["collections"]["settings"]["main"].update({"lang": lang, "theme": theme, "space": "floraison"})
    ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme, timezone_id="Europe/Oslo", locale="fr-FR", service_workers="block", reduced_motion="reduce")
    ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'{theme}',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
    ctx.add_init_script(mic)
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"console {m.text}"))
    pg.clock.install(time=f"{DAY}T08:30:00+01:00"); pg.clock.resume()
    pg.goto(url); pg.wait_for_timeout(1500); pg.evaluate(LOAD, backup); pg.reload(); pg.wait_for_timeout(2500)
    pg.click("#tab-plus"); pg.wait_for_timeout(500); pg.click("#add-entry"); pg.wait_for_selector("#e-when"); pg.wait_for_timeout(700)
    return ctx, pg


def dictate(pg, text):
    if not pg.locator("#e-voice").count(): pg.click("#e-dictate"); pg.wait_for_selector("#e-voice")
    pg.fill("#e-voice-text", text)
    pg.click("#e-voice-fill"); pg.wait_for_timeout(500)


def val(pg, k):
    return pg.input_value(f"#e-{k}") if pg.locator(f"#e-{k}").count() else None


def doubt(pg, k):
    loc = pg.locator(f"#e-{k}-doubt")
    return loc.inner_text() if loc.count() else None


with sync_playwright() as p:
    b = p.chromium.launch()

    # 1. The panel without Claude, the (fake) microphone.
    ctx, pg = open_entry(b)
    before = pg.evaluate(SAVED, f"{DAY}_floraison")
    row = pg.evaluate("() => [...document.querySelectorAll('#e-resume, #e-dictate')].map((x) => [x.id, x.innerText.trim(), Math.round(x.getBoundingClientRect().width)])")
    pg.click("#e-dictate"); pg.wait_for_selector("#e-voice"); pg.wait_for_timeout(300)
    panel = pg.evaluate("() => ({ hint: document.querySelector('#e-voice p').innerText, review: !!document.querySelector('#e-voice-review'), fill: document.querySelector('#e-voice-fill').innerText.trim(), sw: document.querySelector('[data-slot=drawer-content]').scrollWidth })")
    pg.click("#e-voice-mic"); pg.wait_for_timeout(700)
    heard = [pg.input_value("#e-voice-text"), pg.evaluate("window.__micLang")]
    pg.screenshot(path=str(out / "panneau-fr.png"))
    if [x[0] for x in row] != ["e-resume", "e-dictate"] or abs(row[0][2] - row[1][2]) > 2 or "Dicter" not in row[1][1]: errors.append(f"row {row}")
    if EXP["fr"]["hint"] not in panel["hint"] or panel["review"] or panel["fill"] != "Remplir la saisie" or panel["sw"] > 390: errors.append(f"panel {panel}")
    if heard != ["EC runoff 4,2 pH 5,9", "fr-FR"]: errors.append(f"mic {heard}")
    checks["panel"] = {"row": row, **panel, "heard": heard}

    # 2. The rules fill the sheet; nothing saved until « Enregistrer »; then saved with the trace.
    text = "EC runoff 4,2, pH 5,9, runoff 380 ml, poids matin 8,4, un peu de jaunissement en bas"
    dictate(pg, text)
    filled = {k: val(pg, k) for k in ("ecRunoff", "phRunoff", "runoffMl", "weightMorningKg")}
    note = val(pg, "note")
    marks = pg.locator("[data-doubt]").count()
    pg.screenshot(path=str(out / "remplie-fr.png"))
    now = pg.evaluate(SAVED, f"{DAY}_floraison")
    if filled != {"ecRunoff": "4,2", "phRunoff": "5,9", "runoffMl": "380", "weightMorningKg": "8,4"} or note != "un peu de jaunissement en bas" or marks or pg.locator("#e-voice").count() or now != before:
        errors.append(f"filled {filled} {note!r} marks={marks} saved={now != before}")
    pg.click("#e-save"); pg.wait_for_timeout(1200)
    saved = pg.evaluate(SAVED, f"{DAY}_floraison")
    if not saved or saved.get("ecRunoff") != 4.2 or saved.get("weightMorningKg") != 8.4 or saved.get("source") != "voice" or saved.get("dictation") != text or "jaunissement" not in (saved.get("note") or ""):
        errors.append(f"saved {saved and {k: saved.get(k) for k in ('ecRunoff', 'weightMorningKg', 'source', 'dictation', 'note')}}")
    checks["filled"] = {"values": filled, "note": note}
    ctx.close()

    # 3. Doubts: nothing saved, marks with what was heard; typing clears a mark.
    ctx, pg = open_entry(b)
    before = pg.evaluate(SAVED, f"{DAY}_floraison")
    dictate(pg, "pH 59, EC 2,8, runoff 15 %, VPD 1,2")
    d = {"phIn": doubt(pg, "phIn"), "ecIn": doubt(pg, "ecIn"), "ecInValue": val(pg, "ecIn"), "phInValue": val(pg, "phIn")}
    listed = pg.locator("#e-doubts li").all_inner_texts()
    note = val(pg, "note")
    pg.locator("#e-phIn").scroll_into_view_if_needed(); pg.wait_for_timeout(300)
    pg.screenshot(path=str(out / "doutes-fr.png"))
    if (d["phIn"] != "entendu : pH 59 · hors plage (3 à 9)" or d["ecIn"] != "entendu : EC 2,8 · sans préciser lequel : vérifie" or d["ecInValue"] != "2,8" or "59" in d["phInValue"]
            or listed != ["entendu : runoff 15 % · calculé par l'app, laissé dans la note", "entendu : VPD 1,2 · calculé par l'app, laissé dans la note"] or note != "runoff 15 %, VPD 1,2"):
        errors.append(f"doubts {d} {listed} {note!r}")
    pg.fill("#e-ecIn", "2,9"); pg.wait_for_timeout(200)
    cleared = doubt(pg, "ecIn") is None and pg.locator("#e-phIn-doubt").count() == 1
    if not cleared: errors.append("typing does not clear the mark")
    if pg.evaluate(SAVED, f"{DAY}_floraison") != before: errors.append("doubts: something was saved")
    checks["doubts"] = {**d, "listed": listed, "note": note, "cleared": cleared}

    # 4. Nothing understood.
    pg.click("#e-dictate"); pg.wait_for_selector("#e-voice"); pg.fill("#e-voice-text", "?"); pg.click("#e-voice-fill"); pg.wait_for_timeout(300)
    nothing = pg.locator("#e-voice-error").inner_text() if pg.locator("#e-voice-error").count() else ""
    if "Rien à mettre" not in nothing: errors.append(f"nothing {nothing!r}")
    ctx.close()

    # 5. No browser microphone: the keyboard's.
    ctx, pg = open_entry(b, mic=NO_MIC)
    pg.click("#e-dictate"); pg.wait_for_selector("#e-voice")
    nomic = pg.locator("#e-voice-nomic").inner_text() if pg.locator("#e-voice-nomic").count() else ""
    if EXP["fr"]["nomic"] not in nomic or pg.locator("#e-voice-mic").count(): errors.append(f"no mic {nomic!r}")
    ctx.close()

    # 6. EN / DE dictations, and the captures (light / dark, 390 / 360).
    for lang, theme, w, said, want in [
        ("en", "light", 360, "runoff EC 4.2, morning weight 8.4, temperature 25", {"ecRunoff": "4.2", "weightMorningKg": "8.4", "tempDay": "25"}),
        ("de", "dark", 390, "EC Ablauf 4,2, Gewicht morgens 8,4, Temperatur 25 Grad", {"ecRunoff": "4,2", "weightMorningKg": "8,4", "tempDay": "25"}),
        ("fr", "dark", 360, "EC runoff 4,2, température 25", {"ecRunoff": "4,2", "tempDay": "25"}),
    ]:
        ctx, pg = open_entry(b, lang, theme, w)
        pg.click("#e-dictate"); pg.wait_for_selector("#e-voice")
        labels = [pg.locator("#e-dictate").inner_text().strip(), pg.locator("#e-voice-fill").inner_text().strip(), pg.locator("#e-voice p").first.inner_text()]
        pg.fill("#e-voice-text", said); pg.wait_for_timeout(200)
        pg.screenshot(path=str(out / f"panneau-{lang}-{theme}-{w}.png"))
        sw = pg.evaluate("() => document.querySelector('[data-slot=drawer-content]').scrollWidth")
        pg.click("#e-voice-fill"); pg.wait_for_timeout(500)
        got = {k: val(pg, k) for k in want}
        e = EXP[lang]
        if labels[0] != e["dictate"] or labels[1] != e["fill"] or e["hint"] not in labels[2] or got != want or sw > w: errors.append(f"{lang} {labels} {got} sw={sw}")
        checks[f"{lang}-{theme}-{w}"] = got
        ctx.close()
    b.close()

print(json.dumps(checks, ensure_ascii=False, indent=1))
print("errors:", errors)
print("OK" if not errors else "FAIL")
