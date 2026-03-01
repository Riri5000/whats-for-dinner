"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, Pencil } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Recipe, MealHistory, PantryStaple } from "@/lib/types";
import { logMealAsConsumed } from "@/app/actions/meals";
import { getOrCreateQuickNoteRecipeId } from "@/app/actions/quick-note";
import { LogMealModal } from "./LogMealModal";
import { RecipeAdjustModal } from "./RecipeAdjustModal";
import { SuggestionCard } from "./SuggestionCard";
import { SurpriseModal } from "./SurpriseModal";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDaysAroundToday(radius: number): Date[] {
  const out: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = -radius; i <= radius; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    out.push(d);
  }
  return out;
}

export function LivingLog() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [meals, setMeals] = useState<Array<MealHistory & { recipe?: Recipe }>>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [staples, setStaples] = useState<PantryStaple[]>([]);
  const [loading, setLoading] = useState(true);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logModalPreselectId, setLogModalPreselectId] = useState<string | null>(null);
  const [adjustRecipe, setAdjustRecipe] = useState<Recipe | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [favoritesSearch, setFavoritesSearch] = useState("");
  const [surpriseOpen, setSurpriseOpen] = useState(false);
  // Hydration-safe: only render date-dependent calendar on client
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseClient();
    setLoading(true);

    const [mRes, rRes, sRes] = await Promise.all([
      supabase
        .from("meal_history")
        .select("id, recipe_id, consumed_at, note, tags")
        .order("consumed_at", { ascending: false })
        .limit(200),
      supabase.from("recipes").select("id, title, instructions, ingredients, source_url, edit_count"),
      supabase.from("pantry_staples").select("id, name, status, last_restocked, frequency_rank"),
    ]);

    const mealList = (mRes.data ?? []) as (MealHistory & { recipe?: Recipe })[];
    const recipeList = (rRes.data ?? []) as Recipe[];
    const stapleList = (sRes.data ?? []) as PantryStaple[];

    const recipeMap = new Map(recipeList.map((r) => [r.id, r]));
    for (const m of mealList) {
      m.recipe = recipeMap.get(m.recipe_id);
    }

    setMeals(mealList);
    setRecipes(recipeList.filter((r) => r.title !== "Quick note"));
    setStaples(stapleList);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const mealsByDate = new Map<string, typeof meals>();
  for (const m of meals) {
    const key = toDateKey(new Date(m.consumed_at));
    if (!mealsByDate.has(key)) mealsByDate.set(key, []);
    mealsByDate.get(key)!.push(m);
  }

  const days = getDaysAroundToday(7);
  const selectedKey = toDateKey(selectedDate);
  const selectedMeals = mealsByDate.get(selectedKey) ?? [];
  const isToday = toDateKey(selectedDate) === toDateKey(new Date());

  const openLogModal = (preselectId?: string | null) => {
    // Only preselect when an explicit ID is provided; null means "no preselection"
    setLogModalPreselectId(preselectId !== undefined ? preselectId : null);
    setLogModalOpen(true);
  };

  const handleLogMeal = async (
    recipeId: string,
    at?: Date,
    opts?: { note?: string; tags?: string[] }
  ) => {
    const result = await logMealAsConsumed(recipeId, at ?? selectedDate, opts);
    if (result.ok) {
      setLogModalOpen(false);
      setLogModalPreselectId(null);
      await loadData();
      setToast("Logged for " + (isToday ? "today" : selectedDate.toLocaleDateString()));
      setTimeout(() => setToast(null), 2500);
    }
  };

  const handleQuickNote = async (note: string) => {
    const quickId = await getOrCreateQuickNoteRecipeId();
    if (!quickId) return;
    await handleLogMeal(quickId, undefined, { note });
  };

  const handleReuseLastWeekday = async () => {
    const targetDow = selectedDate.getDay();
    const cutoff = new Date(selectedDate);
    cutoff.setMonth(cutoff.getMonth() - 2);
    const sameWeekday = meals
      .filter((m) => new Date(m.consumed_at).getDay() === targetDow)
      .filter((m) => new Date(m.consumed_at) < selectedDate)
      .filter((m) => new Date(m.consumed_at) >= cutoff);
    const last = sameWeekday[0];
    if (!last?.recipe_id || last.recipe?.title === "Quick note") return;
    await handleLogMeal(last.recipe_id);
  };

  const lastSameWeekday = (() => {
    const targetDow = selectedDate.getDay();
    return meals.find(
      (m) =>
        new Date(m.consumed_at).getDay() === targetDow &&
        new Date(m.consumed_at) < selectedDate &&
        m.recipe?.title !== "Quick note"
    );
  })();

  const favorites = recipes
    .filter((r) =>
      r.title.toLowerCase().includes(favoritesSearch.toLowerCase().trim())
    )
    .sort((a, b) => {
      const aCount = meals.filter((m) => m.recipe_id === a.id).length;
      const bCount = meals.filter((m) => m.recipe_id === b.id).length;
      return bCount - aCount;
    })
    .slice(0, 8);

  return (
    <div className="flex flex-1 flex-col gap-6 py-2">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300/80">
              Living Log
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              What&apos;s with Dinner
            </h1>
            <p className="text-xs text-slate-400">
              Log meals, plan ahead, and let the app remember your patterns.
            </p>
          </div>
        </div>
      </section>

      <SuggestionCard
        selectedDate={selectedDate}
        meals={meals}
        recipes={recipes}
        staples={staples}
        onLogMeal={handleLogMeal}
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Calendar
          </p>
          <button
            onClick={() => openLogModal()}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/15"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{"Log tonight's dinner"}</span>
            <span className="sm:hidden">Log dinner</span>
          </button>
        </div>

        {/* Calendar strip -- only render on client to avoid hydration mismatch with day names */}
        {mounted && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((d) => {
              const key = toDateKey(d);
              const dayMeals = mealsByDate.get(key) ?? [];
              const active = key === selectedKey;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(d)}
                  className={`flex min-w-[4rem] flex-col items-center rounded-xl border px-3 py-2 text-center transition ${
                    active
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-slate-700/80 bg-slate-900/50 hover:bg-slate-800/50"
                  }`}
                >
                  <span className="text-[10px] text-slate-500" suppressHydrationWarning>
                    {DAY_NAMES[d.getDay()]}
                  </span>
                  <span className="text-sm font-medium" suppressHydrationWarning>{d.getDate()}</span>
                  {dayMeals.length > 0 && (
                    <span className="mt-0.5 text-[10px] text-emerald-400">
                      {dayMeals.length} meal{dayMeals.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
            {isToday ? "Today" : selectedDate.toLocaleDateString()} — meals
          </p>
          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : selectedMeals.length === 0 ? (
            <p className="text-sm text-slate-500">
              No meals logged. Tap &quot;Log dinner&quot; to add one.
            </p>
          ) : (
            <ul className="space-y-2">
              {selectedMeals.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-medium">
                      {m.note || m.recipe?.title || "Unknown"}
                    </span>
                    {m.tags?.length ? (
                      <div className="mt-0.5 flex gap-1">
                        {m.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded px-1.5 py-0.5 text-[10px] text-slate-400"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {m.recipe && m.recipe.title !== "Quick note" && (
                    <button
                      onClick={() => setAdjustRecipe(m.recipe!)}
                      className="rounded p-1.5 text-slate-400 transition hover:bg-slate-700/60 hover:text-slate-200"
                      aria-label="Adjust recipe"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Quick actions
          </p>
          <div className="flex flex-wrap gap-2">
            {lastSameWeekday && (
              <button
                onClick={handleReuseLastWeekday}
                className="rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700/80"
              >
                Reuse last {DAY_NAMES[selectedDate.getDay()]}&apos;s meal
              </button>
            )}
            <button
              onClick={() => openLogModal()}
              className="rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700/80"
            >
              Pick from favorites
            </button>
            <button
              onClick={() => openLogModal()}
              className="rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700/80"
            >
              Free-type a quick note
            </button>
          </div>
        </div>

        {recipes.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Favorites
              </p>
              <input
                type="text"
                value={favoritesSearch}
                onChange={(e) => setFavoritesSearch(e.target.value)}
                placeholder="Search..."
                className="w-24 rounded border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {favorites.length === 0 ? (
                <p className="text-xs text-slate-500">No matches.</p>
              ) : (
                favorites.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => openLogModal(r.id)}
                    className="flex-shrink-0 rounded-full border border-slate-600 bg-slate-800/80 px-4 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700/80"
                  >
                    {r.title}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* "I don't know what to make" button - replaces surprise page link */}
      <div className="flex justify-center pb-16 sm:pb-0">
        <button
          onClick={() => setSurpriseOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/60 px-5 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700/60 hover:text-slate-100"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {"I don't know what to make"}
        </button>
      </div>

      <LogMealModal
        open={logModalOpen}
        onClose={() => {
          setLogModalOpen(false);
          setLogModalPreselectId(null);
        }}
        recipes={recipes}
        selectedDate={selectedDate}
        onLog={handleLogMeal}
        onQuickNote={handleQuickNote}
        onRecipeCreated={loadData}
        preSelectRecipeId={logModalPreselectId}
      />

      <SurpriseModal
        open={surpriseOpen}
        onClose={() => setSurpriseOpen(false)}
      />

      {adjustRecipe && (
        <RecipeAdjustModal
          recipe={adjustRecipe}
          onClose={() => setAdjustRecipe(null)}
          onSaved={() => {
            setAdjustRecipe(null);
            loadData();
            setToast("Recipe updated");
            setTimeout(() => setToast(null), 2500);
          }}
        />
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 shadow-lg sm:bottom-6"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
