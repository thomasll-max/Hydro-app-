import { useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label as UiLabel } from "@/components/ui/label"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { isBadNum } from "@/calc/formulas"
import { useSettings } from "@/app/settings-context"
import { addLayer } from "@/app/nav"
import { InfoTip, type Term } from "./info"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/** Bottom sheet used for every form (shadcn Drawer / vaul), full-height on phones. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  dirty,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer: ReactNode
  /** Unsaved changes. By default: something was typed or picked since the sheet opened. */
  dirty?: boolean
}) {
  const { t } = useSettings()
  const [touched, setTouched] = useState(false)
  const [asking, setAsking] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    setTouched(false)
    setAsking(false)
  }
  const unsaved = dirty ?? touched
  // Closing by ✕, swipe, tap outside or the back gesture asks first when something would be lost (lot 10d).
  const tryClose = (): boolean => {
    if (unsaved) {
      setAsking(true)
      return false
    }
    onOpenChange(false)
    return true
  }
  const tryCloseRef = useRef(tryClose)
  useEffect(() => {
    tryCloseRef.current = tryClose
  })
  useEffect(() => {
    if (!open) return
    return addLayer({ onBack: () => tryCloseRef.current() })
  }, [open])
  const touch = (e: SyntheticEvent) => {
    const el = e.target as HTMLElement
    if (e.type === "input" || el.closest?.("[role=radio],[role=switch],[role=checkbox],[aria-pressed]")) setTouched(true)
  }
  return (
    <>
      <Drawer open={open} onOpenChange={(o) => (o ? onOpenChange(true) : tryClose())} dismissible={!unsaved} repositionInputs={false}>
        <DrawerContent
          className="mx-auto max-h-[94dvh]! max-w-[520px] rounded-t-[24px]! border-line-strong bg-background"
          onInputCapture={touch}
          onClickCapture={touch}
          onPointerDownOutside={() => {
            if (unsaved) tryClose()
          }}
          onEscapeKeyDown={() => {
            if (unsaved) tryClose()
          }}
        >
          <DrawerHeader className="flex-row items-start gap-2 pb-2 text-left! md:text-left">
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-[1.25rem] tracking-[-0.4px]">{title}</DrawerTitle>
              {description ? <DrawerDescription>{description}</DrawerDescription> : <DrawerDescription className="sr-only">{title}</DrawerDescription>}
            </div>
            <button
              type="button"
              onClick={tryClose}
              aria-label={t("common.close")}
              className="-mt-1 -mr-1 flex size-11 shrink-0 items-center justify-center rounded-full text-fg-2 hover:bg-surface-2"
            >
              <X className="size-5" />
            </button>
          </DrawerHeader>
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
          <DrawerFooter className="border-t border-line bg-background/90 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] backdrop-blur">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent className="max-w-[340px] rounded-xl border-line-strong bg-surface">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.discardTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.discardBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="h-11 flex-1 rounded-full">{t("common.keepEditing")}</AlertDialogCancel>
            <AlertDialogAction className="h-11 flex-1 rounded-full bg-bad text-white hover:bg-bad/90" onClick={() => onOpenChange(false)}>
              {t("common.discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function Group({ title, aside, children, className, id }: { title: string; aside?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("mt-4 scroll-mt-4 first:mt-1", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="eyebrow">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** Columns fold when there is no room (zoom 200 %, large text): never a field cut in half (lot 10e). */
export function Grid({ cols = 2, children }: { cols?: 2 | 3; children: ReactNode }) {
  return <div className={cn("grid gap-2.5", cols === 3 ? "fold-3" : "fold-2")}>{children}</div>
}

const inputCls =
  "h-12 rounded-md border-line-strong bg-surface text-fg text-[1.0625rem] font-medium shadow-none tabular-nums placeholder:font-normal placeholder:text-fg-3 focus-visible:ring-2"

/** Numeric field: decimal keyboard, accepts "2,4" or "2.4". Value is kept as typed (string). */
export function NumField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  integer,
  className,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  integer?: boolean
  className?: string
}) {
  const { t } = useSettings()
  // A typo is flagged right away; forms refuse to save while one is left (lot 10a).
  const bad = isBadNum(value)
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <UiLabel htmlFor={id} className="truncate text-[0.75rem] font-medium text-fg-2">
        {label}
      </UiLabel>
      <Input
        id={id}
        type="text"
        inputMode={integer ? "numeric" : "decimal"}
        autoComplete="off"
        enterKeyHint="next"
        value={value}
        placeholder={placeholder}
        aria-invalid={bad || undefined}
        aria-describedby={bad ? `${id}-err` : undefined}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,-]/g, ""))}
        className={cn(inputCls, bad && "border-bad ring-2 ring-bad/30")}
      />
      {bad ? (
        <span id={`${id}-err`} className="truncate text-[0.75rem] font-semibold text-bad">
          {t("safe.badNumber")}
        </span>
      ) : (
        hint && <span className="truncate text-[0.75rem] text-fg-3">{hint}</span>
      )}
    </div>
  )
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
  className,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: "text" | "date" | "time"
  hint?: string
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <UiLabel htmlFor={id} className="truncate text-[0.75rem] font-medium text-fg-2">
        {label}
      </UiLabel>
      <Input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "text-[1rem]")} />
      {hint && <span className="truncate text-[0.75rem] text-fg-3">{hint}</span>}
    </div>
  )
}

