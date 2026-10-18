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
export const validRoles = ["SUPERADMIN", "FAGANSVARLIG", "STUDENT", "BANNED", "NONE"];


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

export function nilAuthorizedUserActions():AuthorizedUserActions {
      return {
        userId: "",
        email: "",
        role: "NONE",
        canManageSystem: false,
        canSeeAll: false,
        canControl: false,
        canWork: false,
        canUseQueue: false,
        canDeleteAnything: false,
      }
}


export function getRoleAuthorizedActions( user: User, role: AppRole): AuthorizedUserActions{

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
        canSeeAll: true,
        canControl: true,
        canWork: true,
        canUseQueue: true,
        canDeleteAnything: true,
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
      return nilAuthorizedUserActions()
  }
}