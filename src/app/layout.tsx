import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import AuthButton from "@/components/AuthButton";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "QCard — Behavioral Interview Card Game",
  description: "Draw a card, answer aloud, get AI follow-ups and a full feedback report. Voice in, voice out.",
};

// `viewport-fit=cover` lets the page extend under notches/rounded corners so the
// `env(safe-area-inset-*)` padding in globals.css can keep content clear of them.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applies a stored light/dark choice to <html> before first paint so there's no
// flash of the default theme. "system" stores nothing and falls back to the
// prefers-color-scheme rules in globals.css. Mirrors ThemeToggle's logic.
const themeScript = `(function(){try{var t=localStorage.getItem("qcard-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <a href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white">Q</span>
              QCard
            </a>
            <div className="flex items-center gap-2">
              <span className="chip hidden sm:inline-flex">behavioral interview practice</span>
              <ThemeToggle />
              <Suspense fallback={null}>
                <AuthButton />
              </Suspense>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="mt-10 text-center text-xs text-subtle">
            Voice-driven mock interviews · answers analyzed by Claude · all sessions saved to SQLite
          </footer>
        </div>
      </body>
    </html>
  );
}
