export class WSCError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends WSCError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, details);
  }
}

export class NotFoundError extends WSCError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("NOT_FOUND", message, details);
  }
}

export class ConflictError extends WSCError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("CONFLICT", message, details);
  }
}

export class SecurityError extends WSCError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("SECURITY_ERROR", message, details);
  }
}

export class TransitionError extends WSCError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("TRANSITION_ERROR", message, details);
  }
}
