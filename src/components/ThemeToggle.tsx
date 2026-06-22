"use client";

// Explicit light/dark/system switch. The actual palette lives in globals.css as
// `data-theme` overrides of the same CSS vars the OS-preference media query
// sets, so this control only has to toggle one attribute on <html> and persist
// the choice. "system" removes the attribute and falls back to the media query.
// An inline script in layout.tsx applies the stored choice before first paint
// to avoid a flash, so this component just keeps the UI in sync afterwards.
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export const THEME_KEY = "qcard-theme";
const ORDER: Theme[] = ["system", "light", "dark"];

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

const ICON: Record<Theme, string> = { system: "🖥️", light: "☀️", dark: "🌙" };
const LABEL: Record<Theme, string> = { system: "System", light: "Light", dark: "Dark" };

export default function ThemeToggle() {
  // null until mounted so server and first client render agree (the icon depends
  // on localStorage, which isn't available during SSR).
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    setTheme(stored && ORDER.includes(stored) ? stored : "system");
  }, []);

  function cycle() {
    const current = theme ?? "system";
    const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
    setTheme(next);
    apply(next);
    if (next === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, next);
  }

  // Render a stable placeholder before hydration to keep layout from shifting.
  if (theme === null) {
    return <span className="chip" aria-hidden="true" style={{ visibility: "hidden" }}>🖥️ Theme</span>;
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="chip gap-1.5"
      title={`Theme: ${LABEL[theme]} — click to change`}
      aria-label={`Theme: ${LABEL[theme]}. Click to switch theme.`}
    >
      <span aria-hidden="true">{ICON[theme]}</span>
      <span>{LABEL[theme]}</span>
    </button>
  );
}
