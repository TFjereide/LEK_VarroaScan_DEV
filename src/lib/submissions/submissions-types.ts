import { SignedImage, VarroaSubmissionHistory, VarroaSubmissionImageReview, VarroaSubmissionRecord, VarroaSubmissionReview } from "../varroaWorkflow";

export type VarroaReviewData = {
    submission: VarroaSubmissionRecord;
    reviews: VarroaSubmissionReview[];
    histories: VarroaSubmissionHistory[];
    reviewImages: VarroaSubmissionImageReview[];
    signedImages: SignedImage[];
}
