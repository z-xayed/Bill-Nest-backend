import httpStatus from 'http-status';
import { CookieOptions, Request, Response } from 'express';
import { AppError } from '../../common/errors/AppError';
import { sendSuccess } from '../../common/utils/apiResponse';
import { env } from '../../config/env';
import {
  changePassword,
  forgotPassword,
  getMe,
  loginUser,
  logoutUser,
  refreshToken,
  registerUser,
  resendEmailVerification,
  resetPassword,
  verifyEmail,
} from './auth.service';

const tokenExpiryToMs = (raw: string): number => {
  const match = /^(\d+)([mhd])$/.exec(raw);
  if (!match) return 7 * 24 * 60 * 60 * 1000;

  const value = Number(match[1]);
  const unit = match[2];

  if (unit === 'm') return value * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  return value * 24 * 60 * 60 * 1000;
};

const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/v1/auth',
  maxAge: tokenExpiryToMs(env.JWT_REFRESH_EXPIRES_IN),
};

export const register = async (req: Request, res: Response) => {
  const result = await registerUser(req.body, {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  return sendSuccess(
    res,
    httpStatus.CREATED,
    'Registration successful. Please verify your email.',
    result,
  );
};

export const login = async (req: Request, res: Response) => {
  const result = await loginUser(req.body, {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  res.cookie('refreshToken', result.tokens.refreshToken, refreshTokenCookieOptions);

  return sendSuccess(res, httpStatus.OK, 'Login successful', {
    user: result.user,
    tokens: {
      accessToken: result.tokens.accessToken,
    },
  });
};

export const handleRefreshToken = async (req: Request, res: Response) => {
  const refreshTokenFromBody = req.body?.refreshToken;
  const refreshTokenFromCookie = req.cookies?.refreshToken;
  const token = refreshTokenFromBody ?? refreshTokenFromCookie;

  if (!token) {
    throw new AppError('Refresh token is required', 400, 'REFRESH_TOKEN_REQUIRED');
  }

  const result = await refreshToken({ refreshToken: token }, {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  res.cookie('refreshToken', result.tokens.refreshToken, refreshTokenCookieOptions);

  return sendSuccess(res, httpStatus.OK, 'Token refreshed successfully', {
    tokens: {
      accessToken: result.tokens.accessToken,
    },
  });
};

export const logout = async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  }

  await logoutUser(req.user.userId);
  res.clearCookie('refreshToken', refreshTokenCookieOptions);
  return sendSuccess(res, httpStatus.OK, 'Logout successful', {});
};

export const me = async (req: Request, res: Response) => {
  const result = await getMe(req.user!.userId);
  return sendSuccess(res, httpStatus.OK, 'User fetched successfully', result);
};

export const verifyEmailController = async (req: Request, res: Response) => {
  const result = await verifyEmail(req.body.otp);
  return sendSuccess(res, httpStatus.OK, 'Email verified successfully', result);
};

export const resendEmailVerificationController = async (req: Request, res: Response) => {
  const result = await resendEmailVerification(req.body.email);
  return sendSuccess(res, httpStatus.OK, result.message, result);
};

export const forgotPasswordController = async (req: Request, res: Response) => {
  const result = await forgotPassword(req.body.email);
  return sendSuccess(res, httpStatus.OK, result.message, result);
};

export const resetPasswordController = async (req: Request, res: Response) => {
  await resetPassword(req.body.token, req.body.newPassword);
  return sendSuccess(res, httpStatus.OK, 'Password reset successful', {});
};

export const changePasswordController = async (req: Request, res: Response) => {
  await changePassword(req.user!.userId, req.body.currentPassword, req.body.newPassword);
  return sendSuccess(res, httpStatus.OK, 'Password changed successfully', {});
};
