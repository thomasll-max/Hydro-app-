import type { ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { Label as UiLabel } from "@/components/ui/label"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

/** Bottom sheet used for every form (shadcn Drawer / vaul), full-height on phones. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <DrawerContent className="mx-auto max-h-[94dvh]! max-w-[520px] rounded-t-[24px]! border-line-strong bg-background">
        <DrawerHeader className="pb-2 text-left! md:text-left">
          <DrawerTitle className="text-[20px] tracking-[-0.4px]">{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : <DrawerDescription className="sr-only">{title}</DrawerDescription>}
        </DrawerHeader>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
        <DrawerFooter className="border-t border-line bg-background/90 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] backdrop-blur">
          {footer}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

export function Group({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mt-4 first:mt-1", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="eyebrow">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function Grid({ cols = 2, children }: { cols?: 2 | 3; children: ReactNode }) {
  return <div className={cn("grid gap-2.5", cols === 3 ? "grid-cols-3" : "grid-cols-2")}>{children}</div>
}

const inputCls =
  "h-12 rounded-md border-line-strong bg-surface text-fg text-[17px] font-medium shadow-none tabular-nums placeholder:font-normal placeholder:text-fg-3/70 focus-visible:ring-2"

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
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <UiLabel htmlFor={id} className="truncate text-[12px] font-medium text-fg-2">
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
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,-]/g, ""))}
        className={inputCls}
      />
      {hint && <span className="truncate text-[10.5px] text-fg-3">{hint}</span>}
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
      <UiLabel htmlFor={id} className="truncate text-[12px] font-medium text-fg-2">
        {label}
      </UiLabel>
      <Input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "text-[16px]")} />
      {hint && <span className="truncate text-[10.5px] text-fg-3">{hint}</span>}
    </div>
  )
}

export function AreaField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <UiLabel htmlFor={id} className="text-[12px] font-medium text-fg-2">
        {label}
      </UiLabel>
      <textarea
        id={id}
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-line-strong bg-surface text-fg px-3 py-2.5 text-[16px] outline-none placeholder:text-fg-3/70 focus-visible:ring-2 focus-visible:ring-ring/50"
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
          className="h-10 min-w-0 flex-1 rounded-full! px-2 text-[13px] font-semibold text-fg-3 hover:bg-transparent hover:text-fg data-[state=on]:bg-surface data-[state=on]:text-fg data-[state=on]:shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** Tappable chip. `level` 1–3 shows a severity dot count. */
export function TagChip({ label, on, level, onClick }: { label: string; on: boolean; level?: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
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
        <span className="flex gap-0.5" aria-label={`${level}/3`}>
          {[1, 2, 3].map((i) => (
            <span key={i} className={cn("size-1.5 rounded-full", i <= level ? "bg-current" : "bg-current/25")} />
          ))}
        </span>
      ) : null}
    </button>
  )
}

/** Computed value with its status color. */
export function Computed({ label, value, status }: { label: string; value: string; status?: "ok" | "warn" | "bad" }) {
  return (
    <div className="min-w-0 rounded-md border border-line bg-surface-2 px-2.5 py-2">
      <div className="truncate text-[10.5px] text-fg-3">{label}</div>
      <div
        className={cn(
          "text-[16px] font-semibold tabular",
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
