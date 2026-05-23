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
