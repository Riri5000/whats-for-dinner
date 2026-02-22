"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { RecipeIngredient } from "@/lib/types";
import { recalculateFrequencyRanks } from "./frequency";

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
    const rawIngredients = Array.isArray(parsed.ingredients)
      ? (parsed.ingredients as unknown[])
      : [];
    parsed.ingredients = rawIngredients.map((raw) => {
      const i = raw as { [key: string]: unknown };

      const nameValue = i.name as string | undefined;
      const name = (nameValue ?? "Unknown Ingredient").trim();

      const qtyValue = i.qty as unknown;
      let qty: number | null = null;
      if (typeof qtyValue === "number") {
        qty = qtyValue;
      } else if (
        typeof qtyValue === "string" &&
        qtyValue.trim() !== "" &&
        !Number.isNaN(Number(qtyValue))
      ) {
        qty = Number(qtyValue);
      }

      const unitRaw = i.unit as unknown;
      const unit =
        unitRaw != null && String(unitRaw).trim() !== ""
          ? String(unitRaw).trim()
          : null;

      const isEssentialRaw = i.is_essential as unknown;
      const is_essential =
        typeof isEssentialRaw === "boolean" ? isEssentialRaw : true;

      return {
        name,
        qty,
        unit,
        is_essential,
      } satisfies RecipeIngredient;
    }) as RecipeIngredient[];
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generics
  const { data, error } = await (supabase as any)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generics
    const { error: stapleError } = await (supabase as any)
      .from("pantry_staples")
      .insert({
        name,
        status: "Full",
      });
    if (stapleError?.code === "23505") continue;
  }

  await recalculateFrequencyRanks();
  return { ok: true, id: data?.id };
}
