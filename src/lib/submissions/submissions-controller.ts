import { SupabaseClient } from "@supabase/supabase-js";
import { VarroaSubmissionRecord } from "../varroaWorkflow";
import { SubmissionStatus, SubmissionType, SubmitVarroaScanInput, SubmitVarroaScanResult } from "../varroaScanDb";
import { SubmissionsService } from "./submissions-service";


// NOTE: THis would be in use if we set up a REST-api of
// some sort. Right now it will be useless.


export type SubmissionCountType = "available-new" | "archived"
export type SubmissionSortType = "created_at" | "updated_at" | "type" | "status" 

export type SubmissionUpdateParams = Partial<VarroaSubmissionRecord>
export type SubmissionSubmitParams = {
    files: File[];
    note: string | null;
    type: SubmissionType;
    source: string | null;
    deviceInfo: Record<string, unknown> | null;
    appVersion: string | null;
}

// TODO: Send user along with data to see if the server side session and 
// user session overlap. Can be good indicator of attack of some sort.
export interface SubmissionsController {
    submit(input: SubmissionSubmitParams): Promise<SubmitVarroaScanResult>;
    listAll(sortBy: SubmissionSortType, page: number, limit: number): Promise<VarroaSubmissionRecord[]>;
    getById(id:string): Promise<VarroaSubmissionRecord>;
    updateById(id:string, params: SubmissionUpdateParams): Promise<VarroaSubmissionRecord>;
    
    getNext(byStatus:SubmissionStatus): Promise<VarroaSubmissionRecord>;
    getCount(countType : SubmissionCountType): Promise<number>;
    getReviewDataById(id:string): Promise<VarroaSubmissionRecord>;
}

export function createSubmissionsController(repository: SubmissionsService){
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

const submissionsController = createSubmissionsController(submissionsService)




/// TODO:Combine these into getReviewDataById
// export async function getSubmissionHistoryById(supabase:SupabaseClient, id:string):Promise<VarroaSubmissionHistory[]>{}
// export async function getSubmissionReviewsById(supabase:SupabaseClient, id:string):Promise<VarroaSubmissionReview[]>{}
// export async function getSubmissionReviewImagesById(supabase:SupabaseClient, id:string):Promise<VarroaSubmissionImageReview[]>{}