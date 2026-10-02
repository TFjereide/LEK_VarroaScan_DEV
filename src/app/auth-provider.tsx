"use client";

import { createContext, useContext } from "react";
import { type User } from "@/lib/auth/user";

type AuthContextType = {
    user: User|null;
    isAdmin: boolean;
}
type AuthProviderProps ={
    user : User | null;
    isAdmin : boolean;
    children: React.ReactNode;
}

/** 
 * This works by wrapping every child in the possibility of grabbing the context put together here.
 * User and auth stuff is used all over a normal app so this might be the best place to stuff it.
 * It also keeps a better separation of client-server-shenanigans.
**/ 
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({user, isAdmin , children}:AuthProviderProps){
    return (
        <AuthContext.Provider value={{user, isAdmin}}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth():AuthContextType{
    const context =  useContext(AuthContext);
    if(context === undefined){
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}