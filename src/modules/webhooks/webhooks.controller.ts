import type { RequestHandler } from 'express';
import httpStatus from 'http-status';
import Stripe from 'stripe';
import { env } from '../../config/env';
import { stripe } from '../../config/stripe';
import { AppError } from '../../common/errors/AppError';
import { ERROR_CODES } from '../../common/errors/errorCodes';

export const handleStripeWebhook: RequestHandler = (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  if (!signature || Array.isArray(signature)) {
    return next(
      new AppError(
        'Missing Stripe signature header',
        httpStatus.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST,
      ),
    );
  }

  try {
    stripe.webhooks.constructEvent(
      req.body as Buffer,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );

    return res.status(httpStatus.OK).json({ received: true });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      return next(
        new AppError(
          error.message,
          httpStatus.BAD_REQUEST,
          ERROR_CODES.BAD_REQUEST,
        ),
      );
    }

    return next(error);
  }
};

export const webhookStatus: RequestHandler = (_req, res) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Webhook module is ready',
  });
};
