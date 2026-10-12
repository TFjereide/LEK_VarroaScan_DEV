"use server"
/** 
 * TODO: (TGF)
 * Currently the role system is slightly goofy. It's checking clientside for roles and puts in a lot of effort 
 * to check if someone is authorized to do something, but doesn't do this on the server side very much.
 * In the future this should probably go as follows: 
 * get roles/legal actions client side -> do the action -> send result to server -> server verifies with your 
 * auth user_id that you could actually do them -> do or do not do them based on this.
 * 
 * Additionally, the last step should ideally be logged if the user is able to attempt an action they're not authorized to do.
*/
import { getClient } from "./server";
import { User, NullUser } from "./user";

export type AppRole = "SUPERADMIN" | "FAGANSVARLIG" | "STUDENT" | "BANNED" | "NONE";

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
export type AuthorizedUserActions = {
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


// // TODO: Remove
// export async function getAuthorizedUserActions_Old(user: User | null): Promise<AuthorizedUserActions> {


//   // Hmm...
//   if (user && process.env.ACCESS_MODE_DEBUG === "true") {
//     return {
//       userId: user.user_id,
//       email: "richard141271@gmail.com",
//       role: user.role,
//       canManageSystem: true,
//       canSeeAll: true,
//       canControl: true,
//       canWork: true,
//       canUseQueue: true,
//       canDeleteAnything: true,
//     }
//   }
//   // Set authorized actions based on role
//   function buildAuthorizedUserActions(
//     userId: string | null,
//     email: string | null,
//     role: AppRole | null,
//   ): AuthorizedUserActions {

//     const privileged = role === "SUPERADMIN" || role === "FAGANSVARLIG";

//     return {
//       userId,
//       email,
//       role,
//       canManageSystem: privileged,
//       canSeeAll: privileged,
//       canControl: privileged,
//       canWork: role != null,
//       canUseQueue: role != null,
//       canDeleteAnything: privileged,
//     };
//   }

//   if (!user) {
//     return buildAuthorizedUserActions(null, null, null);
//   }

//   const supabase = await getClient();

//   const email = normalizeEmail(user.email);
//   if (SUPER_ADMIN_EMAILS.has(email)) {
//     return buildAuthorizedUserActions(user.user_id, user.email ?? null, "SUPERADMIN");
//   }

//   const roleRes = await supabase
//     .from("varroa_user_roles")
//     .select("role")
//     .eq("user_id", user.user_id)
//     .maybeSingle();

//   if (roleRes.error && !isMissingRoleTableError(roleRes.error)) {
//     throw roleRes.error;
//   }

//   const role =
//     typeof roleRes.data?.role === "string"
//       ? (roleRes.data.role as AppRole)
//       : null;

//   if (role) {
//     return buildAuthorizedUserActions(user.user_id, user.email ?? null, role);
//   }

//   const adminRes = await supabase
//     .from("varroa_admins")
//     .select("user_id")
//     .eq("user_id", user.user_id)
//     .maybeSingle();

//   if (adminRes.error) {
//     throw adminRes.error;
//   }

//   if (adminRes.data?.user_id) {
//     return buildAuthorizedUserActions(user.user_id, user.email ?? null, "SUPERADMIN");
//   }

//   return buildAuthorizedUserActions(user.user_id, user.email ?? null, null);
// }

// TODO: move to actions.ts, probably
export async function getAuthorizedUserActions(user: User | null): Promise<AuthorizedUserActions> {

  if (!user) {
    user = NullUser;
  }

  let role: AppRole = user.role ?? "NONE";


  if (process.env.ACCESS_MODE_DEBUG === "true") {
    role = "SUPERADMIN";
  } else if (role != "NONE") {
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
      typeof roleRes.data?.role === "string" && roleRes.data?.role in ["SUPERADMIN", "FAGANSVARLIG", "STUDENT", "BANNED", "NONE"]
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

  switch (role) {
    case "SUPERADMIN":
      return {
        userId: user.user_id,
        email: user.email,
        role: role,
        canManageSystem: true,
        canSeeAll: true,
        canControl: true,
        canWork: true,
        canUseQueue: true,
        canDeleteAnything: true,
      }
    case "FAGANSVARLIG":
      return {
        userId: user.user_id,
        email: user.email,
        role: role,
        canManageSystem: true,
        canSeeAll: true,
        canControl: true,
        canWork: true,
        canUseQueue: true,
        canDeleteAnything: true,
      }
    case "STUDENT":
      return {
        userId: user.user_id,
        email: user.email,
        role: role,
        canManageSystem: false,
        canSeeAll: false,
        canControl: true,
        canWork: true,
        canUseQueue: true,
        canDeleteAnything: false,
      }
    case "BANNED":
      return {
        userId: user.user_id,
        email: user.email,
        role: role,
        canManageSystem: false,
        canSeeAll: false,
        canControl: false,
        canWork: false,
        canUseQueue: false,
        canDeleteAnything: false,
      }
    case "NONE":
      return {
        userId: user.user_id,
        email: user.email,
        role: role,
        canManageSystem: false,
        canSeeAll: false,
        canControl: false,
        canWork: false,
        canUseQueue: false,
        canDeleteAnything: false,
      }
  }
}