/// <reference types="vitest/config" />
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { viteSingleFile } from "vite-plugin-singlefile"
import path from "node:path"

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  // Not minified: readable function names in error reports from the phone (size stays far under the 16 MB limit).
  build: { target: "es2022", assetsInlineLimit: 100_000_000, cssCodeSplit: false, minify: false },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
})
