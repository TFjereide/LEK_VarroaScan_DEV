"use client";

import { createContext, useContext } from "react";
import { type User } from "@/lib/auth/user";
import { AuthorizedUserActions } from "@/lib/auth/roles.types";

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
export function useAuth():AuthContextType{
    const context =  useContext(AuthContext);
    if(context === undefined){
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}


type AuthProviderProps ={
    user : User;
    authedActions: AuthorizedUserActions;
    isAdmin : boolean;
    children: React.ReactNode;
}

/**
 * Provides authentication context to all descendant components, including
 * the current user, authorized actions, and admin status.
 *
 * @param props - The authentication data and child components to wrap.
 */
export function AuthProvider({user, authedActions, isAdmin , children}:AuthProviderProps){
    return (
        <AuthContext.Provider value={{user, authedActions, isAdmin}}>
            {children}
        </AuthContext.Provider>
    );
}
