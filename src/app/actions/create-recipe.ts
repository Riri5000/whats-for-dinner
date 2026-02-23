"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { RecipeIngredient } from "@/lib/types";
import { recalculateFrequencyRanks } from "./frequency";

/** Create a new recipe manually with a title, ingredients, and optional instructions.
 *  Also ensures each ingredient exists in pantry_staples for frequency tracking. */
export async function createRecipeManually(
  title: string,
  ingredients: RecipeIngredient[],
  instructions?: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseServerClient() as any;

  const { data, error } = await supabase
    .from("recipes")
    .insert({
      title: title.trim(),
      instructions: instructions?.trim() || "",
      ingredients,
      source_url: null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  // Ensure each ingredient has a pantry_staples row for frequency tracking
  for (const ing of ingredients) {
    const name = (ing.name || "").trim();
    if (!name) continue;
    const { error: stapleError } = await supabase
      .from("pantry_staples")
      .insert({ name, status: "Full" });
    // 23505 = unique_violation, ingredient already exists
    if (stapleError?.code === "23505") continue;
  }

  await recalculateFrequencyRanks();
  return { ok: true, id: data?.id };
}
