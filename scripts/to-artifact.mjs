// Turns Vite's single-file dist/index.html into the artifact page format:
// no doctype/html/head/body (the Artifact tool adds its own skeleton), <title> first.
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const html = fs.readFileSync(path.join(root, "dist/index.html"), "utf8")
// The bundled script can hold "</head>" or "<body>" in a string (the printable review page, lot 12a): the real head
// ends at the last "</head>", the real body starts after it and ends at the last "</body>".
const headEnd = html.lastIndexOf("</head>")
const head = headEnd > 0 ? html.slice(html.indexOf("<head>") + "<head>".length, headEnd) : ""
const bodyStart = html.indexOf("<body>", headEnd)
const body = bodyStart > 0 ? html.slice(bodyStart + "<body>".length, html.lastIndexOf("</body>")) : ""

const title = head.match(/<title>[\s\S]*?<\/title>/i)?.[0] ?? "<title>Hydro</title>"
const rest = head
  .replace(/<meta charset[^>]*>/i, "")
  .replace(/<meta name="viewport"[^>]*>/i, "")
  .replace(/<title>[\s\S]*?<\/title>/i, "")
  .trim()

const out = `${title}\n${rest}\n${body.trim()}\n`
// Never publish a page without its stylesheet or its script.
const biggestStyle = Math.max(0, ...[...out.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1].length))
if (biggestStyle < 20_000 || !/<script type="module"/.test(out) || !out.includes('id="root"')) throw new Error(`dist/hydro.html looks broken (style ${biggestStyle} chars)`)
fs.writeFileSync(path.join(root, "dist/hydro.html"), out)
console.log(`dist/hydro.html: ${(out.length / 1024).toFixed(0)} KB`)
