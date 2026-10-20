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
  head,
  actions,
  big,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  children: ReactNode
  /** Absent: a sheet without a bar at the bottom (a menu, lot 10k3). */
  footer?: ReactNode
  /** Unsaved changes. By default: something was typed or picked since the sheet opened. */
  dirty?: boolean
  /** A line under the title instead of the description (the day's entry: date, time, scope, lot 10l2). */
  head?: ReactNode
  /** Buttons before the close button (the day's entry: « ⋯ »). */
  actions?: ReactNode
  /** A bigger title (≈ 24 px, the day's entry). */
  big?: boolean
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
              <DrawerTitle className={cn("display leading-tight [overflow-wrap:anywhere]", big ? "text-[1.5rem]" : "text-[1.3125rem]")}>{title}</DrawerTitle>
              {description ? <DrawerDescription>{description}</DrawerDescription> : <DrawerDescription className="sr-only">{title}</DrawerDescription>}
              {head}
            </div>
            {actions}
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
          {footer ? (
            <DrawerFooter className="border-t border-line bg-background pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">{footer}</DrawerFooter>
          ) : (
            <div aria-hidden="true" className="h-[env(safe-area-inset-bottom,0px)] shrink-0" />
          )}
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
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
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
  ghost,
  doubt,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  /** What is wrong with the value (lot 15a): written under the field, « à surveiller », and saving waits. */
  error?: string
  /**
   * Yesterday's value, shown very faint in the empty field (lot 10l2): touching the field takes it (selected, so typing
   * replaces it). Never saved unless taken or typed.
   */
  ghost?: string
  /** What a dictation heard here and why it is doubtful (lot 11): the field is marked « à surveiller ». */
  doubt?: string
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
  const err = bad ? t("safe.badNumber") : error
  const [text, fromLabel] = splitUnit(label)
  const u = unit ?? fromLabel
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <UiLabel htmlFor={id} className={labelCls}>
        {text}
        {u && <span className="sr-only"> ({u})</span>}
      </UiLabel>
      <div className={cn(line, (err || doubt) && lineBad)} data-doubt={doubt ? "" : undefined}>
        <input
          id={id}
          type="text"
          inputMode={integer ? "numeric" : "decimal"}
          autoComplete="off"
          enterKeyHint="next"
          value={value}
          placeholder={ghost ?? placeholder}
          data-ghost={ghost && !value ? "" : undefined}
          onClick={(e) => {
            if (!ghost || value) return
            const el = e.currentTarget
            onChange(ghost)
            // Selected once React has written it, only if the field still has the focus (select() would take it back
            // from a field touched right after).
            requestAnimationFrame(() => {
              if (document.activeElement === el) el.select()
            })
          }}
          aria-invalid={!!err || undefined}
          aria-describedby={err ? `${id}-err` : doubt ? `${id}-doubt` : undefined}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,-]/g, ""))}
          className={cn(fieldCls, "h-12 font-num text-[1.625rem] font-medium tabular-nums", ghost && "placeholder:text-fg-3/35")}
        />
        {u && (
          <span aria-hidden="true" className="shrink-0 font-num text-[0.8125rem] text-fg-3">
            {u}
          </span>
        )}
      </div>
      {err ? (
        <FieldError id={`${id}-err`}>{err}</FieldError>
      ) : doubt ? (
        <span id={`${id}-doubt`} className="text-[0.75rem] leading-snug font-semibold text-warn">
          {doubt}
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
  inputMode,
  autoComplete,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  /** « password » for a PIN (lot 12d). */
  type?: "text" | "date" | "time" | "password"
  hint?: string
  className?: string
  inputMode?: "numeric" | "text"
  autoComplete?: string
  /** What is missing or wrong (lot 15a): written under the field, « à surveiller ». */
  error?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <UiLabel htmlFor={id} className={labelCls}>
        {label}
      </UiLabel>
      <div className={cn(line, error && lineBad)}>
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete={autoComplete}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={cn(fieldCls, "h-12 text-[1.0625rem]", type !== "text" && "font-num text-[1rem] tabular-nums")}
        />
      </div>
      {error ? <FieldError id={`${id}-err`}>{error}</FieldError> : hint && <span className="truncate text-[0.75rem] text-fg-3">{hint}</span>}
    </div>
  )
}

/** The message under a field (lot 15a): « à surveiller », never only at the bottom of the page. */
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span id={id} className="text-[0.75rem] leading-snug font-semibold text-warn" data-field-error>
      {children}
    </span>
  )
}

/**
 * Scrolls to a field and gives it the focus (lot 15a), once React has drawn its message. `id` is the input, or a box
 * around a choice (its first button takes the focus).
 */
export function focusField(id: string) {
  const scroll = (box: HTMLElement) => box.scrollIntoView({ block: "center", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
  requestAnimationFrame(() => {
    const box = document.getElementById(id)
    if (!box) return
    const el = box.matches("input, textarea, button, select") ? box : (box.querySelector<HTMLElement>("input, textarea, button, select") ?? box)
    scroll(box)
    el.focus({ preventScroll: true })
    // A folded part that just opened grows for 200 ms: once it is open, the field is brought to the middle again.
    setTimeout(() => box.isConnected && scroll(box), 260)
  })
}

/** The first field marked wrong in the sheet on top (or the page): scrolled to and focused (lot 15a). */
export function focusFirstInvalid() {
  requestAnimationFrame(() => {
    const sheets = document.querySelectorAll<HTMLElement>("[role=dialog]")
    const el = (sheets[sheets.length - 1] ?? document).querySelector<HTMLElement>("[aria-invalid=true]")
    if (el?.id) focusField(el.id)
  })
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
