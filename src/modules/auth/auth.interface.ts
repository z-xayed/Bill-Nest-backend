export type AuthUserPayload = {
  userId: string;
  email: string;
  role: 'admin' | 'client';
};

export type RefreshTokenPayload = {
  userId: string;
  tokenType: 'refresh';
};

export type EmailVerificationTokenPayload = {
  userId: string;
  email: string;
  tokenType: 'email_verification';
};

export type PasswordResetTokenPayload = {
  userId: string;
  email: string;
  tokenType: 'password_reset';
};

export type RequestMeta = { userAgent?: string; ipAddress?: string };

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RefreshTokenInput = {
  refreshToken: string;
};
