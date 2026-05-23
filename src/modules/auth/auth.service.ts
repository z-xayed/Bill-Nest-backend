import { AppError } from '../../common/errors/AppError';
import { env } from '../../config/env';
import { Session } from '../sessions/session.model';
import { createSession, revokeAllUserSessions } from '../sessions/session.service';
import { IUser } from '../users/user.interface';
import { User } from '../users/user.model';
import { sanitizeUser } from '../users/user.utils';
import { LoginPayload, RefreshTokenInput, RegisterPayload, RequestMeta } from './auth.interface';
import {
  comparePassword,
  generateAccessToken,
  generateEmailVerificationOtp,
  generatePasswordResetToken,
  generateRefreshToken,
  hashPassword,
  hashToken,
  verifyPasswordResetToken,
  verifyRefreshToken,
} from './auth.utils';

const msFromTokenExpiry = (raw: string): number => {
  const value = Number(raw.slice(0, -1));
  const unit = raw.slice(-1);
  if (!Number.isFinite(value)) return 0;
  if (unit === 'm') return value * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  if (unit === 'd') return value * 24 * 60 * 60 * 1000;
  return 0;
};

const buildTokenResponse = (user: IUser) => {
  const accessToken = generateAccessToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    userId: user._id.toString(),
    tokenType: 'refresh',
  });

  return { accessToken, refreshToken };
};

export const registerUser = async (
  payload: RegisterPayload,
  _meta?: RequestMeta,
) => {
  const existing = await User.findOne({ email: payload.email.toLowerCase() });
  if (existing) throw new AppError('Email already registered', 409, 'EMAIL_ALREADY_EXISTS');

  const passwordHash = await hashPassword(payload.password);
  const user = await User.create({
    name: payload.name,
    email: payload.email.toLowerCase(),
    passwordHash,
    role: 'client',
  });

  const emailVerificationOtp = generateEmailVerificationOtp();

  user.emailVerificationTokenHash = hashToken(emailVerificationOtp);
  user.emailVerificationTokenExpiresAt = new Date(
    Date.now() + msFromTokenExpiry(env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN),
  );
  await user.save();

  return {
    user: sanitizeUser(user),
    temporaryForFasterCheckingOtp: emailVerificationOtp,
  };
};

export const loginUser = async (
  payload: LoginPayload,
  meta?: RequestMeta,
) => {
  const user = await User.findOne({ email: payload.email.toLowerCase() }).select('+passwordHash');
  if (!user || !user.passwordHash) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

  const isPasswordMatch = await comparePassword(payload.password, user.passwordHash);
  if (!isPasswordMatch) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

  if (user.status !== 'active') throw new AppError('User is not active', 403, 'USER_NOT_ACTIVE');
  if (!user.isEmailVerified) {
    throw new AppError('Please verify your email before logging in', 403, 'EMAIL_NOT_VERIFIED');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = buildTokenResponse(user);
  await createSession(
    user._id,
    hashToken(tokens.refreshToken),
    new Date(Date.now() + msFromTokenExpiry(env.JWT_REFRESH_EXPIRES_IN)),
    meta,
  );

  return { user: sanitizeUser(user), tokens };
};

export const refreshToken = async (payload: RefreshTokenInput, meta?: RequestMeta) => {
  const decoded = verifyRefreshToken(payload.refreshToken);
  const refreshTokenHash = hashToken(payload.refreshToken);

  const session = await Session.findOne({
    refreshTokenHash,
    userId: decoded.userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });

  if (!session) throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');

  session.isRevoked = true;
  session.revokedAt = new Date();
  await session.save();

  const user = await User.findById(decoded.userId);
  if (!user || user.status !== 'active') throw new AppError('User is not active', 403, 'USER_NOT_ACTIVE');

  const tokens = buildTokenResponse(user);
  await createSession(
    user._id,
    hashToken(tokens.refreshToken),
    new Date(Date.now() + msFromTokenExpiry(env.JWT_REFRESH_EXPIRES_IN)),
    meta,
  );

  return { tokens };
};

export const logoutUser = async (userId: string) => {
  await revokeAllUserSessions(userId);
  return { success: true };
};

export const getMe = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  return { user: sanitizeUser(user) };
};

export const verifyEmail = async (otp: string) => {
  const user = await User.findOne({
    emailVerificationTokenHash: hashToken(otp),
    emailVerificationTokenExpiresAt: { $gt: new Date() },
  }).select('+emailVerificationTokenHash +emailVerificationTokenExpiresAt');

  if (!user) {
    throw new AppError('Invalid email verification OTP', 400, 'INVALID_EMAIL_VERIFICATION_TOKEN');
  }

  user.isEmailVerified = true;
  user.emailVerifiedAt = new Date();
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationTokenExpiresAt = undefined;
  await user.save();

  return { user: sanitizeUser(user) };
};

export const resendEmailVerification = async (email: string) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+emailVerificationTokenHash +emailVerificationTokenExpiresAt',
  );

  if (!user) return { message: 'A verification code has been sent to the email address.' };
  if (user.isEmailVerified) throw new AppError('Email already verified', 400, 'EMAIL_ALREADY_VERIFIED');

  const emailVerificationOtp = generateEmailVerificationOtp();

  user.emailVerificationTokenHash = hashToken(emailVerificationOtp);
  user.emailVerificationTokenExpiresAt = new Date(
    Date.now() + msFromTokenExpiry(env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN),
  );
  await user.save();

  return {
    message: 'A verification code has been sent to the email address.',
    temporaryForFasterCheckingOtp: emailVerificationOtp,
  };
};

export const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+passwordResetTokenHash +passwordResetTokenExpiresAt',
  );

  if (!user) return { message: 'A password reset link has been sent to the email address.' };

  const passwordResetToken = generatePasswordResetToken({
    userId: user._id.toString(),
    email: user.email,
    tokenType: 'password_reset',
  });

  user.passwordResetTokenHash = hashToken(passwordResetToken);
  user.passwordResetTokenExpiresAt = new Date(
    Date.now() + msFromTokenExpiry(env.PASSWORD_RESET_TOKEN_EXPIRES_IN),
  );
  await user.save();

  return {
    message: 'A password reset link has been sent to the email address.',
    temporaryForFasterCheckingPasswordResetToken: passwordResetToken,
  };
};

export const resetPassword = async (token: string, newPassword: string) => {
  const decoded = verifyPasswordResetToken(token);
  const user = await User.findOne({
    _id: decoded.userId,
    passwordResetTokenHash: hashToken(token),
    passwordResetTokenExpiresAt: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetTokenExpiresAt');

  if (!user) throw new AppError('Invalid password reset token', 400, 'INVALID_PASSWORD_RESET_TOKEN');

  user.passwordHash = await hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  user.passwordResetTokenHash = undefined;
  user.passwordResetTokenExpiresAt = undefined;
  await user.save();

  await revokeAllUserSessions(user._id.toString());

  return { success: true };
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !user.passwordHash) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  const isCurrentPasswordMatch = await comparePassword(currentPassword, user.passwordHash);
  if (!isCurrentPasswordMatch) throw new AppError('Invalid current password', 400, 'INVALID_CURRENT_PASSWORD');

  user.passwordHash = await hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  await user.save();

  await revokeAllUserSessions(userId);

  return { success: true };
};
