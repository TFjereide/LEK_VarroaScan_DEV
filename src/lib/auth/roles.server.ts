"use server"
import { getUserRole } from "../varroaScanDb";
import { getRoleAuthorizedActions} from "./roles.client";
import { AppRole, AuthorizedUserActions } from "./roles.types";
import { getClient } from "./supabase.server";
import { User, NullUser } from "./user";


/**
 
NOTE: Should be deprecated!
 
Determines the actions a user is authorized to perform based on their role.
Rechecks the user's role against the database if they already have a role,
then returns the corresponding authorized actions.
@param user - The user to determine authorized actions for, or null to
fall back to NullUser.
@returns A promise resolving to the actions authorized for the user's role.
NOTE: Users with a role of "NONE" skip the database role check entirely. */
export async function getAuthorizedUserActions(user: User | null): Promise<AuthorizedUserActions> {
  if (!user) {
    user = NullUser;
  }

  let role: AppRole = user.role ?? "NONE";
  if (role != "NONE") {
    // Is this like a recheck?
    const supabase = await getClient();
    role =  await getUserRole(supabase, user.user_id)

  }
  return getRoleAuthorizedActions(user, role);
}
