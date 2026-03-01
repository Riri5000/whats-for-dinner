"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { PantryStatus, RecipeIngredient } from "@/lib/types";
import { recalculateFrequencyRanks } from "./frequency";

const DEFAULT_USER_ID = process.env.NEXT_PUBLIC_DEFAULT_USER_ID ?? "00000000-0000-0000-0000-000000000001";

/** Count how many meal_history rows reference a recipe that contains this ingredient. */
function getMealCountForIngredientName(
  ingredientName: string,
  mealRecipeIds: string[],
  recipeIdToIngredients: Map<string, RecipeIngredient[]>
): number {
  const nameLower = ingredientName.toLowerCase();
  return mealRecipeIds.filter((recipeId) => {
    const ingredients = recipeIdToIngredients.get(recipeId) ?? [];
    return ingredients.some((i) => (i.name || "").toLowerCase() === nameLower);
  }).length;
}

/** Depletion model: I_exp = I_init - sum(R_meal * f_meal). We use discrete thresholds: 3 meals → Half, 5 → Low. */
function statusFromMealCount(mealCount: number, currentStatus: PantryStatus): PantryStatus {
  if (mealCount >= 5) return "Low";
  if (mealCount >= 3) return "Half";
  return currentStatus;
}

/** Build recipe_id -> ingredients[] and list of meal recipe_ids (one per meal). */
async function getMealAndRecipeData(
  supabase: ReturnType<typeof createSupabaseServerClient>
): Promise<{ mealRecipeIds: string[]; recipeIdToIngredients: Map<string, RecipeIngredient[]> }> {
  const { data: history } = await supabase.from("meal_history").select("recipe_id");
  const mealRecipeIds = ((history ?? []) as Array<{ recipe_id: string }>).map(
    (r) => r.recipe_id
  );
  const recipeIds = [...new Set(mealRecipeIds)];
  if (!recipeIds.length) return { mealRecipeIds: [], recipeIdToIngredients: new Map() };

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, ingredients")
    .in("id", recipeIds);
  const recipeIdToIngredients = new Map<string, RecipeIngredient[]>();
  for (const r of (recipes ?? []) as Array<{ id: string; ingredients: unknown }>) {
    recipeIdToIngredients.set(
      r.id,
      ((r.ingredients as RecipeIngredient[]) ?? []) as RecipeIngredient[]
    );
  }
  return { mealRecipeIds, recipeIdToIngredients };
}

/** Run depletion logic for all ingredients in the given recipe (by recipe_id). */
export async function runDepletionForRecipe(recipeId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generics
  const supabase = createSupabaseServerClient() as any;

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .select("ingredients")
    .eq("id", recipeId)
    .single();
  if (recipeError || !recipe?.ingredients?.length) return;

  const { mealRecipeIds, recipeIdToIngredients } = await getMealAndRecipeData(supabase);
  const ingredients = recipe.ingredients as RecipeIngredient[];
  const seenNames = new Set<string>();

  for (const ing of ingredients) {
    const name = (ing.name || "").trim();
    if (!name || seenNames.has(name.toLowerCase())) continue;
    seenNames.add(name.toLowerCase());

    // Use exact case-insensitive match by fetching candidates and filtering in-memory.
    // ilike with a bare string acts as an equality check in Postgres but we make
    // the intent explicit to avoid accidentally matching "oil" inside "olive oil".
    const { data: staples } = await supabase
      .from("pantry_staples")
      .select("id, name, status");
    if (!staples?.length) continue;

    const staple = (staples as Array<{ id: string; name: string; status: string }>).find(
      (s) => s.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (!staple) continue;
    const mealCount = getMealCountForIngredientName(
      staple.name,
      mealRecipeIds,
      recipeIdToIngredients
    );
    const newStatus = statusFromMealCount(mealCount, staple.status as PantryStatus);

    if (newStatus !== staple.status) {
      await supabase
        .from("pantry_staples")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", staple.id);
    }
  }
}

/** Log a meal as consumed and run the depletion engine. */
export async function logMealAsConsumed(
  recipeId: string,
  consumedAt?: Date,
  options?: { note?: string; tags?: string[] }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generics
  const supabase = createSupabaseServerClient() as any;
  const at = consumedAt ?? new Date();

  const { data: inserted, error } = await supabase
    .from("meal_history")
    .insert({
      recipe_id: recipeId,
      user_id: DEFAULT_USER_ID,
      consumed_at: at.toISOString(),
      note: options?.note ?? null,
      tags: options?.tags ?? [],
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  await runDepletionForRecipe(recipeId);
  await recalculateFrequencyRanks();
  return { ok: true, id: inserted?.id };
}
