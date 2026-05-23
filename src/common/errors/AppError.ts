import { ErrorCode, ERROR_CODES } from './errorCodes';

export class AppError extends Error {
  public statusCode: number;
  public code: ErrorCode;
  public details?: unknown;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code: ErrorCode = ERROR_CODES.INTERNAL_SERVER_ERROR,
    details?: unknown,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
