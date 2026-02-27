"use client";

import Link from "next/link";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 h-16">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#4CAF50]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#4CAF50] text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              restaurant_menu
            </span>
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight text-slate-900">
              LivingLog
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <button className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 transition-colors">
            <span className="material-symbols-outlined text-slate-600 text-[24px]">notifications</span>
          </button>
        </div>
      </div>
    </header>
  );
}
