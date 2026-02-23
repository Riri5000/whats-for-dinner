"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { RecipeIngredient } from "@/lib/types";

export async function getShoppingList() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseServerClient() as any;
  const { data, error } = await supabase
    .from("shopping_list_items")
    .select("*")
    .order("added_at", { ascending: false });
  if (error) return { ok: false as const, error: error.message, items: [] };
  return { ok: true as const, items: data ?? [] };
}

export async function addShoppingItem(name: string, qty?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseServerClient() as any;
  const { error } = await supabase.from("shopping_list_items").insert({
    name: name.trim(),
    qty: qty?.trim() || null,
    checked: false,
    recipe_id: null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function addRecipeIngredientsToShoppingList(
  recipeId: string,
  ingredients: RecipeIngredient[]
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseServerClient() as any;
  const items = ingredients.map((ing) => ({
    name: ing.name.trim(),
    qty: ing.qty != null && ing.unit ? `${ing.qty} ${ing.unit}` : ing.qty != null ? String(ing.qty) : ing.unit || null,
    checked: false,
    recipe_id: recipeId,
  }));
  const { error } = await supabase.from("shopping_list_items").insert(items);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function toggleShoppingItem(id: string, checked: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseServerClient() as any;
  const { error } = await supabase
    .from("shopping_list_items")
    .update({ checked })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function removeShoppingItem(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseServerClient() as any;
  const { error } = await supabase
    .from("shopping_list_items")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function clearCheckedItems() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseServerClient() as any;
  const { error } = await supabase
    .from("shopping_list_items")
    .delete()
    .eq("checked", true);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
