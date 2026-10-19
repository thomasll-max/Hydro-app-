import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

/** Scrolling down hides the button, scrolling up brings it back: it never sits on a « Fait » for long (lot 10e). */
function useHideOnScroll(): boolean {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (Math.abs(y - last) < 8) return
      const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 4
      setHidden(y > last && y > 80 && !atEnd)
      last = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
    }
  }, [])
  return hidden
}

/** "+ Saisie du jour" — floats above the tab bar, reachable with one thumb. Short screens (zoom 200 %, landscape): icon only. */
export function Fab({ label, onClick }: { label: string; onClick: () => void }) {
  const hidden = useHideOnScroll()
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+96px)] z-30 pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] transition-[opacity,translate] duration-200 short:bottom-[calc(env(safe-area-inset-bottom,0px)+68px)]",
        hidden && "translate-y-4 opacity-0",
      )}
    >
      <div className="mx-auto flex max-w-[456px] justify-end">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onClick}
          aria-label={label}
          tabIndex={hidden ? -1 : 0}
          className={cn(
            "flex h-[52px] items-center gap-2 rounded-full bg-primary px-[18px] text-[0.90625rem] font-bold text-primary-foreground shadow-[0_2px_6px_rgba(0,0,0,0.25)] focus-visible:outline-offset-4 short:size-12 short:justify-center short:px-0",
            hidden ? "pointer-events-none" : "pointer-events-auto",
          )}
        >
          <Plus className="size-[18px] shrink-0" strokeWidth={2.6} />
          <span className="short:sr-only">{label}</span>
        </motion.button>
      </div>
    </div>
  )
}
