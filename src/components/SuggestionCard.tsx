"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Loader2 } from "lucide-react";
import type { Recipe, MealHistory, PantryStaple } from "@/lib/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getPantryStatusByName(staples: PantryStaple[], name: string): PantryStaple["status"] | null {
  const n = name.toLowerCase().trim();
  const found = staples.find((s) => s.name.toLowerCase().trim() === n);
  return found?.status ?? null;
}

function pantryCoverage(recipe: Recipe, staples: PantryStaple[]): { ok: number; total: number } {
  const essentials = recipe.ingredients?.filter((i) => i.is_essential) ?? [];
  if (!essentials.length) return { ok: 0, total: 0 };
  const ok = essentials.filter((i) => {
    const s = getPantryStatusByName(staples, i.name);
    return s === "Full" || s === "Half";
  }).length;
  return { ok, total: essentials.length };
}

interface SuggestionCardProps {
  selectedDate: Date;
  meals: Array<MealHistory & { recipe?: Recipe }>;
  recipes: Recipe[];
  staples: PantryStaple[];
  onLogMeal: (recipeId: string, at?: Date, opts?: { note?: string; tags?: string[] }) => Promise<void>;
}

export function SuggestionCard({
  selectedDate,
  meals,
  recipes,
  staples,
  onLogMeal,
}: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const suggestion = useMemo(() => {
    const dow = selectedDate.getDay();
    const dayName = DAY_NAMES[dow];
    const cutoff = new Date(selectedDate);
    cutoff.setDate(cutoff.getDate() - 14);

    const recentMeals = meals.filter((m) => new Date(m.consumed_at) >= cutoff);
    const countByRecipeOnDow = new Map<string, number>();
    const countByRecipeTotal = new Map<string, number>();
    const recipeById = new Map<string, Recipe>();

    for (const m of recentMeals) {
      if (!m.recipe || m.recipe.title === "Quick note") continue;
      const mDow = new Date(m.consumed_at).getDay();
      recipeById.set(m.recipe_id, m.recipe);
      countByRecipeTotal.set(
        m.recipe_id,
        (countByRecipeTotal.get(m.recipe_id) ?? 0) + 1
      );
      if (mDow === dow) {
        countByRecipeOnDow.set(
          m.recipe_id,
          (countByRecipeOnDow.get(m.recipe_id) ?? 0) + 1
        );
      }
    }

    const sameDow = [...countByRecipeOnDow.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({
        recipe_id: id,
        recipe: recipeById.get(id)!,
        count,
      }))
      .filter((x) => x.recipe);

    let primary: { recipe: Recipe; reason: string } | null = null;
    for (const v of sameDow) {
      const { ok, total } = pantryCoverage(v.recipe, staples);
      const pct = total ? ok / total : 1;
      if (pct >= 0.8) {
        primary = {
          recipe: v.recipe,
          reason: `You often have this on ${dayName}s. Cooked ${v.count}× in the last 2 weeks.`,
        };
        break;
      } else if (!primary) {
        primary = {
          recipe: v.recipe,
          reason: `Uses staples you're low on – consider restocking. Cooked ${v.count}× on ${dayName}s.`,
        };
      }
    }

    if (!primary && recipes.length > 0) {
      const byFreq = recipes
        .filter((r) => r.title !== "Quick note")
        .map((r) => {
          const count = meals.filter((m) => m.recipe_id === r.id).length;
          const { ok, total } = pantryCoverage(r, staples);
          return { recipe: r, count, ok, total };
        })
        .filter((r) => r.total === 0 || r.ok / r.total >= 0.8)
        .sort((a, b) => b.count - a.count);
      if (byFreq[0]) {
        primary = {
          recipe: byFreq[0].recipe,
          reason: `Cooked ${byFreq[0].count}× in recent history.`,
        };
      }
    }

    const alternatives: { recipe: Recipe; reason: string }[] = [];
    for (const v of sameDow.slice(0, 3)) {
      if (v.recipe.id !== primary?.recipe.id) {
        const { ok, total } = pantryCoverage(v.recipe, staples);
        alternatives.push({
          recipe: v.recipe,
          reason:
            total && ok / total < 0.8
              ? `Uses staples you're low on. Cooked ${v.count}×.`
              : `Cooked ${v.count}× on ${dayName}s.`,
        });
      }
    }
    for (const r of recipes) {
      if (r.title === "Quick note") continue;
      if (alternatives.length >= 5) break;
      if (alternatives.some((a) => a.recipe.id === r.id)) continue;
      if (primary?.recipe.id === r.id) continue;
      const count = meals.filter((m) => m.recipe_id === r.id).length;
      const { ok, total } = pantryCoverage(r, staples);
      alternatives.push({
        recipe: r,
        reason:
          total && ok / total < 0.8
            ? `Uses staples you're low on.`
            : `Cooked ${count}× in recent history.`,
      });
    }

    return { primary, alternatives };
  }, [selectedDate, meals, recipes, staples]);

  const handleLog = async (recipeId: string) => {
    setLoggingId(recipeId);
    await onLogMeal(recipeId, selectedDate);
    setLoggingId(null);
    setExpanded(false);
  };

  if (!suggestion.primary && suggestion.alternatives.length === 0) return null;

  const { primary, alternatives } = suggestion;
  const dow = mounted ? selectedDate.getDay() : 0;
  const dayName = DAY_NAMES[dow];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4"
    >
      {primary ? (
        <>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Suggestion for {dayName}
          </p>
          <p className="mt-1 text-sm font-medium">
            You often cook {primary.recipe.title} on {dayName}s. Want that again?
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{primary.reason}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleLog(primary.recipe.id)}
              disabled={!!loggingId}
              className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/15 disabled:opacity-50"
            >
              {loggingId === primary.recipe.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Yes"
              )}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800/80 px-4 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700/80"
            >
              Show alternatives
              <ChevronDown
                className={`h-3.5 w-3.5 transition ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500">
          Log a few meals to get personalized suggestions.
        </p>
      )}

      <AnimatePresence>
        {expanded && alternatives.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 space-y-2 border-t border-slate-800 pt-4"
          >
            {alternatives.slice(0, 5).map((alt) => (
              <div
                key={alt.recipe.id}
                className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{alt.recipe.title}</p>
                  <p className="text-[11px] text-slate-500">{alt.reason}</p>
                </div>
                <button
                  onClick={() => handleLog(alt.recipe.id)}
                  disabled={!!loggingId}
                  className="rounded-full border border-slate-600 bg-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-600/80 disabled:opacity-50"
                >
                  {loggingId === alt.recipe.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Log"
                  )}
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
