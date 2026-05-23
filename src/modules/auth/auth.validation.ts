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
    email: z.string().email(),
    password: passwordSchema,
  }),
});

export const loginValidationSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const refreshTokenValidationSchema = z.object({
  body: z.object({ refreshToken: z.string().min(1) }),
});

export const logoutValidationSchema = z.object({
  body: z.object({ refreshToken: z.string().min(1) }),
});

export const verifyEmailValidationSchema = z.object({
  body: z.object({ token: z.string().min(1) }),
});

export const resendVerificationValidationSchema = z.object({
  body: z.object({ email: z.string().email() }),
});

export const forgotPasswordValidationSchema = z.object({
  body: z.object({ email: z.string().email() }),
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
