import "server-only";

import type { PostgrestResponse, PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";
import { getSubmissionSelect, SignedImage, VarroaSubmissionHistory, VarroaSubmissionImageReview, VarroaSubmissionRecord, VarroaSubmissionReview } from "../varroaWorkflow";
import { ErrorCode, Result, makeResultError, makeResultData, supabaseErrorToResultError, makeError, supabaseStorageErrorToResultError } from "../result/result";
import { Database } from "../supabase/database.types";
import { VarroaBoundingBox } from "@/components/submissions/zoomableAnnotatedImage";
import { AppRole } from "../auth/roles.types";



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

type ImageNotes = {
    image_index: number;
    mite_count: number | null;
    image_quality: string | null;
    comment: string | null;
    training_ready: boolean;
    approved: boolean;
    annotations: VarroaBoundingBox[];
}[]

type SubmissionReviewUpsertParams = {
        submission_id: string;
        created_by: string;
        mite_count: number | null;
        image_quality: string | null;
        comment: string | null;
        training_ready: boolean;
        approved: boolean;
        current_image_index: number;
        image_notes: ImageNotes;
};


export async function submissionReviewUpsert(supabase: SupabaseClient<Database>, params : SubmissionReviewUpsertParams): Promise<Result<string>>{
  try {
    const reviewRes = await supabase
        .from("varroa_submission_reviews")
        .upsert(params, {
          onConflict: "submission_id,created_by",
        })
        .select("id")
        .single();

      if (reviewRes.error) return supabaseErrorToResultError(reviewRes.error);
      return makeResultData(reviewRes.data.id);

  } catch (error) {
    return makeResultError(
      ErrorCode.DATABASE_CONNECTION_ERROR,
      "Failed to communicate with the database.",
      error instanceof Error ? error.message : String(error),
    );
  }
}


type ImageReviewUpsertParams = {
 submission_id: string;
 review_id: string;
 created_by: string;
 image_index: number;
 mite_count: number | null;
 image_quality: string | null;
 comment: string | null;
 training_ready: boolean;
 approved: boolean;
 id?: string | undefined;
}[]

export async function imageReviewUpsert(supabase: SupabaseClient<Database>, params : ImageReviewUpsertParams): Promise<Result<null>>{
  try {
    const reviewRes = await supabase
        .from("varroa_submission_review_images")
        .upsert(params, {
          onConflict: "review_id,image_index",
          defaultToNull: false,
        });

      if (reviewRes.error) return supabaseErrorToResultError(reviewRes.error);
      return makeResultData(null);

  } catch (error) {
    return makeResultError(
      ErrorCode.DATABASE_CONNECTION_ERROR,
      "Failed to communicate with the database.",
      error instanceof Error ? error.message : String(error),
    );
  }
}
