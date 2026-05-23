import { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ZodError } from 'zod';
import { logger } from '../../config/logger';
import { AppError } from '../errors/AppError';

const isDuplicateKeyError = (
  error: unknown,
): error is { code: number; keyValue?: Record<string, unknown> } => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
};

export const errorMiddleware: ErrorRequestHandler = (error, req, res, _next) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_SERVER_ERROR';
  let details: unknown = null;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
    details = error.details ?? null;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation error';
    code = 'VALIDATION_ERROR';
    details = error.issues;
  } else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Database validation error';
    code = 'MONGOOSE_VALIDATION_ERROR';
    details = Object.values(error.errors).map((item) => item.message);
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${error.path}`;
    code = 'MONGOOSE_CAST_ERROR';
    details = { path: error.path, value: error.value };
  } else if (isDuplicateKeyError(error)) {
    statusCode = 409;
    message = 'Duplicate key error';
    code = 'DUPLICATE_KEY_ERROR';
    details = error.keyValue ?? null;
  } else if (error instanceof TokenExpiredError) {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  } else if (error instanceof JsonWebTokenError) {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (error instanceof Error) {
    message = error.message;
  }

  logger.error('Request failed', {
    requestId: req.requestId,
    message,
    code,
    statusCode,
    error,
  });

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      details,
    },
    requestId: req.requestId,
  });
};
