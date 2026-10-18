
export type AppRole = "SUPERADMIN" | "FAGANSVARLIG" | "STUDENT" | "BANNED" | "NONE";
export const validRoles = ["SUPERADMIN", "FAGANSVARLIG", "STUDENT", "BANNED", "NONE"];


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
