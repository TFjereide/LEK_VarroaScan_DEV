import { VarroaSubmissionRecord } from "../varroaWorkflow";
import { SubmitVarroaScanResult } from "../varroaSubmissionsDb";
import {  SubmissionStatus } from "../varroaSubmissionsDb";
import {createSubmissionsRepository, SubmissionsRepository } from "./submissions-repository";
import { SubmissionCountType, SubmissionSortType, SubmissionSubmitParams, SubmissionUpdateParams } from "./submissions-controller";
import { Result } from "../result/result";
import { VarroaReviewData } from "./submissions-types";
import { getClient } from "../auth/supabase.server";

// TODO: Send user along with data to see if the server side session and 
// user session overlap. Can be good indicator of attack of some sort.
export interface SubmissionsService {
    submit(input: SubmissionSubmitParams): Promise<Result<SubmitVarroaScanResult>>;
    listAll(page: number, limit: number, sortBy?: SubmissionSortType, byStatus?:SubmissionStatus): Promise<Result<VarroaSubmissionRecord[]>>;
    getById(id:string): Promise<Result<VarroaSubmissionRecord|null>>;
    updateById(id:string, params: SubmissionUpdateParams): Promise<Result<VarroaSubmissionRecord|null>>;
    
    getNext(userId:string, byStatus:SubmissionStatus): Promise<Result<string>>;
    getCount(countType : SubmissionCountType): Promise<Result<number>>;
    getReviewDataById(id:string): Promise<Result<VarroaReviewData>>;
}

export function createSubmissionsService(repository: SubmissionsRepository):SubmissionsService{
    return {
        async submit(input: SubmissionSubmitParams){
            return await repository.insert(input);
        },

        async listAll(page: number, limit: number, sortBy?: SubmissionSortType, byStatus?:SubmissionStatus){
            return await repository.listAll(page,limit, sortBy, byStatus);
        },

        async getById(id:string){
            return await repository.getById(id);
        },
        
        async updateById(id:string, params: SubmissionUpdateParams){
            return await repository.updateById(id, params);
        },
        
        async getNext(userId:string, byStatus:SubmissionStatus){
            return await repository.getNext(userId, byStatus);
        },
        
        async getCount(countType : SubmissionCountType){
            return await repository.getCount(countType);
        },
        
        async getReviewDataById(id:string){
            return await repository.getReviewDataById(id);
        },
    }
}

export async function getSubmissionsService(){
    const repo = await createSubmissionsRepository(await getClient());
    return createSubmissionsService(repo);
}



/// TODO:Combine these into getReviewDataById
// export async function getSubmissionHistoryById(supabase:SupabaseClient, id:string):Promise<VarroaSubmissionHistory[]>{}
// export async function getSubmissionReviewsById(supabase:SupabaseClient, id:string):Promise<VarroaSubmissionReview[]>{}
// export async function getSubmissionReviewImagesById(supabase:SupabaseClient, id:string):Promise<VarroaSubmissionImageReview[]>{}