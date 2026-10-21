import type { PostgrestResponse, SupabaseClient } from "@supabase/supabase-js";
import { AppRole, validRoles } from "./auth/roles.types";
import { VarroaSubmissionRecord } from "./varroaWorkflow";

/**
 * Database-utility for LEK-VarroaScan (ny database).
 *
 * All Supabase-tilgang for submissions/images samles her, slik at:
 *  - app/page.tsx (birøkter-skjemaet)
 *  - app/innsendinger/page.tsx (admin-oversikt)
 *  - app/innsendinger/innsending/page.tsx (admin-detalj)
 * bruker de samme funksjonene i stedet for å bygge egne queries hver for seg.
 *
 * VIKTIG TING JEG MÅ HUSKE PÅ: kjør migrasjons-SQL-en (delt i chatten) i det nye Supabase-prosjektet
 * FØR du tester dette. Den:
 *  - endrer submissions.comment fra uuid -> text
 *  - legger til submissions.status og submissions.type
 *  - legger til images.created_at
 *  - oppretter storage-bucket "varroa-submissions" + RLS-policies
 */

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


export const SUBMISSIONS_BUCKET = "varroa-submissions";

export type ImageQuality = "Høy" | "Middels" | "Lav" | "ikke_vurdert";
export type ImageStatus = "pending" | "analyzed" | "failed";
export type SubmissionStatus = "NY" | "UNDER_ARBEID" | "ARKIVERT";
export type SubmissionType = "BUNNBRETT_FOTO" | "KONTROLLFOTO";

//beskriver formen på dataene i databasen
export type SubmissionImageRow = {
  image_id: string;
  submission_id: string;
  image_path: string;
  quality: ImageQuality;
  notes: string | null;
  image_status: ImageStatus;
  meta_data: Record<string, unknown> | null;
  mite_count: number | null;
  created_at: string;
};

//beskriver formen på dataene i databasen
export type SubmissionRow = {
  id: string;
  submission_date: string;
  source: string | null;
  device_info: Record<string, unknown> | null;
  app_version: string | null;
  comment: string | null;
  status: SubmissionStatus;
  type: SubmissionType;
};

export type SubmissionWithImages = SubmissionRow & {
  images: SubmissionImageRow[];
};

//Henter data fra databasen 
const SUBMISSION_SELECT =
  "id, submission_date, source, device_info, app_version, comment, status, type, " +
  "images(image_id, submission_id, image_path, quality, notes, image_status, meta_data, mite_count, created_at)";

/** Admin-oversikt: alle innsendinger, nyeste først. */
export async function fetchSubmissions(
  supabase: SupabaseClient,
  limit = 200,
): Promise<VarroaSubmissionRecord[]> {

  const local_Select =[
    "id",
    "created_at:submission_date",
    "updated_at",
    "type",
    "note:comment",
    "status",
    "assigned_to",
    "processed_by",
    "training_ready",
    "images(image_path)",
  ].join(",");

   try {
      const submissionsResRaw = await 
        supabase
          .from("submissions")
          .select(local_Select)
          .order("updated_at", { ascending: false })
          .limit(500)

      const submissionsRes = submissionsResRaw as PostgrestResponse<VarroaSubmissionRecord>;

      if (submissionsRes.error) {
        console.error("Failed to fetch submissions:", submissionsRes.error);
        return [];
      } else {
        const fetchedItems = submissionsRes.data ?? [];
        return fetchedItems
      }

    } catch (e) {
      return [];
    }
}

/** Admin-oversikt: alle innsendinger, nyeste først. */
export async function fetchSubmissionsWithImages(
  supabase: SupabaseClient,
  limit = 200,
): Promise<SubmissionWithImages[]> {
  const res = await supabase
    .from("submissions")
    .select(SUBMISSION_SELECT)
    .order("submission_date", { ascending: false })
    .limit(limit);

  if (res.error) throw res.error;
  return (res.data ?? []) as unknown as SubmissionWithImages[];
}

