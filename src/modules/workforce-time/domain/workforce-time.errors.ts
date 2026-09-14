// ============================================================================
// Domain Errors — M15 Attendance, Leave & Workforce Time Engine
// ============================================================================

import { AppError } from '../../../shared/errors/index.js';

export class WorkforceTimeNotFoundError extends AppError {
  constructor(message: string = 'Resource not found in tenant organization', details?: Record<string, unknown>) {
    super('WORKFORCE_TIME_NOT_FOUND' as any, message, 404, details);
  }
}

export class WorkforceTimeCrossTenantAccessError extends AppError {
  constructor(message: string = 'Resource not found', details?: Record<string, unknown>) {
    // Return 404 to never disclose the existence of data in other tenants
    super('WORKFORCE_TIME_CROSS_TENANT_ACCESS' as any, message, 404, details);
  }
}

export class WorkforceTimeScheduleCollisionError extends AppError {
  constructor(message: string = 'Active schedule assignment already exists for employment in specified date range', details?: Record<string, unknown>) {
    super('WORKFORCE_TIME_SCHEDULE_COLLISION' as any, message, 409, details);
  }
}

export class WorkforceTimeOverlappingTimeRecordError extends AppError {
  constructor(message: string = 'Time record overlaps with an existing regular workforce time record for same employment', details?: Record<string, unknown>) {
    super('WORKFORCE_TIME_OVERLAPPING_TIME_RECORD' as any, message, 409, details);
  }
}

export class WorkforceTimeInvalidTimestampsError extends AppError {
  constructor(message: string = 'endedAt must be greater than startedAt and duration must be positive', details?: Record<string, unknown>) {
    super('WORKFORCE_TIME_INVALID_TIMESTAMPS' as any, message, 400, details);
  }
}

export class WorkforceTimeMissingCheckoutError extends AppError {
  constructor(message: string = 'Attempted new check-in while an existing session remains open without check-out', details?: Record<string, unknown>) {
    super('WORKFORCE_TIME_MISSING_CHECKOUT' as any, message, 409, details);
  }
}

export class WorkforceTimeInsufficientLeaveBalanceError extends AppError {
  constructor(message: string = 'Requested leave days exceed available balance and policy does not permit negative balance', details?: Record<string, unknown>) {
    super('WORKFORCE_TIME_INSUFFICIENT_LEAVE_BALANCE' as any, message, 422, details);
  }
}

export class WorkforceTimeInvalidStateTransitionError extends AppError {
  constructor(message: string = 'Invalid state transition', details?: Record<string, unknown>) {
    super('WORKFORCE_TIME_INVALID_STATE_TRANSITION' as any, message, 422, details);
  }
}

export class WorkforceTimeUnauthorizedApprovalError extends AppError {
  constructor(message: string = 'User lacks authorization to approve this record', details?: Record<string, unknown>) {
    super('WORKFORCE_TIME_UNAUTHORIZED_APPROVAL' as any, message, 403, details);
  }
}
