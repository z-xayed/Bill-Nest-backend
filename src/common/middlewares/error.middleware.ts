import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { logger } from '../../config/logger';
import { AppError } from '../errors/AppError';
import { ErrorCode, ERROR_CODES } from '../errors/errorCodes';

const formatZodIssues = (error: ZodError) =>
  error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

const isMongoDuplicateKeyError = (error: unknown): error is { code: number; keyValue?: unknown } => {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 11000;
};

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  let statusCode = 500;
  let message = 'Something went wrong';
  let code: ErrorCode = ERROR_CODES.INTERNAL_SERVER_ERROR;
  let details: unknown = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
    details = error.details;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation error';
    code = ERROR_CODES.VALIDATION_ERROR;
    details = formatZodIssues(error);
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${error.path}: ${String(error.value)}`;
    code = ERROR_CODES.CAST_ERROR;
    details = {
      path: error.path,
      value: error.value,
      kind: error.kind,
    };
  } else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Database validation error';
    code = ERROR_CODES.DATABASE_VALIDATION_ERROR;
    details = Object.values(error.errors).map((item) => ({
      path: item.path,
      message: item.message,
      kind: item.kind,
      value: item.value,
    }));
  } else if (isMongoDuplicateKeyError(error)) {
    statusCode = 409;
    message = 'Duplicate key error';
    code = ERROR_CODES.CONFLICT;
    details = (error as { keyValue?: unknown }).keyValue ?? null;
  } else if (error instanceof Error) {
    message = error.message;
  }

  logger.error(error);

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      details: details ?? null,
    },
  });
};
