// A photo the journal refers to but that cannot be read (a backup restored without its photos, lot 12b): a warning,
// never an empty frame.
import { AlertTriangle } from "lucide-react"
import { useSettings } from "@/app/settings-context"
import { cn } from "@/lib/utils"

export function MissingPhoto({ small }: { small?: boolean }) {
  const { t } = useSettings()
  return (
    <span className="flex size-full flex-col items-center justify-center gap-1 bg-surface-2 p-1 text-center text-warn" data-missing>
      <AlertTriangle className={small ? "size-4" : "size-6"} />
      <span className={cn("leading-tight font-semibold", small ? "text-[0.625rem]" : "text-[0.8125rem]")}>{t("ph.missing")}</span>
    </span>
  )
}
