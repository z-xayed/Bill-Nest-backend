import express, { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { handleStripeWebhook } from './stripeWebhook.controller';

const router = Router();

router.post('/', express.raw({ type: 'application/json' }), asyncHandler(handleStripeWebhook));

export const stripeWebhookRoutes = router;
