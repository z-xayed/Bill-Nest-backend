import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../errors/AppError';
import { ERROR_CODES } from '../errors/errorCodes';

export type AuthUser = {
  userId: string;
  role: 'admin' | 'client';
  iat?: number;
  exp?: number;
};

export const auth: RequestHandler = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : undefined;

  if (!token) {
    return next(
      new AppError('Unauthorized access', 401, ERROR_CODES.UNAUTHORIZED),
    );
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
    req.user = decoded;
    return next();
  } catch {
    return next(new AppError('Invalid token', 401, ERROR_CODES.UNAUTHORIZED));
  }
};
