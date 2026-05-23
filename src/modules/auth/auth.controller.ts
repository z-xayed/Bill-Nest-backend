import httpStatus from 'http-status';
import { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/apiResponse';
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

  return sendSuccess(res, httpStatus.OK, 'Login successful', result);
};

export const handleRefreshToken = async (req: Request, res: Response) => {
  const result = await refreshToken(req.body, {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  return sendSuccess(res, httpStatus.OK, 'Token refreshed successfully', result);
};

export const logout = async (req: Request, res: Response) => {
  await logoutUser(req.body);
  return sendSuccess(res, httpStatus.OK, 'Logout successful', {});
};

export const me = async (req: Request, res: Response) => {
  const result = await getMe(req.user!.userId);
  return sendSuccess(res, httpStatus.OK, 'User fetched successfully', result);
};

export const verifyEmailController = async (req: Request, res: Response) => {
  const result = await verifyEmail(req.body.token);
  return sendSuccess(res, httpStatus.OK, 'Email verified successfully', result);
};

export const resendEmailVerificationController = async (req: Request, res: Response) => {
  const result = await resendEmailVerification(req.body.email);
  return sendSuccess(res, httpStatus.OK, result.message, result);
};

export const forgotPasswordController = async (req: Request, res: Response) => {
  const result = await forgotPassword(req.body.email);
  return sendSuccess(
    res,
    httpStatus.OK,
    'If this email exists, a password reset link has been generated.',
    result,
  );
};

export const resetPasswordController = async (req: Request, res: Response) => {
  await resetPassword(req.body.token, req.body.newPassword);
  return sendSuccess(res, httpStatus.OK, 'Password reset successful', {});
};

export const changePasswordController = async (req: Request, res: Response) => {
  await changePassword(req.user!.userId, req.body.currentPassword, req.body.newPassword);
  return sendSuccess(res, httpStatus.OK, 'Password changed successfully', {});
};
