import {
  AlarmClock,
  Bell,
  BookOpen,
  CalendarDays,
  Camera,
  ChartLine,
  Compass,
  Cylinder,
  Droplet,
  Droplets,
  Fan,
  Flower2,
  Leaf,
  Lightbulb,
  Moon,
  NotebookPen,
  Package,
  Plug,
  Scale,
  Scissors,
  Settings,
  Sprout,
  Sun,
  TestTube,
  Thermometer,
  TriangleAlert,
  Wind,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import type { EmojiName } from "@/assets/emoji"
import { cn } from "@/lib/utils"

/**
 * Thin line icons for the everyday interface (lot 10f2): same weight as the leaf's vein in the logo.
 * The 3D emojis stay for the assistant, empty states and rare moments.
 */
const ICONS: Record<EmojiName, LucideIcon> = {
  sprout: Sprout,
  droplet: Droplet,
  testTube: TestTube,
  thermometer: Thermometer,
  chart: ChartLine,
  bell: Bell,
  herb: Leaf,
  sun: Sun,
  pottedPlant: Sprout,
  book: BookOpen,
  notebook: NotebookPen,
  toolbox: Wrench,
  compass: Compass,
  gear: Settings,
  camera: Camera,
  scissors: Scissors,
  scales: Scale,
  wind: Wind,
  jar: Package,
  bulb: Lightbulb,
  moon: Moon,
  warning: TriangleAlert,
  blossom: Flower2,
  leaf: Leaf,
  calendar: CalendarDays,
  alarm: AlarmClock,
  sweat: Droplets,
  bucket: Cylinder,
  cyclone: Fan,
  plug: Plug,
}

/** Two greens with a meaning: water (drop) for watering, reservoir, solution; leaf (dot) for the plant. */
const WATER: EmojiName[] = ["droplet", "testTube", "scales", "bucket"]
const PLANT: EmojiName[] = ["sprout", "herb", "pottedPlant", "blossom", "leaf", "scissors"]

export function toneOf(name: EmojiName): "water" | "leaf" | "neutral" {
  return WATER.includes(name) ? "water" : PLANT.includes(name) ? "leaf" : "neutral"
}

export function LineIcon({ name, size = 20, className, tone }: { name: EmojiName; size?: number; className?: string; tone?: "water" | "leaf" | "neutral" }) {
  const Icon = ICONS[name]
  const t = tone ?? toneOf(name)
  return (
    <Icon
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      strokeWidth={1.5}
      className={cn("shrink-0", t === "water" && "text-water", t === "leaf" && "text-leaf", t === "neutral" && "text-fg-2", className)}
    />
  )
}
