"""Lot 10h « instrument » in the browser, preview build, light and dark (FR), then captures FR/EN at 390 and 360 px:
- palette tokens of the prompt on <html>; the logo's full stop in the colour of the text;
- space marker: a 10 px square, radius 3;
- main button: radius 10, inner shadow at the bottom, 48 px; secondary: 1 px outline, no fill;
- instrument fields: no box, a bottom line, value in Geologica 26 px (JetBrains Mono until lot 10k), the unit inside; a typo turns the line
  « à surveiller » with its message;
- segmented control: joined boxes, the active one inverted;
- reminders: a square check box (22 px, radius 6) that ticks and unticks;
- keyboard focus: 2 px « eau » outline, 2 px away;
10h2, with a cycle and entries seeded: readings (bar, target zone, tick in « à surveiller » / « alerte » out of target),
« Bonjour Thomas. » upright (Geologica 700 since lot 10k, the title of the screen since lot 10k1), sections without frames, space tabs underlined,
the cycle step button with its consequence, the journal by weeks (lot 10k3);
10h3: the tab bar anchored at the bottom (page ground, thin line, « + » 52 × 44 in the middle, four tabs), no week strip
(removed in lot 10k1), the date of the top bar,
« Tout le calendrier → », the Calendar at the top of Outils, « Tous les réglages → » of the display menu (back returns
to the Journal), tapping Aujourd'hui again goes back to the top, no screen motion with reduced motion.
Usage: npm run preview:build && PYTHONPATH=scripts python3 scripts/e2e-10h.py dist-preview/index.html <out dir>"""
import sys, json, pathlib, datetime, subprocess
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
errors, checks = [], {}
PALETTE = {
    "dark": {"--page": "#0d1310", "--surface": "#131c18", "--line": "#28302c", "--fg": "#eaf0ed", "--fg-3": "#9ca8a2", "--water": "#56d1a3", "--leaf": "#aad56e", "--warn": "#eeb154", "--bad": "#ed7761"},
    "light": {"--page": "#f2f6f4", "--surface": "#ffffff", "--line": "#d5dcd8", "--fg": "#141d19", "--fg-3": "#56605b", "--water": "#007653", "--leaf": "#4f7715", "--warn": "#a15b00", "--bad": "#b2392b"},
}
rgb = lambda h: f"rgb({int(h[1:3], 16)}, {int(h[3:5], 16)}, {int(h[5:7], 16)})"


def ui(theme, lang):
    return f"localStorage.setItem('hydro.ui', JSON.stringify({json.dumps({'theme': theme, 'lang': lang, 'updatedAt': '2026-01-01T00:00:00Z'})}))"


def open_entry(pg, lang="fr"):
    pg.click("#tab-plus"); pg.click("#add-entry"); pg.wait_for_timeout(600)  # the « + » opens a small sheet since lot 10k3
    full = pg.get_by_role("button", name="Saisie complète" if lang == "fr" else "Full entry")
    if full.count(): full.first.click()
    pg.wait_for_selector("#e-when"); pg.wait_for_timeout(800)


