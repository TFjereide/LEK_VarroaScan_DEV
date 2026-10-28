import type { PostgrestResponse, SupabaseClient } from "@supabase/supabase-js";
import { AppRole, validRoles } from "./auth/roles.types";
import { getSubmissionSelect, VarroaSubmissionHistory, VarroaSubmissionImageReview, VarroaSubmissionRecord, VarroaSubmissionReview } from "./varroaWorkflow";



// (TGF)TODO: 
// 1. Det er flere funksjoner som gjør _nesten_ samme ting, som ikke er bra.
//    De burde egentlig være én prosedyre som gjør det samme overalt.
//    eks: fetchSubmissionById og getSubmissionById
//    Det er også en del logikk som er stykket opp i mange spørringer, og
//    det er ganske tregt å utføre, og kan føre til merkelige feil i teorien.
//    (Typ, du finner en innsending, men ikke tilhørende bilder...)
// 2. Bedre måte å rapportere feil gjennom dette API-et
// 2. Formalisere og parameterisere API-et.


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

  // TODO: Pretty awful, but can be fixed later
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

export async function getAvailableNewSubmissionsCount(supabase: SupabaseClient): Promise<number>{
  try{
    const availableResRaw = await supabase.rpc("varroa_available_new_count");
    const availableRes = availableResRaw as PostgrestResponse<number>;
    if(availableRes.error){
      throw availableRes.error
    }
    const availableCount = availableRes.data[0] ?? 0;
    return availableCount;
  }catch (e){
    console.error("Can't get available new submissions count.")
  }
  return -1;
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
  try{
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

  }catch (e){

  }
  return null;
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

export async function getNextsubmissionId(supabase :SupabaseClient, userId:string){

  if(userId){
    // GAMMEL: .from("varroa_submissions"). NY: submissions - updated_at
    // er en ekte kolonne, så sorteringen trengte ingen endring.
      
    const underWorkRes = await supabase
      .from("submissions")
      .select("id")
      .eq("status", "UNDER_ARBEID")
      .or(`assigned_to.eq.${userId},processed_by.eq.${userId}`)
      .order("updated_at", { ascending: true })
      .limit(1)
      .maybeSingle();
  
    if (underWorkRes.error) throw underWorkRes.error;
    const resumeId = String(underWorkRes.data?.id ?? "");
    return resumeId;
  }

}

export async function getNextsubmissionForControlId(supabase :SupabaseClient, userId:string){
  // GAMMEL: .from("varroa_submissions"), og sorterte en bar
  // .select("id")-spørring på "created_at" - som bare er et alias fra
  // getSubmissionSelect() og ikke finnes utenfor den. NY: riktig
  // tabellnavn + sortering på den ekte kolonnen submission_date.
   const reviewRes = await supabase
      .from("submissions")
      .select("id")
      .eq("status", "KLAR_FOR_KONTROLL")
      .neq("processed_by", userId ?? "")
      .order("submission_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (reviewRes.error) throw reviewRes.error;
    const reviewId = String(reviewRes.data?.id ?? "");

    return reviewId;
}

export async function getSubmissionById(supabase:SupabaseClient, id:string): Promise<VarroaSubmissionRecord | null>{

  try{
    const submissionsRes = await supabase
      .from("submissions")
      .select(getSubmissionSelect())
      .eq("id", id)
      .maybeSingle()

      if (submissionsRes.error) {
        // TODO: investigate this former way of doing things:
        // if (isMissingWorkflowSchemaError(submissionsRes.error)) {
        //   setLoadError(getWorkflowMigrationMessage());
        //   return;
        // }
        throw submissionsRes.error;
      }
      if (submissionsRes.data === null){
        return null;
      }
      const submission = (submissionsRes.data) as unknown as VarroaSubmissionRecord;
      return submission;
  }catch(e){
    console.error("Couldn't get submission ", e);
  }
  return null;
}

export async function getSubmissionHistoryById(supabase:SupabaseClient, id:string):Promise<VarroaSubmissionHistory[]>{

  const historySelect = [
    "id",
    "submission_id",
    "created_at:changed_at",
    "user_id:changed_by",
    "action",
    "from_status",
    "to_status",
    "comment",
    "payload",
  ].join(",");

  try{
  const historyRes = await  supabase
    .from("submission_history")
    .select(historySelect)
    .eq("submission_id", id)
    .order("changed_at", { ascending: false })
    .limit(40)
    if (historyRes.error) {
      // TODO: investigate this former way of doing things:
      // if (isMissingWorkflowSchemaError(historyRes.error)) {
      //   setLoadError(getWorkflowMigrationMessage());
      //   return;
      // }
      throw historyRes.error;
    }
    
    const loadedHistory = (historyRes.data ?? []) as unknown as VarroaSubmissionHistory[];
    return loadedHistory;
  } catch (e){
    console.error("Couldn't get submission history", e);
  }
  return [];
}

export async function getSubmissionReviewsById(supabase:SupabaseClient, id:string):Promise<VarroaSubmissionReview[]>{

  try{
    const reviewsRes = await supabase
          .from("varroa_submission_reviews")
          .select(
            "id,submission_id,created_at,updated_at,created_by,mite_count,image_quality,comment,training_ready,approved,current_image_index,image_notes",
          )
          .eq("submission_id", id)
          .order("updated_at", { ascending: false })
          .limit(20)

    if (reviewsRes.error) {
        // if (isMissingWorkflowSchemaError(imageReviewsRes.error)) {
        //   setLoadError(getWorkflowMigrationMessage());
        //   return;
        // }
        throw reviewsRes.error;
    }
    const loadedReviews = (reviewsRes.data ?? []) as unknown as VarroaSubmissionReview[];
    return loadedReviews;
      
  }catch (e){
    console.error("Couldn't get submission review images", e);
  }
  return [];
}

export async function getSubmissionReviewImagesById(supabase:SupabaseClient, id:string):Promise<VarroaSubmissionImageReview[]>{

  try{
    const imageReviewsRes = await supabase
      .from("varroa_submission_review_images")
      .select(
        "id,submission_id,review_id,created_at,updated_at,created_by,image_index,mite_count,image_quality,comment,training_ready,approved",
      )
      .eq("submission_id", id)
      // NOTE: FUngerte etter at jeg tok dette vekk. Det virker ikke som om det
      // burde være her heller?
      // .eq("created_by", authedActions.userId)
      .order("image_index", { ascending: true })
      if (imageReviewsRes.error) {
        // if (isMissingWorkflowSchemaError(imageReviewsRes.error)) {
        //   setLoadError(getWorkflowMigrationMessage());
        //   return;
        // }
        throw imageReviewsRes.error;
      }
      const loadedImageReviews = (imageReviewsRes.data ?? []) as unknown as VarroaSubmissionImageReview[];
      return loadedImageReviews;
  }catch (e){
    console.error("Couldn't get submission review images", e);
  }
  return [];
}