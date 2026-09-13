import type { SupabaseClient } from "@supabase/supabase-js";

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

export const SUBMISSIONS_BUCKET = "varroa-submissions";

export type ImageQuality = "Høy" | "Middels" | "Lav" | "ikke_vurdert";
export type ImageStatus = "pending" | "analyzed" | "failed";
export type SubmissionStatus = "NY" | "UNDER_ARBEID" | "ARKIVERT";
export type SubmissionType = "BUNNBRETT_FOTO" | "KONTROLLFOTO";

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

const SUBMISSION_SELECT =
  "id, submission_date, source, device_info, app_version, comment, status, type, " +
  "images(image_id, submission_id, image_path, quality, notes, image_status, meta_data, mite_count, created_at)";

/** Admin-oversikt: alle innsendinger, nyeste først. */
export async function fetchSubmissions(
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