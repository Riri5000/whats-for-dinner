"use server";

import OpenAI from "openai";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { RecipeIngredient } from "@/lib/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ScrapedRecipe {
  title: string;
  instructions: string;
  ingredients: RecipeIngredient[];
}

/** Fetch URL content and use GPT-4o-mini to extract recipe as JSON. */
export async function scrapeRecipeFromUrl(url: string): Promise<{ ok: true; recipe: ScrapedRecipe } | { ok: false; error: string }> {
  if (!process.env.OPENAI_API_KEY) return { ok: false, error: "OPENAI_API_KEY not set" };

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RecipeBot/1.0)" },
    });
    if (!res.ok) return { ok: false, error: `Fetch failed: ${res.status}` };
    html = await res.text();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to fetch URL" };
  }

  const prompt = `Extract the recipe from this web page. Return a single JSON object (no markdown, no code fence) with:
- title: string
- instructions: string (full instructions, can be multi-line)
- ingredients: array of { "name": string, "qty": number or null, "unit": string or null, "is_essential": boolean }
  Use is_essential: true for core ingredients, false for garnishes, optional toppings, or vanity items.

Page content (first 12000 chars):
${html.slice(0, 12000)}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return { ok: false, error: "Empty response from OpenAI" };

    const parsed = JSON.parse(raw) as ScrapedRecipe;
    if (!parsed.title || !Array.isArray(parsed.ingredients)) {
      return { ok: false, error: "Invalid recipe structure" };
    }
    parsed.instructions = parsed.instructions ?? "";
    parsed.ingredients = (parsed.ingredients ?? []).map((i: Record<string, unknown>) => ({
      name: String(i.name ?? ""),
      qty: typeof i.qty === "number" ? i.qty : null,
      unit: i.unit != null ? String(i.unit) : null,
      is_essential: Boolean(i.is_essential ?? true),
    })) as RecipeIngredient[];
    return { ok: true, recipe: parsed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "OpenAI request failed" };
  }
}

/** Save recipe to Supabase and optionally ensure pantry_staples rows for each ingredient. */
export async function saveRecipe(recipe: ScrapedRecipe, sourceUrl: string | null) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recipes")
    .insert({
      title: recipe.title,
      instructions: recipe.instructions,
      ingredients: recipe.ingredients,
      source_url: sourceUrl,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  for (const ing of recipe.ingredients) {
    const name = (ing.name || "").trim();
    if (!name) continue;
    const { error } = await supabase.from("pantry_staples").insert({
      name,
      status: "Full",
    });
    if (error?.code === "23505") continue;
  }

  return { ok: true, id: data?.id };
}
