import { AppError, ErrorCode, ValidationError, ConflictError, InvalidStateTransitionError } from '../../../shared/errors/index.js';

export class IdentityConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.IDENTITY_CONFLICT, message, 409, details);
  }
}

export class PositionClosedError extends ValidationError {
  constructor(message: string = 'Position is closed and cannot be modified or reopened') {
    super(message);
  }
}

export class PositionFullError extends ValidationError {
  constructor(message: string = 'Position has no remaining openings available') {
    super(message);
  }
}

export class OfferStateError extends InvalidStateTransitionError {
  constructor(message: string) {
    super(message);
  }
}

export class DuplicateActiveApplicationError extends ConflictError {
  constructor(message: string = 'Candidate already has an active application for this position') {
    super(message);
  }
}
