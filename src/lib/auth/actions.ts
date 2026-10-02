'use server';
import { type User as SupabaseUser } from '@supabase/auth-js';
import { getClient } from "@/lib/auth/server";
import { TestUser, type User } from "@/lib/auth/user";
import { AppAuthError, toAppAuthError } from "@/lib/auth/appAuthError";
import { redirect } from "next/navigation";


// All return this type:
type AuthData = {
    user: User | null;
    error: AppAuthError;
}

/**
 * Authenticates an existing user using email and password credentials.
 */
export async function loginWithPassword(email: string, password: string): Promise<AuthData> {
    const supabase = await getClient();

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) return { user: null, error: toAppAuthError(error) };
    return await getAppUserFromSupabaseUser(data.user);
}

/**
 * registers a user using email and password.
 */
export async function registerUser(email: string, password: string): Promise<AuthData> {
    const supabase = await getClient();
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/`
        },
    });
    if (error) return { user: null, error: toAppAuthError(error) };
    return await getAppUserFromSupabaseUser(data.user);
}

/**
 * Signs out the currently authenticated user and clears session tokens.
 */
export async function logOut() {
    const supabase = await getClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isAnonymous = user?.is_anonymous === true;

    if (isAnonymous) return;
    await supabase.auth.signOut({ scope: "local" });
    //redirect('/login')
}

/**
 * Fetches the currently authenticated user from Supabase auth state.
 * Uses getUser() to validate the JWT token against the server.
 */
export async function getCurrentUser(): Promise<AuthData> {
    if (process.env.ACCESS_MODE_DEBUG==="true") {
        return {user:TestUser, error:AppAuthError.Ok} ;
}

    const supabase = await getClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) return { user: null, error: toAppAuthError(error) };
    return await getAppUserFromSupabaseUser(data.user);
}


/**
 * Ensures a session exists by returning the active user or creating an anonymous session.
 */
export async function ensureAnonymousSession(): Promise<AuthData> {
    const supabase = await getClient();
    
    {
        const { data, error } = await supabase.auth.getUser()
        
        // await supabase.auth.refreshSession();
        if (data.user) {
            if (error) return { user: null, error: toAppAuthError(error) };
            return await getAppUserFromSupabaseUser(data.user);
        }
    }

    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) return { user: null, error: toAppAuthError(error) };
    return await getAppUserFromSupabaseUser(data.user);
}


export async function sendRecoveryEmail(email:string): Promise<AuthData>  {
    const supabase = await getClient();
    const {error} = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/recovery`,
    });
    return {user: null, error: toAppAuthError(error) }
}

export async function updatePassword(password: string): Promise<AuthData>  {
    const supabase = await getClient();
    const { error } = await supabase.auth.updateUser({ password, });
    return {user:null, error:toAppAuthError(error)};
}


export async function isAdmin() : Promise<boolean>{
    if (process.env.ACCESS_MODE_DEBUG==="true") return true ;

    const supabase = await getClient();
    const { data, error } = await supabase.auth.getUser();

    if (toAppAuthError(error) !== AppAuthError.Ok || !data.user) {
        return false
    }

    const adminRes = await supabase
        .from("varroa_admins")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (adminRes.error) {
        return false
    };
    // NOTE: Burde sjekke om brukeren eksisterer ellers også...
    return true
}


/** Gives you the app-specific information on a user from the supabase auth user type.*/
async function getAppUserFromSupabaseUser(authUser: SupabaseUser | null): Promise<AuthData> {
    const supabase = await getClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
        return { user: null, error: toAppAuthError(error) };
    }

    const userRes = await supabase
        .from("varroa_users")
        .select("*")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (userRes.error) {
        return { user: null, error: toAppAuthError(error) };
    };

    const user = {
        user_id: "",
        email: null,
        created_at: "",
        last_sign_in_at: null,
        role: null,
        role_created_at: null,
        expires_at: null,
        banned_at: null,
    }

    return { user: user, error: toAppAuthError(error) };
}