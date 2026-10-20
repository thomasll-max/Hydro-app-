"""Shared steps for the day's entry sheet in the e2e scripts."""


def when(pg):
    """Since lot 10l2 the date and the time of an entry are behind « modifier » in its header: open them if needed."""
    if not pg.locator("#e-date").count():
        pg.click("#e-when")
        pg.wait_for_selector("#e-date")
