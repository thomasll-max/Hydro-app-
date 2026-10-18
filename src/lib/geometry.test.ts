import { describe, expect, it } from "vitest"
import { arcDash, bandStatus } from "./geometry"

describe("jauge en arc", () => {
  it("l'arc complet couvre 270°", () => {
    const a = arcDash(0, 1, 40)
    expect(a.length).toBeCloseTo(0.75 * 2 * Math.PI * 40)
  })
  it("la bande cible commence au bon endroit", () => {
    const b = arcDash(40 / 70, 50 / 70, 40)
    expect(b.dashoffset).toBeCloseTo(-(40 / 70) * b.length)
  })
})

describe("pastilles", () => {
  it("dans la cible : vert", () => expect(bandStatus(44, 40, 50)).toBe("ok"))
  it("juste à côté : orange", () => expect(bandStatus(6.6, 5.8, 6.2)).toBe("warn"))
  it("loin : rouge", () => expect(bandStatus(7.5, 5.8, 6.2)).toBe("bad"))
})
