"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Log" },
  { href: "/recipes", label: "Recipes" },
  { href: "/shopping-list", label: "Shopping List" },
  { href: "/stock-up", label: "Stock Up" },
] as const;

export function AppHeader() {
  const pathname = usePathname();

  return (
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
            <span className="hidden text-[11px] text-slate-400 sm:block">
              Inventory-free meal decisions
            </span>
          </div>
        </Link>
        <nav className="hidden gap-2 text-xs font-medium text-slate-300 sm:flex">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-3 py-1.5 transition ${
                  active
                    ? "bg-slate-800/80 text-slate-50 shadow-sm shadow-emerald-400/20"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
