import { type User as SupabaseUser } from '@supabase/auth-js';
import { getClient } from "@/lib/auth/supabase.client";
import { type User } from "@/lib/auth/user";
import { AppAuthError, toAppAuthError } from "@/lib/auth/appAuthError";
import { getUserRoleExtended } from '../varroaScanDb';
import { AuthData } from './authData';
import { getAppUserFromSupabaseUser } from './actions.server';

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
    return await getAppUserFromSupabaseUser();
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
    // TODO: add to varroa_user_roles


    if (error) return { user: null, error: toAppAuthError(error) };
    return await getAppUserFromSupabaseUser();
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

// export async function isAnonymous(): Promise<boolean> {
//     const supabase = await getClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     const isAnonymous = user?.is_anonymous === true;
//     return isAnonymous;
// }






export async function sendRecoveryEmail(email: string): Promise<AuthData> {
    const supabase = await getClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/recovery`,
    });
    console.log("recovery redirectTo: ", `${process.env.NEXT_PUBLIC_SITE_URL}/recovery`);
    return { user: null, error: toAppAuthError(error) }
}

/**
 * Server action that updates a users password
 * @param password 
 * @returns Promise\<AuthData>
 */
export async function updatePassword(password: string): Promise<AuthData> {
    const supabase = await getClient();
    const { error } = await supabase.auth.updateUser({ password, });
    return { user: null, error: toAppAuthError(error) };
}