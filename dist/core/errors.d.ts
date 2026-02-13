export declare class WSCError extends Error {
    readonly code: string;
    readonly details: Record<string, unknown> | undefined;
    constructor(code: string, message: string, details?: Record<string, unknown>);
}
export declare class ValidationError extends WSCError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class NotFoundError extends WSCError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class ConflictError extends WSCError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class SecurityError extends WSCError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class TransitionError extends WSCError {
    constructor(message: string, details?: Record<string, unknown>);
}