export function AreaField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <UiLabel htmlFor={id} className="text-[0.75rem] font-medium text-fg-2">
        {label}
      </UiLabel>
      <textarea
        id={id}
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-line-strong bg-surface text-fg px-3 py-2.5 text-[1rem] outline-none placeholder:text-fg-3 focus-visible:ring-2 focus-visible:ring-ring/50"
      />
    </div>
  )
}

/** Segmented choice (shadcn ToggleGroup), same pill as the top bar. */
export function Seg<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T | undefined
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
  className?: string
}) {
  return (
    <ToggleGroup
      type="single"
      value={value ?? ""}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      className={cn("flex w-full flex-wrap gap-0 rounded-full border border-line bg-surface-2 p-[3px]", className)}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="min-h-11 min-w-0 flex-1 rounded-full! px-2 py-1 text-center text-[0.8125rem] leading-tight font-semibold whitespace-normal text-fg-3 hover:bg-transparent hover:text-fg data-[state=on]:bg-surface data-[state=on]:text-fg data-[state=on]:shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** Tappable chip. `level` 1–3 shows a severity dot count. */
export function TagChip({ label, on, level, onClick }: { label: string; on: boolean; level?: number; onClick: () => void }) {
  const { t } = useSettings()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-[0.8125rem] font-semibold transition-colors",
        on
          ? level && level >= 3
            ? "border-bad/40 bg-bad/12 text-bad"
            : level === 2
              ? "border-warn/40 bg-warn/12 text-warn"
              : "border-primary/40 bg-primary/12 text-primary"
          : "border-line bg-surface-2 text-fg-2",
      )}
    >
      {label}
      {on && level ? (
        <span className="flex gap-0.5">
          <span className="sr-only">{t("entry.severity", { n: level })}</span>
          {[1, 2, 3].map((i) => (
            <span key={i} aria-hidden="true" className={cn("size-1.5 rounded-full", i <= level ? "bg-current" : "bg-current/25")} />
          ))}
        </span>
      ) : null}
    </button>
  )
}

/** Computed value with its status color. */
export function Computed({ label, value, status, term }: { label: string; value: string; status?: "ok" | "warn" | "bad"; term?: Term }) {
  return (
    <div className="min-w-0 rounded-md border border-line bg-surface-2 px-2 py-2">
      <div className="flex min-w-0 items-center gap-0.5 text-[0.75rem] text-fg-3">
        <span className="min-w-0 truncate">{label}</span>
        {term && <InfoTip term={term} />}
      </div>
      <div
        className={cn(
          "text-[1rem] font-semibold tabular",
          status === "ok" && "text-primary",
          status === "warn" && "text-warn",
          status === "bad" && "text-bad",
        )}
      >
        {value}
      </div>
    </div>
  )
}
