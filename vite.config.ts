/// <reference types="vitest/config" />
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { viteSingleFile } from "vite-plugin-singlefile"
import path from "node:path"

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  // Minified since lot 9 (stable code, page about 3 times lighter to load on the phone). For readable stack traces while
  // debugging, build with HYDRO_DEBUG=1.
  build: { target: "es2022", assetsInlineLimit: 100_000_000, cssCodeSplit: false, minify: !process.env.HYDRO_DEBUG },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
})
