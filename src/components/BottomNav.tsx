"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Plan", icon: "calendar_month" },
  { href: "/recipes", label: "Recipes", icon: "restaurant_menu" },
  { href: "/shopping-list", label: "List", icon: "shopping_cart" },
  { href: "/stock-up", label: "Pantry", icon: "inventory_2" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-100 bg-white/90 backdrop-blur-xl sm:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around h-12 px-4">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active
                  ? "text-[#4CAF50]"
                  : "text-slate-400 hover:text-[#4CAF50]"
              }`}
            >
              <span 
                className="material-symbols-outlined text-[24px]"
                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
              >
                {icon}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
