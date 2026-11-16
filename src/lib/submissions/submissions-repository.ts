import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import { createSignedImages, getAvailableNewSubmissionsCount, getNextsubmissionId, getSubmissionById, getSubmissions, submissionHistoryInsert, SubmissionStatus, submitVarroaScan, SubmitVarroaScanDbResult, SubmitVarroaScanResult, updateSubmissionById, updateSubmissionStatus } from "./submissions-database";
import { getSubmissionImagePaths, VarroaSubmissionHistory, VarroaSubmissionImageReview, VarroaSubmissionRecord, VarroaSubmissionReview } from "../varroaWorkflow";
import { getClient } from "../auth/supabase.server";
import { ErrorCode, Result, makeResultError, makeResultData } from "../result/result";
import { getSubmissionHistoryById} from "./submissions-database";
import { SubmissionCountType, SubmissionSortType, SubmissionSubmitParams, SubmissionUpdateParams, VarroaReviewData } from "./submissions-types";
import { getSubmissionReviewImagesById, getSubmissionReviewsById } from "../submission-reviews/submission-reviews-database";


export interface SubmissionsRepository{
    insert(params: SubmissionSubmitParams): Promise<Result<SubmitVarroaScanDbResult>>;
    listAll(page: number, limit: number, sortBy?: SubmissionSortType, byStatus?:SubmissionStatus): Promise<Result<VarroaSubmissionRecord[]>>;
    getById(id:string): Promise<Result<VarroaSubmissionRecord|null>>;
    updateById(id:string, params: SubmissionUpdateParams): Promise<Result<VarroaSubmissionRecord|null>>;
    
    getNext(userId:string, byStatus:SubmissionStatus): Promise<Result<string|null>>;
    getCount(countType : SubmissionCountType): Promise<Result<number>>;
    getReviewDataById(id:string): Promise<Result<VarroaReviewData>>;
}

export function createSubmissionsRepository(supabase: SupabaseClient): SubmissionsRepository {
    return {
        async insert(params: SubmissionSubmitParams){
            return await submitVarroaScan(supabase, params);;
        },
        
        async listAll(page: number, limit: number, sortBy?: SubmissionSortType, byStatus?:SubmissionStatus){
            // TODO: Params
            return await getSubmissions(supabase, page, limit, sortBy, byStatus);
        },
        
        async getById(id:string){
            return await getSubmissionById(supabase, id);
        },
        
        async updateById(id:string, params: SubmissionUpdateParams){

            const updateResult = await updateSubmissionById(
                supabase,
                id,
                params
            );
            if(!updateResult.success) return updateResult;
            // insert history
            const historyInsertParams = {
                submission_id: item.id,
                changed_by: authedActions.userId,
                action: historyAction,
                from_status: isVarroaSubmissionStatus( historyFromStatus) ? historyFromStatus : "UNDER_ARBEID" ,
                to_status: isVarroaSubmissionStatus(historyToStatus) ? historyToStatus: "UNDER_ARBEID" ,
                comment: historyComment,
                payload: {
                    role: authedActions?.role params.role,
                    mite_count: params.currentMiteCount,
                    image_quality: currentDraft.imageQuality || null,
                    training_ready: nextTrainingReady,
                    approved,
                    current_image_index: nextImageIndex,
                    total_images: images.length,
                },
            };
            const historyRes = await submissionHistoryInsert(supabase, historyInsertParams);
            if (!historyRes.success) return historyRes;
            


            return makeResultData(null);
        },
        
        async getNext(userId:string, byStatus:SubmissionStatus){
            return await getNextsubmissionId(supabase,userId, byStatus);
        },
        
        async getCount(countType : SubmissionCountType){
            // TODO: counttype
            return await getAvailableNewSubmissionsCount(supabase);
        },

        async getReviewDataById(id:string){

            // GAMMEL: leste fra varroa_submissions og varroa_submission_history
            // (gamle databasen, finnes ikke lenger). NY: submissions/
            // submission_history er de nye tabellnavnene. Historikk-spørringen
            // bruker nå getHistorySelect(), som henter de faktiske kolonnene
            // (changed_by/changed_at) men gir dem tilbake under de gamle
            // feltnavnene (user_id/created_at) slik resten av filen forventer.
            const [submission, reviews, histories, reviewImages] = await Promise.all([
                getSubmissionById(supabase, id),
                getSubmissionReviewsById(supabase,id),
                getSubmissionHistoryById(supabase, id),
                getSubmissionReviewImagesById(supabase, id),
            ]);

            if(!submission.success) return submission;
            if (submission.data === null){
                return makeResultError(ErrorCode.NOT_FOUND, "submission not found");
            }
            if(!reviews.success) return reviews;
            if(!histories.success) return histories;
            if(!reviewImages.success) return reviewImages;

            // GAMMEL: submission.images var et flatt string[] direkte på raden.
            // NY: images er en egen relasjon ({image_path: string}[]) hentet inn
            // via getSubmissionSelect() - getSubmissionImagePaths() gjør den om
            // til det samme flate string[]-formatet som før.
            
            const signedImages = await createSignedImages(
                    supabase,
                    submission.data !== null ? getSubmissionImagePaths(submission.data): [],
                  );

            if(!signedImages.success) return signedImages;

            return makeResultData(
                {
                    submission: submission.data,
                    reviews: reviews.data,
                    histories: histories.data,
                    reviewImages: reviewImages.data,
                    signedImages: signedImages.data,
                }
            );
        },
    }
}
