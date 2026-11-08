'use server';
import { getCurrentUser } from "../auth/actions.server";
import { getAuthorizedUserActions } from "../auth/roles.server";
import { ErrorCode, makeResultError, Result } from "../result/result";
import { SubmissionStatus } from "../varroaScanDb";
import { SubmitVarroaScanResult } from "../varroaSubmissionsDb";
import { VarroaSubmissionRecord } from "../varroaWorkflow";
import { SubmissionCountType, SubmissionSortType, SubmissionSubmitParams, SubmissionUpdateParams } from "./submissions-controller";
import { getSubmissionsService } from "./submissions-service";
import { VarroaReviewData } from "./submissions-types";

/* 
The entrypoint the app uses to get and/or manipulate submissions.
Every interaction is done through a series of server actions.
*/

export async function submit(input: SubmissionSubmitParams):Promise<Result<SubmitVarroaScanResult>>{
    const authData = await getCurrentUser()
    if (!authData.user){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }

    const submissionsService = await getSubmissionsService();
    return await submissionsService.submit(input);
}

export async function listAll(sortBy: SubmissionSortType, page: number, limit: number):Promise<Result<VarroaSubmissionRecord[]>>{
    const authData = await getCurrentUser()
    if (!authData.user){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }
    const actions = await getAuthorizedUserActions(authData.user)
    if(!actions.canWork){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }

    const submissionsService = await getSubmissionsService();
    return await submissionsService.listAll(sortBy,page,limit);
}

export async function getById(id:string):Promise<Result<VarroaSubmissionRecord|null>>{
    const authData = await getCurrentUser()
    if (!authData.user){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }
    const actions = await getAuthorizedUserActions(authData.user)
    if(!actions.canWork){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }   const submissionsService = await getSubmissionsService();
    return await submissionsService.getById(id);
}

export async function updateById(id:string, params: SubmissionUpdateParams):Promise<Result<VarroaSubmissionRecord | null>>{
    const authData = await getCurrentUser()
    if (!authData.user){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }
    const actions = await getAuthorizedUserActions(authData.user)
    if(!actions.canWork){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }
    const submissionsService = await getSubmissionsService();
    return await submissionsService.updateById(id, params);
}

export async function getNext(userId:string, byStatus:SubmissionStatus): Promise<Result<string>>{
    const authData = await getCurrentUser()
    if (!authData.user){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }
    const actions = await getAuthorizedUserActions(authData.user)
    if(!actions.canUseQueue){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }
    const submissionsService = await getSubmissionsService();
    return await submissionsService.getNext(userId, byStatus);
}

export async function getCount(countType : SubmissionCountType): Promise<Result<number>>{

    const authData = await getCurrentUser()
    if (!authData.user){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }
    const actions = await getAuthorizedUserActions(authData.user)
    if(!actions.canWork){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }   const submissionsService = await getSubmissionsService();
    return await submissionsService.getCount(countType);
}

export async function getReviewDataById(id:string): Promise<Result<VarroaReviewData>>{
    const authData = await getCurrentUser()
    if (!authData.user){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }
    const actions = await getAuthorizedUserActions(authData.user)
    if(!actions.canWork){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }   const submissionsService = await getSubmissionsService();
    return await submissionsService.getReviewDataById(id);
}