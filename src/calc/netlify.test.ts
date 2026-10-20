// The friends' version on Netlify: only commits with [deploy] are built, and the security headers leave what the app
// needs: the camera (photos), the microphone (the dictation, lot 11b), the fingerprint or face (lock, lot 12d).
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const toml = readFileSync("netlify.toml", "utf8")
const policy = toml.match(/Permissions-Policy = "([^"]+)"/)![1]

describe("Netlify", () => {
  it("construit la version locale, seulement sur un commit [deploy]", () => {
    expect(toml).toMatch(/command = "npm run build:local"/)
    expect(toml).toMatch(/publish = "dist-local"/)
    expect(toml).toMatch(/ignore = "git log -1 --pretty=%B \| grep -qF '\[deploy\]' && exit 1 \|\| exit 0"/)
  })

  it("le micro (dictée) et l'appareil photo autorisés pour l'app elle-même ; l'empreinte jamais bloquée", () => {
    expect(policy).toMatch(/camera=\(self\)/)
    expect(policy).toMatch(/microphone=\(self\)/)
    expect(policy).not.toMatch(/microphone=\(\)/)
    expect(policy).not.toMatch(/publickey-credentials-(get|create)=\(\)/)
    expect(policy).toMatch(/geolocation=\(\)/)
  })
})
