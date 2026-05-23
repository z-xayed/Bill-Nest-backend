import type { RequestHandler } from 'express';
import { AppError } from '../errors/AppError';
import { verifyAccessToken } from '../../modules/auth/auth.utils';
import { User } from '../../modules/users/user.model';

export const authMiddleware: RequestHandler = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

  if (!token) {
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId).select('email role status');

    if (!user) {
      return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
    }

    if (user.status !== 'active') {
      return next(new AppError('User is not active', 403, 'USER_NOT_ACTIVE'));
    }

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};
