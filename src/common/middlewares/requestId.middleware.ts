import { NextFunction, Request, Response } from 'express';
import { v7 as uuidv7 } from 'uuid';

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const requestId = uuidv7();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};
