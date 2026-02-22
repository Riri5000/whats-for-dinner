"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Scissors } from "lucide-react";
import type { Recipe, RecipeIngredient } from "@/lib/types";
import { updateRecipeIngredients } from "@/app/actions/recipes";

interface RecipeAdjustModalProps {
  recipe: Recipe;
  onClose: () => void;
  onSaved: () => void;
}

export function RecipeAdjustModal({ recipe, onClose, onSaved }: RecipeAdjustModalProps) {
  const [ingredients] = useState<RecipeIngredient[]>(
    () => [...(recipe.ingredients ?? [])]
  );
  const [prunedIndices, setPrunedIndices] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleIngredient = (index: number) => {
    setPrunedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const finalIngredients = ingredients.filter((_, i) => !prunedIndices.has(i));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await updateRecipeIngredients(recipe.id, finalIngredients);
    setSaving(false);
    if (result.ok) onSaved();
    else setError(result.error ?? "Failed to save");
  };

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
            <h2 className="text-sm font-semibold">Adjust recipe — {recipe.title}</h2>
            <button
              onClick={onClose}
              className="rounded p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-4">
            <p className="mb-3 text-[11px] text-slate-500">
              Click a tag to remove it from the recipe. Changes sync to the shopping list.
            </p>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ing, index) => {
                const removed = prunedIndices.has(index);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleIngredient(index)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      removed
                        ? "border-slate-700/60 bg-slate-800/40 text-slate-500 line-through"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
                    }`}
                  >
                    {removed ? <Scissors className="h-3 w-3" /> : null}
                    {ing.name}
                    {ing.is_essential ? (
                      <span className="text-[10px] text-slate-500">essential</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              {prunedIndices.size} removed · {finalIngredients.length} will be saved
            </p>
          </div>

          <div className="border-t border-slate-800 p-4">
            {error && (
              <p className="mb-2 text-xs text-amber-400">{error}</p>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
