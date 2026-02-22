"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCart, ArrowLeft, Package, AlertCircle } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { PantryStaple } from "@/lib/types";

export default function StockUpPage() {
  const [items, setItems] = useState<PantryStaple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();
    supabase
      .from("pantry_staples")
      .select("id, name, status, last_restocked")
      .in("status", ["Low", "Out"])
      .order("status", { ascending: true })
      .then(({ data, error: e }) => {
        setLoading(false);
        if (e) setError(e.message);
        else setItems((data ?? []) as PantryStaple[]);
      });
  }, []);

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
              Driven by the depletion engine (3 meals → Half, 5 → Low).
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-8 text-center"
          >
            <Package className="mx-auto h-10 w-10 text-slate-500" />
            <p className="mt-2 text-sm font-medium text-slate-300">Nothing to restock</p>
            <p className="mt-1 text-xs text-slate-500">
              When staples hit Low or Out, they’ll show here.
            </p>
          </motion.div>
        )}

        {!loading && items.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {out.length > 0 && (
              <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300/90">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Out
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {out.map((i) => (
                    <li
                      key={i.id}
                      className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100"
                    >
                      {i.name}
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
                <ul className="flex flex-wrap gap-2">
                  {low.map((i) => (
                    <li
                      key={i.id}
                      className="rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200"
                    >
                      {i.name}
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
