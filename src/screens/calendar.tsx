import { ComingSoon, Reveal, ScreenHero } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"

export function CalendarScreen() {
  const { t } = useSettings()
  return (
    <>
      <ScreenHero emoji="calendar" title={t("nav.calendar")} />
      <Reveal i={0}>
        <ComingSoon emoji="alarm" lot={t("soon.title", { n: 3 })} title={t("nav.calendar")} body={t("soon.calendar")} foot={t("soon.keep")} />
      </Reveal>
    </>
  )
}
