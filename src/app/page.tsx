import { DiceRoller } from "@/components/DiceRoller";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col gap-6 py-2">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 px-4 py-4 shadow-[0_40px_120px_-60px_rgba(16,185,129,0.85)] sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300/80">
              Dashboard
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              What&apos;s with Dinner – tonight
            </h1>
          </div>
          <div className="flex gap-2 text-[11px] text-slate-400">
            <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1">
              Invisible AI pantry logic
            </span>
            <span className="hidden rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1 sm:inline">
              Designed for ingredient households
            </span>
          </div>
        </div>
      </section>

      <section className="flex flex-1 flex-col">
        <DiceRoller />
      </section>
    </div>
  );
}
