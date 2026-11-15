'use server';
import { getCurrentUser } from "../auth/actions.server";
import { getAuthorizedUserActions } from "../auth/roles.server";
import { getClient } from "../auth/supabase.server";
import { ErrorCode, makeResultData, makeResultError, Result, supabaseErrorToResultError } from "../result/result";
import { getDetector } from "../roboflow";
import { SubmitVarroaScanResult, SubmissionStatus  } from "../varroaSubmissionsDb";
import { VarroaSubmissionRecord } from "../varroaWorkflow";
import { SubmissionCountType, SubmissionSortType, SubmissionSubmitParams, SubmissionUpdateParams } from "./submissions-controller";
import { getSubmissionsService } from "./submissions-service";
import { VarroaReviewData } from "./submissions-types";

/* 
The entrypoint the app uses to get and/or manipulate submissions.
Every interaction is done through a series of server actions.
*/



export async function submit(input: SubmissionSubmitParams):Promise<Result<SubmitVarroaScanResult>>{
    const authData = await getCurrentUser()
    if (!authData.user){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }

    const submissionsService = await getSubmissionsService();
    return await submissionsService.submit(input);
}

export async function listAll(page: number, limit: number, sortBy?: SubmissionSortType, byStatus?:SubmissionStatus):Promise<Result<VarroaSubmissionRecord[]>>{
    const authData = await getCurrentUser()
    if (!authData.user){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }
    const actions = await getAuthorizedUserActions(authData.user)
    if(!actions.canWork){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }

    const submissionsService = await getSubmissionsService();
    return await submissionsService.listAll(page,limit,sortBy, byStatus);
}

export async function getById(id:string):Promise<Result<VarroaSubmissionRecord|null>>{
    const authData = await getCurrentUser()
    if (!authData.user){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }
    const actions = await getAuthorizedUserActions(authData.user)
    if(!actions.canWork){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }   const submissionsService = await getSubmissionsService();
    return await submissionsService.getById(id);
}

export async function updateById(id:string, params: SubmissionUpdateParams):Promise<Result<VarroaSubmissionRecord | null>>{
    const authData = await getCurrentUser()
    if (!authData.user){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }
    const actions = await getAuthorizedUserActions(authData.user)
    if(!actions.canWork){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }
    const submissionsService = await getSubmissionsService();
    return await submissionsService.updateById(id, params);
}

export async function getNext(userId:string, byStatus:SubmissionStatus): Promise<Result<string>>{
    const authData = await getCurrentUser()
    if (!authData.user){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }
    const actions = await getAuthorizedUserActions(authData.user)
    if(!actions.canUseQueue){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }
    const submissionsService = await getSubmissionsService();
    return await submissionsService.getNext(userId, byStatus);
}

export async function getCount(countType : SubmissionCountType): Promise<Result<number>>{

    const authData = await getCurrentUser()
    if (!authData.user){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }
    const actions = await getAuthorizedUserActions(authData.user)
    if(!actions.canWork){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }   const submissionsService = await getSubmissionsService();
    return await submissionsService.getCount(countType);
}



export async function getReviewDataById(id:string): Promise<Result<VarroaReviewData>>{
    const authData = await getCurrentUser()
    if (!authData.user){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }
    const actions = await getAuthorizedUserActions(authData.user)
    if(!actions.canWork){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }   const submissionsService = await getSubmissionsService();
    return await submissionsService.getReviewDataById(id);
}

// TODO: Move to db layer. Not the righ place to have the logic here. 
export async function claimNextSubmission(): Promise<Result<string|null>>{
    const authData = await getCurrentUser()
    if (!authData.user){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }

    const actions = await getAuthorizedUserActions(authData.user)
    if(!actions.canUseQueue){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }

    const supabase = await getClient();
    const res = await supabase.rpc("varroa_claim_next_submission");

    if (res.error) {
        return supabaseErrorToResultError(res.error);
    }

    return makeResultData(res.data);
}

// TODO: Move to db layer. Not the righ place to have the logic here. 
export async function deleteSubmission(id : string): Promise<Result<null>>{
    const authData = await getCurrentUser()
    if (!authData.user){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }

    const actions = await getAuthorizedUserActions(authData.user)
    if(!actions.canDeleteAnything){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }

    const supabase = await getClient();
    const res = await supabase.rpc("varroa_delete_submission_as_admin", {
        p_submission_id: id,
      });

    if (res.error) {
        return supabaseErrorToResultError(res.error);
    }

    return makeResultData(null);
}


// TODO: Move to db layer. Not the righ place to have the logic here. 
export async function submitReview(reviewPayload : any, imageReviewRows: any, updatePatch: any) : Promise<Result<string>>{

    const supabase = await getClient();
    const reviewRes = await supabase
        .from("varroa_submission_reviews")
        .upsert(reviewPayload, {
            onConflict: "submission_id,created_by",
        })
        .select("id")
        .single();
    
    if (reviewRes.error) return supabaseErrorToResultError(reviewRes.error);
    const reviewId = String(reviewRes.data.id);

    const imageReviewRes = await supabase
        .from("varroa_submission_review_images")
        .upsert(imageReviewRows, {
          onConflict: "review_id,image_index",
          defaultToNull: false,
        });
    if (imageReviewRes.error) return supabaseErrorToResultError(imageReviewRes.error);
    const updateRes = await supabase
        .from("submissions")
        .update(updatePatch)
        .eq("id", item.id);

    if (updateRes.error) return supabaseErrorToResultError(updateRes.error);
    const historyRes = await supabase.from("submission_history").insert({
        submission_id: item.id,
        changed_by: authedActions.userId,
        action: historyAction,
        from_status: isVarroaSubmissionStatus( historyFromStatus) ? historyFromStatus : "UNDER_ARBEID" ,
        to_status: isVarroaSubmissionStatus(historyToStatus) ? historyToStatus: "UNDER_ARBEID" ,
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


    return makeResultData(reviewId);
}