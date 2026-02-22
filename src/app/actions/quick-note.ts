"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

const QUICK_NOTE_TITLE = "Quick note";

/** Get or create the special "Quick note" recipe for free-form meal logs. */
export async function getOrCreateQuickNoteRecipeId(): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generics
  const supabase = createSupabaseServerClient() as any;

  const { data: existing } = await supabase
    .from("recipes")
    .select("id")
    .eq("title", QUICK_NOTE_TITLE)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: inserted, error } = await supabase
    .from("recipes")
    .insert({
      title: QUICK_NOTE_TITLE,
      instructions: "",
      ingredients: [],
      source_url: null,
    })
    .select("id")
    .single();

  if (error) return null;
  return inserted?.id ?? null;
}
