"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DiceRoller } from "@/components/DiceRoller";

export default function SurprisePage() {
  return (
    <div className="flex flex-1 flex-col gap-6 py-2">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full border border-slate-700/80 p-2 text-slate-400 transition hover:bg-slate-800/80 hover:text-slate-200"
            aria-label="Back to log"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300/80">
              Decision emergency
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Surprise me
            </h1>
            <p className="text-xs text-slate-400">
              When you just need the system to pick something good enough.
            </p>
          </div>
        </div>
      </section>

      <DiceRoller />
    </div>
  );
}
