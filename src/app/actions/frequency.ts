"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { RecipeIngredient } from "@/lib/types";

/** S_f = Total Count in Recipes × Consumption Frequency in History */
export async function recalculateFrequencyRanks() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generics mismatch
  const supabase = createSupabaseServerClient() as any;

  const { data: staples } = await supabase.from("pantry_staples").select("id, name");
  if (!staples?.length) return;

  const { data: recipes } = await supabase.from("recipes").select("id, ingredients");
  const { data: history } = await supabase.from("meal_history").select("recipe_id");

  const recipeMap = new Map<string, RecipeIngredient[]>();
  for (const r of (recipes ?? []) as Array<{ id: string; ingredients: unknown }>) {
    recipeMap.set(r.id, (r.ingredients as RecipeIngredient[]) ?? []);
  }

  const mealRecipeIds = ((history ?? []) as Array<{ recipe_id: string }>).map(
    (m) => m.recipe_id
  );

  for (const staple of staples) {
    const name = staple.name.toLowerCase().trim();
    if (!name) continue;

    let totalRecipes = 0;
    for (const ingredients of recipeMap.values()) {
      if (
        ingredients.some((i) => (i.name || "").toLowerCase().trim() === name)
      ) {
        totalRecipes += 1;
      }
    }

    const consumption = mealRecipeIds.filter((recipeId) => {
      const ingredients = recipeMap.get(recipeId) ?? [];
      return ingredients.some(
        (i) => (i.name || "").toLowerCase().trim() === name
      );
    }).length;

    const score = totalRecipes * consumption;

    await supabase
      .from("pantry_staples")
      .update({ frequency_rank: score })
      .eq("id", staple.id);
  }
}
