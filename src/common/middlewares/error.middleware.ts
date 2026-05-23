import { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ZodError } from 'zod';
import { logger } from '../../config/logger';
import { AppError } from '../errors/AppError';

const FRIENDLY_ERROR_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: 'You are not authorized to access this resource. Please provide a valid access token.',
  INVALID_TOKEN:
    'Authentication failed because the provided token is invalid or malformed. Please log in again and try with a valid token.',
  TOKEN_EXPIRED:
    'Your authentication token has expired. Please refresh your session or log in again.',
  FORBIDDEN:
    'You do not have permission to perform this action with your current role.',
  VALIDATION_ERROR:
    'The request validation failed. Please review the submitted fields and try again.',
  ROUTE_NOT_FOUND:
    'The requested API endpoint was not found. Please verify the URL and HTTP method.',
  USER_NOT_ACTIVE:
    'Your account is not active. Please contact support if you believe this is a mistake.',
  INVALID_CREDENTIALS:
    'The email or password you entered is incorrect. Please check your credentials and try again.',
  EMAIL_NOT_VERIFIED:
    'Your email address is not verified yet. Please verify your email before continuing.',
  INVALID_REFRESH_TOKEN:
    'The refresh token is invalid or no longer active. Please log in again to continue.',
  REFRESH_TOKEN_REQUIRED:
    'A refresh token is required to complete this request.',
};

const resolveMessage = (code: string, fallbackMessage: string) => {
  return FRIENDLY_ERROR_MESSAGES[code] ?? fallbackMessage;
};

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

  message = resolveMessage(code, message);

  logger.error('Request failed', {
    requestId: req.requestId,
    message,
    code,
    statusCode,
    error,
  });

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    error: {
      code,
      details,
    },
    requestId: req.requestId,
  });
};
