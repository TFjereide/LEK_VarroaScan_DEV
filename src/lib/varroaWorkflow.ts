import type { SupabaseClient } from "@supabase/supabase-js";

export const VARROA_STATUSES = [
  "NY",
  "UNDER_ARBEID",
  "KLAR_FOR_KONTROLL",
  "GODKJENT",
  "KLAR_FOR_TRENING",
  "ARKIVERT",
] as const;

export type VarroaSubmissionStatus = (typeof VARROA_STATUSES)[number];
export type VarroaRole = "SUPERADMIN" | "FAGANSVARLIG" | "STUDENT";

// GAMMEL: VarroaSubmissionRecord pekte på varroa_submissions (gammel
// databasen) og hadde flere felt som enten ike finnes i den nye
// databasen, eller som har flyttet et annet sted:
//  - user_id/user_name: fantes ikke i det hele tatt - nytt skjema tillater
//    anonym innsending (birøkter trenger ikke logge inn).
//  - images: var et flatt tekst-array direkte på raden. Nå er det en
//    egen relasjon (images-tabellen) - se getSumissionImagePaths() under.
//  - quality_rating / manual_mite_count / review_comment: lå på selve
//    innsendingen. Disse tilhører nå enten ett bilde (images.quality,
//    images.mite_count) eller en konkret vurdering
//    (varroa_submission_review_images), ikke innsendingen som helhet.
//  - assigned_at/processed_at/approved_by/approved_at/returned_by/
//    returned_at: erstattet av submission_history (se
//    findApprovedBy() under for hvordan vi henter "hvem godkjente").
//  - current_role_owner / route: ble ikke lest noe sted i koden vi har
//    gått gjennom - fjernet i stedet for å gjette et nytt hjem for dem.
//
// NY: samme id/type/status/assigned_to/processed_by/training_ready som
// før (de kolonnene finnes fortsatt), pluss et par alias forklart i
// getSubmissionSelect() under.
export type VarroaSubmissionRecord = {
  id: string;
  created_at: string;
  updated_at: string | null;
  type: string;
  note: string | null;
  status: VarroaSubmissionStatus | string;
  assigned_to: string | null;
  processed_by: string | null;
  training_ready: boolean;
  // Rå form rett fra Supabase (images er en relasjon nå, ikke et
  // tekst-array). Bruk getSubmissionImagePaths(item) for å få et vanlig
  // string[] med bildestier, slik resten av koden er vant til.
  images: { image_path: string }[] | null;
};

// NY: matcher submission_history-tabellen. changed_by/changed_at er de
// faktiske kolonnenavnene i databasen, men vi henter dem ut med alias
// (se getHistorySelect()) slik at feltnavnene her - og dermed resten av
// koden som leser entry.user_id / entry.created_at - kan holdes like
// gamle VarroaSubmissionHistory for å unngå unødvendige endringer andre
// steder.
export type VarroaSubmissionHistory = {
  id: string;
  submission_id: string;
  created_at: string;
  user_id: string | null;
  action: string | null;
  from_status: VarroaSubmissionStatus | null;
  to_status: VarroaSubmissionStatus | null;
  comment: string | null;
  payload: Record<string, unknown> | null;
};

// Uendret - matcher varroa_submission_reviews 1:1, ingen alias nødvendig.
export type VarroaSubmissionReview = {
  id: string;
  submission_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  mite_count: number | null;
  image_quality: string | null;
  comment: string | null;
  training_ready: boolean;
  approved: boolean;
  current_image_index: number;
  image_notes: unknown;
};

// Uendret - matcher varroa_submission_review_images 1:1.
export type VarroaSubmissionImageReview = {
  id: string;
  submission_id: string;
  review_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  image_index: number;
  mite_count: number | null;
  image_quality: string | null;
  comment: string | null;
  training_ready: boolean;
  approved: boolean;
};

export type SignedImage = {
  path: string;
  url: string;
};

export function formatDateTime(value: string | null | undefined) {
  const raw = String(value ?? "");
  if (!raw) return "—";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleString("no-NO");
}

