"""Serve Figtree + JetBrains Mono locally to Playwright (Google Fonts is unreachable from the sandbox)."""
import pathlib
import base64
def font_css():
    css = []
    for fam, pkg, ws in [("Figtree", "figtree", [400, 500, 600, 700]), ("JetBrains Mono", "jetbrains-mono", [400, 500, 600])]:
        for w in ws:
            f = pathlib.Path(f"node_modules/@fontsource/{pkg}/files/{pkg}-latin-{w}-normal.woff2").read_bytes()
            css.append(f"@font-face{{font-family:'{fam}';font-weight:{w};font-display:block;src:url(data:font/woff2;base64,{base64.b64encode(f).decode()}) format('woff2')}}")
    return "\n".join(css)
FONT_CSS = font_css()
def serve_fonts(ctx):
    # Google Fonts is unreachable from the build sandbox: serve the same families locally.
    ctx.route("**/fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=FONT_CSS))
    ctx.route("**/fonts.gstatic.com/**", lambda r: r.fulfill(status=204))

