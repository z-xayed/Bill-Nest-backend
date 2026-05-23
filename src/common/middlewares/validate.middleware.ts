import { RequestHandler } from 'express';
import { ZodError, ZodType } from 'zod';
import { AppError } from '../errors/AppError';
import { ERROR_CODES } from '../errors/errorCodes';

const formatZodIssues = (error: ZodError) =>
  error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

export const validateRequest = (schema: ZodType): RequestHandler => {
  return async (req, _res, next) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          new AppError(
            'Validation error',
            400,
            ERROR_CODES.VALIDATION_ERROR,
            formatZodIssues(error),
          ),
        );
      }
      return next(error);
    }
  };
};
