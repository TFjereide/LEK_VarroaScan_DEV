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
    user_id: "tester",
    email: "test@test.com",
    created_at: "default",
    last_sign_in_at: "default",
    role: "SUPERADMIN",
    role_created_at: "default",
    expires_at: "default",
    banned_at: "default",
}

export const NullUser : User= {
    user_id: "",
    email: "",
    created_at: "",
    last_sign_in_at: "",
    role: "NONE",
    role_created_at: "",
    expires_at: "",
    banned_at: "",
}