'use server';
import { getCurrentUser } from "../auth/actions.server";
import { getAuthorizedUserActions } from "../auth/roles.server";
import { ErrorCode, makeResultError } from "../result/result";
import { SubmissionStatus } from "../varroaScanDb";
import { SubmissionCountType, SubmissionSortType, SubmissionSubmitParams, SubmissionUpdateParams } from "./submissions-controller";
import { submissionsService } from "./submissions-service";

/* 
The entrypoint the app uses to get and/or manipulate submissions.
Every interaction is done through a series of server actions.
*/

export async function submit(input: SubmissionSubmitParams){
    const user = await getCurrentUser()
    if (user.error){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }

    return await submissionsService.submit(input);
}

export async function listAll(sortBy: SubmissionSortType, page: number, limit: number){
    const user = await getCurrentUser()
    if (user.error){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }
    const actions = await getAuthorizedUserActions(user)
    if(!actions.canWork){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }
    return await submissionsService.listAll(sortBy,page,limit);
}

export async function getById(id:string){
    const user = await getCurrentUser()
    if (user.error){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }
    const actions = await getAuthorizedUserActions(user)
    if(!actions.canWork){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }
    return await submissionsService.getById(id);
}

export async function updateById(id:string, params: SubmissionUpdateParams){
    const user = await getCurrentUser()
    if (user.error){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }
    const actions = await getAuthorizedUserActions(user)
    if(!actions.canWork){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }

    return await submissionsService.updateById(id, params);
}

export async function getNext(userId:string, byStatus:SubmissionStatus){
    const user = await getCurrentUser()
    if (user.error){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }
    const actions = await getAuthorizedUserActions(user)
    if(!actions.canUseQueue){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }

    return await submissionsService.getNext(userId, byStatus);
}

export async function getCount(countType : SubmissionCountType){

    const user = await getCurrentUser()
    if (user.error){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }
    const actions = await getAuthorizedUserActions(user)
    if(!actions.canWork){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }
    return await submissionsService.getCount(countType);
}

export async function getReviewDataById(id:string){
    const user = await getCurrentUser()
    if (user.error){
        return makeResultError(ErrorCode.AUTH_UNAUTHORIZED, "unauthorized");
    }
    const actions = await getAuthorizedUserActions(user)
    if(!actions.canWork){
        return makeResultError(ErrorCode.AUTH_FORBIDDEN, "forbidden");
    }
    return await submissionsService.getReviewDataById(id);
}