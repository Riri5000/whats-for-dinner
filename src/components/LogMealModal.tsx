"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Plus } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { createRecipeManually } from "@/app/actions/create-recipe";

interface LogMealModalProps {
  open: boolean;
  onClose: () => void;
  recipes: Recipe[];
  selectedDate: Date;
  onLog: (recipeId: string, at?: Date, opts?: { note?: string; tags?: string[] }) => Promise<void>;
  onQuickNote: (note: string) => Promise<void>;
  onRecipeCreated?: () => void;
  preSelectRecipeId?: string | null;
}

export function LogMealModal({
  open,
  onClose,
  recipes,
  selectedDate,
  onLog,
  onQuickNote,
  onRecipeCreated,
  preSelectRecipeId,
}: LogMealModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"pick" | "create" | "note">("pick");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(false);

  // Create recipe form state
  const [createTitle, setCreateTitle] = useState("");
  const [createInstructions, setCreateInstructions] = useState("");
  const [createIngredients, setCreateIngredients] = useState<
    Array<{ name: string; qty: string; unit: string; is_essential: boolean }>
  >([{ name: "", qty: "", unit: "", is_essential: true }]);

  const MEAL_TAGS = ["Quick", "Comfort", "Healthy"] as const;

  const filteredRecipes = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase().trim())
  );

  useEffect(() => {
    if (open) {
      setSelectedId(preSelectRecipeId ?? null);
      setMode("pick");
      setNote("");
      setTags([]);
      setSearch("");
      setCreateTitle("");
      setCreateInstructions("");
      setCreateIngredients([{ name: "", qty: "", unit: "", is_essential: true }]);
    }
  }, [open, preSelectRecipeId]);

  const toggleTag = (t: string) => {
    setTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const addIngredientRow = () => {
    setCreateIngredients((prev) => [
      ...prev,
      { name: "", qty: "", unit: "", is_essential: true },
    ]);
  };

  const updateIngredient = (
    index: number,
    field: string,
    value: string | boolean
  ) => {
    setCreateIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    );
  };

  const removeIngredient = (index: number) => {
    setCreateIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLog = async () => {
    if (mode === "note") {
      if (!note.trim()) return;
      setPending(true);
      await onQuickNote(note.trim());
      setPending(false);
      return;
    }
    if (mode === "create") {
      if (!createTitle.trim()) return;
      setPending(true);
      const ingredients = createIngredients
        .filter((i) => i.name.trim())
        .map((i) => ({
          name: i.name.trim(),
          qty: i.qty ? Number(i.qty) || null : null,
          unit: i.unit.trim() || null,
          is_essential: i.is_essential,
        }));
      const result = await createRecipeManually(
        createTitle,
        ingredients,
        createInstructions
      );
      if (result.ok) {
        // Log the newly created recipe as a meal
        await onLog(result.id, selectedDate, { tags: tags.length ? tags : undefined });
        onRecipeCreated?.();
      }
      setPending(false);
      return;
    }
    if (!selectedId) return;
    setPending(true);
    await onLog(selectedId, selectedDate, { tags: tags.length ? tags : undefined });
    setPending(false);
  };

  const canSubmit = () => {
    if (mode === "pick") return !!selectedId;
    if (mode === "note") return !!note.trim();
    if (mode === "create") return !!createTitle.trim();
    return false;
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
            {/* Mode tabs */}
            <div className="mb-4 flex gap-2 overflow-x-auto">
              {(
                [
                  { key: "pick", label: "Pick recipe" },
                  { key: "create", label: "New recipe" },
                  { key: "note", label: "Quick note" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    mode === key
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Pick recipe mode */}
            {mode === "pick" && (
              <div className="space-y-3">
                <p className="mb-2 text-[11px] text-slate-500">
                  For {selectedDate.toLocaleDateString()}
                </p>
                {recipes.length > 0 && (
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search recipes..."
                    className="w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                  />
                )}
                {recipes.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No recipes yet. Switch to &quot;New recipe&quot; to create one.
                  </p>
                ) : (
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
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
            )}

            {/* Create recipe mode */}
            {mode === "create" && (
              <div className="space-y-3">
                <p className="mb-2 text-[11px] text-slate-500">
                  Create a new recipe and log it for{" "}
                  {selectedDate.toLocaleDateString()}
                </p>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Recipe name"
                  className="w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                />
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Ingredients
                  </p>
                  <div className="space-y-2">
                    {createIngredients.map((ing, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={ing.name}
                          onChange={(e) =>
                            updateIngredient(i, "name", e.target.value)
                          }
                          placeholder="Ingredient"
                          className="flex-1 rounded-lg border border-slate-700/80 bg-slate-950/80 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={ing.qty}
                          onChange={(e) =>
                            updateIngredient(i, "qty", e.target.value)
                          }
                          placeholder="Qty"
                          className="w-14 rounded-lg border border-slate-700/80 bg-slate-950/80 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={ing.unit}
                          onChange={(e) =>
                            updateIngredient(i, "unit", e.target.value)
                          }
                          placeholder="Unit"
                          className="w-14 rounded-lg border border-slate-700/80 bg-slate-950/80 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                        />
                        {createIngredients.length > 1 && (
                          <button
                            onClick={() => removeIngredient(i)}
                            className="rounded p-1 text-slate-500 hover:text-red-400"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addIngredientRow}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-300/80 transition hover:text-emerald-300"
                  >
                    <Plus className="h-3 w-3" />
                    Add ingredient
                  </button>
                </div>
                <textarea
                  value={createInstructions}
                  onChange={(e) => setCreateInstructions(e.target.value)}
                  placeholder="Instructions (optional)"
                  rows={2}
                  className="w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                />
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
            )}

            {/* Quick note mode */}
            {mode === "note" && (
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
              disabled={pending || !canSubmit()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "create" ? (
                "Save & log meal"
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
