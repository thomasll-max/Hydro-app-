"""Lot 3 walk-through at 390 px: a recurring reminder, a transfer without Great White (lot 10b), month, agenda, day sheet,
Fait / Reporter, Today's "À venir" and the Bonjour card, .ics export (zip in the Claude build).
Usage: PYTHONPATH=scripts python3 scripts/e2e-3.py dist-preview/index.html <out dir>"""
import sys, pathlib, json, zipfile, datetime
from playwright.sync_api import sync_playwright
from fonts import serve_fonts

page_file = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
errors, checks = [], {}
today = datetime.date.today()
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="dark", accept_downloads=True, timezone_id="Europe/Oslo")
    ctx.add_init_script("localStorage.setItem('hydro.ui', JSON.stringify({theme:'dark',lang:'fr',updatedAt:'2026-01-01T00:00:00Z'}))")
    serve_fonts(ctx)
    pg = ctx.new_page()
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
    pg.goto(f"file://{page_file}#calendar")
    pg.wait_for_timeout(3000)
    pg.screenshot(path=str(out / "01-calendar-empty.png"), full_page=True)

    # Recurring reminder: every 3 days, 5 times, 08:00, Floraison, alarm 15 min.
    pg.get_by_role("button", name="Nouveau rappel").click()
    pg.wait_for_selector("#rm-title")
    pg.fill("#rm-title", "Vérifier le pH du bidon")
    pg.get_by_role("radio", name="Floraison").click()
    pg.fill("#rm-time", "08:00")
    pg.get_by_role("radio", name="Tous les N jours").click()
    pg.fill("#rm-every", "3")
    pg.get_by_role("radio", name="Après N fois").click()
    pg.fill("#rm-count", "5")
    pg.get_by_role("radio", name="15 min avant").click()
    pg.screenshot(path=str(out / "02-reminder-sheet.png"))
    checks["preview"] = pg.locator("text=Prochaines").inner_text()
    pg.get_by_role("button", name="Enregistrer").click()
    pg.wait_for_selector("text=Enregistré", timeout=10000)
    pg.wait_for_timeout(800)

    # Lot 10b (decision of Thomas): no planned transfer; moving cycle 1 (Colonne → Floraison) on the day brings the
    # Great White reminder when the product was not ticked at the move.
    pg.goto(f"file://{page_file}#settings"); pg.wait_for_timeout(1800)
    pg.get_by_role("button", name="Transférer").first.click()
    pg.wait_for_selector("#rp-great-white")
    pg.click("#rp-great-white")
    pg.get_by_role("button", name="Enregistrer").click()
    pg.wait_for_selector("text=Cycle transféré", timeout=10000)
    pg.wait_for_timeout(800)
    pg.goto(f"file://{page_file}#today"); pg.wait_for_timeout(1500)

    pg.get_by_role("button", name="Tous").first.click()
    pg.get_by_role("tab", name="Calendrier").click()
    pg.wait_for_timeout(1500)
    pg.screenshot(path=str(out / "03-calendar-month.png"), full_page=True)
    checks["month_dots"] = pg.locator("button[aria-label] span span").count()

    # Day sheet of today: the flow check → Fait.
    label = pg.locator("button[aria-label]").filter(has_text=str(today.day)).first
    pg.locator("button[aria-current=date]").first.click()
    pg.wait_for_timeout(800)
    pg.screenshot(path=str(out / "04-day-sheet.png"))
    checks["day_has_flow"] = pg.locator("text=Mesurer le débit").count() > 0
    pg.get_by_role("checkbox", name="Fait").first.click()
    pg.wait_for_selector("text=C'est noté", timeout=10000)
    pg.wait_for_timeout(600)
    pg.screenshot(path=str(out / "05-day-sheet-done.png"))
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(600)

    # Agenda + Reporter on the first reminder.
    pg.get_by_role("radio", name="Agenda").click()
    pg.wait_for_timeout(1000)
    pg.screenshot(path=str(out / "06-agenda.png"), full_page=True)
    checks["agenda_greatwhite"] = pg.locator("text=Great White sur les racines").count() > 0
    before = pg.locator("text=Vérifier le pH du bidon").count()
    pg.get_by_role("button", name="Reporter à demain").first.click()
    pg.wait_for_selector("text=Reporté à demain", timeout=10000)
    pg.wait_for_timeout(800)
    checks["agenda_reminders"] = before

    # Export: the Claude build without runtime falls back to a plain download link.
    with pg.expect_download() as dl:
        pg.get_by_role("button", name="hydro.zip").click()
    path = out / "hydro.zip"
    dl.value.save_as(str(path))
    with zipfile.ZipFile(path) as z:
        ics = z.read("hydro.ics").decode()
    (out / "hydro.ics").write_text(ics)
    checks["ics"] = {k: k in ics for k in ["BEGIN:VCALENDAR", "RRULE:FREQ=DAILY;INTERVAL=3;COUNT=5", "TRIGGER:-PT15M", "TZID:Europe/Oslo", "Great White"]}

    # Today: "À venir" and Bonjour.
    pg.get_by_role("tab", name="Aujourd'hui").click()
    pg.wait_for_timeout(1500)
    pg.screenshot(path=str(out / "07-today-all.png"), full_page=True)
    pg.get_by_role("button", name="Floraison").first.click()
    pg.wait_for_timeout(1500)
    pg.screenshot(path=str(out / "08-today-floraison.png"), full_page=True)
    sw = pg.evaluate("document.documentElement.scrollWidth")
    b.close()
print(json.dumps({"checks": checks, "scrollWidth": sw, "errors": errors}, ensure_ascii=False, indent=1))
