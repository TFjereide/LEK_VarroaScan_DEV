"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// lib
import { getAppVersion } from "@/lib/appVersion";
import { getDeviceInfo } from "@/lib/deviceInfo";
import { isVarroaAdmin } from "@/lib/varroaAdmin";
import { getSupabaseClient } from "@/lib/supabaseClient";
// NYTT: database-utility for ny database (samler queries for submissions/images)
import { submitVarroaScan } from "@/lib/varroaScanDb";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import * as utils from "@/lib/utils";
import { SubmissionInfo, SubmissionType } from "@/lib/utils";

// components
import { CommonHeader } from "@/components/header";
import { TechnicalInfoPanel } from "@/components/technicalInfo";
import { PhototypeSection } from "@/components/phototypeSection";
import { SubmissionButtonSection } from "@/components/submissionButtonSection";
import { AfterSubmissionSection } from "@/components/afterSubmissionSection";


export default function Home() {
  const pathname = usePathname();
  const isOnline = useOnlineStatus();

  const [returnMeta, setReturnMeta] = useState<{
    url: string | null;
    label: string;
  }>({
    url: null,
    label: "Tilbake",
  });

  useEffect(() => {
    setReturnMeta(utils.getReturnMeta());
  }, []);


  const {url : returnUrl, label: returnLabel} = returnMeta;
  
  const [error, setError] = useState<string | null>(null);
  
  const [note, setNote] = useState("");
  const [images, setImages] = useState<utils.LocalImage[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [didSubmit, setDidSubmit] = useState(false);
  const [lastSubmissionInfo, setLastSubmissionInfo] = useState< SubmissionInfo | null>(null);
  const [submissionType, setSubmissionType] = useState<SubmissionType>("BUNNBRETT_FOTO");
  
  const [bottomOverlayPx, setBottomOverlayPx] = useState(0);
  const [lastTech, setLastTech] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const cameraLoopTimerRef = useRef<number | null>(null);

  const appVersion = useMemo(() => getAppVersion(), []);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const [sourceParam, setSourceParam] = useState<string | null>(null);
  const [authRedirectPath, setAuthRedirectPath] = useState<string | null>(null);
  const [isMagicLinkLanding, setIsMagicLinkLanding] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const type = utils.normalizeType(params.get("type"));
    if (type){
      setSubmissionType(type);
    }

    setSourceParam(
      utils.normalizeSource(params.get("source"))
    );

    setAuthRedirectPath(
      utils.normalizeInternalRedirectPath(params.get("authRedirect"))
    );

    setIsMagicLinkLanding(
      utils.hasMagicLinkHash(window.location.hash)
    );
  }, []);

  const isFromBiensVokter = () => utils.isLikelyFromBiensVokter(returnUrl, sourceParam);

  const canAutoReopenCamera = useMemo(() => {
    if (typeof window === "undefined") return false;
    return utils.MOBILE_CAMERA_LOOP_RE.test(window.navigator.userAgent ?? "");
  }, []);



  // AUTH redirection
  useEffect(() => {
    // Nothing to do unless we've been given a redirect destination.
    if (!authRedirectPath) return;

    // Get the browser-side Supabase client. If it isn't available,
    // we can't check authentication or subscribe to auth changes.
    const supabase = getSupabaseClient();
    if (!supabase) return;


    // These variables belong to this particular invocation of the effect.
    //
    // `active` prevents an async callback from doing anything after
    // the effect has been cleaned up.
    //
    // `redirected` prevents multiple auth events from causing multiple
    // redirects.
    let active = true;
    let redirected = false;
    const target = `${basePath}${authRedirectPath}`;

    // Perform the redirect once we have a logged-in user.
    const redirectIfReady = (session: { user?: unknown } | null) => {
      if (!active || redirected || !session?.user) return;
      redirected = true;
      window.location.replace(target);
    };

    // Check whether we're already authenticated.
    //
    // This handles the case where the user was already logged in
    // when this component mounted.
    void supabase.auth.getSession().then(({ data }) => {
      redirectIfReady(data.session);
    });

    // Also listen for future authentication changes.
    //
    // For example, the user might log in after the component has mounted.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      redirectIfReady(session);
    });


    // Clean up when the component unmounts or when one of the
    // dependencies changes.
    //
    // Without this, the auth listener would remain subscribed and
    // could continue trying to redirect after this component is gone.
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [authRedirectPath, basePath]);

  useEffect(() => {
    if (authRedirectPath || !isMagicLinkLanding) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    let active = true;
    let redirected = false;
    const target = `${basePath}/admin/innsendinger/`;

    const redirectIfAdmin = async (
      session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"],
    ) => {
      if (!active || redirected || !session?.user) return;
      const admin = await isVarroaAdmin(supabase, session);
      if (!active || redirected || !admin) return;
      redirected = true;
      window.location.replace(target);
    };

    void supabase.auth.getSession().then(({ data }) => {
      void redirectIfAdmin(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void redirectIfAdmin(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [authRedirectPath, basePath, isMagicLinkLanding]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const raw = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop),
      );
      const keyboardLikely = raw >= 140;
      const keyboardLiftPx = keyboardLikely ? Math.min(raw, 360) : 0;
      setBottomOverlayPx(keyboardLiftPx);
    };

    update();
    vv.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      vv.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (cameraLoopTimerRef.current != null) {
        window.clearTimeout(cameraLoopTimerRef.current);
      }
    };
  }, []);

  const reopenCamera = () => {
    if (!canAutoReopenCamera) return;
    if (cameraLoopTimerRef.current != null) {
      window.clearTimeout(cameraLoopTimerRef.current);
    }
    cameraLoopTimerRef.current = window.setTimeout(() => {
      cameraInputRef.current?.click();
    }, 120);
  };

  const onPickImages = (
    files: FileList | null,
    options?: { reopenCamera?: boolean },
  ) => {
    setError(null);
    if (!files || files.length === 0) return;
    const picked = Array.from(files);

    const tooLarge = picked.find(
      (f) => f.size > utils.MAX_FILE_SIZE_MB * 1024 * 1024,
    );
    if (tooLarge) {
      setError(
        `Bildet "${tooLarge.name}" er for stort (${utils.formatBytes(tooLarge.size)}). Maks ${utils.MAX_FILE_SIZE_MB} MB per bilde.`,
      );
      return;
    }

    const next: utils.LocalImage[] = picked.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      note: "",
      noteOpen: false,
    }));
    setImages((prev) => [...prev, ...next]);

    if (options?.reopenCamera && picked.length > 0) {
      reopenCamera();
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((p) => p.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const updateImageNote = (id: string, value: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, note: value } : img)),
    );
  };

  const toggleImageNote = (id: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, noteOpen: !img.noteOpen } : img,
      ),
    );
  };

  const resetForm = () => {
    setSubmissionType("BUNNBRETT_FOTO");
    setNote("");
    setError(null);
    setIsSubmitting(false);
    setDidSubmit(false);
    setLastSubmissionInfo(null);
    setImages((prev) => {
      for (const img of prev) URL.revokeObjectURL(img.previewUrl);
      return [];
    });
  };

  const onSubmit = async () => {
    setError(null);
    setLastTech(null);

    if (!isOnline) {
      setError("Du er offline. Koble til nett og prøv igjen.");
      return;
    }

    if (images.length === 0) {
      setError("Ta minst ett bilde.");
      return;
    }

    const supabase = getSupabaseClient();
    // const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
    // const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    // if (!supabase || !supabaseUrl || !anonKey) {
    if (!supabase) {
      setError("Appen mangler Supabase-konfig (NEXT_PUBLIC_SUPABASE_URL).");
      return;
    }

    let step = "Starter";
    setIsSubmitting(true);
    try {
      // NY (mot ny database - submissions + images via lib/varroaScanDb.ts):
      const noteValue = note.trim() ? note.trim() : null;

      const { submissionId, imagePaths } = await submitVarroaScan(supabase, {
        files: images.map((img) => img.file),
        note: noteValue,
        type: submissionType,
        source: sourceParam ?? "web",
        deviceInfo: getDeviceInfo(),
        appVersion,
        onProgress: (s) => {
          step = s;
        },
      });

      setLastSubmissionInfo({
        id: submissionId,
        type: submissionType,
        note: noteValue,
        imagesCount: imagePaths.length,
      });
      setDidSubmit(true);
      setImages((prev) => {
        for (const img of prev) URL.revokeObjectURL(img.previewUrl);
        return [];
      });
      setNote("");
    } catch (e) {
      const raw = e instanceof Error ? e.message : utils.normalizeErrorMessage(e);
      // const raw = e instanceof Error ? e.message : String(e);
      setLastTech(`${step}: ${raw}`);
      setError(`Kunne ikke sende inn (${step}): ${raw}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // After submission page
    didSubmit ? 
    <AfterSubmissionSection 
      returnUrl={returnUrl} 
      returnLabel={returnLabel} 
      isOnline={isOnline} 
      submissionInfo={lastSubmissionInfo} 
      onClick={ () => {setDidSubmit(false)}} />
    :
    // Main page
    <div
      className="flex flex-col min-h-[100svh] px-4 pt-8"
      style={{
        paddingBottom: `calc(8rem + env(safe-area-inset-bottom) + ${bottomOverlayPx}px)`,
      }}
    >
      <CommonHeader url={returnUrl} label={returnLabel} isOnline={isOnline}></CommonHeader>

      <main className="mx-auto mt-6 w-full max-w-xl">
        <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5">
          <div className="text-base font-semibold">
            Send inn bunnbrett-bilder (MVP)
          </div>
          <div className="mt-1 text-sm text-zinc-400">
            Raskt, enkelt og robust. Snakk med utviklerne hvis noe føles rart.
          </div>
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
            <div className="font-semibold text-zinc-200">Tips for KI-telling</div>
            <div className="mt-1">
              Ta bildet rett ovenfra, sørg for jevnt lys, og få med hele området der midden ligger.
            </div>
          </div>

          <div className="mt-6 space-y-5">

            <div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-zinc-200">Bilder</div>
                <div className="text-xs text-zinc-400">{images.length} valgt</div>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  onPickImages(e.target.files, { reopenCamera: true });
                  e.currentTarget.value = "";
                }}
              />

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="mt-2 flex h-14 w-full items-center justify-center rounded-2xl bg-amber-400 px-4 text-base font-semibold text-zinc-950 active:opacity-90"
              >
                {"\uD83D\uDCF7"} Ta bilde
              </button>

              <div className="mt-3 space-y-3">
                {images.map((img, index) => (
                  <div
                    key={img.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                        <img
                          src={img.previewUrl}
                          alt={`Bilde ${index + 1}`}
                          className="h-28 w-28 object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-zinc-100">
                              Bilde {index + 1}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                              {utils.formatBytes(img.file.size)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(img.id)}
                            className="rounded-2xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 active:opacity-90"
                          >
                            Fjern
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => toggleImageNote(img.id)}
                            className="rounded-2xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 active:opacity-90"
                          >
                            {img.noteOpen || img.note ? "Skjul notat" : "Legg til notat"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {img.noteOpen ? (
                      <textarea
                        value={img.note}
                        onChange={(e) => updateImageNote(img.id, e.target.value)}
                        rows={2}
                        className="mt-3 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
                        placeholder="Kort notat for dette bildet (valgfritt)"
                      />
                    ) : null}
                  </div>
                ))}

                {/* GAMMEL: {images.length < MAX_IMAGES_PER_SUBMISSION ? (<label>...</label>) : null}
                    NY: ingen grense på antall bilder - knappen vises alltid */}
                <label className="h-40 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 flex items-center justify-center text-sm font-semibold text-zinc-200 active:opacity-90">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                    onChange={(e) => onPickImages(e.target.files)}
                  />
                  + Legg til
                </label>
              </div>

              <div className="mt-2 text-xs text-zinc-500">
                Ubegrenset antall bilder. Maks {utils.MAX_FILE_SIZE_MB} MB per bilde.
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-zinc-200">
                Kommentar (valgfritt)
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="F.eks. bigård, dato, behandling, noe spesielt…"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

          </div>
            <TechnicalInfoPanel isFromBiensVokter={isFromBiensVokter()} sourceParam={sourceParam} lastTech={lastTech}></TechnicalInfoPanel>
            <PhototypeSection submissionType={submissionType} onSubmissionTypeChange={setSubmissionType} />
        </div>
      </main>
      <SubmissionButtonSection isSubmitting={isSubmitting} onSubmit={onSubmit} bottomOverlayPx={bottomOverlayPx} />
    </div>
  );
}