"""Lot 15: a new user's whole path on the local build (the friends' version), empty profile, FR then EN, 390 px, no
console error. To run before each Netlify release.
1. full assistant, with a cycle and without pots → Aujourd'hui shows the space and the cycle; on the way, every error is
   written under its field, which is scrolled to and focused (empty name, empty date, pots at 0, « 15,5 », a future date);
2. assistant skipped → « Créer un espace » → the cycle sheet opens in it → the cycle appears; the same errors in the
   sheet (empty name, empty date, a typo in a folded field); a cycle saved without a space (before 15a) gets one from
   Aujourd'hui; with no space at all, the cycle sheet creates it;
Usage: npm run build:local && PYTHONPATH=scripts python3 scripts/e2e-15.py dist-local <out dir> [fr,en]"""
import sys, json, pathlib, threading, http.server, functools, socketserver, datetime
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

root = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
LANGS = sys.argv[3].split(",") if len(sys.argv) > 3 else ["fr", "en"]
errors, checks = [], {}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


http.server.SimpleHTTPRequestHandler.extensions_map[".webmanifest"] = "application/manifest+json"
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(root)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{httpd.server_address[1]}/"

DB = "new Promise((res) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => res(r.result) })"
DOC = f"async (k) => {{ const db = await {DB}; return new Promise((res) => {{ const q = db.transaction('docs').objectStore('docs').get(k); q.onsuccess = () => res(q.result ?? null) }}) }}"
DOCS = f"async (col) => {{ const db = await {DB}; return new Promise((res) => {{ const st = db.transaction('docs').objectStore('docs'); const k = st.getAllKeys(), v = st.getAll(); v.onsuccess = () => res(k.result.map((key, i) => [key, v.result[i]]).filter(([key]) => key.startsWith(col + '/')).map(([, d]) => d)) }}) }}"
PUT = f"async ([k, d]) => {{ const db = await {DB}; return new Promise((res) => {{ const tx = db.transaction('docs', 'readwrite'); tx.objectStore('docs').put(d, k); tx.oncomplete = () => res(true) }}) }}"
# Is the field on screen, and the one with the focus?
# Visible means above the bar at the bottom (the sheet's Save, the assistant's Next).
SEEN = """(id) => { const el = document.getElementById(id); if (!el) return null; const r = el.getBoundingClientRect()
  const bars = [...document.querySelectorAll('[data-slot=drawer-footer], #onboarding ~ footer')].map((f) => f.getBoundingClientRect().top).filter((t) => t > 0)
  return { focus: document.activeElement === el || el.contains(document.activeElement), inView: r.top >= 0 && r.bottom <= Math.min(innerHeight, ...bars) } }"""
OVERFLOW = "document.documentElement.scrollWidth > innerWidth"

W = {
    "fr": {"cycleNow": "Créer le premier cycle", "save": "Enregistrer", "setup": "Arrosage et matériel", "newCycle": "Nouveau cycle",
           "needStart": "Indique la date de départ du cycle.", "cycleName": "Donne un nom au cycle.", "needName": "Donne un nom à l'espace.",
           "pots": "Pots : des nombres plus grands que zéro, ou laisse vide.", "bad": "Nombre invalide", "lost": "Cycle sans espace : choisir son espace",
           "newSpace": "Créer un espace", "first": "Floraison"},
    "en": {"cycleNow": "Create the first cycle", "save": "Save", "setup": "Watering and gear", "newCycle": "New cycle",
           "needStart": "Enter the start date of the cycle.", "cycleName": "Give the cycle a name.", "needName": "Give the space a name.",
           "pots": "Pots: numbers above zero, or leave empty.", "bad": "Invalid number", "lost": "Cycle without a space: pick its space",
           "newSpace": "Create a space", "first": "Flower"},
}
TODAY = datetime.date.today().isoformat()
FUTURE = (datetime.date.today() + datetime.timedelta(days=5)).isoformat()


