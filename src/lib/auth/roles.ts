"use server"
import { getClient } from "./server";
import { User } from "./user";

export type AppRole = "SUPERADMIN" | "FAGANSVARLIG" | "STUDENT" | "BANNED";

// FIXME: This should NOT be here at any point, ever! BOO! bad llm, boo!
const SUPER_ADMIN_EMAILS = new Set(["richard141271@gmail.com",]);

function normalizeEmail(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function isMissingRoleTableError(value: unknown) {
  if (!value || typeof value !== "object") return false;
  if (!("message" in value)) return false;
  const message = String((value as { message?: unknown }).message ?? "");
  return message.includes("varroa_user_roles");
}

// FIXME: userId and email make NO sense here if you already have it in the user and a bunch of other places
export type RoleAuthorization = {
  userId: string | null;
  email: string | null;
  role: AppRole | null;
  canManageSystem: boolean;
  canSeeAll: boolean;
  canControl: boolean;
  canWork: boolean;
  canUseQueue: boolean;
  canDeleteAnything: boolean;
};

function buildRoleAccess(
  userId: string | null,
  email: string | null,
  role: AppRole | null,
): RoleAuthorization {
  const privileged = role === "SUPERADMIN" || role === "FAGANSVARLIG";
  return {
    userId,
    email,
    role,
    canManageSystem: privileged,
    canSeeAll: privileged,
    canControl: privileged,
    canWork: role != null,
    canUseQueue: role != null,
    canDeleteAnything: privileged,
  };
}


// TODO: move to actions.ts
// This feels extremely cumbersome....
export async function getAppAccess( user: User| null) : Promise<RoleAuthorization>{

  if (!user) {
    return buildRoleAccess(null, null, null);
  }
  
  const supabase = await getClient();
  // Hmm...
  if (process.env.ACCESS_MODE_DEBUG ==="true"){
    return {
      userId:user.user_id, 
      email:"richard141271@gmail.com",
      role: user.role,
      canManageSystem: true,
      canSeeAll: true,
      canControl: true,
      canWork: true,
      canUseQueue: true,
      canDeleteAnything: true,
    }
  }


  const email = normalizeEmail(user.email);
  if (SUPER_ADMIN_EMAILS.has(email)) {
    return buildRoleAccess(user.user_id, user.email ?? null, "SUPERADMIN");
  }

  const roleRes = await supabase
    .from("varroa_user_roles")
    .select("role")
    .eq("user_id", user.user_id)
    .maybeSingle();

  if (roleRes.error && !isMissingRoleTableError(roleRes.error)) {
    throw roleRes.error;
  }

  const role =
    typeof roleRes.data?.role === "string"
      ? (roleRes.data.role as AppRole)
      : null;

  if (role) {
    return buildRoleAccess(user.user_id, user.email ?? null, role);
  }

  const adminRes = await supabase
    .from("varroa_admins")
    .select("user_id")
    .eq("user_id", user.user_id)
    .maybeSingle();

  if (adminRes.error) {
    throw adminRes.error;
  }

  if (adminRes.data?.user_id) {
    return buildRoleAccess(user.user_id, user.email ?? null, "SUPERADMIN");
  }

  return buildRoleAccess(user.user_id, user.email ?? null, null);
}
