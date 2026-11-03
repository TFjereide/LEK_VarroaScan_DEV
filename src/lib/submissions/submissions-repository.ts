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
    listAll(sortBy: SubmissionSortType, page: number, limit: number): Promise<Result<VarroaSubmissionRecord[]>>;
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
        async listAll(sortBy: SubmissionSortType, page: number, limit: number){
            // TODO: Params
            return await getSubmissions(supabase);
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
            return getAvailableNewSubmissionsCount(supabase);
        },
        async getReviewDataById(id:string){
            const [submissions, reviews, histories, reviewImages] = await Promise.all([
                getSubmissionById(supabase, id),
                getSubmissionReviewsById(supabase,id),
                getSubmissionHistoryById(supabase, id),
                getSubmissionReviewImagesById(supabase, id),
            ]);
            if(!submissions.success) return submissions;
            if(!reviews.success) return reviews;
            if(!histories.success) return histories;
            if(!reviewImages.success) return reviewImages;

            const signedImages = await createSignedImages(
                    supabase,
                    submissions.data !== null ? getSubmissionImagePaths(submissions.data): [],
                  );

            return makeResultData(
                {
                    submissions: submissions.data,
                    reviews: reviews.data,
                    histories: histories.data,
                    reviewImages: reviewImages.data,
                    signedImages
                }
            );
        },
    }
}

export const submissionsRepository = createSubmissionsRepository(await getClient());