def hook(pg, tag):
    pg.on("pageerror", lambda e: errors.append(f"{tag} PAGEERROR {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"{tag} console {m.text}"))


def fresh(b, lang, tag):
    """An empty profile (a new context), the assistant's welcome in the language."""
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="light", service_workers="block", reduced_motion="reduce")
    ctx.add_init_script(f"localStorage.setItem('hydro.ui', JSON.stringify({{theme:'light',lang:'{lang}',updatedAt:'2026-01-01T00:00:00Z'}}))")
    serve_fonts(ctx)
    pg = ctx.new_page(); hook(pg, tag)
    pg.goto(url); pg.wait_for_selector("#onb-welcome", timeout=10000)
    return ctx, pg


def shot(pg, name):
    pg.wait_for_timeout(300)
    pg.screenshot(path=str(out / name))


def err(pg, id):
    el = pg.locator(f"#{id}-err")
    return el.inner_text() if el.count() and el.is_visible() else None


def expect_error(tag, pg, id, text):
    """The message under the field, the field scrolled to and focused."""
    got, seen = err(pg, id), pg.evaluate(SEEN, id)
    if got != text: errors.append(f"{tag} {id} error {got!r} != {text!r}")
    if not seen or not seen["inView"]: errors.append(f"{tag} {id} not in view {seen}")
    return seen


def sheet(pg):
    return pg.locator("[role=dialog]").last


def save_sheet(pg, w, wait=900):
    sheet(pg).get_by_role("button", name=w["save"], exact=True).click(); pg.wait_for_timeout(wait)


def skip(b, lang, tag):
    ctx, pg = fresh(b, lang, tag)
    pg.click("#onb-skip"); pg.wait_for_selector("#onboarding", state="detached", timeout=10000); pg.wait_for_timeout(1200)
    return ctx, pg


with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in LANGS:
        w = W[lang]
        c = checks.setdefault(lang, {})

        # 1. The whole assistant, a cycle without pots.
        tag = f"{lang}/1"
        ctx, pg = fresh(b, lang, tag)
        pg.click("#onb-start")
        pg.click("#onb-next"); pg.wait_for_timeout(200)
        if not err(pg, "onb-name") or not pg.evaluate(SEEN, "onb-name")["focus"]: errors.append(f"{tag} grow name error {err(pg, 'onb-name')!r}")
        pg.fill("#onb-name", "Grow e2e")
        for _ in range(5): pg.click("#onb-next"); pg.wait_for_timeout(250)  # name, spaces, equipment (later), modules, nutrition
        pg.get_by_role("radio", name=w["cycleNow"], exact=True).click(); pg.wait_for_timeout(200)
        c["assistantDatePrefilled"] = pg.input_value("#onb-c-germ")
        if c["assistantDatePrefilled"] != TODAY: errors.append(f"{tag} start date not prefilled {c['assistantDatePrefilled']!r}")
        # Empty name, empty date, pots at 0: three messages, each under its field; the first one is focused.
        pg.fill("#onb-c-name", ""); pg.fill("#onb-c-germ", ""); pg.fill("#onb-c-potl", "0")
        step = pg.inner_text("#onb-count")
        pg.click("#onb-next"); pg.wait_for_timeout(400)
        if pg.inner_text("#onb-count") != step: errors.append(f"{tag} left the cycle step with errors")
        if not expect_error(tag, pg, "onb-c-name", w["cycleName"])["focus"]: errors.append(f"{tag} cycle name not focused")
        if err(pg, "onb-c-germ") != w["needStart"]: errors.append(f"{tag} date error {err(pg, 'onb-c-germ')!r}")
        if err(pg, "onb-c-potl") != w["pots"]: errors.append(f"{tag} pots error {err(pg, 'onb-c-potl')!r}")
        shot(pg, f"1-assistant-erreurs-{lang}.png")
        pg.fill("#onb-c-name", "Cycle A")
        pg.click("#onb-next"); pg.wait_for_timeout(400)
        if not expect_error(tag, pg, "onb-c-germ", w["needStart"])["focus"]: errors.append(f"{tag} date not focused")
        shot(pg, f"1-assistant-date-{lang}.png")
        # A date to come is accepted, said under the field; « 15,5 » is a number; pots left empty.
        pg.fill("#onb-c-germ", FUTURE); pg.wait_for_timeout(150)
        c["futureNote"] = pg.locator("#onb-c-germ-future").inner_text() if pg.locator("#onb-c-germ-future").count() else None
        if not c["futureNote"]: errors.append(f"{tag} no note for a future date")
        pg.fill("#onb-c-germ", TODAY)
        pg.fill("#onb-c-potl", "15,5"); pg.wait_for_timeout(100)
        if err(pg, "onb-c-potl"): errors.append(f"{tag} 15,5 refused")
        pg.fill("#onb-c-potl", "")
        if pg.evaluate(OVERFLOW): errors.append(f"{tag} assistant overflow")
        pg.click("#onb-next"); pg.wait_for_timeout(300)
        pg.click("#onb-finish")
        pg.wait_for_selector("#onboarding", state="detached", timeout=10000); pg.wait_for_timeout(1200)
        pg.goto(url); pg.wait_for_timeout(1800)
        spaces = pg.evaluate(DOCS, "spaces")
        cycles = pg.evaluate(DOCS, "cycles")
        lines = pg.locator("[data-space-line]").all_inner_texts()
        c["todayAfterAssistant"] = lines
        if len(spaces) != 1 or len(cycles) != 1 or cycles[0].get("spaceId") != spaces[0]["id"] or cycles[0].get("germinationDate") != TODAY:
            errors.append(f"{tag} docs {spaces} {cycles}")
        elif "potVolumeL" in cycles[0] or "potCount" in cycles[0]: errors.append(f"{tag} pots invented {cycles[0]}")
        if len(lines) != 1 or w["first"] not in lines[0] or pg.locator("#spaces-empty").count(): errors.append(f"{tag} today {lines}")
        shot(pg, f"1-aujourdhui-{lang}.png")
        ctx.close()

        # 2. Assistant skipped: a space first, then its cycle.
        tag = f"{lang}/2"
        ctx, pg = skip(b, lang, tag)
        if pg.inner_text("#today-new-space") != w["newSpace"]: errors.append(f"{tag} empty state {pg.inner_text('#spaces-empty')!r}")
        shot(pg, f"2-vide-{lang}.png")
        pg.click("#today-new-space"); pg.wait_for_selector("#sp-name"); pg.wait_for_timeout(500)
        save_sheet(pg, w, 500)
        if not expect_error(tag, pg, "sp-name", w["needName"])["focus"]: errors.append(f"{tag} space name not focused")
        shot(pg, f"2-espace-nom-{lang}.png")
        pg.fill("#sp-name", "Tente")
        save_sheet(pg, w, 1500)
        # The cycle sheet comes next, in that space.
        if not pg.locator("#c-germ").count(): errors.append(f"{tag} no cycle sheet after the space")
        picked = sheet(pg).locator("#c-space [role=radio][aria-checked=true]").all_inner_texts()
        c["cycleSpace"] = picked
        if picked != ["Tente"] or pg.locator("#c-new-space").count(): errors.append(f"{tag} space of the cycle {picked}")
        pg.fill("#c-germ", "")
        save_sheet(pg, w, 500)
        if not expect_error(tag, pg, "c-germ", w["needStart"])["focus"]: errors.append(f"{tag} sheet date not focused")
        shot(pg, f"2-cycle-date-{lang}.png")
        pg.fill("#c-germ", TODAY)
        # A typo in the folded part: the part opens again, the field is focused.
        sheet(pg).get_by_role("button", name=w["setup"]).click(); pg.wait_for_timeout(400)
        pg.fill("#c-pv", "15,5"); pg.fill("#c-pc", "4,5,6")
        sheet(pg).get_by_role("button", name=w["setup"]).click(); pg.wait_for_timeout(400)
        save_sheet(pg, w, 900)
        if not expect_error(tag, pg, "c-pc", w["bad"])["focus"]: errors.append(f"{tag} folded field not focused")
        if err(pg, "c-pv"): errors.append(f"{tag} 15,5 refused in the sheet")
        shot(pg, f"2-cycle-plie-{lang}.png")
        pg.fill("#c-pc", "4")
        save_sheet(pg, w, 1500)
        if pg.locator("#c-germ").count(): errors.append(f"{tag} cycle sheet still open")
        cycles = pg.evaluate(DOCS, "cycles"); spaces = pg.evaluate(DOCS, "spaces")
        if len(cycles) != 1 or cycles[0].get("spaceId") != spaces[0]["id"] or cycles[0].get("potVolumeL") != 15.5 or cycles[0].get("potCount") != 4:
            errors.append(f"{tag} cycle {cycles}")
        lines = pg.locator("[data-space-line]").all_inner_texts()
        c["todayAfterSkip"] = lines
        if len(lines) != 1 or "Tente" not in lines[0] or pg.locator("#spaces-empty").count(): errors.append(f"{tag} today {lines}")
        shot(pg, f"2-aujourdhui-{lang}.png")

        # A cycle saved without a space (before 15a): a line on Aujourd'hui, its space picked from there.
        lost = {**cycles[0], "id": "cy-lost", "name": "Perdu", "createdAt": cycles[0]["createdAt"]}
        lost.pop("spaceId", None)
        pg.evaluate(PUT, ["cycles/cy-lost", lost]); pg.reload(); pg.wait_for_timeout(1800)
        line = pg.locator("[data-lost-cycle=cy-lost]")
        c["lostLine"] = line.inner_text() if line.count() else None
        if not line.count() or w["lost"] not in line.inner_text(): errors.append(f"{tag} no line for the lost cycle")
        shot(pg, f"2-cycle-sans-espace-{lang}.png")
        line.click(); pg.wait_for_selector("#c-space"); pg.wait_for_timeout(500)
        save_sheet(pg, w, 1500)
        if pg.locator("[data-lost-cycle]").count() or (pg.evaluate(DOC, "cycles/cy-lost") or {}).get("spaceId") != spaces[0]["id"]: errors.append(f"{tag} lost cycle not placed")
        ctx.close()

        # No space at all: the cycle sheet (Réglages → Nouveau cycle) creates it.
        tag = f"{lang}/2b"
        ctx, pg = skip(b, lang, tag)
        pg.evaluate("location.hash = '#tools/settings'"); pg.wait_for_timeout(1200)
        pg.get_by_role("button", name=w["newCycle"]).first.click(); pg.wait_for_selector("#c-new-space"); pg.wait_for_timeout(500)
        if pg.input_value("#c-sp-name") != w["first"]: errors.append(f"{tag} inline space name {pg.input_value('#c-sp-name')!r}")
        pg.fill("#c-sp-name", "")
        save_sheet(pg, w, 500)
        if not expect_error(tag, pg, "c-sp-name", w["needName"])["focus"]: errors.append(f"{tag} inline space name not focused")
        shot(pg, f"2b-espace-dans-le-cycle-{lang}.png")
        pg.fill("#c-sp-name", "Box")
        save_sheet(pg, w, 1500)
        spaces = pg.evaluate(DOCS, "spaces"); cycles = pg.evaluate(DOCS, "cycles")
        if len(spaces) != 1 or spaces[0]["name"] != "Box" or len(cycles) != 1 or cycles[0].get("spaceId") != spaces[0]["id"]: errors.append(f"{tag} {spaces} {cycles}")
        pg.goto(url); pg.wait_for_timeout(1500)
        if "Box" not in " ".join(pg.locator("[data-space-line]").all_inner_texts()): errors.append(f"{tag} Box not on Aujourd'hui")
        ctx.close()
    b.close()
    httpd.shutdown()

print(json.dumps(checks, ensure_ascii=False)[:2500])
print("errors:", errors[:40])
print("FAIL" if errors else "OK")
