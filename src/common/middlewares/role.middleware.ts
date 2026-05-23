import type { RequestHandler } from 'express';
import { AppError } from '../errors/AppError';

export const requireRole = (...roles: Array<'admin' | 'client'>): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
    }

    return next();
  };
};
