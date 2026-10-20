// One filter in a filter sheet (Journal, lot 10j; photos, lot 12b): the name above, the choices wrapping, the active one filled.
import { cn } from "@/lib/utils"

export function FilterRow({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div role="radiogroup" aria-label={label} className="mt-1 mb-4 flex flex-wrap items-center gap-2">
      <span aria-hidden="true" className="w-full text-[0.8125rem] font-semibold text-fg-2">
        {label}
      </span>
      {options.map((o) => (
        <button
          key={o.v}
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            // The pill shape is kept for the Journal filters only (lot 10h); the active one is filled.
            "hit h-9 shrink-0 rounded-full border px-3 text-[0.75rem] font-semibold whitespace-nowrap",
            value === o.v ? "border-fg bg-fg text-background" : "border-line-strong text-fg-2",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

