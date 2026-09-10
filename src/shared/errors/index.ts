export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  FORBIDDEN = 'FORBIDDEN',
  TENANT_CONTEXT_REQUIRED = 'TENANT_CONTEXT_REQUIRED',
  TENANT_ACCESS_DENIED = 'TENANT_ACCESS_DENIED',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 400,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(ErrorCode.AUTHENTICATION_REQUIRED, message, 401);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message: string = 'Invalid email or password') {
    super(ErrorCode.INVALID_CREDENTIALS, message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(ErrorCode.FORBIDDEN, message, 403);
  }
}

export class TenantContextRequiredError extends AppError {
  constructor(message: string = 'Organization context is required') {
    super(ErrorCode.TENANT_CONTEXT_REQUIRED, message, 400);
  }
}

export class TenantAccessDeniedError extends AppError {
  constructor(message: string = 'Access to specified organization is denied') {
    super(ErrorCode.TENANT_ACCESS_DENIED, message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(ErrorCode.NOT_FOUND, message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.CONFLICT, message, 49, details);
  }
}

export class InvalidStateTransitionError extends AppError {
  constructor(message: string) {
    super(ErrorCode.INVALID_STATE_TRANSITION, message, 422);
  }
}
