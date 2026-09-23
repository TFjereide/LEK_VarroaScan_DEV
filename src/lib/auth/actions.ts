'use server';
import { getClient} from "@/lib/auth/server";


/**
 * Authenticates an existing user using email and password credentials.
 */
export async function loginWithPassword(email:string, password:string){
    const supabase = await getClient();

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error){
        console.error(error);
        return;
    }

  return data.user;
}

/**
 * Signs out the currently authenticated user and clears session tokens.
 */
export async function logout(){
    const supabase = await getClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error(error);
    };
}

/**
 * Fetches the currently authenticated user from Supabase auth state.
 * Uses getUser() to validate the JWT token against the server.
 */
export async function getCurrentUser(){
    const supabase = await getClient();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error) return null;
    return user;
}

/**
 * Ensures a session exists by returning the active user or creating an anonymous session.
 */
export async function ensureAnonymousSession(){
    const supabase = await getClient();

    const {
    data: { user },
    } = await supabase.auth.getUser()

    if (user) {
        return user
    }

    const {
        data,
        error,
    } = await supabase.auth.signInAnonymously()

    if (error) {
        throw error
    }

    return data.user
}
