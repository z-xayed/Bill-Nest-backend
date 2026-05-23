import { RequestHandler } from 'express';
import { AppError } from '../errors/AppError';
import { ERROR_CODES } from '../errors/errorCodes';

export const notFound: RequestHandler = (req, _res, next) => {
  next(
    new AppError(
      `Route not found: ${req.originalUrl}`,
      404,
      ERROR_CODES.NOT_FOUND,
    ),
  );
};
