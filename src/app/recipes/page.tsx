"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  ExternalLink,
  Loader2,
  Link as LinkIcon,
  X,
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Recipe, MealHistory } from "@/lib/types";
import { addRecipeIngredientsToShoppingList } from "@/app/actions/shopping-list";
import { scrapeRecipeFromUrl, saveRecipe } from "@/app/actions/import-recipe";
import { createRecipeManually } from "@/app/actions/create-recipe";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [meals, setMeals] = useState<MealHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  // Import from URL state
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Manual create state
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createInstructions, setCreateInstructions] = useState("");
  const [createIngredients, setCreateIngredients] = useState<
    Array<{ name: string; qty: string; unit: string; is_essential: boolean }>
  >([{ name: "", qty: "", unit: "", is_essential: true }]);
  const [createLoading, setCreateLoading] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const loadData = useCallback(async () => {
    const supabase = createSupabaseClient();
    const [rRes, mRes] = await Promise.all([
      supabase.from("recipes").select("id, title, instructions, ingredients, source_url, edit_count"),
      supabase.from("meal_history").select("id, recipe_id, consumed_at"),
    ]);
    const recipeList = (rRes.data ?? []) as Recipe[];
    setRecipes(recipeList.filter((r) => r.title !== "Quick note"));
    setMeals((mRes.data ?? []) as MealHistory[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase().trim())
  );

  const getMealCount = (recipeId: string) =>
    meals.filter((m) => m.recipe_id === recipeId).length;

  const handleAddToShoppingList = async (recipe: Recipe) => {
    setAddingToCart(recipe.id);
    const result = await addRecipeIngredientsToShoppingList(
      recipe.id,
      recipe.ingredients
    );
    if (result.ok) {
      showToast(`Added ${recipe.ingredients.length} items to shopping list`);
    }
    setAddingToCart(null);
  };

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    setImportLoading(true);
    setImportError(null);
    const result = await scrapeRecipeFromUrl(importUrl.trim());
    if (!result.ok) {
      setImportError(result.error);
      setImportLoading(false);
      return;
    }
    const saveResult = await saveRecipe(result.recipe, importUrl.trim());
    if (!saveResult.ok) {
      setImportError(saveResult.error ?? "Failed to save");
      setImportLoading(false);
      return;
    }
    setImportUrl("");
    setShowImport(false);
    await loadData();
    showToast(`Imported "${result.recipe.title}"`);
    setImportLoading(false);
  };

  const handleCreateRecipe = async () => {
    if (!createTitle.trim()) return;
    setCreateLoading(true);
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
      setCreateTitle("");
      setCreateInstructions("");
      setCreateIngredients([{ name: "", qty: "", unit: "", is_essential: true }]);
      setShowCreate(false);
      await loadData();
      showToast(`Created "${createTitle.trim()}"`);
    }
    setCreateLoading(false);
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

  return (
    <div className="flex flex-1 flex-col gap-6 py-2">
      {/* Header */}
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-emerald-400" />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300/80">
              Recipe Book
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              All Recipes
            </h1>
          </div>
        </div>
      </section>

      {/* Search and actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes..."
            className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowCreate(!showCreate);
              setShowImport(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/15"
          >
            <Plus className="h-3.5 w-3.5" />
            New Recipe
          </button>
          <button
            onClick={() => {
              setShowImport(!showImport);
              setShowCreate(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700/80"
          >
            <LinkIcon className="h-3.5 w-3.5" />
            Import URL
          </button>
        </div>
      </div>

      {/* Import from URL panel */}
      <AnimatePresence>
        {showImport && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-200">
                  Import from URL
                </p>
                <button
                  onClick={() => setShowImport(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleImportUrl()}
                  placeholder="Paste a recipe URL..."
                  className="flex-1 rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                />
                <button
                  onClick={handleImportUrl}
                  disabled={importLoading || !importUrl.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/15 disabled:opacity-50"
                >
                  {importLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Import"
                  )}
                </button>
              </div>
              {importError && (
                <p className="mt-2 text-xs text-red-400">{importError}</p>
              )}
              <p className="mt-2 text-[11px] text-slate-500">
                Paste a recipe URL and we will use AI to extract the title,
                ingredients, and instructions.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create recipe panel */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-200">
                  Create New Recipe
                </p>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
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
                          className="flex-1 rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={ing.qty}
                          onChange={(e) =>
                            updateIngredient(i, "qty", e.target.value)
                          }
                          placeholder="Qty"
                          className="w-16 rounded-lg border border-slate-700/80 bg-slate-950/80 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={ing.unit}
                          onChange={(e) =>
                            updateIngredient(i, "unit", e.target.value)
                          }
                          placeholder="Unit"
                          className="w-16 rounded-lg border border-slate-700/80 bg-slate-950/80 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
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
                    className="mt-2 text-xs font-medium text-emerald-300/80 transition hover:text-emerald-300"
                  >
                    + Add ingredient
                  </button>
                </div>
                <textarea
                  value={createInstructions}
                  onChange={(e) => setCreateInstructions(e.target.value)}
                  placeholder="Instructions (optional)"
                  rows={3}
                  className="w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                />
                <button
                  onClick={handleCreateRecipe}
                  disabled={createLoading || !createTitle.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-50"
                >
                  {createLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save Recipe"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recipes list */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-400">Loading recipes...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/50 py-12">
            <BookOpen className="h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-500">
              {search ? "No recipes match your search." : "No recipes yet."}
            </p>
            <p className="text-xs text-slate-600">
              Create a new recipe or import one from a URL.
            </p>
          </div>
        ) : (
          filtered.map((recipe) => {
            const isExpanded = expandedId === recipe.id;
            const count = getMealCount(recipe.id);
            return (
              <motion.div
                key={recipe.id}
                layout
                className="rounded-2xl border border-slate-800/80 bg-slate-900/50 overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : recipe.id)
                  }
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-100 truncate">
                      {recipe.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-slate-500">
                        {recipe.ingredients.length} ingredients
                      </span>
                      {count > 0 && (
                        <span className="text-[11px] text-emerald-400/70">
                          Cooked {count}x
                        </span>
                      )}
                      {(recipe.edit_count ?? 0) > 1 && (
                        <span className="text-[11px] text-amber-400/70">
                          House version
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-slate-800/60 px-4 py-3 space-y-3">
                        {/* Ingredients */}
                        <div>
                          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                            Ingredients
                          </p>
                          <ul className="space-y-1">
                            {recipe.ingredients.map((ing, i) => (
                              <li
                                key={i}
                                className="flex items-center gap-2 text-sm text-slate-300"
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                                    ing.is_essential
                                      ? "bg-emerald-400"
                                      : "bg-slate-600"
                                  }`}
                                />
                                <span>
                                  {ing.name}
                                  {ing.qty != null && (
                                    <span className="text-slate-500">
                                      {" "}
                                      {ing.qty}
                                      {ing.unit ? ` ${ing.unit}` : ""}
                                    </span>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Instructions */}
                        {recipe.instructions && (
                          <div>
                            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                              Instructions
                            </p>
                            <p className="text-sm text-slate-300 whitespace-pre-wrap">
                              {recipe.instructions}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            onClick={() =>
                              handleAddToShoppingList(recipe)
                            }
                            disabled={addingToCart === recipe.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700/80 disabled:opacity-50"
                          >
                            {addingToCart === recipe.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <ShoppingCart className="h-3 w-3" />
                            )}
                            Add to shopping list
                          </button>
                          {recipe.source_url && (
                            <a
                              href={recipe.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700/80"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Source
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
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
