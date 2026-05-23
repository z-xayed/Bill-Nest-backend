import express, { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { handleStripeWebhook, webhookStatus } from './webhooks.controller';

const stripeWebhookRouter = Router();
const webhooksRoutes = Router();

stripeWebhookRouter.post(
  '/',
  express.raw({ type: 'application/json' }),
  asyncHandler(handleStripeWebhook),
);

webhooksRoutes.get('/status', asyncHandler(webhookStatus));

export { stripeWebhookRouter, webhooksRoutes };


