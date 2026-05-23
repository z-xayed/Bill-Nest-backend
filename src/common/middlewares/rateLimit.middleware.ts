import rateLimit from 'express-rate-limit';
import { ERROR_CODES } from '../errors/errorCodes';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    error: {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      details: null,
    },
  },
});
