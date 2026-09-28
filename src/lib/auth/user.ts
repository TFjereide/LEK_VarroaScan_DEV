
export type User = {
    user_id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    role: string | null;
    role_created_at: string | null;
    expires_at: string | null;
    banned_at: string | null;
}