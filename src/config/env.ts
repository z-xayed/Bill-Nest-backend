import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().min(1),
  CLIENT_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),
  EMAIL_VERIFICATION_TOKEN_SECRET: z.string().min(32),
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN: z.string().min(1),
  PASSWORD_RESET_TOKEN_SECRET: z.string().min(32),
  PASSWORD_RESET_TOKEN_EXPIRES_IN: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  CLIENT_SUCCESS_URL: z.string().url(),
  CLIENT_CANCEL_URL: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
  console.error('Invalid environment variables:', issues);
  process.exit(1);
}

export const env = parsed.data;
