
export type AppRole = "SUPERADMIN" | "FAGANSVARLIG" | "STUDENT" | "BANNED" | "NONE";
export const validRoles = ["SUPERADMIN", "FAGANSVARLIG", "STUDENT", "BANNED", "NONE"];


// FIXME: userId and email make NO sense here if you already have it in the user and a bunch of other places
export type AuthorizedUserActions = {
  userId: string | null; // should not be here
  email: string | null; // should not be here
  role: AppRole | null; // should not be here
  canManageSystem: boolean;
  canSeeAll: boolean;
  canControl: boolean;
  canWork: boolean;
  canUseQueue: boolean;
  canDeleteAnything: boolean;
};
