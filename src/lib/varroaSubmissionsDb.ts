import type { PostgrestResponse, PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";
import { getSubmissionSelect, SignedImage, VarroaSubmissionHistory, VarroaSubmissionImageReview, VarroaSubmissionRecord, VarroaSubmissionReview } from "./varroaWorkflow";
import { ErrorCode, Result, makeResultError, makeResultData, supabaseErrorToResultError, makeError, supabaseStorageErrorToResultError } from "./result/result";
import { SubmissionSortType } from "./submissions/submissions-controller";
import { Database } from "./supabase/database.types";


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
 */

export const SUBMISSIONS_BUCKET = "varroa-submissions";

export type ImageQuality = "Høy" | "Middels" | "Lav" | "ikke_vurdert";
export type ImageStatus = "pending" | "analyzed" | "failed";
export type SubmissionStatus = "NY" | "UNDER_ARBEID" | "ARKIVERT" | "KLAR_FOR_KONTROLL";
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

/** Admin-oversikt: alle innsendinger, nyeste først. */
export async function getSubmissions(
  supabase: SupabaseClient<Database>,
  page: number,
  limit: number,
  sortBy?: SubmissionSortType,
  byStatus?: SubmissionStatus,
): Promise<Result<VarroaSubmissionRecord[]>> {

  const _sortBy = sortBy ?? "updated_at"

  try {
    let submissionsResRaw: PostgrestSingleResponse<unknown>

    if (!byStatus) {
      submissionsResRaw = await supabase
        .from("submissions")
        .select(SUBMISSION_SELECT)
        .order(_sortBy, { ascending: false })
        .limit(500)
    } else {
      submissionsResRaw = await supabase
        .from("submissions")
        .select(SUBMISSION_SELECT)
        .eq("status", byStatus)
        .order(_sortBy, { ascending: false })
        .limit(500)
    }
    if (submissionsResRaw.error) {
      console.error("Failed to fetch submissions:", submissionsResRaw.error);
      return supabaseErrorToResultError(submissionsResRaw.error);
    } else {

      const fetchedItems = (submissionsResRaw.data ?? []) as unknown as VarroaSubmissionRecord[];
      return makeResultData(fetchedItems);
    }

  } catch (error) {
    return makeResultError(
      ErrorCode.DATABASE_CONNECTION_ERROR,
      "Failed to communicate with the database.",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function getAvailableNewSubmissionsCount(supabase: SupabaseClient): Promise<Result<number>> {
  try {
    const availableResRaw = await supabase.rpc("varroa_available_new_count");
    const availableRes = availableResRaw as PostgrestResponse<number>;
    if (availableRes.error) {
      return supabaseErrorToResultError(availableRes.error);
    }
    const availableCount = availableRes.data[0] ?? 0;
    return makeResultData(availableCount);

  } catch (error) {
    return makeResultError(
      ErrorCode.DATABASE_CONNECTION_ERROR,
      "Failed to communicate with the database.",
      error instanceof Error ? error.message : String(error),
    );
  }
}

/** Admin-detalj: én innsending med alle bilder, sortert i riktig rekkefølge. */
export async function getSubmissionById(
  supabase: SupabaseClient,
  id: string,
): Promise<Result<VarroaSubmissionRecord | null>> {
  try {
    const res = await supabase
      .from("submissions")
      .select(SUBMISSION_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (res.error) return supabaseErrorToResultError(res.error);
    if (!res.data) return makeResultData(null);

    const submission = res.data as unknown as VarroaSubmissionRecord;
    if (!submission.images) {
      return makeResultData(submission);
    }
    // Nøstede rader har ikke garantert rekkefølge uten explicit order på
    // relasjonen, så vi sorterer på created_at her i stedet.
    const sortedImages = [...submission.images].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    return makeResultData({ ...submission, images: sortedImages });
  } catch (error) {
    return makeResultError(
      ErrorCode.DATABASE_CONNECTION_ERROR,
      "Failed to communicate with the database.",
      error instanceof Error ? error.message : String(error),
    );
  }
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
): Promise<Result<Map<string, string>>> {

  try {
    const map = new Map<string, string>();
    if (paths.length === 0) return makeResultData(map);

    const res = await supabase.storage
      .from(SUBMISSIONS_BUCKET)
      .createSignedUrls(paths, expirySeconds);

    if (res.error) return supabaseStorageErrorToResultError(res.error);

    for (const item of res.data ?? []) {
      if (!item) continue;
      if (typeof item.path !== "string") continue;
      if (typeof item.signedUrl !== "string") continue;
      map.set(item.path, item.signedUrl);
    }
    return makeResultData(map);

  } catch (error) {
    return makeResultError(
      ErrorCode.DATABASE_CONNECTION_ERROR,
      "Failed to communicate with the database.",
      error instanceof Error ? error.message : String(error),
    );
  }
}

function extensionFromFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext && ext.length <= 10 ? ext : "jpg";
}

async function uploadSubmissionImageFile(
  supabase: SupabaseClient,
  submissionId: string,
  file: File,
): Promise<Result<string>> {
  try {
    const objectPath = `submissions/${submissionId}/${crypto.randomUUID()}.${extensionFromFile(file)}`;
    const res = await supabase.storage.from(SUBMISSIONS_BUCKET).upload(objectPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

    if (res.error) return supabaseStorageErrorToResultError(res.error);
    return makeResultData(objectPath);
  } catch (error) {
    return makeResultError(
      ErrorCode.DATABASE_CONNECTION_ERROR,
      "Failed to communicate with the database.",
      error instanceof Error ? error.message : String(error),
    );
  }
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
 */
export async function submitVarroaScan(
  supabase: SupabaseClient,
  input: SubmitVarroaScanInput,
): Promise<Result<SubmitVarroaScanResult>> {
  try {
    const { files, note, type, source, deviceInfo, appVersion } = input;
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
    if (insertRes.error) return supabaseErrorToResultError(insertRes.error);

    const imagePaths: string[] = [];
    for (const [index, file] of files.entries()) {
      // onProgress?.(`Laster opp bilde ${index + 1}/${files.length}`);
      const uploadRes = await uploadSubmissionImageFile(supabase, submissionId, file);
      if (!uploadRes.success) {
        return uploadRes;
      }
      const path = uploadRes.data;
      imagePaths.push(path);

      // onProgress?.(`Registrerer bilde ${index + 1}/${files.length}`);
      const imgRes = await supabase.from("images").insert({
        submission_id: submissionId,
        image_path: path,
        quality: "ikke_vurdert",
        image_status: "pending",
      });
      if (imgRes.error) return supabaseErrorToResultError(imgRes.error);
    }
    return makeResultData({ submissionId, imagePaths });
  } catch (error) {
    return makeResultError(
      ErrorCode.DATABASE_CONNECTION_ERROR,
      "Failed to communicate with the database.",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function getNextsubmissionId(supabase: SupabaseClient, userId: string, byStatus: SubmissionStatus): Promise<Result<string>> {


  // Kommentar til implementasjonen av dette på databasesiden
  // GAMMEL: sorterte på "created_at" - den kolonnen heter nå
  // submission_date i submissions-tabellen (created_at var kun et
  // alias inni getSubmissionSelect(), og gjelder ikke her siden vi
  // bare henter "id"). NY: sorter på det ekte kolonnenavnet.

  // GAMMEL: .from("varroa_submissions"). NY: submissions - updated_at
  // er en ekte kolonne, så sorteringen trengte ingen endring.

  try {
    const underWorkRes = await supabase
      .from("submissions")
      .select("id")
      .eq("status", byStatus)
      .or(`assigned_to.eq.${userId},processed_by.eq.${userId}`)
      .order("updated_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (underWorkRes.error) return supabaseErrorToResultError(underWorkRes.error);
    const resumeId = String(underWorkRes.data?.id ?? "");

    return makeResultData(resumeId);
  } catch (error) {
    return makeResultError(
      ErrorCode.DATABASE_CONNECTION_ERROR,
      "Failed to communicate with the database.",
      error instanceof Error ? error.message : String(error),
    );
  }
}

// export async function getNextsubmissionForControlId(supabase :SupabaseClient, userId:string){
//   // GAMMEL: .from("varroa_submissions"), og sorterte en bar
//   // .select("id")-spørring på "created_at" - som bare er et alias fra
//   // getSubmissionSelect() og ikke finnes utenfor den. NY: riktig
//   // tabellnavn + sortering på den ekte kolonnen submission_date.
//    const reviewRes = await supabase
//       .from("submissions")
//       .select("id")
//       .eq("status", "KLAR_FOR_KONTROLL")
//       .neq("processed_by", userId ?? "")
//       .order("submission_date", { ascending: true })
//       .limit(1)
//       .maybeSingle();

//     if (reviewRes.error) throw reviewRes.error;
//     const reviewId = String(reviewRes.data?.id ?? "");

//     return reviewId;
// }


export async function getSubmissionHistoryById(supabase: SupabaseClient, id: string): Promise<Result<VarroaSubmissionHistory[]>> {

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

  try {
    const historyRes = await supabase
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
      return supabaseErrorToResultError(historyRes.error);
    }
    const loadedHistory = (historyRes.data ?? []) as unknown as VarroaSubmissionHistory[];
    return makeResultData(loadedHistory);
  } catch (error) {
    return makeResultError(
      ErrorCode.DATABASE_CONNECTION_ERROR,
      "Failed to communicate with the database.",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function getSubmissionReviewsById(supabase: SupabaseClient, id: string): Promise<Result<VarroaSubmissionReview[]>> {

  try {
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
      return supabaseErrorToResultError(reviewsRes.error);
    }
    const loadedReviews = (reviewsRes.data ?? []) as unknown as VarroaSubmissionReview[];
    return makeResultData(loadedReviews);

  } catch (error) {
    return makeResultError(
      ErrorCode.DATABASE_CONNECTION_ERROR,
      "Failed to communicate with the database.",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function getSubmissionReviewImagesById(supabase: SupabaseClient, id: string): Promise<Result<VarroaSubmissionImageReview[]>> {

  try {
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
      return supabaseErrorToResultError(imageReviewsRes.error);
    }
    const loadedImageReviews = (imageReviewsRes.data ?? []) as unknown as VarroaSubmissionImageReview[];
    return makeResultData(loadedImageReviews);

  } catch (error) {
    return makeResultError(
      ErrorCode.DATABASE_CONNECTION_ERROR,
      "Failed to communicate with the database.",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function createSignedImages(
  supabase: SupabaseClient,
  imagePaths: string[],
): Promise<Result<SignedImage[]>> {
  if (imagePaths.length === 0) return makeResultData([] as SignedImage[]);

  const signedRes = await supabase.storage
    .from("varroa-submissions")
    .createSignedUrls(imagePaths, 60 * 30);

  if (signedRes.error) return supabaseStorageErrorToResultError(signedRes.error);

  return makeResultData((signedRes.data ?? []).flatMap((item) => {
    if (!item) return [];
    if (typeof item.path !== "string") return [];
    if (typeof item.signedUrl !== "string") return [];
    return [{ path: item.path, url: item.signedUrl }];
  }));
}