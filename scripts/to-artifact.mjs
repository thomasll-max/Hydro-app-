// Turns Vite's single-file dist/index.html into the artifact page format:
// no doctype/html/head/body (the Artifact tool adds its own skeleton), <title> first.
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const html = fs.readFileSync(path.join(root, "dist/index.html"), "utf8")
const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? ""
const body = html.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? ""

const title = head.match(/<title>[\s\S]*?<\/title>/i)?.[0] ?? "<title>Hydro</title>"
const rest = head
  .replace(/<meta charset[^>]*>/i, "")
  .replace(/<meta name="viewport"[^>]*>/i, "")
  .replace(/<title>[\s\S]*?<\/title>/i, "")
  .trim()

const out = `${title}\n${rest}\n${body.trim()}\n`
fs.writeFileSync(path.join(root, "dist/hydro.html"), out)
console.log(`dist/hydro.html: ${(out.length / 1024).toFixed(0)} KB`)
