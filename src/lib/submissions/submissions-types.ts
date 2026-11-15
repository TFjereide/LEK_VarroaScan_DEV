import { Database } from "../supabase/database.types";
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