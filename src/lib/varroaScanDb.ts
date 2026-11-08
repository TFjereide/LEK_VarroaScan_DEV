import type { PostgrestResponse, SupabaseClient } from "@supabase/supabase-js";
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
 * -utility for LEK-VarroaScan (ny database).
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
* @deprecated do not use this. New functions in varroaSubmissionsDb.ts 
*/

export const SUBMISSIONS_BUCKET = "varroa-submissions";

export type ImageQuality = "Høy" | "Middels" | "Lav" | "ikke_vurdert";
export type ImageStatus = "pending" | "analyzed" | "failed";
export type SubmissionStatus = "NY" | "UNDER_ARBEID" | "ARKIVERT";
export type SubmissionType = "BUNNBRETT_FOTO" | "KONTROLLFOTO";

//beskriver formen på dataene i databasen
type SubmissionImageRow = {
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

// Dunno if meta-data is used, but this is mostly for later.
export type ImageRecord = Omit<SubmissionImageRow, "meta_data">

//Henter data fra databasen 
// const SUBMISSION_SELECT =
//   "id, submission_date, source, device_info, app_version, comment, status, type, " +
//   "images(image_id, submission_id, image_path, quality, notes, image_status, meta_data, mite_count, created_at)";
const SUBMISSION_SELECT = [
    "*",
    "images(*)",
  ].join(",");

/** 
 * Admin-oversikt: alle innsendinger, nyeste først. 
 * @deprecated do not use this. New functions in varroaSubmissionsDb.ts 
*/
export async function getSubmissions(
  supabase: SupabaseClient,
  limit = 200,
): Promise<VarroaSubmissionRecord[]> {

   try {
      const submissionsResRaw = await supabase
          .from("submissions")
          .select(SUBMISSION_SELECT)
          .order("updated_at", { ascending: false })
          .limit(500)

      if (submissionsResRaw.error) {
          console.error("Failed to fetch submissions:", submissionsResRaw.error);
          return [];
      } else {
        
        const fetchedItems = (submissionsResRaw.data ?? []) as unknown as VarroaSubmissionRecord[];
        return fetchedItems
      }

    } catch (e) {
      return [];
    }
}
/**
 * 
 * @param supabase 
 * @returns 
 * @deprecated do not use this. New functions in varroaSubmissionsDb.ts 
 */
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


/**
 * Admin-detalj: én innsending med alle bilder, sortert i riktig rekkefølge. 
 * @deprecated do not use this. New functions in varroaSubmissionsDb.ts  
*/
export async function getSubmissionById(
  supabase: SupabaseClient,
  id: string,
): Promise<VarroaSubmissionRecord | null> {
  try{
    const res = await supabase
      .from("submissions")
      .select(SUBMISSION_SELECT)
      .eq("id", id)
      .maybeSingle();
  
    if (res.error) throw res.error;
    if (!res.data) return null;
  
    const submission = res.data as unknown as VarroaSubmissionRecord;
    if (!submission.images){
      return submission;
    }
    // Nøstede rader har ikke garantert rekkefølge uten explicit order på
    // relasjonen, så vi sorterer på created_at her i stedet.
    const sortedImages = [...submission.images].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    return { ...submission, images: sortedImages };
  }catch (e){
    console.error("Couldn't get submission ", e);
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

/** Signerte URL-er for en liste bildestier. Returnerer et path -> url-kart. 
 * @deprecated do not use this. New functions in varroaSubmissionsDb.ts 
*/
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
  // onProgress?: (step: string) => void;
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
 * @deprecated do not use this. New functions in varroaSubmissionsDb.ts 
*/
export async function submitVarroaScan(
  supabase: SupabaseClient,
  input: SubmitVarroaScanInput,
): Promise<SubmitVarroaScanResult> {
  const { files, note, type, source, deviceInfo, appVersion} = input;
  const submissionId = crypto.randomUUID();

  // onProgress?.("Oppretter innsending");
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
    // onProgress?.(`Laster opp bilde ${index + 1}/${files.length}`);
    const path = await uploadSubmissionImageFile(supabase, submissionId, file);
    imagePaths.push(path);

    // onProgress?.(`Registrerer bilde ${index + 1}/${files.length}`);
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

/**
 * 
 * @param supabase 
 * @param userId 
 * @returns 
 * @deprecated do not use this. New functions in varroaSubmissionsDb.ts 
 */
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

/**
 * 
 * @param supabase 
 * @param userId 
 * @returns 
 * @deprecated do not use this. New functions in varroaSubmissionsDb.ts 
 */
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

/**
 * 
 * @param supabase 
 * @param id 
 * @returns 
 * @deprecated do not use this. New functions in varroaSubmissionsDb.ts 
 */
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

/**
 * 
 * @param supabase 
 * @param id 
 * @returns 
 * @deprecated do not use this. New functions in varroaSubmissionsDb.ts 
 */
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

/**
 * 
 * @param supabase 
 * @param id 
 * @returns 
 * @deprecated do not use this. New functions in varroaSubmissionsDb.ts 
 */
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