import type { Config } from "tailwindcss";

// Zen structure, crypto palette: warm obsidian, emerald accent, gold for locked.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0b",    // near-black — page background
        panel: "#161618",  // raised surface
        edge: "#262629",   // hairline / faint fill
        brand: "#fafafa",  // near-white — the only "accent" (CTA, links, values)
        warn: "#a1a1a4",   // neutral gray — locked / secondary
        danger: "#f87171", // red — errors only
        // Neutral gray scale for a near-black background:
        gray: {
          50: "#fafafa", 100: "#ededee", 200: "#d4d4d6", 300: "#a1a1a4",
          400: "#797a7d", 500: "#5c5d60", 600: "#3f4043", 700: "#2a2b2e",
          800: "#1c1d1f", 900: "#141416", 950: "#0e0e10",
        },
      },
      fontFamily: {
        // Clean sans throughout (Uber/Linear feel); "serif" aliases to sans so
        // existing font-serif usages render sans without per-file edits.
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "sans-serif"],
        serif: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: { widest2: "0.22em" },
    },
  },
  plugins: [],
};
export default config;
