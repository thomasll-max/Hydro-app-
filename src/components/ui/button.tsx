import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

// Lot 10h « instrument »: radius 10 px; one main (filled « eau ») button per screen, outlined secondary buttons,
// underlined tertiary and destructive text buttons. Focus: the global 2 px « eau » outline (index.css).
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] text-[0.9375rem] font-medium whitespace-nowrap transition-[background-color,box-shadow,transform,color] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary font-semibold text-primary-foreground shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)] hover:bg-primary/92 active:translate-y-px active:shadow-[inset_0_2px_0_rgba(0,0,0,0.25)]",
        outline: "border border-line-strong bg-transparent text-fg hover:bg-surface-2",
        secondary: "border border-line-strong bg-transparent text-fg hover:bg-surface-2",
        ghost: "text-fg hover:bg-surface-2",
        link: "font-semibold text-fg underline decoration-water decoration-[1.5px] underline-offset-4",
        destructive: "font-semibold text-bad underline decoration-bad decoration-[1.5px] underline-offset-4",
      },
      size: {
        default: "h-12 px-5",
        xs: "h-6 gap-1 px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-11 gap-1.5 px-3.5 text-[0.875rem]",
        lg: "h-12 px-6",
        icon: "size-11",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-11",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
