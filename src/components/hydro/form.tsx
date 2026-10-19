import { useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react"
import { Check, X } from "lucide-react"
import { Label as UiLabel } from "@/components/ui/label"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { isBadNum } from "@/calc/formulas"
import { useSettings } from "@/app/settings-context"
import { addLayer } from "@/app/nav"
import { InfoTip, type Term } from "./info"
import { iconButton, joined, segmentItem, toggle } from "./styles"
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
    // A check box that acts at once (« Fait » on a reminder) is not a form field: nothing to lose.
    if (el.closest?.("[data-instant]")) return
    if (e.type === "input" || el.closest?.("[role=radio],[role=switch],[role=checkbox],[aria-pressed]")) setTouched(true)
  }
  return (
    <>
      <Drawer open={open} onOpenChange={(o) => (o ? onOpenChange(true) : tryClose())} dismissible={!unsaved} repositionInputs={false}>
        <DrawerContent
          className="mx-auto max-h-[94dvh]! max-w-[520px] rounded-t-[14px]! border-line-strong bg-background"
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
              <DrawerTitle className="display text-[1.3125rem] leading-tight">{title}</DrawerTitle>
              {description ? <DrawerDescription>{description}</DrawerDescription> : <DrawerDescription className="sr-only">{title}</DrawerDescription>}
            </div>
            <button
              type="button"
              onClick={tryClose}
              aria-label={t("common.close")}
              className={cn("-mt-1 -mr-1", iconButton)}
            >
              <X className="size-5" />
            </button>
          </DrawerHeader>
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
          <DrawerFooter className="border-t border-line bg-background pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent className="max-w-[340px] rounded-[14px] border-line-strong bg-surface">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.discardTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.discardBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="h-11 flex-1">{t("common.keepEditing")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" className="h-11 flex-1" onClick={() => onOpenChange(false)}>
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
        <h3 className="display text-[1.0625rem] leading-tight">{title}</h3>
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

// « Instrument » fields (lot 10h): label above, no box, a 1.5 px underline that turns « eau » on focus and
// « à surveiller » on a typo (message under it); the value in big mono, the unit inside on the right.
const line = "flex min-w-0 items-baseline gap-1 shadow-[inset_0_-1.5px_0_var(--line-strong)] transition-shadow focus-within:shadow-[inset_0_-2px_0_var(--water)]"
const lineBad = "shadow-[inset_0_-2px_0_var(--warn)] focus-within:shadow-[inset_0_-2px_0_var(--warn)]"
const labelCls = "truncate text-[0.8125rem] text-fg-3"
const fieldCls = "w-full min-w-0 bg-transparent text-fg outline-none placeholder:font-normal placeholder:text-fg-3"
/** A unit written at the end of a label, « T° jour (°C) », goes inside the field. */
const UNIT = /^(.*\S)\s*\((°C|%|kg|g|mL|L|cm|mm|W|h|min|mS\/cm|µmol\/J|µmol\/s|mL\/min|m³\/h|mol\/m²\/[jd])\)$/
export const splitUnit = (label: string): [string, string | undefined] => {
  const m = UNIT.exec(label)
  return m ? [m[1], m[2]] : [label, undefined]
}

/** Numeric field: decimal keyboard, accepts "2,4" or "2.4". Value is kept as typed (string). */
export function NumField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  integer,
  unit,
  hintMono,
  className,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  /** The hint is a value (« hier 25,3 »): written in mono. */
  hintMono?: boolean
  integer?: boolean
  /** Shown inside the field; by default taken from the end of the label. */
  unit?: string
  className?: string
}) {
  const { t } = useSettings()
  // A typo is flagged right away; forms refuse to save while one is left (lot 10a).
  const bad = isBadNum(value)
  const [text, fromLabel] = splitUnit(label)
  const u = unit ?? fromLabel
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <UiLabel htmlFor={id} className={labelCls}>
        {text}
        {u && <span className="sr-only"> ({u})</span>}
      </UiLabel>
      <div className={cn(line, bad && lineBad)}>
        <input
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
          className={cn(fieldCls, "h-12 font-num text-[1.625rem] font-medium tabular-nums")}
        />
        {u && (
          <span aria-hidden="true" className="shrink-0 font-num text-[0.8125rem] text-fg-3">
            {u}
          </span>
        )}
      </div>
      {bad ? (
        <span id={`${id}-err`} className="truncate text-[0.75rem] font-semibold text-warn">
          {t("safe.badNumber")}
        </span>
      ) : (
        hint && <span className={cn("truncate text-[0.75rem] text-fg-3", hintMono && "font-num")}>{hint}</span>
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
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <UiLabel htmlFor={id} className={labelCls}>
        {label}
      </UiLabel>
      <div className={line}>
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(fieldCls, "h-12 text-[1.0625rem]", type !== "text" && "font-num text-[1rem] tabular-nums")}
        />
      </div>
      {hint && <span className="truncate text-[0.75rem] text-fg-3">{hint}</span>}
    </div>
  )
}

export function AreaField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <UiLabel htmlFor={id} className={labelCls}>
        {label}
      </UiLabel>
      <div className={line}>
        <textarea id={id} rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(fieldCls, "resize-none py-2 text-[1rem]")} />
      </div>
    </div>
  )
}

/** Segmented choice (shadcn ToggleGroup, radios): joined boxes, the active one inverted (lot 10h). */
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
    <ToggleGroup type="single" value={value ?? ""} onValueChange={(v) => v && onChange(v as T)} aria-label={label} className={joined(undefined, cn("w-full gap-0", className))}>
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className={segmentItem}
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** Square check box (lot 10h): 22 px, radius 6, « plante » when ticked, with a 44 px tap area. */
export function CheckBox({
  checked,
  onChange,
  label,
  instant,
  className,
}: {
  checked: boolean
  onChange: (on: boolean) => void
  label: string
  /** Saved at once (not part of a form): ticking it does not count as an unsaved change of the sheet around it. */
  instant?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      data-instant={instant || undefined}
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "hit-sq flex size-[22px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] transition-[background-color,border-color,transform] duration-150 active:scale-90",
        checked ? "border-leaf bg-leaf text-background" : "border-line-strong hover:border-leaf",
        className,
      )}
    >
      {checked && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
    </button>
  )
}

/** Tappable chip (an outlined box, filled when on). `level` 1–3 shows a severity dot count. */
export function TagChip({ label, on, level, onClick }: { label: string; on: boolean; level?: number; onClick: () => void }) {
  const { t } = useSettings()
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={toggle(on)}>
      {label}
      {on && level ? (
        <span className="flex gap-0.5">
          <span className="sr-only">{t("entry.severity", { n: level })}</span>
          {[1, 2, 3].map((i) => (
            <span key={i} aria-hidden="true" className={cn("size-1.5 rounded-[2px]", i <= level ? "bg-current" : "bg-current/30")} />
          ))}
        </span>
      ) : null}
    </button>
  )
}

/** Computed value (lot 10h): label and mono value, coloured only when out of target. */
export function Computed({ label, value, status, term }: { label: string; value: string; status?: "ok" | "warn" | "bad"; term?: Term }) {
  return (
    <div className="min-w-0 border-t border-line pt-1.5" data-status={status}>
      <div className="flex min-w-0 items-center gap-0.5 text-[0.75rem] text-fg-3">
        <span className="min-w-0 truncate">{label}</span>
        {term && <InfoTip term={term} />}
      </div>
      <div className={cn("font-num text-[1.0625rem] font-medium tabular-nums", status === "warn" && "text-warn", status === "bad" && "text-bad")}>{value}</div>
    </div>
  )
}
