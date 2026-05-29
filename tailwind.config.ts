import type { Config } from "tailwindcss";

// Monochrome: warm obsidian base, near-white as the only accent (CTA, links,
// values). Red is reserved for danger / the drainer warning only.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0b",    // near-black — page background
        panel: "#161618",  // raised surface
        edge: "#262629",   // hairline / faint fill
        brand: "#fafafa",  // near-white — the only accent
        warn: "#a1a1a4",   // neutral gray — secondary
        danger: "#f87171", // red — errors / the drainer warning only
        gray: {
          50: "#fafafa", 100: "#ededee", 200: "#d4d4d6", 300: "#a1a1a4",
          400: "#797a7d", 500: "#5c5d60", 600: "#3f4043", 700: "#2a2b2e",
          800: "#1c1d1f", 900: "#141416", 950: "#0e0e10",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: { widest2: "0.22em" },
      boxShadow: {
        glow: "0 16px 50px -22px rgba(255, 255, 255, 0.22)",
      },
    },
  },
  plugins: [],
};
export default config;
