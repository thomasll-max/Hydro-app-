import { describe, expect, it } from "vitest"
import { dli, dryback, parseNum, potPctToMl, ppfdForDli, round, runoffPct, shotSeconds, vpd } from "./formulas"

describe("cas de test obligatoires (spec §10)", () => {
  it("PPFD 600 pendant 18 h → DLI 38,9", () => expect(round(dli(600, 18), 1)).toBe(38.9))
  it("PPFD 900 pendant 12 h → DLI 38,9", () => expect(round(dli(900, 12), 1)).toBe(38.9))
  it("1 % d'un pot de 15 L = 150 mL", () => expect(potPctToMl(15, 1)).toBe(150))
  it("pic 10,0 kg, creux 8,5 kg → dryback 15 %", () => expect(round(dryback(10, 8.5), 1)).toBe(15))
  it("26 °C, 60 % HR, feuille −2 °C → VPD ≈ 0,97 kPa (Tetens)", () => expect(round(vpd(26, 60, -2), 2)).toBe(0.97))
})

describe("autres calculs", () => {
  it("runoff %", () => expect(runoffPct(450, 27)).toBe(6))
  it("durée d'une dose : 450 mL à 2 L/min = 13,5 s", () => expect(shotSeconds(450, 2000)).toBe(13.5))
  it("calcul inverse du DLI", () => expect(round(ppfdForDli(38.88, 18), 0)).toBe(600))
  it("lit les virgules et les points", () => {
    expect(parseNum("2,4")).toBe(2.4)
    expect(parseNum("2.4")).toBe(2.4)
    expect(parseNum("")).toBeUndefined()
    expect(parseNum("abc")).toBeUndefined()
  })
})
