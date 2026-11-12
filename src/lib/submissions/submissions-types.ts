import { SignedImage, VarroaSubmissionHistory, VarroaSubmissionImageReview, VarroaSubmissionRecord, VarroaSubmissionReview } from "../varroaWorkflow";

export type VarroaReviewData = {
    submission: VarroaSubmissionRecord;
    reviews: VarroaSubmissionReview[];
    histories: VarroaSubmissionHistory[];
    reviewImages: VarroaSubmissionImageReview[];
    signedImages: SignedImage[];
}

export type VarroaAnalysisResult ={
    image_id: string;
    model_id: string;
    operation_data: string;
    mite_estimate: number;
}