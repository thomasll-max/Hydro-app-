// Version locale : comment mettre Hydro sur l'écran d'accueil (lot 8b, guide des amis). Hidden once the app runs installed.
import { Card } from "@/components/ui/card"
import { Label } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"

const installed = () => {
  try {
    return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  } catch {
    return false
  }
}

export function InstallTip() {
  const { t } = useSettings()
  if (installed()) return null
  return (
    <Card className="gap-2" id="install-tip">
      <Label emoji="pottedPlant">{t("install.title")}</Label>
      <ul className="flex flex-col gap-1.5 text-[0.78125rem] leading-[1.45] text-fg-2">
        <li>
          <span className="font-semibold text-fg">iPhone</span> · {t("install.ios")}
        </li>
        <li>
          <span className="font-semibold text-fg">Android</span> · {t("install.android")}
        </li>
      </ul>
      <p className="text-[0.75rem] leading-snug text-fg-3">{t("install.offline")}</p>
    </Card>
  )
}
