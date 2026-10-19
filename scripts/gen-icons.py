"""App icons (lot 10f): the drop with its leaf on #101613, from pwa/icon.svg. Run: python3 scripts/gen-icons.py"""
import pathlib
from playwright.sync_api import sync_playwright

PWA = pathlib.Path(__file__).resolve().parent.parent / "pwa"
BG = "#101613"
DROP = "#3ecf8e"
PATHS = (
    '<path d="M50 4 C50 4 8 58 8 84 A42 42 0 0 0 92 84 C92 58 50 4 50 4 Z" fill="{drop}"/>'
    '<path d="M50 114 C29 101 29 72 50 54 C71 72 71 101 50 114 Z" fill="{bg}"/>'
    '<path d="M50 108 L50 64" stroke="{drop}" stroke-width="5" stroke-linecap="round"/>'
)


def svg(share: float, size: int | None = None) -> str:
    """Square icon; the drop (y 4…126, centre 50,65) takes `share` of the height."""
    side = 122 / share
    x, y = 50 - side / 2, 65 - side / 2
    dims = f' width="{size}" height="{size}"' if size else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x:.2f} {y:.2f} {side:.2f} {side:.2f}"{dims}>'
        f'<rect x="{x:.2f}" y="{y:.2f}" width="{side:.2f}" height="{side:.2f}" fill="{BG}"/>'
        + PATHS.format(drop=DROP, bg=BG)
        + "</svg>\n"
    )


# 58 % of the height: inside the « maskable » safe zone. The maskable version keeps an extra margin (48 %).
ICON = svg(0.58)
MASKABLE = svg(0.48)
(PWA / "icon.svg").write_text(ICON)
(PWA / "favicon.svg").write_text(svg(0.62))

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, src, size in [
        ("icon-192.png", ICON, 192),
        ("icon-512.png", ICON, 512),
        ("apple-touch-icon.png", ICON, 180),
        ("icon-maskable-512.png", MASKABLE, 512),
        ("favicon-32.png", svg(0.62), 32),
    ]:
        page = b.new_page(viewport={"width": size, "height": size})
        page.set_content(f'<html><body style="margin:0">{src.replace("<svg ", f"<svg width=\"{size}\" height=\"{size}\" ", 1)}</body></html>')
        page.screenshot(path=str(PWA / name), clip={"x": 0, "y": 0, "width": size, "height": size})
        page.close()
        print(name)
    b.close()
