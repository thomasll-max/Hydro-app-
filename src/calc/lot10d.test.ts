import { describe, expect, it } from "vitest"
import { parseHash, planNav, routeHash } from "@/app/nav"
import { resumeFrom } from "@/model/entry"
import { formatInput } from "@/i18n/core"
import type { Entry } from "@/model/types"

describe("lot 10d — routes", () => {
  it("#tools/irrigation, anciens liens #irrigation et #guide, Aujourd'hui sans hash", () => {
    expect(parseHash("#tools/irrigation")).toEqual({ tab: "tools", tool: "irrigation" })
    expect(parseHash("#irrigation")).toEqual({ tab: "tools", tool: "irrigation" })
    expect(parseHash("#guide")).toEqual({ tab: "tools", tool: "reperes" })
    expect(parseHash("#tools/nope")).toEqual({ tab: "tools" })
    expect(parseHash("#journal")).toEqual({ tab: "journal" })
    expect(parseHash("")).toEqual({ tab: "today" })
    expect(parseHash("#whatever")).toEqual({ tab: "today" })
    expect(routeHash({ tab: "today" })).toBe("")
    expect(routeHash({ tab: "tools", tool: "data" })).toBe("#tools/data")
    expect(routeHash({ tab: "charts" })).toBe("#charts")
  })
})

describe("lot 10d — historique : le retour revient en arrière au lieu de quitter l'app", () => {
  const today = { tab: "today" } as const
  const tools = { tab: "tools" } as const
  const irrigation = { tab: "tools", tool: "irrigation" } as const
  const journal = { tab: "journal" } as const
  it("depuis Aujourd'hui, un onglet ajoute une étape ; entre onglets, l'étape est remplacée", () => {
    expect(planNav(today, journal, { depth: 0 })).toEqual({ kind: "push", hash: "#journal" })
    expect(planNav(journal, { tab: "charts" }, { depth: 1, prev: "" })).toEqual({ kind: "replace", hash: "#charts" })
    expect(planNav(journal, today, { depth: 1, prev: "" })).toEqual({ kind: "back" })
    expect(planNav(journal, journal, { depth: 1, prev: "" })).toBeNull()
  })
  it("un outil ajoute une étape ; « Outils » (ou retoucher l'onglet) revient à la liste", () => {
    expect(planNav(tools, irrigation, { depth: 1, prev: "" })).toEqual({ kind: "push", hash: "#tools/irrigation" })
    expect(planNav(irrigation, tools, { depth: 2, prev: "#tools" })).toEqual({ kind: "back" })
    // Opened from a link: the list is a new step, the link stays one step back.
    expect(planNav(irrigation, tools, { depth: 0 })).toEqual({ kind: "push", hash: "#tools" })
  })
  it("quitter un outil pour un autre onglet : retour à la liste, puis changement d'onglet", () => {
    expect(planNav(irrigation, journal, { depth: 2, prev: "#tools" })).toEqual({ kind: "back", then: journal })
    // Back on the list (depth 1): the tab replaces it, back then leads to Today.
    expect(planNav(tools, journal, { depth: 1, prev: "" })).toEqual({ kind: "replace", hash: "#journal" })
  })
})

describe("lot 10d — saisie", () => {
  const show = (v?: number) => formatInput("fr", v)
  const prev = { tempDay: 24.5, rh: 60, runoffMl: 300, ecRunoff: 3.1 } as Partial<Entry> as Entry
  it("« Reprendre hier » remplit les champs vides affichés, garde ce qui est tapé", () => {
    const r = resumeFrom({ tempDay: "", rh: "55" }, prev, ["tempDay", "rh", "runoffMl"], show)
    expect(r.values).toEqual({ tempDay: "24,5", rh: "55", runoffMl: "300" })
    expect(r.filled).toEqual(["tempDay", "runoffMl"])
    // ecRunoff is not on screen: never filled behind the user's back.
    expect("ecRunoff" in r.values).toBe(false)
    expect(resumeFrom({}, undefined, ["tempDay"], show).filled).toEqual([])
  })
  it("format des champs : virgule en français, rien quand c'est inconnu", () => {
    expect(formatInput("fr", 2.4)).toBe("2,4")
    expect(formatInput("en", 2.4)).toBe("2.4")
    expect(formatInput("fr", undefined)).toBe("")
    expect(formatInput("fr", Number.NaN)).toBe("")
  })
})
