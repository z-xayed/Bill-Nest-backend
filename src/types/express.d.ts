import type { AuthUser } from '../common/middlewares/auth.middleware';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};