/** Admin-detalj: én innsending med alle bilder, sortert i riktig rekkefølge. */
export async function fetchSubmissionById(
  supabase: SupabaseClient,
  id: string,
): Promise<SubmissionWithImages | null> {
  const res = await supabase
    .from("submissions")
    .select(SUBMISSION_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (res.error) throw res.error;
  if (!res.data) return null;

  const row = res.data as unknown as SubmissionWithImages;
  // Nøstede rader har ikke garantert rekkefølge uten explicit order på
  // relasjonen, så vi sorterer på created_at her i stedet.
  const sortedImages = [...row.images].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  return { ...row, images: sortedImages };
}

export async function updateSubmissionStatus(
  supabase: SupabaseClient,
  id: string,
  status: SubmissionStatus,
): Promise<void> {
  const res = await supabase.from("submissions").update({ status }).eq("id", id);
  if (res.error) throw res.error;
}

/** Signerte URL-er for en liste bildestier. Returnerer et path -> url-kart. */
export async function getSignedImageUrls(
  supabase: SupabaseClient,
  paths: string[],
  expirySeconds = 60 * 30,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;

  const res = await supabase.storage
    .from(SUBMISSIONS_BUCKET)
    .createSignedUrls(paths, expirySeconds);

  if (res.error) throw res.error;

  for (const item of res.data ?? []) {
    if (!item) continue;
    if (typeof item.path !== "string") continue;
    if (typeof item.signedUrl !== "string") continue;
    map.set(item.path, item.signedUrl);
  }
  return map;
}

function extensionFromFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext && ext.length <= 10 ? ext : "jpg";
}

async function uploadSubmissionImageFile(
  supabase: SupabaseClient,
  submissionId: string,
  file: File,
): Promise<string> {
  const objectPath = `submissions/${submissionId}/${crypto.randomUUID()}.${extensionFromFile(file)}`;

  const res = await supabase.storage.from(SUBMISSIONS_BUCKET).upload(objectPath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (res.error) throw res.error;
  return objectPath;
}

export type SubmitVarroaScanInput = {
  files: File[];
  note: string | null;
  type: SubmissionType;
  source: string | null;
  deviceInfo: Record<string, unknown> | null;
  appVersion: string | null;
  onProgress?: (step: string) => void;
};

export type SubmitVarroaScanResult = {
  submissionId: string;
  imagePaths: string[];
};

/**
 * Høynivå-funksjon brukt av birøkter-skjemaet (app/page.tsx):
 * oppretter én rad i "submissions", laster opp alle bilder til storage,
 * og oppretter én rad per bilde i "images".
 *
 * Ubegrenset antall bilder - ingen kunstig grense (jf. kravspek §9).
 */
export async function submitVarroaScan(
  supabase: SupabaseClient,
  input: SubmitVarroaScanInput,
): Promise<SubmitVarroaScanResult> {
  const { files, note, type, source, deviceInfo, appVersion, onProgress } = input;
  const submissionId = crypto.randomUUID();

  onProgress?.("Oppretter innsending");
  const insertRes = await supabase.from("submissions").insert({
    id: submissionId,
    source,
    device_info: deviceInfo,
    app_version: appVersion,
    comment: note,
    status: "NY",
    type,
  });
  if (insertRes.error) throw insertRes.error;

  const imagePaths: string[] = [];
  for (const [index, file] of files.entries()) {
    onProgress?.(`Laster opp bilde ${index + 1}/${files.length}`);
    const path = await uploadSubmissionImageFile(supabase, submissionId, file);
    imagePaths.push(path);

    onProgress?.(`Registrerer bilde ${index + 1}/${files.length}`);
    const imgRes = await supabase.from("images").insert({
      submission_id: submissionId,
      image_path: path,
      quality: "ikke_vurdert",
      image_status: "pending",
    });
    if (imgRes.error) throw imgRes.error;
  }

  return { submissionId, imagePaths };
}