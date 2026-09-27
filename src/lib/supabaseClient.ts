import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (supabase) return supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // GAMMEL: leste feil variabelnavn, matchet ikke .env, ga alltid null
  // const pubkey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; // dette fantes ikke i .env
  const pubkey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !pubkey) return null;

  supabase = createClient(url, pubkey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabase;
}