"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Check, ShoppingCart, Loader2 } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { ShoppingListItem } from "@/lib/types";
import {
  addShoppingItem,
  toggleShoppingItem,
  removeShoppingItem,
  clearCheckedItems,
} from "@/app/actions/shopping-list";

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [adding, setAdding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const loadItems = useCallback(async () => {
    const supabase = createSupabaseClient();
    const { data } = await supabase
      .from("shopping_list_items")
      .select("*")
      .order("checked", { ascending: true })
      .order("added_at", { ascending: false });
    setItems((data ?? []) as ShoppingListItem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    await addShoppingItem(newName, newQty);
    setNewName("");
    setNewQty("");
    await loadItems();
    setAdding(false);
  };

  const handleToggle = async (id: string, checked: boolean) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked } : item))
    );
    await toggleShoppingItem(id, checked);
  };

  const handleRemove = async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await removeShoppingItem(id);
  };

  const handleClearChecked = async () => {
    setClearing(true);
    await clearCheckedItems();
    await loadItems();
    setClearing(false);
    showToast("Cleared purchased items");
  };

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  return (
    <div className="flex flex-1 flex-col gap-6 py-2">
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-5 w-5 text-emerald-400" />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300/80">
              Shopping List
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              What to buy
            </h1>
          </div>
        </div>
      </section>

      {/* Add item form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add an item..."
          className="flex-1 rounded-xl border border-slate-700/80 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
        />
        <input
          type="text"
          value={newQty}
          onChange={(e) => setNewQty(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Qty"
          className="w-20 rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/15 disabled:opacity-50"
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      {/* Items list */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <ShoppingCart className="h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-500">
              Your shopping list is empty.
            </p>
            <p className="text-xs text-slate-600">
              Add items above or add ingredients from a recipe.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {unchecked.length > 0 && (
              <div className="space-y-1">
                <AnimatePresence>
                  {unchecked.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center gap-3 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2.5"
                    >
                      <button
                        onClick={() => handleToggle(item.id, true)}
                        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border border-slate-600 transition hover:border-emerald-500/50 hover:bg-emerald-500/10"
                        aria-label={`Mark ${item.name} as purchased`}
                      >
                        <span className="sr-only">Check</span>
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-slate-100">
                          {item.name}
                        </span>
                        {item.qty && (
                          <span className="ml-2 text-xs text-slate-400">
                            {item.qty}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="rounded p-1 text-slate-500 transition hover:bg-slate-700/60 hover:text-red-400"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {checked.length > 0 && (
              <div className="mt-4 space-y-1">
                <div className="flex items-center justify-between py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Purchased ({checked.length})
                  </p>
                  <button
                    onClick={handleClearChecked}
                    disabled={clearing}
                    className="text-[11px] font-medium text-slate-400 transition hover:text-red-400"
                  >
                    {clearing ? "Clearing..." : "Clear all"}
                  </button>
                </div>
                <AnimatePresence>
                  {checked.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 rounded-lg border border-slate-800/40 bg-slate-900/30 px-3 py-2.5"
                    >
                      <button
                        onClick={() => handleToggle(item.id, false)}
                        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border border-emerald-500/50 bg-emerald-500/20 transition"
                        aria-label={`Uncheck ${item.name}`}
                      >
                        <Check className="h-3 w-3 text-emerald-400" />
                      </button>
                      <span className="flex-1 min-w-0 text-sm text-slate-500 line-through">
                        {item.name}
                        {item.qty && (
                          <span className="ml-2 text-xs">{item.qty}</span>
                        )}
                      </span>
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="rounded p-1 text-slate-600 transition hover:bg-slate-700/60 hover:text-red-400"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
