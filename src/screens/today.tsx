// Aujourd'hui: « Tous » (or a room) is the calm overview (today-calm.tsx, lot 10k1); a space's tab is its page
// (space-page.tsx, lot 10l1).
import { Loading } from "@/components/hydro/wordmark"
import { DigestKeeper } from "./today-spaces"
import { CalmToday } from "./today-calm"
import { SpacePage } from "./space-page"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { GuideLine } from "./guide-line"

export function TodayScreen() {
  const { t } = useSettings()
  const { ready, selection } = useGrow()
  if (!ready) return <Loading label={t("app.loading")} />
  return (
    <>
      <DigestKeeper />
      <GuideLine />
      {selection.kind === "space" ? <SpacePage key={selection.space.id} space={selection.space} /> : <CalmToday />}
    </>
  )
}
