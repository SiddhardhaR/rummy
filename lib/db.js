"use client";

import { supabase } from "./auth";
import { isSupabaseConfigured } from "./auth";

export async function upsertUserProfile(user) {
  if (!user) return null;
  if (!isSupabaseConfigured()) return user;

  const displayName =
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "Player";

  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        id: user.id,
        email: user.email,
        display_name: displayName
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
