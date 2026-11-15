import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./supabase/database.types";
import { ErrorCode, makeResultData, makeResultError, Result, supabaseErrorToResultError } from "./result/result";
import { VarroaAnalysisInsert, VarroaAnalysisResult } from "./submissions/submissions-types";




export async function getAiModel(supabase: SupabaseClient<Database>): Promise<Result<string>> {
    try {
        const modelRes = await supabase
            .from("ai_models")
            .select("model_id")
            .limit(1)
            .maybeSingle();

        if (modelRes.error) return supabaseErrorToResultError(modelRes.error);
        const resumeId = String(modelRes.data?.model_id ?? "");

        return makeResultData(resumeId);

    } catch (error) {
        return makeResultError(
            ErrorCode.DATABASE_CONNECTION_ERROR,
            "Failed to communicate with the database.",
            error instanceof Error ? error.message : String(error),
        );
    }
}

export async function InsertImageAnalysisResult(supabase: SupabaseClient<Database>, analysisResult: VarroaAnalysisInsert): Promise<Result<VarroaAnalysisResult>> {

    
    const aiModelIdRes = await getAiModel(supabase);
    if (!aiModelIdRes.success) return aiModelIdRes;
    const aiModelId = aiModelIdRes.data;
    
    const analysisResAmended = {...analysisResult, model_id: aiModelId}
    
    try {
        const insertResultRes = await supabase
            .from("analysis_results")
            .insert(analysisResAmended)
            .select()
            .single()
            
        if (insertResultRes.error) return supabaseErrorToResultError(insertResultRes.error);

        return makeResultData(insertResultRes.data);

    } catch (error) {
        return makeResultError(
            ErrorCode.DATABASE_CONNECTION_ERROR,
            "Failed to communicate with the database.",
            error instanceof Error ? error.message : String(error),
        );
    }
}