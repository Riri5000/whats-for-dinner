"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

/** Mark a staple as stocked / "Got it" – deprioritizes it for the next week. */
export async function markStapleAsStocked(stapleId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generics
  const supabase = createSupabaseServerClient() as any;
  const { error } = await supabase
    .from("pantry_staples")
    .update({
      status: "Full",
      marked_stocked_at: new Date().toISOString(),
      last_restocked: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", stapleId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
