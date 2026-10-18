'use server';
import { type User as SupabaseUser } from '@supabase/auth-js';
import { getClient } from "@/lib/auth/server";
import { TestUser, type User } from "@/lib/auth/user";
import { AppAuthError, toAppAuthError } from "@/lib/auth/appAuthError";
import { AppRole, validRoles } from './roles';


// All return this type:
export type AuthData = {
    user: User;
    error: 'ok';
}|{
    user: null;
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
    console.log("Was signed in.")
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
    // TODO: add to varroa_user_roles


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
 * Server action that checks if a user is an anonymous user or not.
 * @returns Promise\<boolean>
 */
// export async function isAnonymous(): Promise<boolean> {
//     const supabase = await getClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     const isAnonymous = user?.is_anonymous === true;
//     return isAnonymous;
// }

/**
 * Fetches the currently authenticated user from Supabase auth state.
 * Uses getUser() to validate the JWT token against the server.
 */
export async function getCurrentUser(): Promise<AuthData> {
    // if (process.env.ACCESS_MODE_DEBUG === "true") {
    //     return { user: TestUser, error: AppAuthError.Ok };
    // }

    const supabase = await getClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) return { user: null, error: toAppAuthError(error) };
    return await getAppUserFromSupabaseUser(data.user);
}

/**
 * Ensures a session exists by returning the active user or creating an anonymous session.
 */
export async function ensureAnonymousSession(): Promise<AuthData> {

    // if (process.env.ACCESS_MODE_DEBUG === "true"){
    //     return {user:TestUser, error:AppAuthError.Ok};
    // }
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

/**
 *  Server action that checks if the current user is an admin in the system or not
 * @returns Promise\<boolean>
 */
export async function isAdmin(): Promise<boolean> {
    // if (process.env.ACCESS_MODE_DEBUG === "true") return true;

    const supabase = await getClient();
    const { data, error } = await supabase.auth.getUser();

    if (toAppAuthError(error) !== AppAuthError.Ok || !data.user) {
        return false
    }
    const {user, error:aError} = await getAppUserFromSupabaseUser(data.user);

    if (!user || aError !== AppAuthError.Ok){
        return false
    }


    if( user.role === "FAGANSVARLIG" || user.role === "STUDENT" || user.role === "SUPERADMIN"){
        return true
    }

    // NOTE: Burde sjekke om brukeren eksisterer ellers også...
    return false;
}


/** 
 * Gives you the app-specific information on a user from the supabase auth user type.
 * */
async function getAppUserFromSupabaseUser(authUser: SupabaseUser | null): Promise<AuthData> {
    if (authUser == null || authUser.id.length === 0)
        return { user: null, error: AppAuthError.InvalidCredentials };

    console.log("getappuser: ",authUser.id)
    const supabase = await getClient();
    const userRes = await supabase
        .from("varroa_user_roles")
        .select("role, expires_at, banned_at, created_at")
        .eq("user_id", authUser.id)
        .maybeSingle();

    if (!userRes.success) {
        return { user: null, error: AppAuthError.NotFound };
    };

    console.log("FOund something....")

    const dbRole =
        typeof userRes.data?.role === "string" && validRoles.includes(userRes.data.role as AppRole )
            ? (userRes.data.role as AppRole)
            : "NONE";

    const dbExpiresAt =
        typeof userRes.data?.expires_at === "string"
            ? userRes.data?.expires_at as string
            : null;

    const dbCreatedAt =
        typeof userRes.data?.created_at === "string"
            ? userRes.data?.created_at as string
            : null;

    const dbBannedAt =
        typeof userRes.data?.banned_at === "string"
            ? userRes.data?.banned_at as string
            : null;


    const finalUser: User = {
        user_id: authUser.id,
        email: authUser.email ?? "",
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at === undefined ? null : authUser.last_sign_in_at,
        role: dbRole,
        role_created_at: dbCreatedAt,
        expires_at: dbExpiresAt,
        banned_at: dbBannedAt,
    }

    console.log("hmmm")

    return { user: finalUser, error: AppAuthError.Ok };
}