export function formatShortDate(value: string | null | undefined) {
  const raw = String(value ?? "");
  if (!raw) return "—";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleDateString("no-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function getStatusUi(status: string) {
  switch (status) {
    case "NY":
      return {
        label: "Ny",
        chipClass: "border-zinc-700 bg-zinc-800 text-zinc-100",
        accentClass: "bg-zinc-500",
      };
    case "UNDER_ARBEID":
      return {
        label: "Under arbeid",
        chipClass: "border-amber-300 bg-amber-400 text-zinc-950",
        accentClass: "bg-amber-400",
      };
    case "KLAR_FOR_KONTROLL":
      return {
        label: "Venter pa kontroll",
        chipClass: "border-sky-300 bg-sky-400 text-zinc-950",
        accentClass: "bg-sky-400",
      };
    case "GODKJENT":
      return {
        label: "Godkjent",
        chipClass: "border-emerald-300 bg-emerald-400 text-zinc-950",
        accentClass: "bg-emerald-400",
      };
    case "KLAR_FOR_TRENING":
      return {
        label: "Klar for trening",
        chipClass: "border-fuchsia-300 bg-fuchsia-400 text-zinc-950",
        accentClass: "bg-fuchsia-400",
      };
    case "ARKIVERT":
      return {
        label: "Arkivert",
        chipClass: "border-zinc-700 bg-zinc-950 text-zinc-200",
        accentClass: "bg-zinc-700",
      };
    default:
      return {
        label: status || "Ukjent",
        chipClass: "border-zinc-700 bg-zinc-900 text-zinc-100",
        accentClass: "bg-zinc-500",
      };
  }
}

export function getRoleLabel(role: VarroaRole | null) {
  switch (role) {
    case "SUPERADMIN":
      return "Superadmin";
    case "FAGANSVARLIG":
      return "Fagansvarlig";
    case "STUDENT":
      return "Student";
    default:
      return "Ukjent";
  }
}

export function getDisplayNameFromEmail(email: string | null | undefined): string {
  if (!email) return "Gjest";
  const local = String(email).split("@")[0] ?? "";
  if (!local) return email;
  const cleaned = local
    .replace(/[0-9._-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  if (!cleaned) return local;
  return cleaned
    .split(" ")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ")
    .trim();
}

export function getTypeLabel(type: string | null | undefined) {
  if (type === "BUNNBRETT_FOTO") return "Bunnbrett foto";
  if (type === "KONTROLLFOTO") return "Kontrollfoto";
  return String(type ?? "Ukjent");
}

export function getQualityOptions() {
  return [
    { value: "", label: "Ikke vurdert" },
    { value: "LAV", label: "Lav" },
    { value: "MIDDELS", label: "Middels" },
    { value: "HØY", label: "Høy" },
  ];
}

export function getHistoryActionLabel(action: string | null) {
  switch (action) {
    case "CLAIMED_NEXT":
      return "Neste sak hentet";
    case "CONTROL_NEXT_IMAGE":
      return "Neste kontrollbilde";
    case "WORK_NEXT_IMAGE":
      return "Neste bilde";
    case "SAVE_DRAFT":
      return "Lagring";
    case "READY_FOR_REVIEW":
      return "Sendt til kontroll";
    case "SAVE_AND_NEXT":
      return "Lagre og neste";
    case "APPROVED":
      return "Godkjent";
    case "APPROVED_FOR_TRAINING":
      return "Klar for trening";
    case "RETURNED":
      return "Sendt tilbake";
    case "ARCHIVED":
      return "Arkivert";
    default:
      return action ?? "Ukjent";
  }
}

// GAMMEL: sjekket mot navn fra den gamle, ikke-migrerte databasen. Alle
// disse tabellene/kolonnene/funksjonene finnes nå (etter de to
// migrasjonene), men vi beholder sjekken som en defensiv sikkerhetsnett
// i tilfelle noen kjører koden før migrasjonene er kjørt.
export function isMissingWorkflowSchemaError(value: unknown) {
  if (!value || typeof value !== "object") return false;
  if (!("message" in value)) return false;
  const message = String((value as { message?: unknown }).message ?? "");
  return (
    message.includes("varroa_user_roles") ||
    message.includes("varroa_submission_history") ||
    message.includes("submission_history") ||
    message.includes("varroa_submission_reviews") ||
    message.includes("varroa_submission_review_images") ||
    message.includes("assigned_to") ||
    message.includes("training_ready") ||
    message.includes("current_image_index") ||
    message.includes("image_notes") ||
    message.includes("varroa_claim_next_submission") ||
    message.includes("varroa_available_new_count")
  );
}

export function getWorkflowMigrationMessage() {
  return "Produksjonsflyten krever ny DB-migrasjon. Kjor siste workflow-migrasjoner i Supabase forst.";
}

export function isAvailableControlSubmission(
  item: Pick<VarroaSubmissionRecord, "status" | "processed_by">,
  userId: string | null | undefined,
) {
  if (item.status !== "KLAR_FOR_KONTROLL") return false;
  if (!userId) return true;
  return item.processed_by !== userId;
}

export function formatWorkerLabel(
  userId: string | null | undefined,
  workerId: string | null | undefined,
) {
  if (!workerId) return "Ingen";
  if (userId && workerId === userId) return "Meg";
  return `${workerId.slice(0, 8)}...`;
}

// NY: siden "hvem godkjente" ikke lenger er en kolonne på submissions,
// men en hendelse i historikken, leter denne gjennom historikken (nyeste
// først) etter siste gang saken gikk til GODKJENT eller KLAR_FOR_TRENING,
// og returnerer hvem som gjorde det. Brukes i stedet for item.approved_by.
export function findApprovedBy(history: VarroaSubmissionHistory[]): string | null {
  const entry = history.find(
    (h) => h.to_status === "GODKJENT" || h.to_status === "KLAR_FOR_TRENING",
  );
  return entry?.user_id ?? null;
}

// NY: gjør om images-relasjonen ({image_path: string}[]) som kommer fra
// getSubmissionSelect() til et vanlig string[] med bildestier - samme
// form koden allerede forventet fra den gamle, flate images-kolonnen.
export function getSubmissionImagePaths(
  record: Pick<VarroaSubmissionRecord, "images">,
): string[] {
  if (!record.images) return [];
  return record.images.map((img) => img.image_path).filter(Boolean);
}

export async function createSignedImages(
  supabase: SupabaseClient,
  imagePaths: string[],
) {
  if (imagePaths.length === 0) return [] as SignedImage[];

  const signedRes = await supabase.storage
    .from("varroa-submissions")
    .createSignedUrls(imagePaths, 60 * 30);

  if (signedRes.error) throw signedRes.error;

  return (signedRes.data ?? []).flatMap((item) => {
    if (!item) return [];
    if (typeof item.path !== "string") return [];
    if (typeof item.signedUrl !== "string") return [];
    return [{ path: item.path, url: item.signedUrl }];
  });
}

// GAMMEL: selekterte 24 kolonner direkte fra varroa_submissions (gammel
// database), inkludert flere felt vi ikke lenger har (se forklaringen
// ved VarroaSubmissionRecord over).
//
// NY: leser fra submissions, med to alias slik at feltnavnene i resten
// av koden (item.created_at, item.note) ikke må endres:
//  - created_at:submission_date  (kolonnen heter submission_date i DB)
//  - note:comment                (kolonnen heter comment i DB)
// images hentes som en relasjon - bruk getSubmissionImagePaths() på
// resultatet for å få et flatt string[].
export function getSubmissionSelect() {
  return [
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
}

// NY: samme alias-prinsipp for submission_history - beholder
// changed_by/changed_at som de faktiske DB-kolonnene, men henter dem ut
// som user_id/created_at slik VarroaSubmissionHistory-typen (og all kode
// som leser den) allerede forventer.
export function getHistorySelect() {
  return [
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
}