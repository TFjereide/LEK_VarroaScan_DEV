'use server';
import { type User as SupabaseUser } from '@supabase/auth-js';
import { getClient } from "@/lib/auth/supabase.server";
import { type User } from "@/lib/auth/user";
import { AppAuthError, toAppAuthError } from "@/lib/auth/appAuthError";
import { getUserRoleExtended } from '../varroaScanDb';
import { AuthData } from './authData';


// TODO: https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac


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
            return await getAppUserFromSupabaseUser();
        }
    }

    const {error } = await supabase.auth.signInAnonymously()
    if (error) return { user: null, error: toAppAuthError(error) };
    return await getAppUserFromSupabaseUser();
}


/**
 * Fetches the currently authenticated user from Supabase auth state.
 * Uses getUser() to validate the JWT token against the server.
 */
export async function getCurrentUser(): Promise<AuthData> {
    return await getAppUserFromSupabaseUser();
}


/**
 *  Server action that checks if the current user is an admin in the system or not
 * @returns Promise\<boolean>
 */
// export async function isAdmin(): Promise<boolean> {
//     // if (process.env.ACCESS_MODE_DEBUG === "true") return true;

//     const supabase = await getClient();
//     const { data, error } = await supabase.auth.getUser();

//     if (toAppAuthError(error) !== AppAuthError.Ok || !data.user) {
//         return false
//     }
//     const {user, error:aError} = await getAppUserFromSupabaseUser();

//     if (!user || aError !== AppAuthError.Ok){
//         return false
//     }


//     if( user.role === "FAGANSVARLIG" || user.role === "STUDENT" || user.role === "SUPERADMIN"){
//         return true
//     }

//     // NOTE: Burde sjekke om brukeren eksisterer ellers også...
//     return false;
// }


/** 
 * Gives you the app-specific information on a user from the supabase auth user type.
 * */
export async function getAppUserFromSupabaseUser(): Promise<AuthData> {
    const supabase = await getClient();
    const { data: { user:authUser } } = await supabase.auth.getUser();
    
    if (authUser == null || authUser.id.length === 0)
        return { user: null, error: AppAuthError.InvalidCredentials };

    const userRole = await getUserRoleExtended(supabase, authUser.id)

    if (!userRole) {
        return { user: null, error: AppAuthError.NotFound };
    };
    const finalUser: User = {
        user_id: authUser.id,
        email: authUser.email ?? "",
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at === undefined ? null : authUser.last_sign_in_at,
        role: userRole.role,
        role_created_at: userRole.created_at,
        expires_at: userRole.expires_at,
        banned_at: userRole.banned_at,
    }

    return { user: finalUser, error: AppAuthError.Ok };
}