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
        className="fixed inset-0 z-50 flex items-end justify-center bg-[#1A1A1A]/60 backdrop-blur-sm sm:items-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-lg rounded-t-3xl border border-[#D5D3C4] bg-[#F5F3EB] shadow-xl sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[#D5D3C4] px-5 py-4">
            <h2 className="text-base font-bold text-[#1A1A1A]">Log a meal</h2>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-[#A5B8A2] transition hover:bg-[#F2EB8D]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-5">
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
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                    mode === key
                      ? "bg-[#A5B8A2] text-[#F5F3EB]"
                      : "border border-[#D5D3C4] bg-[#F5F3EB] text-[#A5B8A2] hover:bg-[#F2EB8D]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Pick recipe mode */}
            {mode === "pick" && (
              <div className="space-y-3">
                <p className="text-xs text-[#A5B8A2]">
                  For {selectedDate.toLocaleDateString()}
                </p>
                {recipes.length > 0 && (
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search recipes..."
                    className="w-full rounded-2xl border border-[#D5D3C4] bg-[#F2EB8D] px-4 py-3 text-sm text-[#1A1A1A] placeholder:text-[#B4B4B4] focus:border-[#A5B8A2] focus:outline-none"
                  />
                )}
                {recipes.length === 0 ? (
                  <p className="text-sm text-[#B4B4B4]">
                    No recipes yet. Switch to &quot;New recipe&quot; to create one.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredRecipes.map((r) => (
                      <li key={r.id}>
                        <button
                          data-recipe-id={r.id}
                          onClick={() => setSelectedId(r.id)}
                          className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                            selectedId === r.id
                              ? "border-[#A5B8A2] bg-[#A5B8A2] text-[#F5F3EB]"
                              : "border-[#D5D3C4] bg-[#F5F3EB] text-[#1A1A1A] hover:bg-[#F2EB8D]"
                          }`}
                        >
                          {r.title}
                          {(r.edit_count ?? 0) > 1 && (
                            <span className="ml-2 text-xs opacity-70">
                              House version
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div>
                  <p className="mb-2 text-xs font-medium text-[#A5B8A2]">Optional tags</p>
                  <div className="flex gap-2">
                    {MEAL_TAGS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTag(t)}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                          tags.includes(t)
                            ? "bg-[#A5B8A2] text-[#F5F3EB]"
                            : "border border-[#D5D3C4] bg-[#F5F3EB] text-[#A5B8A2] hover:bg-[#F2EB8D]"
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
                <p className="text-xs text-[#A5B8A2]">
                  Create a new recipe and log it for{" "}
                  {selectedDate.toLocaleDateString()}
                </p>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Recipe name"
                  className="w-full rounded-2xl border border-[#D5D3C4] bg-[#F2EB8D] px-4 py-3 text-sm text-[#1A1A1A] placeholder:text-[#B4B4B4] focus:border-[#A5B8A2] focus:outline-none"
                />
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#A5B8A2]">
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
                          className="flex-1 rounded-xl border border-[#D5D3C4] bg-[#F5F3EB] px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#B4B4B4] focus:border-[#A5B8A2] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={ing.qty}
                          onChange={(e) =>
                            updateIngredient(i, "qty", e.target.value)
                          }
                          placeholder="Qty"
                          className="w-16 rounded-xl border border-[#D5D3C4] bg-[#F5F3EB] px-2 py-2 text-sm text-[#1A1A1A] placeholder:text-[#B4B4B4] focus:border-[#A5B8A2] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={ing.unit}
                          onChange={(e) =>
                            updateIngredient(i, "unit", e.target.value)
                          }
                          placeholder="Unit"
                          className="w-16 rounded-xl border border-[#D5D3C4] bg-[#F5F3EB] px-2 py-2 text-sm text-[#1A1A1A] placeholder:text-[#B4B4B4] focus:border-[#A5B8A2] focus:outline-none"
                        />
                        {createIngredients.length > 1 && (
                          <button
                            onClick={() => removeIngredient(i)}
                            className="rounded-xl p-2 text-[#B4B4B4] hover:text-[#E61919]"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addIngredientRow}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#A5B8A2] transition hover:text-[#A5B8A2]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add ingredient
                  </button>
                </div>
                <textarea
                  value={createInstructions}
                  onChange={(e) => setCreateInstructions(e.target.value)}
                  placeholder="Instructions (optional)"
                  rows={2}
                  className="w-full rounded-2xl border border-[#D5D3C4] bg-[#F5F3EB] px-4 py-3 text-sm text-[#1A1A1A] placeholder:text-[#B4B4B4] focus:border-[#A5B8A2] focus:outline-none"
                />
                <div>
                  <p className="mb-2 text-xs font-medium text-[#A5B8A2]">Optional tags</p>
                  <div className="flex gap-2">
                    {MEAL_TAGS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTag(t)}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                          tags.includes(t)
                            ? "bg-[#A5B8A2] text-[#F5F3EB]"
                            : "border border-[#D5D3C4] bg-[#F5F3EB] text-[#A5B8A2] hover:bg-[#F2EB8D]"
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
                <label className="mb-2 block text-xs font-medium text-[#A5B8A2]">
                  What did you have?
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Leftover pizza"
                  className="w-full rounded-2xl border border-[#D5D3C4] bg-[#F2EB8D] px-4 py-3 text-sm text-[#1A1A1A] placeholder:text-[#B4B4B4] focus:border-[#A5B8A2] focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="border-t border-[#D5D3C4] p-5">
            <button
              onClick={handleLog}
              disabled={pending || !canSubmit()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#A5B8A2] py-3 text-sm font-semibold text-[#F5F3EB] transition hover:bg-[#B4B4B4] disabled:opacity-50"
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
