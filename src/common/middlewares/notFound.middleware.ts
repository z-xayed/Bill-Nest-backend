import { RequestHandler } from 'express';
import { AppError } from '../errors/AppError';

export const notFoundMiddleware: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
};
