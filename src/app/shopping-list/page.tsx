"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    <div className="flex flex-1 flex-col pb-20 px-4 sm:px-0">
      {/* Header */}
      <div className="sticky top-16 z-40 -mx-4 sm:mx-0 px-4 sm:px-0 py-6 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Shopping List</h1>
          <button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100">
            <span className="material-symbols-outlined text-slate-700">more_vert</span>
          </button>
        </div>
      </div>

      {/* Add item form */}
      <div className="mt-6 flex gap-2 mb-8">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add new item..."
          className="flex-1 rounded-full bg-slate-100 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="flex items-center justify-center bg-green-600 text-white text-[11px] font-bold py-3 px-6 rounded-full hover:bg-green-700 active:scale-95 transition-all shadow-sm disabled:opacity-50"
        >
          {adding ? (
            <span className="inline-block h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full"></span>
          ) : (
            "Add"
          )}
        </button>
      </div>

      {/* Items list */}
      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12">
          <span className="material-symbols-outlined text-slate-300 text-4xl">shopping_cart</span>
          <p className="text-sm text-slate-600 font-medium">
            Your shopping list is empty.
          </p>
          <p className="text-xs text-slate-500">
            Add items above or add ingredients from a recipe.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* To Buy Section */}
          {unchecked.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest px-1">
                TO BUY ({unchecked.length})
              </h3>
              <AnimatePresence>
                {unchecked.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-slate-50 rounded-xl p-4 flex items-center justify-between hover:bg-slate-100 transition"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => handleToggle(item.id, true)}
                        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-2 border-slate-300 hover:border-green-600 transition"
                        aria-label={`Mark ${item.name} as purchased`}
                      >
                        <span className="sr-only">Check</span>
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-slate-900">
                          {item.name}
                        </span>
                        {item.qty && (
                          <span className="ml-2 text-xs text-slate-600">
                            {item.qty}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="flex items-center justify-center w-6 h-6 ml-2 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition shrink-0"
                      aria-label={`Remove ${item.name}`}
                    >
                      <span className="material-symbols-outlined text-lg">drag_handle</span>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Purchased Section */}
          {checked.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                  PURCHASED ({checked.length})
                </h3>
                <button
                  onClick={handleClearChecked}
                  disabled={clearing}
                  className="text-xs font-medium text-green-600 hover:text-green-700 transition"
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
                    className="bg-slate-50 rounded-xl p-4 flex items-center gap-3"
                  >
                    <button
                      onClick={() => handleToggle(item.id, false)}
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-2 border-green-600 bg-green-600 transition"
                      aria-label={`Uncheck ${item.name}`}
                    >
                      <span className="material-symbols-outlined text-white text-sm">check</span>
                    </button>
                    <span className="flex-1 min-w-0 text-sm text-slate-500 line-through">
                      {item.name}
                      {item.qty && (
                        <span className="ml-2 text-xs">{item.qty}</span>
                      )}
                    </span>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="flex items-center justify-center w-6 h-6 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition shrink-0"
                      aria-label={`Remove ${item.name}`}
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-900 shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
