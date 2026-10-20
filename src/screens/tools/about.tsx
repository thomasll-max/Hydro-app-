// Outils → À propos (lot 13): everything the app rests on, in one place, out of the way (Réglages, last line, and the gear
// menu). The version; each source with what is taken from it and where; the technical credits with their licences; a
// short warning; what stays where and what goes to Claude. The tools only keep a small ⓘ that leads here.
import { Card } from "@/components/ui/card"
import { Label, Reveal } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import type { MessageKey } from "@/i18n/types"
import { TARGET } from "@/store"
import { CURRENT_BUILD, formatVersion } from "@/lib/version"
import { CREDITS, licenseLabel, type Credit } from "@/data/credits"

type Block = { id: string; title: MessageKey; lines: MessageKey[]; where?: MessageKey; mark?: MessageKey }

/** The sources, most used first. Pages are the printed ones (docs/athena-fiche.md). */
export const ABOUT_SOURCES: Block[] = [
  { id: "athena", title: "about.athena", lines: ["about.athena1", "about.athena2", "about.athena3"], where: "about.athenaWhere", mark: "about.athenaMark" },
  { id: "sensor", title: "about.sensor", lines: ["about.sensor1"], where: "about.sensorWhere" },
  { id: "makers", title: "about.makers", lines: ["about.makers1"] },
  { id: "formulas", title: "about.formulas", lines: ["about.formulas1", "about.formulas2", "about.formulas3", "about.formulas4", "about.formulas5"] },
  { id: "common", title: "about.common", lines: ["about.common1"] },
  { id: "spec", title: "about.spec", lines: ["about.spec1"] },
  { id: "estimates", title: "about.estimates", lines: ["about.estimates1"] },
  { id: "yours", title: "about.yours", lines: ["about.yours1"] },
]

const KINDS: { kind: Credit["kind"]; title: MessageKey }[] = [
  { kind: "font", title: "about.fonts" },
  { kind: "art", title: "about.art" },
  { kind: "icons", title: "about.icons" },
  { kind: "lib", title: "about.libs" },
]

export function AboutTool() {
  const { t, locale } = useSettings()
  const privacy: MessageKey[] =
    TARGET === "local"
      ? ["about.privacyAccount", "about.privacyLocal", "about.privacyNoClaude", "about.privacySpeech", "about.privacyBackup"]
      : ["about.privacyAccount", "about.privacyArtifact", "about.privacyClaude", "about.privacySpeech", "about.privacyFonts", "about.privacyBackup"]
  return (
    <div className="flex flex-col gap-3" id="about">
      <Reveal i={0}>
        <Card className="gap-1" id="about-version">
          <p className="text-[0.9375rem] font-semibold tabular-nums">{t("about.version", { v: formatVersion(CURRENT_BUILD, locale) })}</p>
          <p className="text-[0.8125rem] text-fg-3">{TARGET === "local" ? t("about.local") : t("about.artifact")}</p>
        </Card>
      </Reveal>

      <Reveal i={1}>
        <Card className="gap-4" id="about-sources">
          <div>
            <Label>{t("about.basedOn")}</Label>
            <p className="mt-1 text-[0.8125rem] leading-[1.45] text-fg-2">{t("about.basedOnD")}</p>
          </div>
          {ABOUT_SOURCES.map((b) => (
            <section key={b.id} id={`about-${b.id}`} className="border-t border-line pt-3.5 first-of-type:border-t-0 first-of-type:pt-0">
              <h3 className="text-[0.9375rem] leading-snug font-semibold">{t(b.title)}</h3>
              <ul className="mt-1.5 flex flex-col gap-1.5 text-[0.8125rem] leading-[1.45] text-fg-2">
                {b.lines.map((k) => (
                  <li key={k}>{t(k)}</li>
                ))}
              </ul>
              {b.where && <p className="mt-1.5 text-[0.75rem] leading-[1.45] text-fg-3">{t(b.where)}</p>}
              {b.mark && <p className="mt-1.5 text-[0.75rem] leading-[1.45] text-fg-3">{t(b.mark)}</p>}
            </section>
          ))}
        </Card>
      </Reveal>

      <Reveal i={2}>
        <Card className="gap-3" id="about-credits">
          <Label>{t("about.credits")}</Label>
          {KINDS.map(({ kind, title }) => (
            <div key={kind}>
              <h3 className="text-[0.8125rem] font-semibold text-fg-2">{t(title)}</h3>
              <p className="mt-0.5 text-[0.8125rem] leading-[1.45] text-fg-3" data-credits={kind}>
                {CREDITS.filter((c) => c.kind === kind)
                  .map((c) => `${c.name} (${licenseLabel(c.license)})`)
                  .join(" · ")}
              </p>
            </div>
          ))}
        </Card>
      </Reveal>

      <Reveal i={3}>
        <Card className="gap-1.5" id="about-disclaimer">
          <Label>{t("about.disclaimer")}</Label>
          <p className="text-[0.8125rem] leading-[1.45] text-fg-2">{t("about.disclaimer1")}</p>
        </Card>
      </Reveal>

      <Reveal i={4}>
        <Card className="gap-1.5" id="about-privacy">
          <Label>{t("about.privacy")}</Label>
          <ul className="flex flex-col gap-1.5 text-[0.8125rem] leading-[1.45] text-fg-2">
            {privacy.map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
        </Card>
      </Reveal>
    </div>
  )
}
