import { StorageError } from "@supabase/storage-js";
import type { PostgrestError } from "@supabase/supabase-js";

export type ResultData<T> = {success:true, data:T}
export type ResultError = {success:false, error: Error}
export type Result<T> = ResultData<T> | ResultError

export type Error = {
    code: ErrorCode;
    message: string;
    details?: string;
}

export enum ErrorCode {
    // General
    UNKNOWN_ERROR = "UNKNOWN_ERROR",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    NOT_FOUND = "NOT_FOUND",
    CONFLICT = "CONFLICT",
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    RATE_LIMITED = "RATE_LIMITED",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",

    // Database
    DATABASE_ERROR = "DATABASE_ERROR",
    DATABASE_CONNECTION_ERROR = "DATABASE_CONNECTION_ERROR",
    DATABASE_QUERY_ERROR = "DATABASE_QUERY_ERROR",
    DATABASE_CONSTRAINT_VIOLATION = "DATABASE_CONSTRAINT_VIOLATION",
    DATABASE_FOREIGN_KEY_VIOLATION = "DATABASE_FOREIGN_KEY_VIOLATION",
    DATABASE_UNIQUE_VIOLATION = "DATABASE_UNIQUE_VIOLATION",
    DATABASE_NOT_NULL_VIOLATION = "DATABASE_NOT_NULL_VIOLATION",
    DATABASE_CHECK_VIOLATION = "DATABASE_CHECK_VIOLATION",
    DATABASE_TIMEOUT = "DATABASE_TIMEOUT",
    DATABASE_PERMISSION_DENIED = "DATABASE_PERMISSION_DENIED",
    DATABASE_INVALID_DATA = "DATABASE_INVALID_DATA",
    DATABASE_FUNCTION_ERROR = "DATABASE_FUNCTION_ERROR",
    DATABASE_SCHEMA_ERROR = "DATABASE_SCHEMA_ERROR",

    // Supabase Auth
    AUTH_ERROR = "AUTH_ERROR",
    AUTH_SESSION_EXPIRED = "AUTH_SESSION_EXPIRED",
    AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS",
    AUTH_USER_NOT_FOUND = "AUTH_USER_NOT_FOUND",
    AUTH_EMAIL_ALREADY_EXISTS = "AUTH_EMAIL_ALREADY_EXISTS",
    AUTH_TOKEN_INVALID = "AUTH_TOKEN_INVALID",
    AUTH_UNAUTHORIZED = "AUTH_UNAUTHORIZED",
    AUTH_FORBIDDEN = "AUTH_FORBIDDEN",

    // Supabase Storage
    STORAGE_ERROR = "STORAGE_ERROR",
    STORAGE_FILE_NOT_FOUND = "STORAGE_FILE_NOT_FOUND",
    STORAGE_BUCKET_NOT_FOUND = "STORAGE_BUCKET_NOT_FOUND",
    STORAGE_PERMISSION_DENIED = "STORAGE_PERMISSION_DENIED",
    STORAGE_FILE_TOO_LARGE = "STORAGE_FILE_TOO_LARGE",
    STORAGE_INVALID_REQUEST = "STORAGE_INVALID_REQUEST",
    STORAGE_RATE_LIMITED = "STORAGE_RATE_LIMITED",
    STORAGE_TIMEOUT = "STORAGE_TIMEOUT",

    // Business logic
    RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS",
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
    OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED",
}
;

export function makeError(
    code: ErrorCode,
    message: string,
    details?: string
): Error {
    return {
        code,
        message,
        details,
    };
}

export function makeResultData<T>(data:T):ResultData<T>{
    return {
        success: true,
        data
    };
}

export function makeResultError(
    code: ErrorCode,
    message: string,
    details?: string):ResultError{
    return {
        success: false,
        error: {
            code,
            message,
            details,
        }
    };
}

