import { SupabaseClient } from "@supabase/supabase-js";
import { VarroaSubmissionRecord } from "../varroaWorkflow";
import { SubmissionStatus, SubmissionType, SubmitVarroaScanInput, SubmitVarroaScanResult } from "../varroaScanDb";
import {SubmissionsRepository, submissionsRepository } from "./submissions-repository";
import { SubmissionCountType, SubmissionSortType, SubmissionSubmitParams, SubmissionUpdateParams } from "./submissions-controller";

// TODO: Send user along with data to see if the server side session and 
// user session overlap. Can be good indicator of attack of some sort.
export interface SubmissionsService {
    submit(input: SubmissionSubmitParams): Promise<SubmitVarroaScanResult>;
    listAll(sortBy: SubmissionSortType, page: number, limit: number): Promise<VarroaSubmissionRecord[]>;
    getById(id:string): Promise<VarroaSubmissionRecord>;
    updateById(id:string, params: SubmissionUpdateParams): Promise<VarroaSubmissionRecord>;
    
    getNext(byStatus:SubmissionStatus): Promise<VarroaSubmissionRecord>;
    getCount(countType : SubmissionCountType): Promise<number>;
    getReviewDataById(id:string): Promise<VarroaSubmissionRecord>;
}

export function createSubmissionsService(repository: SubmissionsRepository):SubmissionsService{
    return {
        async submit(input: SubmissionSubmitParams){},
        async listAll(sortBy: SubmissionSortType, page: number, limit: number){},
        async getById(id:string){},
        async updateById(id:string, params: SubmissionUpdateParams){},
        async getNext(byStatus:SubmissionStatus){},
        async getCount(countType : SubmissionCountType){},
        async getReviewDataById(id:string){},
    }
}

const submissionsService = createSubmissionsService(submissionsRepository)




/// TODO:Combine these into getReviewDataById
// export async function getSubmissionHistoryById(supabase:SupabaseClient, id:string):Promise<VarroaSubmissionHistory[]>{}
// export async function getSubmissionReviewsById(supabase:SupabaseClient, id:string):Promise<VarroaSubmissionReview[]>{}
// export async function getSubmissionReviewImagesById(supabase:SupabaseClient, id:string):Promise<VarroaSubmissionImageReview[]>{}