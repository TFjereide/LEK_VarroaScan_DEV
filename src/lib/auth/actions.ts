'use server';
import { AuthError, type User } from '@supabase/auth-js';
import { getClient } from "@/lib/auth/server";
import { toAppAuthError, type AppAuthError  } from "@/lib/auth/appAuthError";


type AuthData = {
    user: User | null;
    error: AppAuthError | null;
}


/**
 * Authenticates an existing user using email and password credentials.
 */
export async function loginWithPassword(email: string, password: string) :Promise<AuthData> {
    const supabase = await getClient();

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    return {user: data.user, error:null};
}

/**
 * registers a user using email and password.
 */
export async function registerUser(email: string, password: string):Promise<AuthData>  {
    const supabase = await getClient();
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/`,
            data: {},
        },
    });
    return { user:data.user, error: toAppAuthError(error)};
}


/**
 * Signs out the currently authenticated user and clears session tokens.
 */
export async function logout() {
    const supabase = await getClient();
    const { error } = await supabase.auth.signOut();
    
    return { user: null, error: toAppAuthError(error)};
}

/**
 * Fetches the currently authenticated user from Supabase auth state.
 * Uses getUser() to validate the JWT token against the server.
 */
export async function getCurrentUser():Promise<AuthData>  {
    const supabase = await getClient();
    const {data,error} = await supabase.auth.getUser();
    return { user: data.user, error: toAppAuthError(error)};
}

/**
 * Ensures a session exists by returning the active user or creating an anonymous session.
 */
export async function ensureAnonymousSession():Promise<AuthData>  {
    const supabase = await getClient();
    {
        const {data, error} = await supabase.auth.getUser()

        if (data.user) {
            return { user: data.user, error: toAppAuthError(error)};
        }
    }

    const {data,error} = await supabase.auth.signInAnonymously()    
    return { user:data.user, error: toAppAuthError(error)};
}
