import type { Metadata } from "next";
import { Suspense } from "react";
import AuthButton from "@/components/AuthButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "QCard — Behavioral Interview Card Game",
  description: "Draw a card, answer aloud, get AI follow-ups and a full feedback report. Voice in, voice out.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6">
          <header className="mb-6 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white">Q</span>
              QCard
            </a>
            <div className="flex items-center gap-2">
              <span className="chip">behavioral interview practice</span>
              <Suspense fallback={null}>
                <AuthButton />
              </Suspense>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="mt-10 text-center text-xs text-slate-500">
            Voice-driven mock interviews · answers analyzed by Claude · all sessions saved to SQLite
          </footer>
        </div>
      </body>
    </html>
  );
}
