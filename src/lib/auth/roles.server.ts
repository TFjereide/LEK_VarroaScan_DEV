"use server"
import { AppRole, AuthorizedUserActions, getRoleAuthorizedActions, validRoles } from "./roles";
import { getClient } from "./server";
import { User, NullUser } from "./user";

export async function getAuthorizedUserActions(user: User | null): Promise<AuthorizedUserActions> {

  if (!user) {
    user = NullUser;
  }

  let role: AppRole = user.role ?? "NONE";


  // if (process.env.ACCESS_MODE_DEBUG === "true") {
  //   role = "SUPERADMIN";
  if (role != "NONE") {
    // Check in database for matching roles
    const supabase = await getClient();
    const roleRes = await supabase
      .from("varroa_user_roles")
      .select("role")
      .eq("user_id", user.user_id)
      .maybeSingle();

    if (roleRes.error) {
      console.error(roleRes.error.message);
    }
    // FIXME: replace with something better at some point.


    const dbRole =
      typeof roleRes.data?.role === "string" && 
      validRoles.includes(roleRes.data.role as AppRole)
        ? (roleRes.data.role as AppRole)
        : "NONE";


    role = dbRole;

    // FIXME: this should be in the user_roles table, not here.
    // sort of a second pass to find out if someone is an "admin", which isn't a role?
    // I guess it'll be a "SUPERADMIN" for now
    const adminRes = await supabase
      .from("varroa_admins")
      .select("user_id")
      .eq("user_id", user.user_id)
      .maybeSingle();

    if (adminRes.error) {
      console.error(adminRes.error)
    }

    if (adminRes.data?.user_id) {
      // strange check here too....
      // if (SUPER_ADMIN_EMAILS.has(user.email)) {
      role = "SUPERADMIN";
      // }
    }
  }
  return getRoleAuthorizedActions(user, role);
}
