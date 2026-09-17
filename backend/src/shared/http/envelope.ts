import { Response } from 'express';
import { AppError, ErrorCode } from '../errors/index.js';

export interface SuccessEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    request_id?: string;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: Record<string, unknown>
): Response => {
  const envelope: SuccessEnvelope<T> = {
    data,
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(envelope);
};

export const sendError = (
  res: Response,
  error: Error | AppError,
  requestId?: string
): Response => {
  if (error instanceof AppError) {
    const payload: ErrorEnvelope = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
        ...(requestId ? { request_id: requestId } : {}),
      },
    };
    return res.status(error.statusCode).json(payload);
  }

  // Internal error fallback (hide sensitive stack traces in production)
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  const payload: ErrorEnvelope = {
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: isDev ? error.message : 'An internal server error occurred',
      ...(requestId ? { request_id: requestId } : {}),
    },
  };
  return res.status(500).json(payload);
};
