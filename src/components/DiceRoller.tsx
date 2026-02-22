"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, CheckCircle2, ShoppingBag } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Recipe, PantryStaple } from "@/lib/types";
import { logMealAsConsumed } from "@/app/actions/meals";

type DiceState = "idle" | "rolling" | "locked";

interface DiceRollerProps {
  onRoll?: (recipe: Recipe | null) => void;
}

function getPantryStatusByName(staples: PantryStaple[], name: string): PantryStaple["status"] | null {
  const n = name.toLowerCase().trim();
  const found = staples.find((s) => s.name.toLowerCase().trim() === n);
  return found?.status ?? null;
}

function pickRecipeWeighted(
  recipes: Recipe[],
  staples: PantryStaple[]
): Recipe | null {
  const scored = recipes
    .map((r) => {
      const essentials = r.ingredients.filter((i) => i.is_essential);
      if (!essentials.length) return null;
      const available = essentials.filter((i) => {
        const status = getPantryStatusByName(staples, i.name);
        return status === "Full" || status === "Half";
      });
      const ratio = available.length / essentials.length;
      if (ratio < 0.8) return null;
      return { recipe: r, weight: ratio };
    })
    .filter(Boolean) as { recipe: Recipe; weight: number }[];

  if (!scored.length) return null;

  const totalWeight = scored.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of scored) {
    if (roll < entry.weight) return entry.recipe;
    roll -= entry.weight;
  }

  return scored[0]?.recipe ?? null;
}

export function DiceRoller({ onRoll }: DiceRollerProps) {
  const [diceState, setDiceState] = useState<DiceState>("idle");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [staples, setStaples] = useState<PantryStaple[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [logStatus, setLogStatus] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [logError, setLogError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseClient();
    setLoadError(null);
    const [rRes, sRes] = await Promise.all([
      supabase.from("recipes").select("id, title, instructions, ingredients, source_url"),
      supabase.from("pantry_staples").select("id, name, status, last_restocked"),
    ]);
    if (rRes.error) setLoadError(rRes.error.message);
    else setRecipes((rRes.data ?? []) as Recipe[]);
    if (sRes.error) setLoadError(sRes.error.message);
    else setStaples((sRes.data ?? []) as PantryStaple[]);
  }, []);

  useEffect(() => {
    // Data-fetching effect; we intentionally call setState here to hydrate from Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleRoll = async () => {
    if (diceState === "rolling") return;
    setDiceState("rolling");
    setLogStatus("idle");
    setLogError(null);

    await new Promise((resolve) => setTimeout(resolve, 900));

    const recipe = pickRecipeWeighted(recipes, staples);
    setSelectedRecipe(recipe);
    onRoll?.(recipe ?? null);
    setDiceState("locked");
    setTimeout(() => setDiceState("idle"), 800);
  };

  const handleLogConsumed = async () => {
    if (!selectedRecipe) return;
    setLogStatus("pending");
    setLogError(null);
    const result = await logMealAsConsumed(selectedRecipe.id);
    if (result.ok) {
      setLogStatus("done");
      await loadData();
    } else {
      setLogStatus("error");
      setLogError(result.error ?? "Failed to log");
    }
  };

  const isRolling = diceState === "rolling";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
            Tonight&apos;s move
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Roll the pantry dice
          </h1>
          <p className="max-w-md text-sm text-slate-400">
            We only surface meals your staples can already cover – at least{" "}
            <span className="font-semibold text-emerald-300">80%</span> of
            essentials in-stock.
          </p>
        </div>
        <button
          onClick={handleRoll}
          disabled={isRolling}
          className="group inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-100 shadow-[0_0_40px_-24px] shadow-emerald-400/80 transition hover:border-emerald-400 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRolling ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking like an inventory clerk…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
              Roll for dinner
            </>
          )}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex items-center justify-center">
          <motion.div
            className="relative h-40 w-40 [perspective:800px] sm:h-48 sm:w-48"
            initial={false}
            animate={
              isRolling
                ? {
                    rotateX: [0, 360],
                    rotateY: [0, 540],
                    rotateZ: [0, 180],
                  }
                : { rotateX: 24, rotateY: -32, rotateZ: 0 }
            }
            transition={
              isRolling
                ? {
                    duration: 0.9,
                    ease: [0.16, 1, 0.3, 1],
                  }
                : {
                    type: "spring",
                    stiffness: 60,
                    damping: 12,
                  }
            }
          >
            <motion.div
              className="absolute inset-0 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 shadow-[0_40px_120px_-40px_rgba(16,185,129,0.85)] ring-1 ring-emerald-400/40 [transform-style:preserve-3d]"
              whileHover={{
                translateZ: 16,
              }}
            >
              <div className="absolute inset-3 rounded-2xl bg-slate-900/80 ring-1 ring-slate-700/80" />
              <div className="absolute inset-0 flex items-center justify-center [transform:translateZ(32px)]">
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <motion.span
                      key={i}
                      className="h-2 w-2 rounded-full bg-emerald-300/80 shadow-[0_0_12px_rgba(52,211,153,0.75)]"
                      animate={
                        isRolling
                          ? {
                              scale: [1, 0.3, 1.1, 1],
                              opacity: [0.4, 1, 0.8, 1],
                            }
                          : { scale: 1, opacity: 0.9 }
                      }
                      transition={{
                        repeat: isRolling ? Infinity : 0,
                        duration: 0.9,
                        ease: "easeInOut",
                        delay: (i % 3) * 0.09,
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <div className="flex flex-col justify-center gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-inner shadow-slate-950/80">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
            Tonight we suggest
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRecipe?.id ?? "empty"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-2"
            >
              {selectedRecipe ? (
                <>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {selectedRecipe.title}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Essentials it assumes:{" "}
                    <span className="font-medium text-emerald-200">
                      {
                        selectedRecipe.ingredients.filter(
                          (i) => i.is_essential
                        ).length
                      }{" "}
                      pantry staples
                    </span>
                    .
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={handleLogConsumed}
                      disabled={logStatus === "pending"}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700/80 disabled:opacity-60"
                    >
                      {logStatus === "pending" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : logStatus === "done" ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <ShoppingBag className="h-3 w-3" />
                      )}
                      {logStatus === "done" ? "Logged" : "Log as consumed"}
                    </button>
                    {logError && (
                      <p className="mt-1 text-[11px] text-red-400">{logError}</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400">
                  Roll once and we&apos;ll only surface meals your pantry can
                  already support. No manual checking. No spreadsheet.
                </p>
              )}
            </motion.div>
          </AnimatePresence>
          {loadError && (
            <p className="text-[11px] text-amber-400">{loadError}</p>
          )}
          <p className="text-[11px] text-slate-500">
            Recipes and pantry from Supabase. Logging a meal runs the depletion
            engine (3 meals → Half, 5 → Low).
          </p>
        </div>
      </div>
    </div>
  );
}
