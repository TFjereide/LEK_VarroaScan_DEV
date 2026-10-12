"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  appendAdminContext,
  getAdminContextSearch,
  getAdminReturnInfo,
} from "@/lib/adminNavigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import {
  createSignedImages,
  formatWorkerLabel,
  formatDateTime,
  // NYE imports: findApprovedBy erstatter item.approved_by (den kolonnen
  // finnes ikke lenger), getHistorySelect() gir riktig spørring mot
  // submission_history, getSubmissionImagePaths() gjør om images-relasjonen
  // til et vanlig string[] slik koden allerede forventet.
  findApprovedBy,
  getDisplayNameFromEmail,
  getHistoryActionLabel,
  getHistorySelect,
  getQualityOptions,
  getRoleLabel,
  getStatusUi,
  getSubmissionImagePaths,
  getSubmissionSelect,
  getTypeLabel,
  getWorkflowMigrationMessage,
  isAvailableControlSubmission,
  isMissingWorkflowSchemaError,
  type SignedImage,
  type VarroaSubmissionHistory,
  type VarroaSubmissionImageReview,
  type VarroaSubmissionRecord,
  type VarroaSubmissionReview,
} from "@/lib/varroaWorkflow";

import { ZoomableAnnotatedImage } from "@/components/submissions/zoomableAnnotatedImage"

import { useAuth } from "@/app/auth-provider";
import { getClient } from "@/lib/auth/client";
import { createDraftFromImageReview, createEmptyImageDraft, extractAnnotationsFromImageNotes, ImageReviewDraft, VarroaBoundingBox } from "@/components/submissions/zoomableAnnotatedImage";
import { SubmissionInfoCard } from "@/components/submissions/submissionInfoCard";

type SaveAction =
  | "SAVE_DRAFT"
  | "READY_FOR_REVIEW"
  | "SAVE_AND_NEXT"
  | "APPROVED"
  | "APPROVED_FOR_TRAINING"
  | "RETURNED"
  | "ARCHIVED";

function getActionButtonLabel(action: SaveAction) {
  switch (action) {
    case "SAVE_DRAFT":
      return "Lagre kladd";
    case "READY_FOR_REVIEW":
      return "Klar for kontroll";
    case "SAVE_AND_NEXT":
      return "Lagre og neste";
    case "APPROVED":
      return "Godkjenn";
    case "APPROVED_FOR_TRAINING":
      return "Godkjenn + trening";
    case "RETURNED":
      return "Send tilbake";
    case "ARCHIVED":
      return "Arkiver";
  }
}

