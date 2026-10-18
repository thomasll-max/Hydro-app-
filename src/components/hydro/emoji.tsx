import { EMOJI, type EmojiName } from "@/assets/emoji"
import { cn } from "@/lib/utils"

/** Fluent Emoji 3D illustration. Decorative: always alt="". */
export function Emoji({ name, size = 24, className }: { name: EmojiName; size?: number; className?: string }) {
  return (
    <img
      src={EMOJI[name]}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable={false}
      decoding="async"
      className={cn("shrink-0 select-none", className)}
      style={{ width: size, height: size }}
    />
  )
}
