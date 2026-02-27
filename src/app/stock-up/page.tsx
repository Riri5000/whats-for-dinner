"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
  const lowCount = low.length;
  const outCount = out.length;

  return (
    <div className="flex flex-1 flex-col pb-20 px-4 sm:px-0">
      {/* Header */}
      <div className="sticky top-16 z-40 -mx-4 sm:mx-0 px-4 sm:px-0 py-6 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-display font-bold">Stock Up</h1>
          <button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100">
            <span className="material-symbols-outlined text-slate-700">search</span>
          </button>
        </div>
      </div>

      {/* Pantry Status Card */}
      <div className="mt-6 mb-8 rounded-2xl bg-green-50 border border-green-100 p-6 flex flex-col items-center text-center">
        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
          <span className="material-symbols-outlined text-green-600 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            inventory_2
          </span>
        </div>
        <h2 className="text-xl font-display font-bold text-slate-900 mb-2">Pantry Status</h2>
        <p className="text-sm text-slate-600 leading-relaxed max-w-xs">
          You're running low on <span className="font-bold text-green-600">{lowCount + outCount} essential items</span> needed for this week's meal plan.
        </p>
      </div>

      {/* Content */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-slate-500">Loading…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl bg-slate-50 p-8 text-center">
          <span className="material-symbols-outlined text-slate-400 text-4xl mx-auto block mb-2">
            inventory_2
          </span>
          <p className="text-sm font-medium text-slate-700">All stocked up!</p>
          <p className="text-xs text-slate-500 mt-1">
            When staples hit Low or Out, they'll show here.
          </p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-8 pb-8">
          {/* Out (Critical) Section */}
          {out.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-red-500 flex items-center gap-2 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  Out (Critical)
                </h3>
                <span className="text-[10px] font-bold bg-red-50 text-red-500 px-2 py-0.5 rounded-full uppercase">{outCount} items</span>
              </div>
              <div className="space-y-2">
                {out.map((i) => (
                  <div key={i.id} className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-red-400 shrink-0">
                        <span className="material-symbols-outlined text-xl">warning</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{i.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Used in {Math.round(i.frequency_rank ?? 0)} meals
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkStocked(i.id)}
                      disabled={!!markingId}
                      className="shrink-0 bg-green-600 text-white text-[11px] font-bold py-2 px-4 rounded-full hover:bg-green-700 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                    >
                      {markingId === i.id ? (
                        <span className="inline-block h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full"></span>
                      ) : (
                        "Got it"
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Low Stock Section */}
          {low.length > 0 && (
            <section className="space-y-3 pb-8">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-orange-500 flex items-center gap-2 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  Low Stock
                </h3>
                <span className="text-[10px] font-bold bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full uppercase">{lowCount} items</span>
              </div>
              <div className="space-y-2">
                {low.map((i) => (
                  <div key={i.id} className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-orange-400 shrink-0">
                        <span className="material-symbols-outlined text-xl">oil_barrel</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{i.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Key for {Math.round(i.frequency_rank ?? 0)} recipes
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkStocked(i.id)}
                      disabled={!!markingId}
                      className="shrink-0 bg-green-600 text-white text-[11px] font-bold py-2 px-4 rounded-full hover:bg-green-700 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                    >
                      {markingId === i.id ? (
                        <span className="inline-block h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full"></span>
                      ) : (
                        "Got it"
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
