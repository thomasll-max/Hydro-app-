import { describe, expect, it } from "vitest"
import { fr } from "@/i18n/fr"
import { de } from "@/i18n/de"
import { flattenKeys, formatDate, formatDayMonth, formatDayShortMonth, formatInput, lookup, translate } from "@/i18n/core"
import { LANGS } from "@/i18n/types"
import { parseSettings, phoneLang } from "@/lib/settings"
import { csvCell } from "@/lib/backup"
import { buildDailyDigest, digestWeek } from "./digest"
import { FLOWER_ID, thomasGrow } from "@/data/thomas-grow"

describe("lot 10i — allemand", () => {
  it("troisième langue : réglages, langue du téléphone au premier lancement", () => {
    expect(LANGS).toEqual(["fr", "en", "de"])
    expect(parseSettings({ lang: "de" }).lang).toBe("de")
    expect(phoneLang(["de-DE", "en"])).toBe("de")
    expect(phoneLang(["de-AT"])).toBe("de")
    expect(phoneLang(["en-US"])).toBe("fr")
    expect(phoneLang(["fr-FR"])).toBe("fr")
    expect(phoneLang([])).toBe("fr")
  })

  it("formats : virgule décimale, « 19.10. », « 19. Okt. », CSV comme en français", () => {
    const d = new Date("2026-10-19T12:00:00")
    expect(formatDayMonth("de", d)).toBe("19.10.")
    expect(formatDayShortMonth("de", d)).toBe("19. Okt.")
    expect(formatDate("de", d)).toBe("19.10.2026")
    expect(formatInput("de", 2.4)).toBe("2,4")
    expect(csvCell(6.2, "de")).toBe("6,2")
  })

  it("pluriel allemand : seulement 1 au singulier", () => {
    expect(translate("de", "site.spaces", { n: 1 })).toBe("1 Bereich")
    expect(translate("de", "site.spaces", { n: 0 })).toBe("0 Bereiche")
    expect(translate("de", "site.spaces", { n: 3 })).toBe("3 Bereiche")
  })

  it("les noms de produits et de marques ne se traduisent pas ; aucun guillemet français", () => {
    const names = ["Pro Grow", "Pro Bloom", "Pro Core", "Fade", "Cleanse", "Balance", "IPW", "Proper", "Great White", "Athena", "Handbook", "AC Infinity"]
    for (const key of flattenKeys(fr)) {
      const f = lookup(fr, key as never)
      const g = lookup(de, key as never)
      for (const n of names) if (f.includes(n)) expect(g, `${key} : ${n}`).toContain(n)
      expect(g, key).not.toMatch(/[«»]/)
    }
  })

  it("carte du matin : le texte allemand existe, la tâche du matin garde le français ; les noms gardent leur majuscule", () => {
    const s = thomasGrow("2026-10-18T06:00:00.000Z", "2026-06-01")
    const cycle = { ...s.cycles[0], spaceId: FLOWER_ID, germinationDate: "2026-07-01", vegDate: "2026-07-15", flipDate: "2026-08-24", flowerWeeks: 9 }
    const data = { grow: s.grow, spaces: s.spaces, cycles: [cycle], entries: [], mixes: [], events: [], equipment: s.equipment, assignments: s.assignments, customProducts: s.customProducts, reminders: [] }
    const [today] = digestWeek(data, "2026-10-19", "de")
    expect(Object.keys(today.texts!).sort()).toEqual(["de", "en", "fr"])
    expect(today.texts!.fr).toBe(buildDailyDigest(data, "2026-10-19", "fr").text)
    expect(today.texts!.de).toMatch(/^Guten Morgen · 19\.10\./)
    const line = buildDailyDigest(data, "2026-10-19", "de").spaces.find((x) => x.spaceId === FLOWER_ID)!.lines[0]
    expect(line.text).toMatch(/Blüte W9 · Reife/)
  })
})