export function ProductionSubmissionClient() {

  const isOnline = useOnlineStatus();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const returnTo = searchParams.get("returnto") ?? `${basePath}/admin/innsendinger`;

  const supabase = getClient();

  const adminContextSearch = useMemo(() => {
    if (typeof window === "undefined") return "";
    return getAdminContextSearch(window.location.search);
  }, []);


  const returnInfo = useMemo(() => {
    if (typeof window === "undefined") {
      return { href: null as string | null, label: null as string | null };
    }
    const raw = getAdminReturnInfo(window.location.search);
    if (raw.href) return raw;
    return { href: null as string | null, label: null as string | null };
  }, []);

  const adminLoginHref = useMemo(() => {
    if (typeof window === "undefined") return `${basePath}/admin/`;
    const params = new URLSearchParams(window.location.search);
    const currentPath = window.location.pathname.startsWith(basePath)
      ? window.location.pathname.slice(basePath.length) || "/"
      : window.location.pathname;
    params.set("next", `${currentPath}${window.location.search}`);
    return `${basePath}/admin/?${params.toString()}`;
  }, [basePath]);

  const { user, authedActions, isAdmin } = useAuth();

  // const [isAuthed, setIsAuthed] = useState(false);
  // const [access, setAccess] = useState<AuthorizedUserActions | null>(null);
  const [item, setItem] = useState<VarroaSubmissionRecord | null>(null);
  const [images, setImages] = useState<SignedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviews, setReviews] = useState<VarroaSubmissionReview[]>([]);
  const [imageDrafts, setImageDrafts] = useState<Record<number, ImageReviewDraft>>({});
  const [history, setHistory] = useState<VarroaSubmissionHistory[]>([]);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const totalImages = images.length;
  const isLastImage = totalImages === 0 || selectedImage >= totalImages - 1;
  const currentDraft = imageDrafts[selectedImage] ?? createEmptyImageDraft(selectedImage);

  const reload = useCallback(async () => {
    setLoadError(null);
    setSaveError(null);
    setSaveOk(null);

    if (!id) {
      setLoadError("Mangler id i URL. Bruk ?id=<uuid>.");
      return;
    }
    if (!supabase) {
      setLoadError("Mangler Supabase-konfig (NEXT_PUBLIC_SUPABASE_*).");
      return;
    }

    setIsLoading(true);
    try {
      // const { data: sessionData } = await supabase.auth.getSession();
      // const session = sessionData.session;
      // setIsAuthed(Boolean(session));
      // if (!session) {
      // setAccess(null);
      // setItem(null);
      // setImages([]);
      // window.location.replace(adminLoginHref);
      // return;
      // }

      // const nextAccess = await getAuthorizedUserActions(supabase, session);
      // setAccess(nextAccess);
      // if (!nextAccess.role) {
      //   setItem(null);
      //   setImages([]);
      //   setLoadError("Du mangler rolle i VarroaScan-produksjonen.");
      //   return;
      // }

      // GAMMEL: leste fra varroa_submissions og varroa_submission_history
      // (gamle databasen, finnes ikke lenger). NY: submissions/
      // submission_history er de nye tabellnavnene. Historikk-spørringen
      // bruker nå getHistorySelect(), som henter de faktiske kolonnene
      // (changed_by/changed_at) men gir dem tilbake under de gamle
      // feltnavnene (user_id/created_at) slik resten av filen forventer.
      const [submissionRes, reviewsRes, historyRes, imageReviewsRes] = await Promise.all([
        supabase
          .from("submissions")
          .select(getSubmissionSelect())
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("varroa_submission_reviews")
          .select(
            "id,submission_id,created_at,updated_at,created_by,mite_count,image_quality,comment,training_ready,approved,current_image_index,image_notes",
          )
          .eq("submission_id", id)
          .order("updated_at", { ascending: false })
          .limit(20),
        supabase
          .from("submission_history")
          .select(getHistorySelect())
          .eq("submission_id", id)
          .order("changed_at", { ascending: false })
          .limit(40),
        supabase
          .from("varroa_submission_review_images")
          .select(
            "id,submission_id,review_id,created_at,updated_at,created_by,image_index,mite_count,image_quality,comment,training_ready,approved",
          )
          .eq("submission_id", id)
          // NOTE: FUngerte etter at jeg tok dette vekk. Det virker ikke som om det
          // burde være her heller?
          // .eq("created_by", authedActions.userId)
          .order("image_index", { ascending: true }),
      ]);

      if (submissionRes.error) {
        if (isMissingWorkflowSchemaError(submissionRes.error)) {
          setLoadError(getWorkflowMigrationMessage());
          return;
        }
        throw submissionRes.error;
      }
      if (!submissionRes.data) {
        setLoadError("Fant ikke saken.");
        setItem(null);
        setImages([]);
        return;
      }
      if (reviewsRes.error) {
        if (isMissingWorkflowSchemaError(reviewsRes.error)) {
          setLoadError(getWorkflowMigrationMessage());
          return;
        }
        throw reviewsRes.error;
      }
      if (historyRes.error) {
        if (isMissingWorkflowSchemaError(historyRes.error)) {
          setLoadError(getWorkflowMigrationMessage());
          return;
        }
        throw historyRes.error;
      }
      if (imageReviewsRes.error) {
        if (isMissingWorkflowSchemaError(imageReviewsRes.error)) {
          setLoadError(getWorkflowMigrationMessage());
          return;
        }
        throw imageReviewsRes.error;
      }

      const loaded = submissionRes.data as unknown as VarroaSubmissionRecord;
      const loadedReviews =
        (reviewsRes.data ?? []) as unknown as VarroaSubmissionReview[];
      const loadedImageReviews =
        (imageReviewsRes.data ?? []) as unknown as VarroaSubmissionImageReview[];
      const loadedHistory =
        (historyRes.data ?? []) as unknown as VarroaSubmissionHistory[];
      // GAMMEL: loaded.images var et flatt string[] direkte på raden.
      // NY: images er en egen relasjon ({image_path: string}[]) hentet inn
      // via getSubmissionSelect() - getSubmissionImagePaths() gjør den om
      // til det samme flate string[]-formatet som før.
      const signedImages = await createSignedImages(
        supabase,
        getSubmissionImagePaths(loaded),
      );

      setItem(loaded);
      setReviews(loadedReviews);
      setHistory(loadedHistory);
      setImages(signedImages);

      const ownReview = loadedReviews.find((review) => review.created_by === authedActions.userId);
      const latestReview = ownReview ?? loadedReviews[0] ?? null;
      const sharedImageNotes = latestReview?.image_notes;
      const nextImageIndex =
        typeof latestReview?.current_image_index === "number"
          ? latestReview.current_image_index
          : 0;
      setSelectedImage(
        signedImages.length === 0 ? 0 : Math.min(Math.max(nextImageIndex, 0), signedImages.length - 1),
      );
      const nextDrafts: Record<number, ImageReviewDraft> = {};
      for (let index = 0; index < signedImages.length; index += 1) {
        nextDrafts[index] = createEmptyImageDraft(index);
      }
      for (const imageReview of loadedImageReviews) {
        nextDrafts[imageReview.image_index] = createDraftFromImageReview(
          imageReview,
          sharedImageNotes,
        );
      }
      if (loadedImageReviews.length === 0 && latestReview) {
        const fallbackIndex = Math.min(Math.max(nextImageIndex, 0), Math.max(signedImages.length - 1, 0));
        const annotations = extractAnnotationsFromImageNotes(sharedImageNotes, fallbackIndex);
        // GAMMEL: falt tilbake på loaded.manual_mite_count / loaded.quality_rating /
        // loaded.review_comment når det ikke fantes en per-bilde-vurdering ennå.
        // NY: disse tre kolonnene finnes ikke lenger på submissions - de var
        // aldri noe annet enn et utgangspunkt for review-verdiene, så vi
        // faller nå bare tilbake på tomt/false når verken annotations eller
        // review-raden har noe.
        nextDrafts[fallbackIndex] = {
          imageIndex: fallbackIndex,
          miteCountInput:
            annotations.length > 0
              ? String(annotations.length)
              : latestReview.mite_count != null
                ? String(latestReview.mite_count)
                : "",
          imageQuality: latestReview.image_quality ?? "",
          comment: latestReview.comment ?? "",
          trainingReady: Boolean(latestReview.training_ready ?? loaded.training_ready),
          approved: Boolean(latestReview.approved),
          annotations,
        };
      }
      setImageDrafts(nextDrafts);
    } catch (e) {
      const message =
        typeof e === "object" && e && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Ukjent feil";
      setLoadError(message);
      setItem(null);
      setImages([]);
      setReviews([]);
      setImageDrafts({});
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [adminLoginHref, id, supabase]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(t);
  }, [reload]);

  const isControlStage = Boolean(
    item &&
    authedActions.canControl &&
    isAvailableControlSubmission(item, authedActions.userId) &&
    item.processed_by,
  );
  const isFinalized = item?.status === "GODKJENT" || item?.status === "KLAR_FOR_TRENING";
  const canDoWork = Boolean(item && authedActions?.role && !isControlStage && item.status !== "ARKIVERT" && !isFinalized);
  const totalDraftMites = Object.values(imageDrafts).reduce((sum, draft) => {
    if (draft.miteCountInput.trim() === "") return sum;
    const value = Number.parseInt(draft.miteCountInput.trim(), 10);
    return Number.isNaN(value) ? sum : sum + value;
  }, 0);
  const allImagesTrainingReady =
    totalImages > 0 &&
    Array.from({ length: totalImages }, (_, index) => imageDrafts[index] ?? createEmptyImageDraft(index)).every(
      (draft) => draft.trainingReady,
    );

  const updateCurrentDraft = (patch: Partial<ImageReviewDraft>) => {
    setImageDrafts((prev) => {
      const existing = prev[selectedImage] ?? createEmptyImageDraft(selectedImage);
      const next = { ...existing, ...patch };
      // Auto-sync: when annotations array is present, set miteCountInput = boxes.length.
      if (
        "annotations" in patch &&
        Array.isArray(patch.annotations) &&
        patch.annotations.length >= 0
      ) {
        next.miteCountInput = patch.annotations.length === 0 ? "" : String(patch.annotations.length);
      }
      return { ...prev, [selectedImage]: next };
    });
  };

  const handleAnnotationsChange = (next: VarroaBoundingBox[]) => {
    updateCurrentDraft({ annotations: next });
  };

  const persist = async (action: SaveAction) => {
    setSaveError(null);
    setSaveOk(null);

    if (!supabase) {
      setSaveError("Mangler Supabase-konfig (NEXT_PUBLIC_SUPABASE_*).");
      return;
    }
    if (!isOnline) {
      setSaveError("Du er offline. Kan ikke lagre.");
      return;
    }
    if (!item || !authedActions.userId || !authedActions?.role) {
      setSaveError("Mangler tilgang eller sak.");
      return;
    }

    const draftEntries = Array.from({ length: totalImages }, (_, index) => imageDrafts[index] ?? createEmptyImageDraft(index));
    const invalidDraft = draftEntries.find((draft) => {
      if (draft.miteCountInput.trim() === "") return false;
      return Number.isNaN(Number.parseInt(draft.miteCountInput.trim(), 10));
    });
    if (invalidDraft) {
      setSaveError(`Antall midd ma vare et helt tall pa bilde ${invalidDraft.imageIndex + 1}.`);
      return;
    }

    const currentMiteCount =
      currentDraft.miteCountInput.trim() === ""
        ? null
        : Number.parseInt(currentDraft.miteCountInput.trim(), 10);

    // GAMMEL: nowIso ble brukt til å sette assigned_at/processed_at/
    // approved_at/returned_at manuelt under. NY: ingen av de kolonnene
    // finnes lenger på submissions (submissions.updated_at settes
    // automatisk av en trigger i databasen, og "når/hvem" for statusbytter
    // ligger nå i submission_history sin egen changed_at, satt av DB).
    let nextStatus = item.status;
    let nextTrainingReady = allImagesTrainingReady;
    let approved = false;
    const historyComment = currentDraft.comment.trim() || null;
    const stayOnCurrentSubmission =
      action === "SAVE_AND_NEXT" && selectedImage < Math.max(images.length - 1, 0);
    const nextImageIndex = stayOnCurrentSubmission
      ? Math.min(selectedImage + 1, Math.max(images.length - 1, 0))
      : selectedImage;

    switch (action) {
      case "SAVE_DRAFT":
        nextStatus =
          isControlStage
            ? item.status
            : item.status === "NY" || item.status === "KLAR_FOR_KONTROLL"
              ? "UNDER_ARBEID"
              : item.status;
        break;
      case "READY_FOR_REVIEW":
        nextStatus = "KLAR_FOR_KONTROLL";
        break;
      case "SAVE_AND_NEXT":
        nextStatus = isControlStage
          ? item.status
          : stayOnCurrentSubmission
            ? item.status === "KLAR_FOR_KONTROLL"
              ? "KLAR_FOR_KONTROLL"
              : "UNDER_ARBEID"
            : "KLAR_FOR_KONTROLL";
        break;
      case "APPROVED":
        nextStatus = "GODKJENT";
        approved = true;
        break;
      case "APPROVED_FOR_TRAINING":
        nextStatus = "KLAR_FOR_TRENING";
        nextTrainingReady = true;
        approved = true;
        break;
      case "RETURNED":
        nextStatus = "UNDER_ARBEID";
        break;
      case "ARCHIVED":
        nextStatus = "ARKIVERT";
        approved = item.status === "GODKJENT" || item.status === "KLAR_FOR_TRENING";
        break;
    }

    const isImageStep = action === "SAVE_AND_NEXT" && stayOnCurrentSubmission;
    const historyAction = isImageStep
      ? isControlStage
        ? "CONTROL_NEXT_IMAGE"
        : "WORK_NEXT_IMAGE"
      : action;
    const historyFromStatus = isImageStep ? null : item.status;
    const historyToStatus = isImageStep ? null : nextStatus;

    // GAMMEL: updatePatch skrev manual_mite_count/quality_rating/
    // review_comment/current_role_owner samt assigned_at/processed_at/
    // approved_by/approved_at/returned_by/returned_at til submissions.
    // NY: de fire første flyttet til per-bilde-review (allerede lagret via
    // reviewPayload/imageReviewRows under), og de seks siste finnes ikke
    // som kolonner lenger - "hvem/når" for statusbytter er nå raden vi
    // uansett setter inn i submission_history rett under. updatePatch
    // beholder derfor bare de kolonnene som faktisk finnes på submissions.
    const updatePatch: Record<string, unknown> = {
      status: nextStatus,
      training_ready: nextTrainingReady,
    };

    if (action === "SAVE_DRAFT" || action === "READY_FOR_REVIEW" || action === "SAVE_AND_NEXT") {
      updatePatch.assigned_to = item.assigned_to ?? authedActions.userId;
      updatePatch.processed_by = authedActions.userId;
    }

    if (action === "RETURNED") {
      updatePatch.assigned_to = item.processed_by ?? item.assigned_to;
    }

    setIsSaving(true);
    try {
      const reviewPayload = {
        submission_id: item.id,
        created_by: authedActions.userId,
        mite_count: currentMiteCount,
        image_quality: currentDraft.imageQuality || null,
        comment: historyComment,
        training_ready: nextTrainingReady,
        approved,
        current_image_index: nextImageIndex,
        image_notes: draftEntries.map((draft) => {
          // Annotations (Roboflow-ready bboxes) are stored per-image in image_notes.
          // Later: these can be exported as YOLO/COCO/Roboflow JSON.
          const validAnnotations = (draft.annotations ?? []).filter(
            (b) =>
              Number.isFinite(b.x) &&
              Number.isFinite(b.y) &&
              Number.isFinite(b.w) &&
              Number.isFinite(b.h) &&
              b.w > 0 &&
              b.h > 0,
          );
          const countFromBoxes = validAnnotations.length;
          const explicitCount =
            draft.miteCountInput.trim() === ""
              ? null
              : Number.parseInt(draft.miteCountInput.trim(), 10);
          // Prefer explicit count if it differs (rare, user typed manually after drawing).
          // Otherwise: derived count = number of boxes.
          const finalMiteCount =
            explicitCount != null && !Number.isNaN(explicitCount)
              ? countFromBoxes > 0
                ? countFromBoxes
                : explicitCount
              : countFromBoxes > 0
                ? countFromBoxes
                : null;
          return {
            image_index: draft.imageIndex,
            mite_count: finalMiteCount,
            image_quality: draft.imageQuality || null,
            comment: draft.comment.trim() || null,
            training_ready: draft.trainingReady,
            approved: approved || draft.approved,
            annotations: validAnnotations,
          };
        }),
      };
      const reviewRes = await supabase
        .from("varroa_submission_reviews")
        .upsert(reviewPayload, {
          onConflict: "submission_id,created_by",
        })
        .select("id")
        .single();

      if (reviewRes.error) throw reviewRes.error;
      const reviewId = String(reviewRes.data.id);

      const imageReviewRows = draftEntries.map((draft) => ({
        id: draft.id,
        submission_id: item.id,
        review_id: reviewId,
        created_by: authedActions.userId,
        image_index: draft.imageIndex,
        mite_count:
          draft.miteCountInput.trim() === ""
            ? null
            : Number.parseInt(draft.miteCountInput.trim(), 10),
        image_quality: draft.imageQuality || null,
        comment: draft.comment.trim() || null,
        training_ready: draft.trainingReady,
        approved: approved || draft.approved,
      }));
      const imageReviewRes = await supabase
        .from("varroa_submission_review_images")
        .upsert(imageReviewRows, {
          onConflict: "review_id,image_index",
          defaultToNull: false,
        });

      if (imageReviewRes.error) throw imageReviewRes.error;

      // GAMMEL: skrev til varroa_submissions/varroa_submission_history
      // (gamle databasen). NY: submissions/submission_history. Historikk-
      // innsettingen bruker changed_by (ekte kolonnenavn) i stedet for
      // user_id - alias-navn som getHistorySelect() bruker på SELECT
      // virker ikke på INSERT, der må man bruke de faktiske kolonnenavnene.
      const updateRes = await supabase
        .from("submissions")
        .update(updatePatch)
        .eq("id", item.id);
      if (updateRes.error) throw updateRes.error;

      const historyRes = await supabase.from("submission_history").insert({
        submission_id: item.id,
        changed_by: authedActions.userId,
        action: historyAction,
        from_status: historyFromStatus,
        to_status: historyToStatus,
        comment: historyComment,
        payload: {
          role: authedActions?.role,
          mite_count: currentMiteCount,
          image_quality: currentDraft.imageQuality || null,
          training_ready: nextTrainingReady,
          approved,
          current_image_index: nextImageIndex,
          total_images: images.length,
        },
      });
      if (historyRes.error) throw historyRes.error;

      setSaveOk(`${getActionButtonLabel(action)} lagret.`);

      if (
        authedActions.canControl &&
        (action === "APPROVED" ||
          action === "APPROVED_FOR_TRAINING" ||
          action === "RETURNED" ||
          action === "ARCHIVED")
      ) {
        // GAMMEL: .from("varroa_submissions"), og sorterte en bar
        // .select("id")-spørring på "created_at" - som bare er et alias fra
        // getSubmissionSelect() og derfor ikke finnes utenfor den. NY:
        // riktig tabellnavn + sortering på den ekte kolonnen submission_date.
        const nextControlRes = await supabase
          .from("submissions")
          .select("id")
          .eq("status", "KLAR_FOR_KONTROLL")
          .neq("processed_by", authedActions.userId)
          .neq("id", item.id)
          .order("submission_date", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nextControlRes.error) throw nextControlRes.error;
        const nextId = String(nextControlRes.data?.id ?? "");
        if (nextId) {
          window.location.assign(
            appendAdminContext(
              `${basePath}/admin/innsendinger/innsending/?id=${encodeURIComponent(nextId)}`,
              adminContextSearch,
            ),
          );
          return;
        }

        const underWorkRes = await supabase
          .from("submissions")
          .select("id")
          .eq("status", "UNDER_ARBEID")
          .or(`assigned_to.eq.${authedActions.userId},processed_by.eq.${authedActions.userId}`)
          .neq("id", item.id)
          .order("updated_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (underWorkRes.error) throw underWorkRes.error;
        const resumeId = String(underWorkRes.data?.id ?? "");
        if (resumeId) {
          window.location.assign(
            appendAdminContext(
              `${basePath}/admin/innsendinger/innsending/?id=${encodeURIComponent(resumeId)}`,
              adminContextSearch,
            ),
          );
          return;
        }

        window.location.assign(
          appendAdminContext(`${basePath}/admin/innsendinger/?view=mine`, adminContextSearch),
        );
        return;
      }

      if (action === "SAVE_AND_NEXT") {
        if (stayOnCurrentSubmission) {
          await reload();
          return;
        }
        if (isControlStage) {
          setSaveOk("Alle bilder er kontrollert. Du kan nå godkjenne saken.");
          await reload();
          return;
        }
        const nextRes = await supabase.rpc("varroa_claim_next_submission");
        if (nextRes.error) throw nextRes.error;
        const nextId = String(nextRes.data ?? "");
        if (nextId) {
          window.location.assign(
            appendAdminContext(
              `${basePath}/admin/innsendinger/innsending/?id=${encodeURIComponent(nextId)}`,
              adminContextSearch,
            ),
          );
          return;
        }
        // GAMMEL: .from("varroa_submissions"). NY: submissions - updated_at
        // er en ekte kolonne (satt automatisk av DB-triggeren), så
        // sorteringen her trengte ingen endring utover tabellnavnet.
        const underWorkRes = await supabase
          .from("submissions")
          .select("id")
          .eq("status", "UNDER_ARBEID")
          .or(`assigned_to.eq.${authedActions.userId},processed_by.eq.${authedActions.userId}`)
          .neq("id", item.id)
          .order("updated_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (underWorkRes.error) throw underWorkRes.error;
        const resumeId = String(underWorkRes.data?.id ?? "");
        if (resumeId) {
          window.location.assign(
            appendAdminContext(
              `${basePath}/admin/innsendinger/innsending/?id=${encodeURIComponent(resumeId)}`,
              adminContextSearch,
            ),
          );
          return;
        }

        window.location.assign(
          appendAdminContext(`${basePath}/admin/innsendinger/?view=mine`, adminContextSearch),
        );
        return;
      }

      await reload();
    } catch (e) {
      const message =
        typeof e === "object" && e && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Ukjent feil";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const currentImage = images[selectedImage] ?? null;
  const currentStatusUi = getStatusUi(item?.status ?? "NY");
  const qualityOptions = getQualityOptions();
  const latestReview = reviews[0] ?? null;
  const isArchived = item?.status === "ARKIVERT";
  const isApproved = item?.status === "GODKJENT" || item?.status === "KLAR_FOR_TRENING";
  const canBrowseImages = images.length > 1 && !isArchived;
  const saveAndNextLabel = isControlStage
    ? isLastImage
      ? "Kontroll fullført"
      : "Neste kontrollbilde"
    : isLastImage
      ? "Lagre og neste sak"
      : "Lagre og neste bilde";

  return (
    <div className="min-h-dvh px-4 pb-10 pt-8">
      <header className="mx-auto w-full max-w-[1500px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-shrink-0">
            <div className="text-lg font-semibold">Arbeidsflate</div>
            <div className="text-xs text-zinc-400">
              Stor bildeflate, rask lagring og sporbar historikk.
            </div>
          </div>
          <div className="hidden flex-1 text-center md:block">
            {authedActions?.role && authedActions.email ? (
              <div className="text-sm font-medium text-amber-200/90">
                👋 Velkommen {getDisplayNameFromEmail(authedActions.email)} ({getRoleLabel(authedActions?.role)}), ha
                en fin dag!
              </div>
            ) : null}
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
            {returnInfo.href ? (
              <a
                href={returnInfo.href}
                className="text-sm font-semibold text-zinc-200 hover:text-zinc-50"
              >
                {returnInfo.label}
              </a>
            ) : (
              <a
                href={`${basePath}/`}
                className="text-sm font-semibold text-zinc-300 hover:text-zinc-50"
              >
                ← Til forsiden
              </a>
            )}
            <a
              href={returnTo}
              className="text-sm font-semibold text-zinc-200 hover:text-zinc-50"
            >
              Arbeidskø
            </a>
            <button
              type="button"
              onClick={reload}
              disabled={isLoading}
              className="h-10 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-semibold text-zinc-50 active:opacity-90 disabled:opacity-60"
            >
              Oppdater
            </button>
          </div>
        </div>
        {authedActions?.role && authedActions.email ? (
          <div className="mt-2 text-center md:hidden">
            <div className="text-xs font-medium text-amber-200/90">
              👋 Velkommen {getDisplayNameFromEmail(authedActions.email)} ({getRoleLabel(authedActions?.role)})
            </div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto mt-6 w-full max-w-[1500px] space-y-4">
        {loadError ? (
          <div className="rounded-3xl border border-red-900/60 bg-red-950/40 px-5 py-4 text-sm text-red-200">
            LoadError:{loadError}
          </div>
        ) : null}

        {item && authedActions?.role ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_420px]">
            <section className="space-y-4">
              <SubmissionInfoCard submission={item} approvedBy={(findApprovedBy(history) ?? "-")} />

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="text-base font-semibold text-zinc-50">Bilde</div>
                <div className="mt-2 text-sm text-zinc-400">
                  Bilde {Math.min(selectedImage + 1, Math.max(totalImages, 1))} av {Math.max(totalImages, 1)}
                </div>
                {canBrowseImages ? (
                  <div className="mt-2 text-xs text-zinc-500">
                    Klikk miniatyrene for å bytte mellom bilder og rette vurderingen før saken er
                    ferdigstilt.
                  </div>
                ) : null}
                <div className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-2">
                  {currentImage ? (
                    <ZoomableAnnotatedImage
                      src={currentImage.url}
                      alt="Varroa-bilde"
                      boxes={currentDraft.annotations ?? []}
                      onBoxesChange={handleAnnotationsChange}
                      disabled={isArchived || isFinalized || isSaving || isLoading}
                    />
                  ) : (
                    <div className="flex h-[55vh] items-center justify-center text-sm text-zinc-500 xl:h-[70vh]">
                      Ingen bilder tilgjengelig.
                    </div>
                  )}
                </div>

                {images.length > 1 ? (
                  <div className="mt-4 grid grid-cols-4 gap-3 xl:grid-cols-6">
                    {images.map((image, index) => (
                      <button
                        type="button"
                        key={image.path}
                        onClick={() => setSelectedImage(index)}
                        disabled={isSaving || isArchived}
                        className={[
                          "overflow-hidden rounded-2xl border bg-zinc-950 text-left transition active:opacity-90 disabled:cursor-default disabled:opacity-80",
                          index === selectedImage
                            ? "border-amber-300 ring-2 ring-amber-300/40"
                            : index < selectedImage
                              ? "border-emerald-700"
                              : "border-zinc-800",
                        ].join(" ")}
                      >
                        <img
                          src={image.url}
                          alt={`Miniatyr ${index + 1}`}
                          className="h-24 w-24 object-cover"
                        />
                        <div className="border-t border-zinc-800 px-2 py-1 text-center text-[10px] font-semibold text-zinc-400">
                          {index === selectedImage
                            ? "Nå"
                            : isApproved
                              ? "Vis"
                              : index < selectedImage
                                ? "Åpne igjen"
                                : "Åpne"}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>

            <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
              <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="text-base font-semibold text-zinc-50">Arbeidsfelt</div>
                <div className="mt-1 text-sm text-zinc-400">
                  {isControlStage
                    ? "Denne saken venter pa kontroll av en annen bruker. Du kan ga gjennom alle bildene og godkjenne eller sende tilbake."
                    : "Du kan gå fritt mellom bildene, rette vurderingen og sende saken til kontroll når du er klar."}
                </div>
                {item.status === "KLAR_FOR_KONTROLL" && item.processed_by === authedActions.userId ? (
                  <div className="mt-3 rounded-2xl border border-sky-900/50 bg-sky-950/30 px-4 py-3 text-xs text-sky-100">
                    Saken venter pa kontroll fra en annen bruker. Du kan fortsatt rette bildene og
                    sende den til kontroll pa nytt, men du kan ikke godkjenne din egen forstesjekk.
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-1 gap-4">
                  <label className="block">
                    <div className="text-sm font-semibold text-zinc-200">Antall midd</div>
                    <input
                      value={currentDraft.miteCountInput}
                      onChange={(e) => updateCurrentDraft({ miteCountInput: e.target.value })}
                      inputMode="numeric"
                      placeholder="F.eks. 14"
                      className="mt-2 h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </label>

                  <label className="block">
                    <div className="text-sm font-semibold text-zinc-200">Bildekvalitet</div>
                    <select
                      value={currentDraft.imageQuality}
                      onChange={(e) => updateCurrentDraft({ imageQuality: e.target.value })}
                      className="mt-2 h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    >
                      {qualityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <div className="text-sm font-semibold text-zinc-200">Kommentar for dette bildet</div>
                    <textarea
                      value={currentDraft.comment}
                      onChange={(e) => updateCurrentDraft({ comment: e.target.value })}
                      rows={5}
                      className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
                      placeholder="Observasjoner, usikkerhet, kvalitet eller vurdering."
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={currentDraft.trainingReady}
                      onChange={(e) => updateCurrentDraft({ trainingReady: e.target.checked })}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-amber-400 focus:ring-amber-300"
                    />
                    <span className="text-sm font-medium text-zinc-200">Dette bildet er klart for trening</span>
                  </label>
                </div>

                {latestReview ? (
                  <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-400">
                    Siste review oppdatert {formatDateTime(latestReview.updated_at)} av{" "}
                    {latestReview.created_by}
                  </div>
                ) : null}

                {saveOk ? (
                  <div className="mt-4 rounded-2xl border border-emerald-900/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
                    {saveOk}
                  </div>
                ) : null}
                {saveError ? (
                  <div className="mt-4 rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                    saveError:{saveError}
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => void persist("SAVE_DRAFT")}
                    disabled={isSaving}
                    className="h-12 rounded-2xl border border-zinc-700 bg-zinc-950 text-sm font-semibold text-zinc-50 active:opacity-90 disabled:opacity-60"
                  >
                    {isSaving ? "Lagrer…" : getActionButtonLabel("SAVE_DRAFT")}
                  </button>

                  {canDoWork ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void persist("READY_FOR_REVIEW")}
                        disabled={isSaving || !isLastImage}
                        className="h-12 rounded-2xl border border-sky-700 bg-sky-950/40 text-sm font-semibold text-sky-100 active:opacity-90 disabled:opacity-40"
                      >
                        {getActionButtonLabel("READY_FOR_REVIEW")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void persist("SAVE_AND_NEXT")}
                        disabled={isSaving}
                        className="h-12 rounded-2xl bg-amber-400 text-sm font-semibold text-zinc-950 active:opacity-90 disabled:opacity-60"
                      >
                        {saveAndNextLabel}
                      </button>
                      {!isLastImage ? (
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-400">
                          Jobb deg gjennom bildene og send saken til kontroll nar du er klar. Pa
                          siste bilde kan du enten sende til kontroll eller ga videre til neste sak.
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  {isControlStage ? (
                    <>
                      {!isLastImage ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void persist("SAVE_AND_NEXT")}
                            disabled={isSaving}
                            className="h-12 rounded-2xl bg-amber-400 text-sm font-semibold text-zinc-950 active:opacity-90 disabled:opacity-60"
                          >
                            {saveAndNextLabel}
                          </button>
                          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-400">
                            Gå gjennom alle bildene i saken. Godkjenning låses opp når du er på
                            siste bilde.
                          </div>
                        </>
                      ) : (
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-400">
                          Kontroll fullført. Velg Godkjenn, Godkjenn + trening, Send tilbake eller
                          Arkiver. Neste sak åpnes automatisk.
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => void persist("APPROVED")}
                        disabled={isSaving || !isLastImage || isApproved || isArchived}
                        className="h-12 rounded-2xl border border-emerald-700 bg-emerald-950/40 text-sm font-semibold text-emerald-100 active:opacity-90 disabled:opacity-40"
                      >
                        {getActionButtonLabel("APPROVED")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void persist("APPROVED_FOR_TRAINING")}
                        disabled={
                          isSaving ||
                          !isLastImage ||
                          item.status === "KLAR_FOR_TRENING" ||
                          isArchived
                        }
                        className="h-12 rounded-2xl border border-fuchsia-700 bg-fuchsia-950/40 text-sm font-semibold text-fuchsia-100 active:opacity-90 disabled:opacity-40"
                      >
                        {getActionButtonLabel("APPROVED_FOR_TRAINING")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void persist("RETURNED")}
                        disabled={isSaving || isArchived}
                        className="h-12 rounded-2xl border border-amber-700 bg-amber-950/40 text-sm font-semibold text-amber-100 active:opacity-90 disabled:opacity-60"
                      >
                        {getActionButtonLabel("RETURNED")}
                      </button>
                      {item.status === "GODKJENT" || item.status === "KLAR_FOR_TRENING" ? (
                        <button
                          type="button"
                          onClick={() => void persist("ARCHIVED")}
                          disabled={isSaving || !isLastImage}
                          className="h-12 rounded-2xl border border-zinc-700 bg-zinc-950 text-sm font-semibold text-zinc-50 active:opacity-90 disabled:opacity-40"
                        >
                          {getActionButtonLabel("ARCHIVED")}
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </section>

              <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="text-base font-semibold text-zinc-50">Historikk</div>
                <div className="mt-4 space-y-3">
                  {history.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-sm text-zinc-400">
                      Ingen historikk ennå.
                    </div>
                  ) : null}
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-zinc-100">
                          {getHistoryActionLabel(entry.action)}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {formatDateTime(entry.created_at)}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-zinc-500">
                        {entry.from_status ? `${entry.from_status} → ` : ""}
                        {entry.to_status ?? "—"}
                        {entry.user_id ? ` • ${entry.user_id}` : ""}
                      </div>
                      {entry.comment ? (
                        <div className="mt-2 text-sm text-zinc-300">{entry.comment}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        ) : null}
      </main>
    </div>
  );
}



// <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
//           <div className="flex flex-wrap items-start justify-between gap-3">
//             <div>
//               <div className="text-xl font-semibold text-zinc-50">
//                 {getTypeLabel(item.type)}
//               </div>
//               <div className="mt-1 text-sm text-zinc-400">
//                 Innsendt {formatDateTime(item.created_at)} • ID {item.id}
//               </div>
//             </div>
//             <div
//               className={[
//                 "rounded-full border px-4 py-1.5 text-[11px] font-semibold",
//                 currentStatusUi.chipClass,
//               ].join(" ")}
//             >
//               {currentStatusUi.label}
//             </div>
//           </div>

//           <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-4">
//             <div>
//               <div className="text-zinc-500">Tildelt</div>
//               <div className="mt-1">{formatWorkerLabel(authedActions.userId, item.assigned_to)}</div>
//             </div>
//             <div>
//               <div className="text-zinc-500">Forste sjekk</div>
//               <div className="mt-1">{formatWorkerLabel(authedActions.userId, item.processed_by)}</div>
//             </div>
//             <div>
//               <div className="text-zinc-500">Godkjent av</div>
//               {/* GAMMEL: item.approved_by (kolonnen finnes ikke lenger).
//                   NY: findApprovedBy(history) leter i historikken etter
//                   siste gang saken ble GODKJENT/KLAR_FOR_TRENING. */}
//               <div className="mt-1">{formatWorkerLabel(authedActions.userId, findApprovedBy(history))}</div>
//             </div>
//             <div>
//               <div className="text-zinc-500">Oppdatert</div>
//               <div className="mt-1">{formatDateTime(item.updated_at ?? item.created_at)}</div>
//             </div>
//           </div>

//           <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-sm text-zinc-200">
//             {item.note || "Ingen kommentar fra innsendingen."}
//           </div>
//         </div>
