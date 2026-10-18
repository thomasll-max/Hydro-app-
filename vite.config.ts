/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { viteSingleFile } from "vite-plugin-singlefile"
import path from "node:path"

const local = process.env.VITE_TARGET === "local"

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
    <meta name="theme-color" content="#101613" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Hydro" />`,
          ),
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), ...(local ? [localTarget()] : [])],
  // Manifest, icons and service worker only in the local build.
  publicDir: local ? "pwa" : false,
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  // Minified since lot 9 (stable code, page about 3 times lighter to load on the phone). For readable stack traces while
  // debugging, build with HYDRO_DEBUG=1.
  build: { target: "es2022", assetsInlineLimit: 100_000_000, cssCodeSplit: false, minify: !process.env.HYDRO_DEBUG },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
})
