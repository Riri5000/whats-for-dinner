"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { RecipeIngredient } from "@/lib/types";

const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

export interface ScrapedRecipe {
  title: string;
  instructions: string;
  ingredients: RecipeIngredient[];
}

/** Fetch URL content and use Gemini to extract recipe as JSON. */
export async function scrapeRecipeFromUrl(
  url: string
): Promise<{ ok: true; recipe: ScrapedRecipe } | { ok: false; error: string }> {
  if (!geminiApiKey || !genAI) {
    return { ok: false, error: "GOOGLE_GENERATIVE_AI_API_KEY not set" };
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RecipeBot/1.0)" },
    });
    if (!res.ok) return { ok: false, error: `Fetch failed: ${res.status}` };
    html = await res.text();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to fetch URL",
    };
  }

  const prompt = `Extract the recipe from this web page. Return a single JSON object (no markdown, no code fence) with:
- title: string
- instructions: string (full instructions, can be multi-line)
- ingredients: array of { "name": string, "qty": number or null, "unit": string or null, "is_essential": boolean }
  Use is_essential: true for core ingredients, false for garnishes, optional toppings, or vanity items.

Page content (first 12000 chars):
${html.slice(0, 12000)}`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    if (!raw) return { ok: false, error: "Empty response from Gemini" };

    const parsed = JSON.parse(raw) as ScrapedRecipe;
    if (!parsed.title || !Array.isArray(parsed.ingredients)) {
      return { ok: false, error: "Invalid recipe structure" };
    }
    parsed.instructions = parsed.instructions ?? "";
// We use rawIngredients just to be 100% safe for the .map()
const rawIngredients = Array.isArray(parsed.ingredients) ? parsed.ingredients : [];    
  
parsed.ingredients = rawIngredients.map((i: any) => ({
  name: String(i.name ?? "Unknown Ingredient").trim(),
  // Try to parse a number even if Gemini returns it as a string "2"
  qty: typeof i.qty === "number" ? i.qty : (parseFloat(i.qty) || null),
  unit: i.unit ? String(i.unit).trim() : null,
  is_essential: i.is_essential !== undefined ? Boolean(i.is_essential) : true
}));
    return { ok: true, recipe: parsed };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gemini request failed",
    };
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
    const { error: stapleError } = await supabase.from("pantry_staples").insert({
      name,
      status: "Full",
    });
    if (stapleError?.code === "23505") continue;
  }

  return { ok: true, id: data?.id };
}
