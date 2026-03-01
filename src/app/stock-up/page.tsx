"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ShoppingCart, ArrowLeft, Package, AlertCircle, Check } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { PantryStaple } from "@/lib/types";
import { markStapleAsStocked } from "@/app/actions/pantry";

export default function StockUpPage() {
  const [items, setItems] = useState<PantryStaple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseClient();
    const { data, error: e } = await supabase
      .from("pantry_staples")
      .select("id, name, status, last_restocked, frequency_rank, marked_stocked_at")
      .in("status", ["Low", "Out"])
      .order("status", { ascending: true })
      .order("frequency_rank", { ascending: false });

    setLoading(false);
    if (e) setError(e.message);
    else setItems((data ?? []) as PantryStaple[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Data-fetch on mount
    loadData();
  }, [loadData]);

  const handleMarkStocked = async (id: string) => {
    setMarkingId(id);
    const result = await markStapleAsStocked(id);
    setMarkingId(null);
    if (result.ok) await loadData();
  };

  const low = items.filter((i) => i.status === "Low");
  const out = items.filter((i) => i.status === "Out");

  return (
    <div className="flex flex-1 flex-col gap-6 py-2">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full border border-slate-700/80 p-2 text-slate-400 transition hover:bg-slate-800/80 hover:text-slate-200"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300/80">
              Stock Up
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Low or out — restock list
            </h1>
            <p className="text-xs text-slate-400">
              Sorted by how heavily you rely on each staple. Tap &quot;Got it&quot; when restocked.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6">
        {loading && (
          <p className="text-sm text-slate-400">Loading…</p>
        )}
        {error && (
          <p className="text-sm text-amber-400">{error}</p>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-8 text-center">
            <Package className="mx-auto h-10 w-10 text-slate-500" />
            <p className="mt-2 text-sm font-medium text-slate-300">Nothing to restock</p>
            <p className="mt-1 text-xs text-slate-500">
              When staples hit Low or Out, they’ll show here.
            </p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="flex flex-col gap-6">
            {out.length > 0 && (
              <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300/90">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Out — likely to annoy you if they run out
                </h2>
                <ul className="space-y-2">
                  {out.map((i) => (
                    <li
                      key={i.id}
                      className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2"
                    >
                      <div>
                        <span className="text-sm font-medium text-amber-100">
                          {i.name}
                        </span>
                        {(i.frequency_rank ?? 0) > 0 && (
                          <span className="ml-2 text-[10px] text-amber-300/80">
                            Used in {Math.round(i.frequency_rank ?? 0)} go-to meals
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleMarkStocked(i.id)}
                        disabled={!!markingId}
                        className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-500/30 disabled:opacity-50"
                      >
                        {markingId === i.id ? (
                          <span className="h-3 w-3 animate-spin rounded-full border border-amber-200 border-t-transparent" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        Got it
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {low.length > 0 && (
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/50 p-4">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Low
                </h2>
                <ul className="space-y-2">
                  {low.map((i) => (
                    <li
                      key={i.id}
                      className="flex items-center justify-between rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-2"
                    >
                      <div>
                        <span className="text-sm font-medium text-slate-200">
                          {i.name}
                        </span>
                        {(i.frequency_rank ?? 0) > 0 && (
                          <span className="ml-2 text-[10px] text-slate-500">
                            Used in {Math.round(i.frequency_rank ?? 0)} go-to meals
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleMarkStocked(i.id)}
                        disabled={!!markingId}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-600/80 disabled:opacity-50"
                      >
                        {markingId === i.id ? (
                          <span className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-transparent" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        Got it
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
