"""Lot 15: a new user's whole path on the local build (the friends' version), empty profile, FR then EN, 390 px, no
console error. To run before each Netlify release.
1. full assistant, with a cycle and without pots → Aujourd'hui shows the space and the cycle; on the way, every error is
   written under its field, which is scrolled to and focused (empty name, empty date, pots at 0, « 15,5 », a future date);
2. assistant skipped → « Créer un espace » → the cycle sheet opens in it → the cycle appears; the same errors in the
   sheet (empty name, empty date, a typo in a folded field); a cycle saved without a space (before 15a) gets one from
   Aujourd'hui; with no space at all, the cycle sheet creates it;
3. a valid day's entry → the Journal (week, week page), Graphiques and « Maintenant » agree;
4. absurd values (morning 24 kg, peak 20 kg, pH runoff 13,1, T° 400) → refused, a message under each field, the dryback
   « — » with a cue; the same in the quick entry; an entry saved before 15b with such values: kept, marked « valeur
   douteuse » in the Journal, left out of the charts and « Maintenant »;
5. a new tank: Pro Line in the first space (an EC of 13 refused under the field first), then Blended in another space
   created from Réglages with its own line, never a Pro product in it; the quick entry refuses a T° of 400;
6. calendar, a reminder (in À faire), Réglages, À propos, the backup exported then imported (« Remplacer »);
7. the page reloaded: everything is still there.
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
           "newSpace": "Créer un espace", "first": "Floraison", "range": "Hors plage : entre {} et {}.", "swapped": "Le pic doit être plus lourd que le matin : inversés ?",
           "doubtful": "Valeur douteuse, hors des calculs", "dec": ",", "addSpace": "Ajouter un espace", "custom": "Propres à cet espace", "reminder": "Rappel",
           "replace": "Remplacer", "import": "Importer", "imported": "Import terminé"},
    "en": {"cycleNow": "Create the first cycle", "save": "Save", "setup": "Watering and gear", "newCycle": "New cycle",
           "needStart": "Enter the start date of the cycle.", "cycleName": "Give the cycle a name.", "needName": "Give the space a name.",
           "pots": "Pots: numbers above zero, or leave empty.", "bad": "Invalid number", "lost": "Cycle without a space: pick its space",
           "newSpace": "Create a space", "first": "Flower", "range": "Out of range: between {} and {}.", "swapped": "The peak must be heavier than the morning: swapped?",
           "doubtful": "Doubtful value, left out of the calculations", "dec": ".", "addSpace": "Add a space", "custom": "Specific to this space", "reminder": "Reminder",
           "replace": "Replace", "import": "Import", "imported": "Import done"},
}
TODAY = datetime.date.today().isoformat()
YESTERDAY = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
MONDAY = (datetime.date.today() - datetime.timedelta(days=datetime.date.today().weekday())).isoformat()
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
        sid = spaces[0]["id"] if spaces else ""

        # 3. A valid day's entry: the Journal, Graphiques and « Maintenant » agree.
        tag = f"{lang}/3"
        d = w["dec"]
        pg.click("#tab-plus"); pg.wait_for_timeout(500); pg.click("#add-entry"); pg.wait_for_selector("#e-save"); pg.wait_for_timeout(700)
        for k, v in [("weightMorningKg", "20"), ("weightPeakKg", f"24{d}5"), ("runoffMl", "300"), ("ecRunoff", f"2{d}5"), ("phRunoff", "6"), ("tempDay", "25"), ("rh", "60")]:
            if pg.locator(f"#e-{k}").count(): pg.fill(f"#e-{k}", v)
            else: errors.append(f"{tag} no field {k}")
        pg.wait_for_timeout(300)
        band = pg.locator("[data-band=dryback]").inner_text() if pg.locator("[data-band=dryback]").count() else None
        c["bandValid"] = band
        pg.click("#e-save"); pg.wait_for_timeout(1500)
        doc = pg.evaluate(DOC, f"entries/{TODAY}_{sid}") or {}
        c["entry"] = {k: doc.get(k) for k in ["dryback", "vpd", "phRunoff", "ecRunoff"]}
        if doc.get("dryback") != 18.4 or not doc.get("vpd") or doc.get("phRunoff") != 6: errors.append(f"{tag} saved {c['entry']}")
        if pg.locator("#now").get_attribute("data-kind") == "entry": errors.append(f"{tag} « Maintenant » still asks for the entry")
        pg.evaluate("location.hash = '#journal'"); pg.wait_for_selector("[data-week]", timeout=8000); pg.wait_for_timeout(600)
        week = pg.locator(f"[data-week$='{MONDAY}']").first
        c["journalWeek"] = week.inner_text().replace("\n", " | ") if week.count() else None
        if not week.count() or "18" not in week.inner_text(): errors.append(f"{tag} journal week {c['journalWeek']}")
        pg.evaluate(f"location.hash = '#journal/{sid}/{MONDAY}'"); pg.wait_for_selector("#week-page", timeout=8000); pg.wait_for_timeout(800)
        day = pg.locator(f"[data-day='{TODAY}']")
        c["weekDay"] = day.inner_text().replace("\n", " | ") if day.count() else None
        if not day.count() or "18" not in day.inner_text() or day.locator("[data-doubtful]").count(): errors.append(f"{tag} week page {c['weekDay']}")
        shot(pg, f"3-semaine-{lang}.png")
        pg.evaluate("location.hash = '#charts'"); pg.wait_for_selector("#ch-period", timeout=10000); pg.wait_for_timeout(1200)
        last = pg.evaluate("() => document.querySelector('[data-curve=dryback] [data-last]')?.textContent ?? null")
        c["chartDryback"] = last
        if not last or "18" not in last: errors.append(f"{tag} chart {last}")
        shot(pg, f"3-graphiques-{lang}.png")

        # 4. Absurd values: refused, each message under its field, nothing saved.
        tag = f"{lang}/4"
        pg.evaluate("location.hash = ''"); pg.wait_for_timeout(800)
        pg.click("#tab-plus"); pg.wait_for_timeout(500); pg.click("#add-entry"); pg.wait_for_selector("#e-save"); pg.wait_for_timeout(700)
        pg.fill("#e-weightMorningKg", "24"); pg.fill("#e-weightPeakKg", "20"); pg.fill("#e-phRunoff", f"13{d}1"); pg.fill("#e-tempDay", "400"); pg.wait_for_timeout(300)
        cue = pg.locator("[data-band=dryback] [data-impossible]").count()
        c["bandAbsurd"] = pg.locator("[data-band=dryback]").inner_text().replace("\n", " ")
        if not cue or "—" not in c["bandAbsurd"]: errors.append(f"{tag} dryback band {c['bandAbsurd']!r}")
        pg.click("#e-save"); pg.wait_for_timeout(900)
        if not pg.locator("#e-save").count(): errors.append(f"{tag} sheet closed: saved")
        seen = expect_error(tag, pg, "e-weightMorningKg", w["swapped"])
        if not seen["focus"]: errors.append(f"{tag} first wrong field not focused")
        if err(pg, "e-weightPeakKg") != w["swapped"]: errors.append(f"{tag} peak {err(pg, 'e-weightPeakKg')!r}")
        if err(pg, "e-phRunoff") != w["range"].format(3, 9): errors.append(f"{tag} pH {err(pg, 'e-phRunoff')!r}")
        if err(pg, "e-tempDay") != w["range"].format(5, 40): errors.append(f"{tag} T° {err(pg, 'e-tempDay')!r}")
        shot(pg, f"4-saisie-refusee-{lang}.png")
        if (pg.evaluate(DOC, f"entries/{TODAY}_{sid}") or {}).get("phRunoff") != 6: errors.append(f"{tag} the absurd values reached the data")
        # Corrected: the messages go, the save goes through.
        pg.fill("#e-weightMorningKg", "20"); pg.fill("#e-weightPeakKg", f"24{d}5"); pg.fill("#e-phRunoff", "6"); pg.fill("#e-tempDay", "25"); pg.wait_for_timeout(200)
        if pg.locator("[data-field-error]").count(): errors.append(f"{tag} messages left after the fix")
        pg.click("#e-save"); pg.wait_for_timeout(1200)
        if pg.locator("#e-save").count(): errors.append(f"{tag} corrected entry not saved")

        # An entry saved before 15b with absurd values: kept, marked in the Journal, out of the charts and « Maintenant ».
        old = {"schemaVersion": 2, "id": f"{YESTERDAY}_{sid}", "date": YESTERDAY, "spaceId": sid, "cycleId": cycles[0]["id"] if cycles else None, "weightMorningKg": 24, "weightPeakKg": 20, "dryback": -20,
               "phRunoff": 13.1, "ecRunoff": 2.6, "tempDay": 400, "rh": 55, "vpd": 28654.56, "createdAt": f"{YESTERDAY}T08:00:00.000Z", "updatedAt": f"{YESTERDAY}T08:00:00.000Z"}
        pg.evaluate(PUT, [f"entries/{YESTERDAY}_{sid}", old]); pg.reload(); pg.wait_for_timeout(1800)
        now = pg.locator("#now").inner_text()
        if "13" in now and ("pH" in now): errors.append(f"{tag} « Maintenant » uses the doubtful pH: {now!r}")
        pg.evaluate(f"location.hash = '#journal/{sid}/{YESTERDAY if datetime.date.fromisoformat(YESTERDAY) >= datetime.date.fromisoformat(MONDAY) else MONDAY}'")
        if datetime.date.fromisoformat(YESTERDAY) < datetime.date.fromisoformat(MONDAY):
            prev_monday = (datetime.date.fromisoformat(MONDAY) - datetime.timedelta(days=7)).isoformat()
            pg.evaluate(f"location.hash = '#journal/{sid}/{prev_monday}'")
        else:
            pg.evaluate(f"location.hash = '#journal/{sid}/{MONDAY}'")
        pg.wait_for_selector("#week-page", timeout=8000); pg.wait_for_timeout(800)
        if pg.locator("#week-more").count(): pg.click("#week-more"); pg.wait_for_timeout(400)
        yday = pg.locator(f"[data-day='{YESTERDAY}']")
        line = yday.locator("[data-doubtful]")
        c["doubtfulLine"] = line.inner_text() if line.count() else None
        if not line.count() or w["doubtful"] not in line.inner_text() or yday.locator("[data-impossible]").count() < 1: errors.append(f"{tag} doubtful day {yday.inner_text() if yday.count() else None!r}")
        if yday.count():
            yday.scroll_into_view_if_needed(); shot(pg, f"4-valeur-douteuse-{lang}.png")
        kept = pg.evaluate(DOC, f"entries/{YESTERDAY}_{sid}") or {}
        if kept.get("phRunoff") != 13.1 or kept.get("tempDay") != 400 or "doubtful" in kept: errors.append(f"{tag} old data changed {kept}")
        pg.evaluate("location.hash = '#charts'"); pg.wait_for_selector("#ch-period", timeout=10000); pg.wait_for_timeout(1200)
        if pg.locator("[data-curve=dryback] [data-off]").count() or "-20" in (pg.evaluate("() => document.querySelector('[data-curve=dryback]')?.textContent ?? ''") or "").replace("−", "-"):
            errors.append(f"{tag} doubtful dryback in the chart")

        # 5. A new tank: Pro Line here, Blended in another space.
        tag = f"{lang}/5"
        pg.evaluate("location.hash = '#tools/nutrition'"); pg.wait_for_selector("#nut-save", timeout=10000); pg.wait_for_timeout(800)
        pg.fill("#n-vol", "20"); pg.fill("#n-ecm", "13"); pg.wait_for_timeout(300)
        if err(pg, "n-ecm") != w["range"].format(0, 6): errors.append(f"{tag} tank EC {err(pg, 'n-ecm')!r}")
        pg.click("#nut-save"); pg.wait_for_timeout(800)
        if pg.evaluate(DOCS, "mixes"): errors.append(f"{tag} a tank saved with an EC of 13")
        shot(pg, f"5-bidon-refuse-{lang}.png")
        pg.fill("#n-ecm", f"2{d}4"); pg.click("#nut-save"); pg.wait_for_timeout(1500)
        mixes = pg.evaluate(DOCS, "mixes")
        names_pro = " ".join(i.get("name", "") for m in mixes for i in m.get("items", []))
        c["tankPro"] = [(m.get("line"), m.get("ec"), [i.get("name") for i in m.get("items", [])]) for m in mixes]
        if len(mixes) != 1 or mixes[0].get("line") != "athena-pro" or mixes[0].get("ec") != 2.4 or " A" in names_pro: errors.append(f"{tag} Pro tank {c['tankPro']}")
        # A second space with its own line, Blended.
        pg.evaluate("location.hash = '#tools/settings'"); pg.wait_for_timeout(1200)
        pg.get_by_role("button", name=w["addSpace"]).first.click(); pg.wait_for_selector("#sp-name"); pg.wait_for_timeout(500)
        pg.fill("#sp-name", "Végé")
        sheet(pg).get_by_role("radio", name=w["custom"]).click(); pg.wait_for_timeout(400)
        sheet(pg).locator("#sp-lines [data-line=athena-blended]").click(); pg.wait_for_timeout(400)
        save_sheet(pg, w, 1500)
        veg = [x for x in pg.evaluate(DOCS, "spaces") if x["name"] == "Végé"]
        if not veg or (veg[0].get("nutrition") or {}).get("line") != "athena-blended": errors.append(f"{tag} Blended space {veg}")
        pg.locator("[role=group] button", has_text="Végé").first.click(); pg.wait_for_timeout(600)
        pg.evaluate("location.hash = '#tools/nutrition'"); pg.wait_for_selector("#nut-save", timeout=10000); pg.wait_for_timeout(800)
        text = pg.locator("main").inner_text()
        if "Blended" not in text or any(x in text for x in ["Pro Grow", "Pro Bloom", "Pro Core"]): errors.append(f"{tag} Blended recipe {text[:200]!r}")
        pg.fill("#n-vol", "20"); pg.click("#nut-save"); pg.wait_for_timeout(1500)
        blended = [m for m in pg.evaluate(DOCS, "mixes") if m.get("line") == "athena-blended"]
        c["tankBlended"] = [(m.get("spaceIds"), [i.get("name") for i in m.get("items", [])]) for m in blended]
        names_bl = " ".join(i.get("name", "") for m in blended for i in m.get("items", []))
        if len(blended) != 1 or (veg and blended[0].get("spaceIds") != [veg[0]["id"]]) or "Pro" in names_bl: errors.append(f"{tag} Blended tank {c['tankBlended']}")
        shot(pg, f"5-bidon-blended-{lang}.png")
        # Two spaces now: the quick entry refuses a T° of 400 too.
        pg.locator("[role=group] button").first.click(); pg.wait_for_timeout(400)
        pg.evaluate("location.hash = ''"); pg.wait_for_timeout(800)
        pg.click("#tab-plus"); pg.wait_for_timeout(500); pg.click("#add-quick"); pg.wait_for_selector(f"#q-{sid}-t"); pg.wait_for_timeout(500)
        pg.fill(f"#q-{sid}-t", "400")
        sheet(pg).get_by_role("button", name=w["save"], exact=True).click(); pg.wait_for_timeout(800)
        if not expect_error(tag, pg, f"q-{sid}-t", w["range"].format(5, 40))["focus"]: errors.append(f"{tag} quick entry field not focused")
        shot(pg, f"5-saisie-rapide-refusee-{lang}.png")
        pg.fill(f"#q-{sid}-t", "25"); sheet(pg).get_by_role("button", name=w["save"], exact=True).click(); pg.wait_for_timeout(1200)
        if (pg.evaluate(DOC, f"entries/{TODAY}_{sid}") or {}).get("tempDay") != 25: errors.append(f"{tag} quick entry")

        # 6. Calendar, a reminder, Réglages, À propos, the backup out and back in.
        tag = f"{lang}/6"
        pg.evaluate("location.hash = '#calendar'"); pg.wait_for_timeout(1000)
        if not pg.locator("#cal-back").count(): errors.append(f"{tag} no calendar")
        pg.evaluate("location.hash = ''"); pg.wait_for_timeout(800)
        pg.locator("#upcoming").get_by_role("button", name=w["reminder"]).click(); pg.wait_for_selector("#rm-title"); pg.wait_for_timeout(400)
        pg.fill("#rm-title", "Vérifier les pots")
        save_sheet(pg, w, 1200)
        rem = [r.get("title") for r in pg.evaluate(DOCS, "reminders")]
        pg.evaluate("location.hash = '#calendar'"); pg.wait_for_timeout(800)
        pg.get_by_role("radio", name="Agenda", exact=True).click(); pg.wait_for_timeout(600)
        if rem != ["Vérifier les pots"] or "Vérifier les pots" not in pg.locator("main").inner_text(): errors.append(f"{tag} reminder {rem}")
        shot(pg, f"6-calendrier-{lang}.png")
        pg.evaluate("location.hash = '#tools/settings'"); pg.wait_for_timeout(1000)
        if not pg.locator("#settings-about").count(): errors.append(f"{tag} Réglages")
        pg.evaluate("location.hash = '#tools/about'"); pg.wait_for_timeout(1000)
        if not pg.locator("#about-version").count(): errors.append(f"{tag} À propos")
        before = {col: len(pg.evaluate(DOCS, col)) for col in ["spaces", "cycles", "entries", "mixes", "reminders", "equipment"]}
        c["before"] = before
        pg.evaluate("location.hash = '#data'"); pg.wait_for_selector("#data-export", timeout=8000); pg.wait_for_timeout(600)
        with pg.expect_download() as dl:
            pg.click("#data-export")
        f = out / f"sauvegarde-{lang}.json"
        dl.value.save_as(str(f))
        backup = json.loads(f.read_text())
        if backup.get("format") != "hydro-backup" or {k: len(backup["collections"].get(k, {})) for k in before} != before: errors.append(f"{tag} backup {backup.get('format')} {[(k, len(v)) for k, v in backup['collections'].items()]}")
        # Something changed after the backup, then the backup put back (« Remplacer »).
        pg.evaluate(PUT, ["spaces/extra", {"schemaVersion": 1, "id": "extra", "name": "En trop", "template": "custom", "color": "rose", "order": 9, "modules": {"climate": True}, "createdAt": "x", "updatedAt": "x"}])
        pg.reload(); pg.wait_for_selector("#data-file", state="attached", timeout=8000); pg.wait_for_timeout(800)
        pg.set_input_files("#data-file", str(f)); pg.wait_for_timeout(600)
        pg.get_by_role("radio", name=w["replace"]).click()
        pg.get_by_role("button", name=w["import"], exact=True).click()
        pg.wait_for_selector("#data-replace-confirm")
        with pg.expect_download():
            pg.click("#data-replace-confirm")
        pg.wait_for_selector(f"text={w['imported']}", timeout=20000)
        if pg.evaluate(DOC, "spaces/extra"): errors.append(f"{tag} import did not replace")

        # 7. Reloaded: everything is still there.
        tag = f"{lang}/7"
        pg.goto(url); pg.wait_for_timeout(2000)
        after = {col: len(pg.evaluate(DOCS, col)) for col in before}
        c["after"] = after
        if after != before: errors.append(f"{tag} after reload {after} != {before}")
        lines = pg.locator("[data-space-line]").all_inner_texts()
        if len(lines) != 2 or [r.get("title") for r in pg.evaluate(DOCS, "reminders")] != ["Vérifier les pots"]: errors.append(f"{tag} today {lines}")
        kept = pg.evaluate(DOC, f"entries/{YESTERDAY}_{sid}") or {}
        if kept.get("phRunoff") != 13.1: errors.append(f"{tag} old doubtful entry lost {kept}")
        shot(pg, f"7-apres-rechargement-{lang}.png")
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
