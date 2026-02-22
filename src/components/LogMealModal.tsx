"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import type { Recipe } from "@/lib/types";

interface LogMealModalProps {
  open: boolean;
  onClose: () => void;
  recipes: Recipe[];
  selectedDate: Date;
  onLog: (recipeId: string, at?: Date, opts?: { note?: string; tags?: string[] }) => Promise<void>;
  onQuickNote: (note: string) => Promise<void>;
  preSelectRecipeId?: string | null;
}

export function LogMealModal({
  open,
  onClose,
  recipes,
  selectedDate,
  onLog,
  onQuickNote,
  preSelectRecipeId,
}: LogMealModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"pick" | "note">("pick");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(false);

  const MEAL_TAGS = ["Quick", "Comfort", "Healthy"] as const;

  const filteredRecipes = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase().trim())
  );

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset form when modal opens
      setSelectedId(preSelectRecipeId ?? null);
      setMode("pick");
      setNote("");
      setTags([]);
    }
  }, [open, preSelectRecipeId]);

  const toggleTag = (t: string) => {
    setTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const handleLog = async () => {
    if (mode === "note") {
      if (!note.trim()) return;
      setPending(true);
      await onQuickNote(note.trim());
      setPending(false);
      return;
    }
    if (!selectedId) return;
    setPending(true);
    await onLog(selectedId, selectedDate, { tags: tags.length ? tags : undefined });
    setPending(false);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 sm:items-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-lg rounded-t-2xl border border-slate-800 bg-slate-900 shadow-xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-semibold">Log a meal</h2>
            <button
              onClick={onClose}
              className="rounded p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-4">
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setMode("pick")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  mode === "pick"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
                }`}
              >
                Pick recipe
              </button>
              <button
                onClick={() => setMode("note")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  mode === "note"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
                }`}
              >
                Quick note
              </button>
            </div>

            {mode === "pick" ? (
              <div className="space-y-3">
                <p className="mb-2 text-[11px] text-slate-500">
                  For {selectedDate.toLocaleDateString()}
                </p>
                {recipes.length > 0 && (
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search recipes…"
                    className="w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                  />
                )}
                {recipes.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No recipes yet. Import one from the Import tab.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {filteredRecipes.map((r) => (
                      <li key={r.id}>
                        <button
                          data-recipe-id={r.id}
                          onClick={() => setSelectedId(r.id)}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                            selectedId === r.id
                              ? "border-emerald-500/50 bg-emerald-500/10"
                              : "border-slate-700/60 bg-slate-800/40 hover:bg-slate-700/60"
                          }`}
                        >
                          {r.title}
                          {(r.edit_count ?? 0) > 1 && (
                            <span className="ml-2 text-[10px] text-slate-500">
                              House version
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div>
                  <p className="mb-2 text-[11px] text-slate-500">Optional tags</p>
                  <div className="flex gap-2">
                    {MEAL_TAGS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTag(t)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          tags.includes(t)
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "border border-slate-600 bg-slate-800/60 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-[11px] text-slate-500">
                  What did you have?
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Leftover pizza"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="border-t border-slate-800 p-4">
            <button
              onClick={handleLog}
              disabled={
                pending ||
                (mode === "pick" && !selectedId) ||
                (mode === "note" && !note.trim())
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Log meal"
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
