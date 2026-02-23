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
    <header className="border-b border-[#D5D3C4] bg-[#F5F3EB] backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#E61919] text-white text-lg font-bold">
            W
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-[#1A1A1A]">
              What&apos;s with Dinner
            </span>
            <span className="hidden text-[11px] text-[#A5B8A2] sm:block">
              Inventory-free meal decisions
            </span>
          </div>
        </Link>
        <nav className="hidden gap-2 text-xs font-medium sm:flex">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-3 py-1.5 transition ${
                  active
                    ? "bg-[#A5B8A2] text-white"
                    : "text-[#1A1A1A] hover:bg-[#F2EB8D] hover:text-[#1A1A1A]"
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
