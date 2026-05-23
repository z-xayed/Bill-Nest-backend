import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { requireRole } from '../../common/middlewares/role.middleware';
import { validateRequest } from '../../common/middlewares/validate.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import {
  cancelSubscriptionController,
  getAllSubscribedUsersController,
  getCurrentSubscriptionController,
  purchaseSubscriptionController,
  upgradeSubscriptionController,
} from './subscription.controller';
import {
  cancelSubscriptionValidationSchema,
  purchaseSubscriptionValidationSchema,
  subscribedUsersQueryValidationSchema,
  upgradeSubscriptionValidationSchema,
} from './subscription.validation';

const router = Router();

router.get(
  '/subscribed-users',
  authMiddleware,
  requireRole('admin'),
  validateRequest(subscribedUsersQueryValidationSchema),
  asyncHandler(getAllSubscribedUsersController),
);

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
