import { RequestHandler } from 'express';
import { AppError } from '../errors/AppError';
import { ERROR_CODES } from '../errors/errorCodes';

export const role = (...allowedRoles: Array<'admin' | 'client'>): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(
        new AppError('Unauthorized access', 401, ERROR_CODES.UNAUTHORIZED),
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden resource', 403, ERROR_CODES.FORBIDDEN));
    }

    return next();
  };
};