const postgresErrorMap: Record<string, ErrorCode> = {
    // Constraint violations
    "23505": ErrorCode.DATABASE_UNIQUE_VIOLATION,
    "23503": ErrorCode.DATABASE_FOREIGN_KEY_VIOLATION,
    "23502": ErrorCode.DATABASE_NOT_NULL_VIOLATION,
    "23514": ErrorCode.DATABASE_CHECK_VIOLATION,

    // Permissions
    "42501": ErrorCode.DATABASE_PERMISSION_DENIED,

    // Invalid data
    "22P02": ErrorCode.DATABASE_INVALID_DATA,
    "22001": ErrorCode.DATABASE_INVALID_DATA,
    "22003": ErrorCode.DATABASE_INVALID_DATA,

    // Timeouts and connection problems
    "57014": ErrorCode.DATABASE_TIMEOUT,
    "08001": ErrorCode.DATABASE_CONNECTION_ERROR,
    "08006": ErrorCode.DATABASE_CONNECTION_ERROR,

    // Schema problems
    "42P01": ErrorCode.DATABASE_SCHEMA_ERROR,
    "42703": ErrorCode.DATABASE_SCHEMA_ERROR,
    "42601": ErrorCode.DATABASE_QUERY_ERROR,
    "42883": ErrorCode.DATABASE_FUNCTION_ERROR,

    "PGRST200": ErrorCode.DATABASE_SCHEMA_ERROR,
    "PGRST201": ErrorCode.DATABASE_QUERY_ERROR,
    "PGRST204": ErrorCode.DATABASE_SCHEMA_ERROR,
    "PGRST205": ErrorCode.DATABASE_SCHEMA_ERROR,

    // Transaction problems
    "40001": ErrorCode.DATABASE_QUERY_ERROR,
    "40P01": ErrorCode.DATABASE_QUERY_ERROR,
};




export function supabaseErrorToResultError(error: PostgrestError): ResultError {
    const code = error.code
        ? postgresErrorMap[error.code]
        : undefined;

    return {
        success : false,
        error : {
            code: code ?? ErrorCode.DATABASE_ERROR,
            message: "A database error occurred.",
            details: [
                `Supabase error: ${error.message}`,
                error.code ? `Code: ${error.code}` : undefined,
                error.details ? `Details: ${error.details}` : undefined,
                error.hint ? `Hint: ${error.hint}` : undefined,
            ]
                .filter(Boolean)
                .join(" | "),
        }
    };
}

// Storage error mapping
const storageErrorMap: Record<string, ErrorCode> = {
    // Missing resources
    NoSuchBucket: ErrorCode.STORAGE_BUCKET_NOT_FOUND,
    NoSuchKey: ErrorCode.STORAGE_FILE_NOT_FOUND,
    not_found: ErrorCode.STORAGE_FILE_NOT_FOUND,

    // Permissions
    AccessDenied: ErrorCode.STORAGE_PERMISSION_DENIED,
    unauthorized: ErrorCode.STORAGE_PERMISSION_DENIED,
    InvalidJWT: ErrorCode.AUTH_TOKEN_INVALID,

    // Invalid requests
    InvalidRequest: ErrorCode.STORAGE_INVALID_REQUEST,
    InvalidKey: ErrorCode.STORAGE_INVALID_REQUEST,
    InvalidBucketName: ErrorCode.STORAGE_INVALID_REQUEST,

    // Limits
    EntityTooLarge: ErrorCode.STORAGE_FILE_TOO_LARGE,
    SlowDown: ErrorCode.STORAGE_RATE_LIMITED,

    // Timeouts and infrastructure
    DatabaseTimeout: ErrorCode.STORAGE_TIMEOUT,
    database_timeout: ErrorCode.STORAGE_TIMEOUT,
    InternalError: ErrorCode.STORAGE_ERROR,
    internal_server_error: ErrorCode.STORAGE_ERROR,
    DatabaseError: ErrorCode.STORAGE_ERROR,
};


export function supabaseStorageErrorToResultError(
    error: StorageError
): ResultError {
    const storageCode = error.name;

    const code = storageCode
        ? storageErrorMap[storageCode]
        : undefined;

    return {
        success: false,
        error: {
            code: code ?? ErrorCode.STORAGE_ERROR,
            message: "A storage error occurred.",
            details: [
                `Supabase Storage error: ${error.message}`,
                storageCode ? `Code: ${storageCode}` : undefined,
            ]
            .filter(Boolean)
            .join(" | "),
        },
    };
}