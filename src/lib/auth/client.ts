import { createBrowserClient } from '@supabase/ssr';
import { type SupabaseClient } from '@supabase/supabase-js';

let client : ReturnType<typeof createBrowserClient> | undefined

// For client components
export async function getClient() :Promise<SupabaseClient>{
  if (client){
    return client;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}


