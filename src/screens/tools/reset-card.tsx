// Réglages → Réinitialiser l'app (lot 8). Everything is deleted after an explicit confirmation; a backup first is offered.
import { useState } from "react"
import { RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Label, Reveal } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { getStores, TARGET } from "@/store"
import { resetData } from "@/lib/reset"

export function ResetCard({ i }: { i: number }) {
  const { t } = useSettings()
  const [busy, setBusy] = useState<string | null>(null)
  const reset = async () => {
    setBusy("…")
    try {
      const { docs, photos } = await getStores()
      await resetData(docs, photos, (n) => setBusy(String(n)))
      toast.success(t("reset.done"))
      setTimeout(() => location.reload(), 600)
    } catch (e) {
      setBusy(null)
      toast.error(t("common.saveError", { reason: (e as Error).message }))
    }
  }
  return (
    <Reveal i={i} className="mb-3">
      <Card className="gap-2.5 border-bad/30" id="reset-card">
        <Label>{t("reset.title")}</Label>
        <p className="text-[12.5px] leading-[1.45] text-fg-2">{t(TARGET === "local" ? "reset.descLocal" : "reset.descClaude")}</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="h-11 self-start rounded-full border-bad/40 text-bad" disabled={!!busy}>
              <RotateCcw className="size-4" /> {busy ? t("reset.running", { n: busy }) : t("reset.button")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-[340px] rounded-xl border-line-strong bg-surface">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("reset.confirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("reset.confirmBody")}</AlertDialogDescription>
            </AlertDialogHeader>
            <a href="#tools/data" className="text-[13px] font-semibold text-primary">
              {t("reset.backupFirst")}
            </a>
            <AlertDialogFooter className="flex-row gap-2">
              <AlertDialogCancel className="h-11 flex-1 rounded-full">{t("common.cancel")}</AlertDialogCancel>
              <Button className="h-11 flex-1 rounded-full bg-bad font-bold text-white hover:bg-bad/90" onClick={reset} id="reset-confirm">
                {t("reset.confirm")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </Reveal>
  )
}
