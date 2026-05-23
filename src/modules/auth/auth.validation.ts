import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8)
  .max(72)
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
  .regex(/[a-z]/, 'Password must include at least one lowercase letter')
  .regex(/[0-9]/, 'Password must include at least one number');

export const registerValidationSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.email(),
    password: passwordSchema,
  }),
});

export const loginValidationSchema = z.object({
  body: z.object({
    email: z.email(),
    password: z.string().min(1),
  }),
});

export const refreshTokenValidationSchema = z.object({
  body: z.object({ refreshToken: z.string().min(1).optional() }),
});

export const verifyEmailValidationSchema = z.object({
  body: z.object({
    otp: z
      .string()
      .regex(/^\d{6}$/, 'OTP must be a 6-digit numeric code'),
  }),
});

export const resendVerificationValidationSchema = z.object({
  body: z.object({ email: z.email() }),
});

export const forgotPasswordValidationSchema = z.object({
  body: z.object({ email: z.email() }),
});

export const resetPasswordValidationSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    newPassword: passwordSchema,
  }),
});

export const changePasswordValidationSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  }),
});