with sync_playwright() as p:
    b = p.chromium.launch()
    for theme in ["light", "dark"]:
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme=theme)
        ctx.add_init_script(ui(theme, "fr"))
        serve_fonts(ctx)
        pg = ctx.new_page()
        pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
        pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
        pg.goto(f"file://{page_file}"); pg.wait_for_timeout(2500)
        c = {}
        c["tokens"] = pg.evaluate("(ks) => Object.fromEntries(ks.map((k) => [k, getComputedStyle(document.documentElement).getPropertyValue(k).trim()]))", list(PALETTE[theme]))
        # The minifier writes #ffffff as #fff.
        c["tokens"] = {k: ("#" + "".join(ch * 2 for ch in v[1:]) if len(v) == 4 else v) for k, v in c["tokens"].items()}
        if c["tokens"] != PALETTE[theme]: errors.append(f"{theme} tokens {c['tokens']}")
        c["logoDot"] = pg.evaluate("""() => { const l = document.querySelector('header [role=img][aria-label=Hydro]'); const dot = [...l.querySelectorAll('span')].pop(); return [getComputedStyle(dot).color, getComputedStyle(l).color] }""")
        if c["logoDot"][0] != c["logoDot"][1]: errors.append(f"{theme} logo dot {c['logoDot']}")
        c["spaceDot"] = pg.evaluate("""() => { const d = [...document.querySelectorAll('span[aria-hidden=true]')].find((s) => (s.getAttribute('style') || '').includes('--space-')); const r = d.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), getComputedStyle(d).borderRadius] }""")
        if c["spaceDot"] != [10, 10, "3px"]: errors.append(f"{theme} space dot {c['spaceDot']}")

        # A square check box (« Fait »). Since lot 10k1 Aujourd'hui may hold the only item of the day in « Maintenant »
        # (« C'est fait »): the box is taken from the day sheet of the calendar.
        pg.goto(f"file://{page_file}#calendar"); pg.wait_for_timeout(1500)
        pg.locator("button[aria-current=date]").first.click(); pg.wait_for_timeout(800)
        box = pg.get_by_role("checkbox", name="Fait").first
        c["check"] = box.evaluate("(el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return [Math.round(r.width), s.borderRadius, el.getAttribute('aria-checked')] }")
        if c["check"][:2] != [22, "6px"]: errors.append(f"{theme} check box {c['check']}")
        if theme == "light":
            box.click(); pg.wait_for_selector("text=C'est noté", timeout=8000); pg.wait_for_timeout(800)
            # The day sheet keeps done items: ticked in « plante », and a second tap unticks.
            c["ticked"] = pg.evaluate("() => [...document.querySelectorAll('[role=checkbox][aria-checked=true]')].map((el) => getComputedStyle(el).backgroundColor)")
            if not c["ticked"] or c["ticked"][0] != rgb(PALETTE[theme]["--leaf"]): errors.append(f"ticked {c['ticked']}")
            pg.screenshot(path=str(out / "day-sheet-ticked.png"))
            pg.locator("[role=checkbox][aria-checked=true]").first.click(); pg.wait_for_timeout(1200)
            c["unticked"] = pg.locator("[role=checkbox][aria-checked=true]").count()
            if c["unticked"]: errors.append("untick failed")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
        pg.goto(f"file://{page_file}"); pg.wait_for_timeout(1500)

        # Keyboard focus on a button.
        pg.locator("#display-menu").focus(); pg.keyboard.press("Shift+Tab"); pg.keyboard.press("Tab"); pg.wait_for_timeout(200)
        c["focus"] = pg.evaluate("() => { const s = getComputedStyle(document.activeElement); return [s.outlineStyle, s.outlineWidth, s.outlineOffset, s.outlineColor] }")
        if c["focus"] != ["solid", "2px", "2px", rgb(PALETTE[theme]["--water"])]: errors.append(f"{theme} focus {c['focus']}")
        pg.screenshot(path=str(out / f"today-{theme}.png"), full_page=True)

        # Entry sheet: fields, segmented control, main and secondary buttons.
        open_entry(pg)
        c["field"] = pg.evaluate("""() => { const i = document.querySelector('#e-tempDay'); const s = getComputedStyle(i); const w = i.parentElement; return { font: s.fontFamily.split(',')[0], size: s.fontSize, border: s.borderTopWidth, bg: s.backgroundColor, line: getComputedStyle(w).boxShadow, unit: w.textContent.trim() } }""")
        f = c["field"]
        if "Geologica" not in f["font"] or f["size"] != "26px" or f["border"] != "0px" or "inset" not in f["line"] or f["unit"] != "°C": errors.append(f"{theme} field {f}")
        pg.fill("#e-tempDay", "2,4,5"); pg.wait_for_timeout(200)
        c["bad"] = pg.evaluate("""() => { const i = document.querySelector('#e-tempDay'); const m = document.querySelector('#e-tempDay-err'); return [getComputedStyle(i.parentElement).boxShadow, m && getComputedStyle(m).color] }""")
        if rgb(PALETTE[theme]["--warn"]) not in c["bad"][0] or c["bad"][1] != rgb(PALETTE[theme]["--warn"]): errors.append(f"{theme} typo {c['bad']}")
        pg.fill("#e-tempDay", "24"); pg.wait_for_timeout(200)
        # Since lot 10l2 the space and the plant are behind « tout l'espace ▾ ».
        if pg.locator("#e-scope").count() and not pg.locator("#e-scope-panel").count(): pg.click("#e-scope"); pg.wait_for_timeout(300)
        c["seg"] = pg.evaluate("""() => { const g = document.querySelector('[data-slot=drawer-content] [role=radiogroup]'); if (!g) return null; const on = g.querySelector('[data-state=on]'); const s = getComputedStyle(on); return { radius: getComputedStyle(g).borderRadius, gap: getComputedStyle(g).columnGap, bg: s.backgroundColor, fg: s.color } }""")
        if not c["seg"] or c["seg"]["radius"] != "10px" or c["seg"]["bg"] != rgb(PALETTE[theme]["--fg"]) or c["seg"]["fg"] != rgb(PALETTE[theme]["--page"]): errors.append(f"{theme} segmented {c['seg']}")
        main = pg.get_by_role("button", name="Enregistrer", exact=True)
        c["main"] = main.evaluate("(el) => { const s = getComputedStyle(el); return [s.borderRadius, s.boxShadow, Math.round(el.getBoundingClientRect().height), s.backgroundColor] }")
        if c["main"][0] != "10px" or "inset" not in c["main"][1] or c["main"][2] != 48 or c["main"][3] != rgb(PALETTE[theme]["--water"]): errors.append(f"{theme} main button {c['main']}")
        # A secondary button: « Reprendre hier » when yesterday's values are there (lot 10l2), else none in the entry.
        sec = pg.locator("[data-slot=drawer-content] [data-variant=outline]")
        c["secondary"] = sec.first.evaluate("(el) => { const s = getComputedStyle(el); return [s.borderRadius, s.borderTopWidth, s.backgroundColor] }") if sec.count() else None
        if c["secondary"] is not None and c["secondary"] != ["10px", "1px", "rgba(0, 0, 0, 0)"]: errors.append(f"{theme} secondary {c['secondary']}")
        pg.screenshot(path=str(out / f"entry-{theme}.png"))
        checks[theme] = c
        ctx.close()

    # 10h2: a cycle in Floraison, an entry today (EC runoff out of target) and two plant heights.
    today = datetime.date.today().isoformat()
    ago = lambda n: (datetime.date.today() - datetime.timedelta(days=n)).isoformat()
    base = json.loads(subprocess.check_output(["npx", "-y", "tsx", "-e", 'import { thomasGrow } from "./src/data/thomas-grow.ts"; console.log(JSON.stringify(thomasGrow("2026-10-19T06:00:00Z").cycles[0]))'], text=True).strip().splitlines()[-1])
    docs = {"cycles/cur": {**base, "id": "cur", "name": "Cycle 7", "spaceId": "floraison", "germinationDate": ago(70), "vegDate": ago(60), "flipDate": ago(38), "createdAt": f"{ago(70)}T08:00:00Z"}}
    tg = {"stage": "bulk", "dryback": {"lo": 40, "hi": 50}, "ecRunoff": {"lo": 3, "hi": 4}, "phRunoff": {"lo": 6.0, "hi": 6.4}}
    docs[f"entries/{today}_floraison"] = {"schemaVersion": 2, "id": f"{today}_floraison", "date": today, "time": "08:10", "spaceId": "floraison", "cycleId": "cur", "createdAt": "x", "updatedAt": "x", "dryback": 45, "ecRunoff": 5.6, "phRunoff": 6.2, "tempDay": 25, "rh": 60, "targets": tg}
    for pl, hcm in [("P1", 88), ("P2", 91)]:
        docs[f"entries/{today}_floraison_{pl}"] = {"schemaVersion": 2, "id": f"{today}_floraison_{pl}", "date": today, "spaceId": "floraison", "plantId": pl, "cycleId": "cur", "heightCm": hcm, "createdAt": "x", "updatedAt": "x"}
    docs[f"entries/{ago(1)}_floraison"] = {"schemaVersion": 2, "id": f"{ago(1)}_floraison", "date": ago(1), "spaceId": "floraison", "cycleId": "cur", "createdAt": "x", "updatedAt": "x", "dryback": 38, "targets": tg}
    for theme in ["dark", "light"]:
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme=theme)
        ctx.add_init_script(ui(theme, "fr"))
        serve_fonts(ctx)
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
        pg.goto(f"file://{page_file}"); pg.wait_for_timeout(2500)
        pg.evaluate("""(docs) => new Promise((res, rej) => { const r = indexedDB.open('hydro', 1); r.onsuccess = () => { const tx = r.result.transaction('docs', 'readwrite'); const s = tx.objectStore('docs'); for (const [k, v] of Object.entries(docs)) s.put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error) } })""", docs)
        pg.reload(); pg.wait_for_timeout(2500)
        c = {}
        c["bonjour"] = pg.evaluate("""() => { const h = document.querySelector('#hello'); const s = getComputedStyle(h); return { text: h.textContent, font: s.fontFamily.split(',')[0], style: s.fontStyle, weight: s.fontWeight, now: !!document.querySelector('#now') } }""")
        bj = c["bonjour"]
        # Lot 10k1: « Bonjour Thomas. » is the title of the screen, « Maintenant » under it (the summary in lines is gone).
        if bj["text"] != "Bonjour Thomas." or "Geologica" not in bj["font"] or bj["style"] != "normal" or bj["weight"] != "700" or not bj["now"]: errors.append(f"{theme} bonjour {bj}")
        c["tabs"] = pg.evaluate("""() => { const g = document.querySelector('[role=group][aria-label]'); const on = g.querySelector('[aria-pressed=true]'); const u = on.querySelector('span.absolute'); return { radius: getComputedStyle(g).borderRadius, line: u && getComputedStyle(u).backgroundColor, h: u && u.getBoundingClientRect().height } }""")
        if c["tabs"]["radius"] != "0px" or c["tabs"]["line"] != rgb(PALETTE[theme]["--water"]) or c["tabs"]["h"] != 2: errors.append(f"{theme} space tabs {c['tabs']}")
        pg.get_by_role("group").first.get_by_role("button", name="Floraison").click(); pg.wait_for_timeout(1500)
        c["readings"] = pg.evaluate("""() => [...document.querySelectorAll('#readings [data-status]')].map((r) => ({ status: r.dataset.status, value: getComputedStyle(r.querySelector('.font-num')).fontSize, tick: r.querySelector('[data-tick]') && getComputedStyle(r.querySelector('[data-tick]')).backgroundColor, zone: !!r.querySelector('[data-zone]'), target: r.lastElementChild.textContent }))""")
        rd = c["readings"]
        if len(rd) < 3 or rd[0]["status"] != "ok" or rd[0]["value"] != "30px" or not rd[0]["zone"] or rd[0]["target"] != "cible 40–50 %": errors.append(f"{theme} dryback reading {rd[:1]}")
        ec = next((r for r in rd if r["target"].startswith("cible 3")), None)
        if not ec or ec["status"] not in ("warn", "bad") or ec["tick"] != rgb(PALETTE[theme]["--" + ec["status"]]): errors.append(f"{theme} EC reading {ec}")
        c["frames"] = pg.evaluate("""() => [...document.querySelectorAll('main [data-slot=card]')].filter((el) => getComputedStyle(el).borderLeftWidth !== '0px' && el.id !== 'start-card').length""")
        if c["frames"]: errors.append(f"{theme} framed sections {c['frames']}")
        # Since lot 10l1: the state block is the page's only frame; the step (when near) is an outlined button in it, without
        # the consequence (« J1 floraison → »).
        c["step"] = pg.evaluate("""() => { const b = document.querySelector('#space-status button[id^=step-]'); return { block: getComputedStyle(document.querySelector('#space-status')).borderTopWidth, step: b ? [b.textContent, getComputedStyle(b).borderTopWidth] : null } }""")
        if c["step"]["block"] != "1px" or (c["step"]["step"] and ("→" in c["step"]["step"][0] or c["step"]["step"][1] != "1px")): errors.append(f"{theme} step {c['step']}")
        pg.screenshot(path=str(out / f"space-{theme}.png"), full_page=True)
        pg.get_by_role("tab", name="Journal").click(); pg.wait_for_timeout(1500)
        # Since lot 10k3: one card per week, the running one open, the strip of 7 days, the ranges in the number font.
        c["journal"] = pg.evaluate("""() => { const w = document.querySelector('[data-week][data-open]'); return w && { days: w.querySelectorAll('[data-strip] button').length, today: !!w.querySelector('[data-today]'), summary: w.querySelector('[data-summary]').textContent, num: getComputedStyle(w.querySelector('[data-summary] .font-num')).fontFamily.split(',')[0] } }""")
        j = c["journal"]
        if not j or j["days"] != 7 or not j["today"] or "dryback" not in j["summary"] or "Geologica" not in j["num"]: errors.append(f"{theme} journal {j}")
        pg.screenshot(path=str(out / f"journal-{theme}.png"), full_page=True)
        checks[f"10h2-{theme}"] = c
        ctx.close()

    # 10h3: navigation.
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark")
    ctx.add_init_script(ui("dark", "fr"))
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(f"file://{page_file}"); pg.wait_for_timeout(2500)
    h = lambda: pg.evaluate("location.hash")
    c = {}
    c["bar"] = pg.evaluate("""() => { const n = document.querySelector('nav[aria-label]'); const r = n.getBoundingClientRect(); const s = getComputedStyle(n); const plus = n.querySelector('#tab-plus'); const p = plus.getBoundingClientRect(); return { bottom: Math.round(r.bottom), left: r.left, width: Math.round(r.width), bg: s.backgroundColor, top: s.borderTopWidth, tabs: [...n.querySelectorAll('[role=tab]')].map((x) => x.textContent.trim()), plus: [Math.round(p.width), Math.round(p.height), getComputedStyle(plus).borderRadius, getComputedStyle(plus).backgroundColor, Math.round(p.left + p.width / 2)] } }""")
    bar = c["bar"]
    if bar["bottom"] != 844 or bar["left"] != 0 or bar["width"] != 390 or bar["bg"] != rgb(PALETTE["dark"]["--page"]) or bar["top"] != "1px" or bar["tabs"] != ["Aujourd'hui", "Journal", "Graphiques", "Outils"] or bar["plus"] != [52, 44, "12px", rgb(PALETTE["dark"]["--water"]), 195]: errors.append(f"tab bar {bar}")
    # Lot 10k1: the week strip left Aujourd'hui (the date of the top bar and « Tout le calendrier → » open the Calendar).
    c["week"] = pg.locator("#week-strip").count()
    if c["week"]: errors.append("week strip still on Aujourd'hui")
    pg.click("#today-date"); pg.wait_for_timeout(1200)
    c["dateBtn"] = h()
    pg.click("#cal-back"); pg.wait_for_timeout(1200)
    c["dateBack"] = h()
    if c["dateBtn"] != "#calendar" or c["dateBack"] != "": errors.append(f"date of the top bar {c['dateBtn']} → {c['dateBack']}")
    pg.click("#all-calendar"); pg.wait_for_timeout(1200)
    c["allCal"] = h(); pg.go_back(); pg.wait_for_timeout(1000)
    pg.get_by_role("tab", name="Outils").click(); pg.wait_for_timeout(1000)
    c["toolsFirst"] = pg.locator("#tools-list button").first.inner_text().split("\n")[0]
    pg.click("#tool-calendar"); pg.wait_for_timeout(1200)
    c["fromTools"] = h(); pg.go_back(); pg.wait_for_timeout(1000); c["backTools"] = h()
    if c["allCal"] != "#calendar" or c["toolsFirst"] != "Nutrition" or c["fromTools"] != "#calendar" or c["backTools"] != "#tools": errors.append(f"calendar accesses {c}")
    pg.get_by_role("tab", name="Journal").click(); pg.wait_for_timeout(1000)
    pg.click("#display-menu"); pg.wait_for_timeout(500)
    pg.click("#all-settings"); pg.wait_for_timeout(1200)
    c["settings"] = [h(), pg.locator("#display-menu[data-state=open]").count()]
    pg.go_back(); pg.wait_for_timeout(1000); c["settingsBack"] = h()
    if c["settings"] != ["#tools/settings", 0] or c["settingsBack"] != "#journal": errors.append(f"all settings {c['settings']} → {c['settingsBack']}")
    pg.get_by_role("tab", name="Aujourd'hui").click(); pg.wait_for_timeout(1000)
    pg.evaluate("window.scrollTo(0, 600)"); pg.wait_for_timeout(300)
    pg.get_by_role("tab", name="Aujourd'hui").click(); pg.wait_for_timeout(1200)
    c["retapTop"] = pg.evaluate("window.scrollY")
    if c["retapTop"] != 0: errors.append(f"tapping Aujourd'hui again: scrollY {c['retapTop']}")
    pg.screenshot(path=str(out / "nav-today-dark.png"))
    checks["10h3"] = c
    ctx.close()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="light", reduced_motion="reduce")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.goto(f"file://{page_file}"); pg.wait_for_timeout(2500)
    pg.get_by_role("tab", name="Journal").click(); pg.wait_for_timeout(60)
    checks["reducedMotion"] = pg.evaluate("getComputedStyle(document.querySelector('#main-panel > div')).opacity")
    if checks["reducedMotion"] != "1": errors.append(f"reduced motion: opacity {checks['reducedMotion']} right after a tab change")
    ctx.close()

    # Captures: FR / EN, light / dark, 390 and 360 px; zoom 200 % on the entry.
    for lang in ["fr", "en"]:
        for theme in ["light", "dark"]:
            for w in [390, 360]:
                ctx = b.new_context(viewport={"width": w, "height": 844}, device_scale_factor=2, color_scheme=theme)
                ctx.add_init_script(ui(theme, lang))
                serve_fonts(ctx)
                pg = ctx.new_page()
                pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
                pg.goto(f"file://{page_file}"); pg.wait_for_timeout(2200)
                if pg.evaluate("document.documentElement.scrollWidth") > w: errors.append(f"overflow {lang}/{theme}/{w}")
                pg.screenshot(path=str(out / f"cap-today-{lang}-{theme}-{w}.png"))
                open_entry(pg, lang)
                pg.screenshot(path=str(out / f"cap-entry-{lang}-{theme}-{w}.png"))
                ctx.close()
    ctx = b.new_context(viewport={"width": 195, "height": 422}, device_scale_factor=4, color_scheme="light")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.goto(f"file://{page_file}"); pg.wait_for_timeout(2200)
    open_entry(pg)
    pg.add_style_tag(content=".hit::after, .hit-sq::after { display: none !important }")
    checks["zoomOverflow"] = pg.evaluate("""() => [...document.querySelectorAll('[data-slot=drawer-content] *')].filter((el) => el.scrollWidth > el.clientWidth + 1 && !['auto', 'scroll'].includes(getComputedStyle(el).overflowX) && el.clientWidth > 0 && !el.closest('.truncate, [class*=truncate], [class*=sr-only]')).map((el) => `${el.tagName}.${String(el.className).slice(0, 40)}`).slice(0, 6)""")
    if checks["zoomOverflow"]: errors.append(f"zoom 200 % overflow {checks['zoomOverflow']}")
    pg.screenshot(path=str(out / "cap-entry-zoom200.png"))
    ctx.close()
    b.close()

print(json.dumps(checks, ensure_ascii=False, indent=1))
print("errors:", errors[:8])
print("OK" if not errors else "FAIL")
sys.exit(0 if not errors else 1)
