"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { RecipeIngredient } from "@/lib/types";
import { recalculateFrequencyRanks } from "./frequency";
import { runDepletionForRecipe } from "./meals";

/** Update recipe ingredients (tweet-style editor). Recalculates frequency and depletion. */
export async function updateRecipeIngredients(
  recipeId: string,
  ingredients: RecipeIngredient[]
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generics
  const supabase = createSupabaseServerClient() as any;

  const { data: existing } = await supabase
    .from("recipes")
    .select("edit_count")
    .eq("id", recipeId)
    .single();

  const editCount = ((existing as { edit_count?: number })?.edit_count ?? 0) + 1;

  const { error } = await supabase
    .from("recipes")
    .update({ ingredients, edit_count: editCount })
    .eq("id", recipeId);

  if (error) return { ok: false, error: error.message };

  await recalculateFrequencyRanks();
  await runDepletionForRecipe(recipeId);
  return { ok: true };
}
