import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#7c5cff",
        accent2: "#22d3ee",
        good: "#34d399",
        warn: "#fbbf24",
        // Semantic, theme-aware tokens backed by CSS vars (see globals.css).
        // These flip automatically under prefers-color-scheme.
        bg: "var(--bg)",
        card: "var(--card)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        edge: "var(--edge)",
        "edge-strong": "var(--edge-strong)",
        fg: "var(--fg)",
        muted: "var(--muted)",
        subtle: "var(--subtle)",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
