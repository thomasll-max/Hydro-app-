/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { viteSingleFile } from "vite-plugin-singlefile"
import path from "node:path"
import { execSync } from "node:child_process"
import fs from "node:fs"
import { headersFile } from "./src/lib/csp"

const local = process.env.VITE_TARGET === "local"

/** Version shown in Réglages and written to version.json (lot 8e). Netlify gives the commit in COMMIT_REF. */
function buildInfo() {
  const sh = (cmd: string) => {
    try {
      return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim()
    } catch {
      return ""
    }
  }
  const commit = (process.env.COMMIT_REF ?? "").slice(0, 7) || sh("git rev-parse --short=7 HEAD") || "dev"
  // Uncommitted changes (the build's own generated files aside) → "+" after the commit.
  const dirty = !process.env.COMMIT_REF && sh("git status --porcelain -- . ':!src/assets/emoji.ts' ':!release'") !== ""
  return { commit, builtAt: new Date().toISOString(), ...(dirty ? { dirty: true } : {}) }
}
const build = buildInfo()

/** Local (friends') build: fonts embedded instead of Google Fonts, installable (manifest, icons, service worker). */
function localTarget(): Plugin {
  return {
    name: "hydro-local-target",
    transformIndexHtml: {
      order: "pre",
      handler: (html) =>
        html
        .replace(/\s*<link rel="preconnect"[^>]*>/g, "")
        .replace(/\s*<link\s+rel="stylesheet"\s+href="https:\/\/fonts\.googleapis\.com[^>]*>/, "")
        .replace(/\s*<meta name="claude:viewport-fit-sides"[^>]*>/, "")
        .replace(
          "</title>",
          `</title>
    <link rel="stylesheet" href="/src/fonts-local.css" />
    <link rel="manifest" href="manifest.webmanifest" />
    <link rel="apple-touch-icon" href="apple-touch-icon.png" />
    <link rel="icon" type="image/svg+xml" href="favicon.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png" />
    <meta name="theme-color" content="#101613" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Hydro" />`,
          ),
    },
    // Read by the app to offer an update (never cached: see pwa/sw.js and netlify.toml).
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify(build) })
    },
    // Netlify: a CSP that allows exactly the inline scripts of this build (lot 10a).
    writeBundle(opts) {
      const dir = opts.dir ?? "dist-local"
      const html = fs.readFileSync(path.join(dir, "index.html"), "utf8")
      fs.writeFileSync(path.join(dir, "_headers"), headersFile(html))
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), ...(local ? [localTarget()] : [])],
  // Manifest, icons and service worker only in the local build.
  publicDir: local ? "pwa" : false,
  define: { __HYDRO_BUILD__: JSON.stringify(build) },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  // Minified since lot 9 (stable code, page about 3 times lighter to load on the phone). For readable stack traces while
  // debugging, build with HYDRO_DEBUG=1.
  build: { target: "es2022", assetsInlineLimit: 100_000_000, cssCodeSplit: false, minify: !process.env.HYDRO_DEBUG },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
})
