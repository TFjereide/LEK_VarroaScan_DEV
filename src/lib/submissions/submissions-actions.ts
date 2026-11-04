'use server';
import { submissionsService } from "./submissions-service";



export async function submit(input: SubmissionSubmitParams){
    // TODO: Implement auth check
    return await submissionsService.submit(input);
}

export async function listAll(sortBy: SubmissionSortType, page: number, limit: number){
    // TODO: Implement auth check
    return await submissionsService.listAll(sortBy,page,limit);
}

export async function getById(id:string){
    // TODO: Implement auth check
    return await submissionsService.getById(id);
}

export async function updateById(id:string, params: SubmissionUpdateParams){
    // TODO: Implement auth check
    return await submissionsService.updateById(id, params);
}

export async function getNext(userId:string, byStatus:SubmissionStatus){
    // TODO: Implement auth check
    return await submissionsService.getNext(userId, byStatus);
}

export async function getCount(countType : SubmissionCountType){
    // TODO: Implement auth check
    return await submissionsService.getCount(countType);
}

export async function getReviewDataById(id:string){
    // TODO: Implement auth check
    return await submissionsService.getReviewDataById(id);
}