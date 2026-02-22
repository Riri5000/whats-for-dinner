import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "What's with Dinner",
  description:
    "A zero-friction pantry-aware meal planner for ingredient households.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased bg-slate-950 text-slate-50"
      >
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
              <Link href="/" className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-400 to-lime-400 text-slate-950 text-lg font-bold">
                  W
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold tracking-tight">
                    What&apos;s with Dinner
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Inventory-free meal decisions
                  </span>
                </div>
              </Link>
              <nav className="hidden gap-2 text-xs font-medium text-slate-300 sm:flex">
                <Link
                  href="/"
                  className="rounded-full bg-slate-800/80 px-3 py-1.5 text-slate-50 shadow-sm shadow-emerald-400/20"
                >
                  Dashboard
                </Link>
                <Link
                  href="/import"
                  className="rounded-full px-3 py-1.5 text-slate-400 transition hover:bg-slate-900 hover:text-slate-200"
                >
                  Import
                </Link>
                <Link
                  href="/stock-up"
                  className="rounded-full px-3 py-1.5 text-slate-400 transition hover:bg-slate-900 hover:text-slate-200"
                >
                  Stock Up
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1">
            <div className="mx-auto flex max-w-5xl flex-1 flex-col px-4 py-6">
              {children}
            </div>
          </main>
          <footer className="border-t border-slate-900/60 bg-slate-950/80">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 text-[11px] text-slate-500">
              <span>Zero-shot pantry utility.</span>
              <span className="hidden sm:inline">
                Data keys live in your env – Supabase & OpenAI.
              </span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
