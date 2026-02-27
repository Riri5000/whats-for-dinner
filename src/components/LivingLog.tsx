"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Recipe, MealHistory, PantryStaple } from "@/lib/types";
import { logMealAsConsumed } from "@/app/actions/meals";
import { getOrCreateQuickNoteRecipeId } from "@/app/actions/quick-note";
import { LogMealModal } from "./LogMealModal";
import { RecipeAdjustModal } from "./RecipeAdjustModal";
import { SuggestionCard } from "./SuggestionCard";
import { SurpriseModal } from "./SurpriseModal";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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
  const [mounted, setMounted] = useState(false);
  const [monthYear, setMonthYear] = useState<Date>(() => new Date());

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

  const days = getDaysAroundToday(2);
  const selectedKey = toDateKey(selectedDate);
  const selectedMeals = mealsByDate.get(selectedKey) ?? [];
  const isToday = toDateKey(selectedDate) === toDateKey(new Date());

  const openLogModal = (preselectId?: string) => {
    setLogModalPreselectId(preselectId ?? null);
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
    <div className="flex flex-1 flex-col pb-20 px-4 sm:px-0">
      {/* Sticky header */}
      <div className="sticky top-16 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 py-4 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-display font-bold">October 2023</h1>
          </div>
          <div className="flex gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
              <span className="material-symbols-outlined text-slate-700">&lt;</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
              <span className="material-symbols-outlined text-slate-700">&gt;</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar strip */}
      {mounted && (
        <div className="mt-6 mb-8 flex gap-3 justify-start sm:justify-center overflow-x-auto pb-2">
          {days.map((d) => {
            const key = toDateKey(d);
            const dayMeals = mealsByDate.get(key) ?? [];
            const active = key === selectedKey;
            return (
              <button
                key={key}
                onClick={() => setSelectedDate(d)}
                className={`flex flex-col items-center rounded-2xl px-4 py-3 text-center transition min-w-max ${
                  active
                    ? "bg-green-600 text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="text-xs font-medium uppercase" suppressHydrationWarning>
                  {DAY_NAMES[d.getDay()]}
                </span>
                <span className="text-xl font-bold mt-1" suppressHydrationWarning>{d.getDate()}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Suggestion card */}
      <div className="mb-8">
        <SuggestionCard
          selectedDate={selectedDate}
          meals={meals}
          recipes={recipes}
          staples={staples}
          onLogMeal={handleLogMeal}
        />
      </div>

      {/* "I don't know what to make" button */}
      <div className="mb-8 rounded-xl bg-green-50 border border-green-100 p-4 flex items-center gap-3">
        <span className="material-symbols-outlined text-green-600 text-lg">lightbulb</span>
        <button
          onClick={() => setSurpriseOpen(true)}
          className="text-sm font-medium text-green-700 hover:text-green-800"
        >
          I don't know what to make?
        </button>
      </div>

      {/* Meals for selected date */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold" suppressHydrationWarning>
            {isToday ? "Today's Meals" : selectedDate.toLocaleDateString()}
          </h2>
          <button
            onClick={() => openLogModal()}
            className="text-green-600 text-sm font-medium hover:text-green-700"
          >
            View Log
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : selectedMeals.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-6 text-center">
            <span className="material-symbols-outlined text-slate-300 text-3xl mx-auto block mb-2">
              restaurant
            </span>
            <p className="text-sm text-slate-600">No meals logged for this day.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedMeals.map((m) => (
              <div
                key={m.id}
                className="bg-slate-50 rounded-xl p-4 flex items-center justify-between hover:bg-slate-100 transition"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🍽️</span>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {m.note || m.recipe?.title || "Unknown meal"}
                      </p>
                      {m.tags?.length ? (
                        <div className="mt-1 flex gap-1">
                          {m.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => openLogModal()}
                  className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white text-slate-400 hover:text-green-600 transition shrink-0"
                >
                  <span className="material-symbols-outlined">add_circle</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
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
        preSelectRecipeId={logModalPreselectId ?? lastSameWeekday?.recipe_id}
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
            className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-medium text-slate-900 shadow-lg sm:bottom-6"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
