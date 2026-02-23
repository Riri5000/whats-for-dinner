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
    <div className="flex flex-1 flex-col gap-4 py-2">
      {/* Header card */}
      <section className="rounded-3xl border border-[#D5D3C4] bg-[#F5F3EB] px-5 py-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#A5B8A2]">
              Living Log
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A] sm:text-3xl">
              What&apos;s with Dinner
            </h1>
            <p className="mt-1 text-sm text-[#A5B8A2]">
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

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#A5B8A2]">
            Calendar
          </p>
          <button
            onClick={() => openLogModal()}
            className="inline-flex items-center gap-2 rounded-full bg-[#A5B8A2] px-4 py-2.5 text-xs font-semibold text-[#F5F3EB] transition hover:bg-[#B4B4B4]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{"Log tonight's dinner"}</span>
            <span className="sm:hidden">Log dinner</span>
          </button>
        </div>

        {/* Calendar strip */}
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
                  className={`flex min-w-[4.5rem] flex-col items-center rounded-2xl border px-3 py-3 text-center transition ${
                    active
                      ? "border-[#A5B8A2] bg-[#A5B8A2] text-[#F5F3EB] shadow-md"
                      : "border-[#D5D3C4] bg-[#F5F3EB] text-[#A5B8A2] hover:bg-[#F2EB8D]"
                  }`}
                >
                  <span className="text-[11px] font-medium" suppressHydrationWarning>
                    {DAY_NAMES[d.getDay()]}
                  </span>
                  <span className="mt-0.5 text-lg font-bold" suppressHydrationWarning>{d.getDate()}</span>
                  {dayMeals.length > 0 && (
                    <span className={`mt-1 text-[10px] font-medium ${active ? "text-[#F2EB8D]" : "text-[#A5B8A2]"}`}>
                      {dayMeals.length} meal{dayMeals.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Meals for selected date */}
        <div className="rounded-3xl border border-[#D5D3C4] bg-[#F5F3EB] p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#A5B8A2]">
            {isToday ? "Today" : selectedDate.toLocaleDateString()} — meals
          </p>
          {loading ? (
            <p className="text-sm text-[#B4B4B4]">Loading...</p>
          ) : selectedMeals.length === 0 ? (
            <p className="text-sm text-[#B4B4B4]">
              No meals logged. Tap &quot;Log dinner&quot; to add one.
            </p>
          ) : (
            <ul className="space-y-2">
              {selectedMeals.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-2xl border border-[#D5D3C4] bg-[#F2EB8D] px-4 py-3"
                >
                  <div>
                    <span className="text-sm font-semibold text-[#1A1A1A]">
                      {m.note || m.recipe?.title || "Unknown"}
                    </span>
                    {m.tags?.length ? (
                      <div className="mt-1 flex gap-1">
                        {m.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-[#F5F3EB] px-2 py-0.5 text-[10px] font-medium text-[#A5B8A2]"
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
                      className="rounded-xl p-2 text-[#A5B8A2] transition hover:bg-[#F5F3EB]"
                      aria-label="Adjust recipe"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#A5B8A2]">
            Quick actions
          </p>
          <div className="flex flex-wrap gap-2">
            {lastSameWeekday && (
              <button
                onClick={handleReuseLastWeekday}
                className="rounded-full border border-[#D5D3C4] bg-[#F5F3EB] px-4 py-2 text-xs font-medium text-[#1A1A1A] transition hover:bg-[#F2EB8D]"
              >
                Reuse last {DAY_NAMES[selectedDate.getDay()]}&apos;s meal
              </button>
            )}
            <button
              onClick={() => openLogModal()}
              className="rounded-full border border-[#D5D3C4] bg-[#F5F3EB] px-4 py-2 text-xs font-medium text-[#1A1A1A] transition hover:bg-[#F2EB8D]"
            >
              Pick from favorites
            </button>
            <button
              onClick={() => openLogModal()}
              className="rounded-full border border-[#D5D3C4] bg-[#F5F3EB] px-4 py-2 text-xs font-medium text-[#1A1A1A] transition hover:bg-[#F2EB8D]"
            >
              Free-type a quick note
            </button>
          </div>
        </div>

        {/* Favorites */}
        {recipes.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#A5B8A2]">
                Favorites
              </p>
              <input
                type="text"
                value={favoritesSearch}
                onChange={(e) => setFavoritesSearch(e.target.value)}
                placeholder="Search..."
                className="w-28 rounded-xl border border-[#D5D3C4] bg-[#F5F3EB] px-3 py-1.5 text-xs text-[#1A1A1A] placeholder:text-[#B4B4B4] focus:border-[#A5B8A2] focus:outline-none"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {favorites.length === 0 ? (
                <p className="text-xs text-[#B4B4B4]">No matches.</p>
              ) : (
                favorites.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => openLogModal(r.id)}
                    className="flex-shrink-0 rounded-full border border-[#D5D3C4] bg-[#F5F3EB] px-4 py-2.5 text-xs font-medium text-[#1A1A1A] transition hover:bg-[#F2EB8D]"
                  >
                    {r.title}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* "I don't know what to make" button */}
      <div className="flex justify-center pb-16 sm:pb-0">
        <button
          onClick={() => setSurpriseOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-[#D5D3C4] bg-[#F2EB8D] px-6 py-3 text-sm font-medium text-[#1A1A1A] transition hover:bg-[#C5A37B]"
        >
          <Sparkles className="h-4 w-4" />
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
            className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#D5D3C4] bg-[#F5F3EB] px-5 py-2.5 text-xs font-medium text-[#1A1A1A] shadow-lg sm:bottom-6"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
