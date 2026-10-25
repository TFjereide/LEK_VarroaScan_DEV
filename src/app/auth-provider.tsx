"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createNullUser, type User } from "@/lib/auth/user";
import { AuthorizedUserActions } from "@/lib/auth/roles.types";
import { getRoleAuthorizedActions, isAdmin, nilAuthorizedUserActions } from "@/lib/auth/roles.client";
import { ensureAnonymousSession, getCurrentUser } from "@/lib/auth/actions.server";
import { getClient } from "@/lib/auth/supabase.client";

/** 
 * This works by wrapping every child in the possibility of grabbing the context put together here.
 * User and auth stuff is used all over a normal app so this might be the best place to stuff it.
 * It also keeps a better separation of client-server-shenanigans.
 * get the auth through useAuth()
**/
type AuthContextType = {
    user: User;
    authedActions: AuthorizedUserActions;
    isAdmin: boolean;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provides access to the current authentication context, including the
 * authenticated user, authorized actions, and admin status.
 * 
 * WARNING: While the user is provided from the serve, all actions MUST be validated
 * on the server before execution!
 *
 * @returns The current authentication context.
 * @throws {Error} If called outside of an AuthProvider.
 */
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}


type AuthProviderProps = {
    // User resolved by the server during the initial page render.
    initialUser: User,
    children: React.ReactNode;
}

/**
 * Provides authentication context to all descendant components, including
 * the current user, authorized actions, and admin status.
 *
 * @param props - The authentication data and child components to wrap.
 */
export function AuthProvider({ initialUser, children }: AuthProviderProps) {

    // React uses initialUser only on the first render; subsequent changes
    // to the prop do not automatically replace this state.
    const [user, setUser] = useState<User>(initialUser);

    useEffect(() => {
        const supabase = getClient();
        // so that an older response is prevented from overwriting the newer state.
        let requestId = 0;
        // Prevent pending asynchronous work from updating state after unmount.
        let disposed = false;


        /**
         * Resolve the Supabase session into our application-specific user.
         *
         * On initial session restoration, create an anonymous session if needed.
         * For later auth events, only look up the current user; don't silently
         * create a new anonymous session when a lookup fails.
         */
        async function loadUser(createAnonIfMissing = false) {
            const id = ++requestId;

            try {
                const result = createAnonIfMissing
                    ? await ensureAnonymousSession()
                    : await getCurrentUser();

                // Ignore responses from an outdated request or an unmounted provider.
                if (disposed || id !== requestId) return;

                if (result.user) {
                    // Updating this one state value SHOULD cause React to render consumers
                    // with the new user and the corresponding derived permissions.
                    setUser(result.user);

                } else {
                    console.error("Failed to resolve application user:", result.error)
                }
            } catch (error) {
                // Handle unexpected failures without applying stale results.
                if (!disposed && id === requestId) {
                    console.error("Failed to load application user: ", error);
                }
            }
        }

        void loadUser(true);

        /**
        * Subscribe to auth events from the browser Supabase client.
        *
        * The callback itself stays synchronous. Supabase warns against making
        * asynchronous Supabase calls inside this callback because of auth-lock
        * deadlock risks.
        */
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "INITIAL_SESSION") return;

            // Defer server work until after the auth callback returns.
            Promise.resolve().then(() => {
                if (disposed) return;

                if (event === "SIGNED_OUT") {
                    setUser(createNullUser());
                    ++requestId;
                    return;
                }

                void loadUser(false);
            });
        });

        return () => {
            disposed = true;
            ++requestId;
            subscription.unsubscribe();
        };


    }, [])


    /**
    * Derive permissions from the current user instead of storing them
    * separately. This prevents user, admin status, and permissions from
    * drifting out of sync.
    *
    * useMemo avoids rebuilding the context value unless the user changes.
    * It is a performance optimization, not a correctness requirement.
    */
    const value = useMemo<AuthContextType>(() => {
        const authedActions = user.role
        ? getRoleAuthorizedActions(user, user.role)
        : nilAuthorizedUserActions();

        return {
        user,
        authedActions,
        isAdmin: isAdmin(user.role),
        };
    }, [user]);




    return (
        <AuthContext.Provider
            value={value}>
            {children}
        </AuthContext.Provider>
    );
}
