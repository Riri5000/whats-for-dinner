"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Loader2, Scissors, Save, ArrowLeft } from "lucide-react";
import { scrapeRecipeFromUrl, saveRecipe, type ScrapedRecipe } from "@/app/actions/import-recipe";
import type { RecipeIngredient } from "@/lib/types";

export default function ImportPage() {
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<ScrapedRecipe | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const [prunedIndices, setPrunedIndices] = useState<Set<number>>(new Set());

  const toggleIngredient = (index: number) => {
    setPrunedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleScrape = async () => {
    if (!url.trim()) return;
    setScraping(true);
    setScrapeError(null);
    setRecipe(null);
    setPrunedIndices(new Set());
    const result = await scrapeRecipeFromUrl(url.trim());
    setScraping(false);
    if (result.ok) setRecipe(result.recipe);
    else setScrapeError(result.error);
  };

  const getFinalIngredients = (): RecipeIngredient[] => {
    if (!recipe) return [];
    return recipe.ingredients.filter((_, i) => !prunedIndices.has(i));
  };

  const handleSave = async () => {
    if (!recipe) return;
    setSaving(true);
    setSaveResult(null);
    const ingredients = getFinalIngredients();
    const result = await saveRecipe(
      { ...recipe, ingredients },
      url.trim() || null
    );
    setSaving(false);
    setSaveResult(result.ok ? { ok: true } : { ok: false, error: result.error });
    if (result.ok) {
      setRecipe(null);
      setUrl("");
      setPrunedIndices(new Set());
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 py-2">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full border border-slate-700/80 p-2 text-slate-400 transition hover:bg-slate-800/80 hover:text-slate-200"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300/80">
              Recipe Importer
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Paste URL → prune vanity ingredients → save
            </h1>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Recipe URL
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 rounded-xl border border-slate-700/80 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
            <button
              onClick={handleScrape}
              disabled={scraping || !url.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/15 disabled:opacity-50"
            >
              {scraping ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Link2 className="h-3.5 w-3.5" />
              )}
              {scraping ? "Scraping…" : "Scrape with AI"}
            </button>
          </div>
          {scrapeError && (
            <p className="text-xs text-amber-400">{scrapeError}</p>
          )}
        </div>

        <AnimatePresence mode="wait">
          {recipe && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4"
            >
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Tweet-sized pruner — click a tag to remove it from the recipe
              </p>
              <h2 className="text-lg font-semibold tracking-tight">{recipe.title}</h2>
              <div className="flex flex-wrap gap-2">
                {recipe.ingredients.map((ing, index) => {
                  const removed = prunedIndices.has(index);
                  return (
                    <motion.button
                      key={index}
                      type="button"
                      onClick={() => toggleIngredient(index)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        removed
                          ? "border-slate-700/60 bg-slate-800/40 text-slate-500 line-through"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      {removed ? (
                        <Scissors className="h-3 w-3" />
                      ) : null}
                      {ing.name}
                      {ing.is_essential ? (
                        <span className="text-[10px] text-slate-500">essential</span>
                      ) : null}
                    </motion.button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500">
                {prunedIndices.size} removed · {getFinalIngredients().length} will be saved
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save recipe
                </button>
              </div>
              {saveResult && (
                <p className={saveResult.ok ? "text-xs text-emerald-400" : "text-xs text-amber-400"}>
                  {saveResult.ok ? "Saved. Add more or go back to Dashboard." : saveResult.error}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
