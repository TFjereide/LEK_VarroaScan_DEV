import { SignedImage, VarroaSubmissionHistory, VarroaSubmissionImageReview, VarroaSubmissionRecord, VarroaSubmissionReview } from "../varroaWorkflow";

export type VarroaReviewData = {
    submissions: VarroaSubmissionRecord | null;
    reviews: VarroaSubmissionReview[];
    histories: VarroaSubmissionHistory[];
    reviewImages: VarroaSubmissionImageReview[];
    signedImages: SignedImage[];
}
