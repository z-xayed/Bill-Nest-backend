import { RequestHandler } from 'express';
import { ZodError, ZodType } from 'zod';
import { AppError } from '../errors/AppError';

export const validateRequest = (schema: ZodType): RequestHandler => {
  return async (req, _res, next) => {
    try {
      await schema.parseAsync({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(new AppError('Validation error', 400, 'VALIDATION_ERROR', error.issues));
      }
      return next(error);
    }
  };
};
