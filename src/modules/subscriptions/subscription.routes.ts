import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { validateRequest } from '../../common/middlewares/validate.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import {
  cancelSubscriptionController,
  getCurrentSubscriptionController,
  purchaseSubscriptionController,
  upgradeSubscriptionController,
} from './subscription.controller';
import {
  cancelSubscriptionValidationSchema,
  purchaseSubscriptionValidationSchema,
  upgradeSubscriptionValidationSchema,
} from './subscription.validation';

const router = Router();

router.post(
  '/purchase',
  authMiddleware,
  validateRequest(purchaseSubscriptionValidationSchema),
  asyncHandler(purchaseSubscriptionController),
);

router.get('/current', authMiddleware, asyncHandler(getCurrentSubscriptionController));
router.post(
  '/upgrade',
  authMiddleware,
  validateRequest(upgradeSubscriptionValidationSchema),
  asyncHandler(upgradeSubscriptionController),
);
router.patch(
  '/cancel',
  authMiddleware,
  validateRequest(cancelSubscriptionValidationSchema),
  asyncHandler(cancelSubscriptionController),
);

export const subscriptionRoutes = router;
