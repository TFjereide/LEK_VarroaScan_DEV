import { SupabaseClient } from "@supabase/supabase-js";
import { AppRole, validRoles } from "./auth/roles.types";



/**
 * Retrieves a user's application role from the database, checking for
 * superadmin status separately.
 *
 * @param supabase - The Supabase client used to query role assignments.
 * @param user_id - The ID of the user whose role to retrieve.
 * @returns The user's valid application role, "SUPERADMIN" if they are an
 * admin, or "NONE" if no valid role is found or an error occurs.
 */
export async function getUserRole(supabase: SupabaseClient, user_id: string): Promise<AppRole> {

  try{
    // Check in database for matching roles
    const roleRes = await supabase
      .from("varroa_user_roles")
      .select("role, expires_at, banned_at, created_at")
      .eq("user_id", user_id)
      .maybeSingle();

    if (!roleRes.success) {
      console.error(roleRes.error.message);
      return "NONE"
    }

    const dbRole =
      typeof roleRes.data?.role === "string" && 
      validRoles.includes(roleRes.data.role as AppRole)
        ? (roleRes.data.role as AppRole)
        : "NONE";

    // FIXME: this should be in the user_roles table, not here.
    // sort of a second pass to find out if someone is an "admin", which isn't a role?
    // I guess it'll be a "SUPERADMIN" for now
    const adminRes = await supabase
      .from("varroa_admins")
      .select("user_id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (adminRes.error) {
      console.error(adminRes.error)
    }

    if (adminRes.data?.user_id) {
      return "SUPERADMIN";
    }

    return dbRole;

  }catch(e){
    console.log("supabase error");
  }
  return "NONE"
}

export async function getUserRoleExtended(supabase: SupabaseClient, user_id: string): 
Promise<{
    role: AppRole;
    expires_at: string | null;
    created_at: string | null;
    banned_at: string | null;
} | null> 
{

  try{

    const userRes = await supabase
            .from("varroa_user_roles")
            .select("role, expires_at, banned_at, created_at")
            .eq("user_id", user_id)
            .maybeSingle();
    
    if (!userRes.success) {
        return null;
    };
  
  
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
  
    return {
      role: dbRole, 
      expires_at:dbExpiresAt,
      created_at:dbCreatedAt,
      banned_at:dbBannedAt,
    }  
  }catch (e){
    return null
  }
}

