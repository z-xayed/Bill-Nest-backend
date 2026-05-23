import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import {
  AuthUserPayload,
  EmailVerificationTokenPayload,
  PasswordResetTokenPayload,
  RefreshTokenPayload,
} from './auth.interface';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
};

export const comparePassword = async (
  password: string,
  passwordHash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, passwordHash);
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateAccessToken = (payload: AuthUserPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): AuthUserPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUserPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
};

export const generateEmailVerificationToken = (
  payload: EmailVerificationTokenPayload,
): string => {
  return jwt.sign(payload, env.EMAIL_VERIFICATION_TOKEN_SECRET, {
    expiresIn: env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verifyEmailVerificationToken = (
  token: string,
): EmailVerificationTokenPayload => {
  return jwt.verify(token, env.EMAIL_VERIFICATION_TOKEN_SECRET) as EmailVerificationTokenPayload;
};

export const generatePasswordResetToken = (
  payload: PasswordResetTokenPayload,
): string => {
  return jwt.sign(payload, env.PASSWORD_RESET_TOKEN_SECRET, {
    expiresIn: env.PASSWORD_RESET_TOKEN_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verifyPasswordResetToken = (token: string): PasswordResetTokenPayload => {
  return jwt.verify(token, env.PASSWORD_RESET_TOKEN_SECRET) as PasswordResetTokenPayload;
};
