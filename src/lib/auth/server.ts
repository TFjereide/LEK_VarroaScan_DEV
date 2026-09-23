import { createServerClient} from '@supabase/ssr';
import { type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

let client: ReturnType<typeof createServerClient> | undefined

export async function getClient(): Promise<SupabaseClient>{
    if (client) {
        return client;
    }
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },

                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options)
                        })
                    } catch {
                        // Server Components can't always write cookies.
                        // The proxy handles refreshing the session.
                    }
                },
            },
        },
    )
}