import { SupabaseClient } from "@supabase/supabase-js";
import { createSignedImages, getAvailableNewSubmissionsCount, getNextsubmissionId, getSubmissionById, getSubmissions, SubmissionStatus, submitVarroaScan, SubmitVarroaScanResult, updateSubmissionStatus } from "../varroaSubmissionsDb";
import { getSubmissionImagePaths, VarroaSubmissionHistory, VarroaSubmissionImageReview, VarroaSubmissionRecord, VarroaSubmissionReview } from "../varroaWorkflow";
import { SubmissionCountType, SubmissionSortType, SubmissionSubmitParams, SubmissionUpdateParams } from "./submissions-controller";
import { getClient } from "../auth/supabase.server";
import { ErrorCode, Result, makeResultError, makeResultData } from "../result/result";
import { getSubmissionHistoryById, getSubmissionReviewImagesById, getSubmissionReviewsById } from "../varroaSubmissionsDb";
import { VarroaReviewData } from "./submissions-types";


export interface SubmissionsRepository{
    insert(params: SubmissionSubmitParams): Promise<Result<SubmitVarroaScanResult>>;
    listAll(page: number, limit: number, sortBy?: SubmissionSortType, byStatus?:SubmissionStatus): Promise<Result<VarroaSubmissionRecord[]>>;
    getById(id:string): Promise<Result<VarroaSubmissionRecord|null>>;
    updateById(id:string, params: SubmissionUpdateParams): Promise<Result<VarroaSubmissionRecord|null>>;
    
    getNext(userId:string, byStatus:SubmissionStatus): Promise<Result<string>>;
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
            // updateSubmission
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
