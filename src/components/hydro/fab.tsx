import { Plus } from "lucide-react"
import { motion } from "motion/react"

/** "+ Saisie du jour" — floats above the tab bar, reachable with one thumb. */
export function Fab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+96px)] z-30 pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))]">
      <div className="mx-auto flex max-w-[456px] justify-end">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onClick}
          className="pointer-events-auto flex h-[52px] items-center gap-2 rounded-full bg-primary px-[18px] text-[14.5px] font-bold text-primary-foreground shadow-[0_10px_30px_-6px_color-mix(in_srgb,var(--primary)_60%,transparent)] focus-visible:outline-offset-4"
        >
          <Plus className="size-[18px]" strokeWidth={2.6} />
          {label}
        </motion.button>
      </div>
    </div>
  )
}
