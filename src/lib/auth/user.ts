import { AppRole } from "./roles";

/**
 * in-app user datatype
 */
export type User = {
    user_id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    role: AppRole | null;
    role_created_at: string | null;
    expires_at: string | null;
    banned_at: string | null;
}

export const TestUser : User= {
    user_id: "default",
    email: "default",
    created_at: "default",
    last_sign_in_at: "default",
    role: "SUPERADMIN",
    role_created_at: "default",
    expires_at: "default",
    banned_at: "default",
}