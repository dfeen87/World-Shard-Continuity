export class WSCError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
    }
}
export class ValidationError extends WSCError {
    constructor(message, details) {
        super("VALIDATION_ERROR", message, details);
    }
}
export class NotFoundError extends WSCError {
    constructor(message, details) {
        super("NOT_FOUND", message, details);
    }
}
export class ConflictError extends WSCError {
    constructor(message, details) {
        super("CONFLICT", message, details);
    }
}
export class SecurityError extends WSCError {
    constructor(message, details) {
        super("SECURITY_ERROR", message, details);
    }
}
export class TransitionError extends WSCError {
    constructor(message, details) {
        super("TRANSITION_ERROR", message, details);
    }
}
