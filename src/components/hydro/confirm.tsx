import type { ReactNode } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useSettings } from "@/app/settings-context"

/** Deletion always asks first (shadcn AlertDialog). A failed deletion says so (lot 10a). */
export function ConfirmDelete({
  trigger,
  onConfirm,
  open,
  onOpenChange,
}: {
  trigger?: ReactNode
  onConfirm: () => void | Promise<void>
  /** Opened from elsewhere (a menu item, lot 10l2) instead of a trigger. */
  open?: boolean
  onOpenChange?: (o: boolean) => void
}) {
  const { t } = useSettings()
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent className="max-w-[340px] rounded-[14px] border-line-strong bg-surface">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("common.confirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("common.confirmBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2">
          <AlertDialogCancel className="h-11 flex-1">{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" className="h-11 flex-1" onClick={async () => {
              try {
                await onConfirm()
              } catch (e) {
                toast.error(t("safe.deleteFailed", { reason: (e as Error)?.message ?? "?" }))
              }
            }}>
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
