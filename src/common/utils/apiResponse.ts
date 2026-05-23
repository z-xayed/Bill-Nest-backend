import { Response } from 'express';

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data: data ?? null,
  });
};

export const apiResponse = <T>(message: string, data?: T) => ({
  success: true,
  message,
  data: data ?? null,
});
