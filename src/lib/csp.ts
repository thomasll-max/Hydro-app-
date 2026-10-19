// Content-Security-Policy of the local build on Netlify (lot 10a). Node only (build and tests): the page is a single
// file whose scripts are inline, so each one is allowed by its exact hash instead of 'unsafe-inline'.
import { createHash } from "node:crypto"

export function inlineScriptHashes(html: string): string[] {
  const out: string[] = []
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/.test(m[1])) continue
    out.push(`'sha256-${createHash("sha256").update(m[2], "utf8").digest("base64")}'`)
  }
  return out
}

/** Everything comes from the site itself (fonts and icons are embedded); photos are blob: URLs; no frame may embed it. */
export function cspFor(html: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' ${inlineScriptHashes(html).join(" ")}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ")
}

/** Netlify `_headers` file: the CSP for every page (the other security headers are in netlify.toml). */
export function headersFile(html: string): string {
  return `/*\n  Content-Security-Policy: ${cspFor(html)}\n`
}
