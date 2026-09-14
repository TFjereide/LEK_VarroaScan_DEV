

export const MAX_FILE_SIZE_MB = 15;
export const MOBILE_CAMERA_LOOP_RE = /iPhone|iPad|iPod|Android/i;

export type SubmissionType = "BUNNBRETT_FOTO" | "KONTROLLFOTO";

export type Submission = {
    id: string;
    type: SubmissionType;
    note: string | null;
    imagesCount: number;
};


export function formatBytes(bytes: number) {
  const kb = bytes / 1024;
  const mb = kb / 1024;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${kb.toFixed(0)} KB`;
}

export function normalizeErrorMessage(e: unknown) {
  const raw =
    typeof e === "object" && e && "message" in e
      ? String((e as { message?: unknown }).message)
      : "Ukjent feil";

  const lower = raw.toLowerCase();
  if (
    lower.includes("row-level security") ||
    lower.includes("violates row-level security") ||
    lower.includes("rls")
  ) {
    return `RLS blokkerer innsetting i Supabase. Sjekk at du kjører SQL i samme Supabase-prosjekt som appen peker mot (se supabaseUrl i teknisk info). Kjør både policy-setup og GRANT (schema/table privileges) i dette prosjektet. (${raw})`;
  }

  if (
    e instanceof TypeError ||
    lower.includes("load failed") ||
    lower.includes("failed to fetch")
  ) {
    return `Nettverksfeil mot backend. Sjekk Vercel env (NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY) og at Supabase-migrasjonen er kjørt (bucket/policies). (${raw})`;
  }

  return raw;
}

export function isMissingImageNotesColumnError(value: unknown) {
  if (!value || typeof value !== "object") return false;
  if (!("message" in value)) return false;
  const message = String((value as { message?: unknown }).message ?? "");
  return message.includes("image_notes");
}

export function normalizeSource(value: string | null) {
  const raw = (value ?? "").trim().toLowerCase();
  const v = raw.replace(/\s+/g, "-");
  if (!v) return null;
  if (!/^[a-z0-9_-]{1,32}$/.test(v)) return null;
  if (
    v === "biens-vokter" ||
    v === "biens_vokter" ||
    v === "lek-biens-vokter" ||
    v === "lek_biens_vokter" ||
    v === "bv"
  ) {
    return "biens-vokter";
  }
  return v;
}

export function normalizeType(value: string | null): SubmissionType | null {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "bunnbrett" || v === "bunnbrett_foto") return "BUNNBRETT_FOTO";
  if (v === "kontroll" || v === "kontrollfoto") return "KONTROLLFOTO";
  return null;
}

export function normalizeReturnUrl(value: string | null) {
  const raw = (value ?? "").trim();
  if (!raw || raw.length > 500) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeInternalRedirectPath(value: string | null) {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  return raw;
}

export function hasMagicLinkHash(hash: string) {
  const raw = String(hash ?? "").replace(/^#/, "");
  if (!raw) return false;
  const params = new URLSearchParams(raw);
  return Boolean(params.get("access_token") || params.get("refresh_token"));
}

export function getReturnMeta() {
  if (typeof window === "undefined") {
    return { url: null as string | null, label: "Tilbake" };
  }

  const storageUrlKey = "lek_varroascan_return_url";
  const storageSourceKey = "lek_varroascan_return_source";
  const params = new URLSearchParams(window.location.search);

  const sourceFromQuery = normalizeSource(params.get("source"));

  const keys = ["returnTo", "return_to", "backTo", "back_to", "return", "back"];
  for (const key of keys) {
    const fromParam = normalizeReturnUrl(params.get(key));
    if (!fromParam) continue;
    try {
      localStorage.setItem(storageUrlKey, fromParam);
      if (sourceFromQuery) localStorage.setItem(storageSourceKey, sourceFromQuery);
    } catch {}
    return {
      url: fromParam,
      label:
        sourceFromQuery === "biens-vokter"
          ? "Tilbake til LEK-Biens Vokter"
          : "Tilbake",
    };
  }

  let urlFromStorage: string | null = null;
  let sourceFromStorage: string | null = null;
  try {
    urlFromStorage = normalizeReturnUrl(localStorage.getItem(storageUrlKey));
    sourceFromStorage = normalizeSource(localStorage.getItem(storageSourceKey));
  } catch {}

  const envDefault =
    process.env.NEXT_PUBLIC_RETURN_URL ??
    process.env.NEXT_PUBLIC_BIENS_VOKTER_RETURN_URL ??
    "";
  const urlFromEnv = normalizeReturnUrl(envDefault);
  const urlFromReferrer = normalizeReturnUrl(document.referrer);

  const finalUrl = urlFromStorage ?? urlFromEnv ?? urlFromReferrer;
  const finalSource = sourceFromQuery ?? sourceFromStorage;
  const label =
    finalSource === "biens-vokter" ? "Tilbake til LEK-Biens Vokter" : "Tilbake";

  return { url: finalUrl, label };
}

export function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const ua = window.navigator.userAgent ?? "";
  const isIos = /iPad|iPhone|iPod/.test(ua);
  if (isIos) return Boolean(nav.standalone);
  try {
    return window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

export function isLikelyFromBiensVokter(returnUrl: string | null, sourceParam: string | null) {
  if (sourceParam === "biens-vokter") return true;
  if (!returnUrl) return false;
  try {
    const u = new URL(returnUrl);
    const h = u.hostname.toLowerCase();
    return h === "lekbie.no" || h.endsWith(".lekbie.no");
  } catch {
    return false;
  }
}