import { Database } from "../supabase/database.types";
import { SubmissionStatus, SubmitVarroaScanInput } from "./submissions-database";
import { SignedImage, VarroaSubmissionHistory, VarroaSubmissionImageReview, VarroaSubmissionRecord, VarroaSubmissionReview } from "../varroaWorkflow";

export type VarroaReviewData = {
    submission: VarroaSubmissionRecord;
    reviews: VarroaSubmissionReview[];
    histories: VarroaSubmissionHistory[];
    reviewImages: VarroaSubmissionImageReview[];
    signedImages: SignedImage[];
}

// export type VarroaAnalysisResult ={
//     result_id: string;
//     image_id: string;
//     model_id: string;
//     mite_estimate: number;
// }

export type VarroaAnalysisInsert = {
    image_id: string;
    mite_estimate: number;
};

export type VarroaAnalysisResult = Database["public"]["Tables"]["analysis_results"]["Insert"];

export type GetNextParams = {
    userId:string;
    byStatus:SubmissionStatus;

}
export type SubmissionUpdate = Database["public"]["Tables"]["submissions"]["Update"];
export type SubmissionUpdateParams = Partial<SubmissionUpdate>;

export type SubmissionSubmitParams = SubmitVarroaScanInput;
// export type SubmissionUpdateParams = Partial<VarroaSubmissionRecord>
export type SubmissionCountType = "available-new" | "archived"
export type SubmissionSortType = "created_at" | "updated_at" | "type" | "status" 
