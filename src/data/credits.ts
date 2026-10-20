// À propos (lot 13): the technical credits. Each licence is the one written in the package itself (node_modules/<pkg>/
// package.json), checked by lot13.test.ts: nothing is credited from memory.
export type Credit = { kind: "font" | "art" | "icons" | "lib"; name: string; pkg: string; license: string }

export const CREDITS: Credit[] = [
  { kind: "font", name: "Geologica", pkg: "@fontsource/geologica", license: "OFL-1.1" },
  { kind: "font", name: "Figtree", pkg: "@fontsource/figtree", license: "OFL-1.1" },
  { kind: "font", name: "Fraunces", pkg: "@fontsource-variable/fraunces", license: "OFL-1.1" },
  { kind: "art", name: "Microsoft Fluent Emoji 3D", pkg: "@lobehub/fluent-emoji-3d", license: "MIT" },
  { kind: "icons", name: "Lucide", pkg: "lucide-react", license: "ISC" },
  { kind: "lib", name: "React", pkg: "react", license: "MIT" },
  { kind: "lib", name: "Radix UI", pkg: "radix-ui", license: "MIT" },
  { kind: "lib", name: "Vaul", pkg: "vaul", license: "MIT" },
  { kind: "lib", name: "Sonner", pkg: "sonner", license: "MIT" },
  { kind: "lib", name: "Recharts", pkg: "recharts", license: "MIT" },
  { kind: "lib", name: "Motion", pkg: "motion", license: "MIT" },
  { kind: "lib", name: "date-fns", pkg: "date-fns", license: "MIT" },
  { kind: "lib", name: "class-variance-authority", pkg: "class-variance-authority", license: "Apache-2.0" },
  { kind: "lib", name: "Tailwind CSS", pkg: "tailwindcss", license: "MIT" },
  { kind: "lib", name: "Vite", pkg: "vite", license: "MIT" },
]

/** How a licence reads on the page. */
export const licenseLabel = (spdx: string) => (spdx === "OFL-1.1" ? "SIL Open Font License 1.1" : spdx === "Apache-2.0" ? "Apache 2.0" : spdx)
