"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, BookOpen, ShoppingCart, Package } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Log", icon: CalendarDays },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/shopping-list", label: "Shop", icon: ShoppingCart },
  { href: "/stock-up", label: "Stock Up", icon: Package },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e1d7cb] bg-[#faf8f5]/98 backdrop-blur-lg sm:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition ${
                active
                  ? "bg-[#a8b8a5] text-[#faf8f5]"
                  : "text-[#6d8069] hover:bg-[#f4e9c8]"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
