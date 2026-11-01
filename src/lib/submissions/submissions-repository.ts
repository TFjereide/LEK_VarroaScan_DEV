import { SupabaseClient } from "@supabase/supabase-js";
import { SubmissionStatus, SubmitVarroaScanResult } from "../varroaScanDb";
import { VarroaSubmissionRecord } from "../varroaWorkflow";
import { SubmissionCountType, SubmissionSortType, SubmissionSubmitParams, SubmissionUpdateParams } from "./submissions-service";
import { getClient } from "../auth/supabase.server";


export interface SubmissionsRepository{
    insert(input: SubmissionSubmitParams): Promise<SubmitVarroaScanResult>;
    listAll(sortBy: SubmissionSortType, page: number, limit: number): Promise<VarroaSubmissionRecord[]>;
    getById(id:string): Promise<VarroaSubmissionRecord>;
    updateById(id:string, params: SubmissionUpdateParams): Promise<VarroaSubmissionRecord>;
    
    getNext(byStatus:SubmissionStatus): Promise<VarroaSubmissionRecord>;
    getCount(countType : SubmissionCountType): Promise<number>;
    getReviewDataById(id:string): Promise<VarroaSubmissionRecord>;
}

export function createSubmissionsRepository(supabase: SupabaseClient) {
    return {
        async insert(input: SubmissionSubmitParams){
            
        },
        async listAll(sortBy: SubmissionSortType, page: number, limit: number){

        },
        async getById(id:string){
            
        },
        async updateById(id:string, params: SubmissionUpdateParams){
            
        },
        async getNext(byStatus:SubmissionStatus){
            
        },
        async getCount(countType : SubmissionCountType){
            
        },
        async getReviewDataById(id:string){
            
        },
    }
}

export const submissionsRepository = createSubmissionsRepository(await getClient());