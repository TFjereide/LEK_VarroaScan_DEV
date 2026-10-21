import { AppAuthError } from "./appAuthError";
import { User } from "./user";

// All return this type:
export type AuthData = {
    user: User;
    error: 'ok';
}|{
    user: null;
    error: AppAuthError;
}
