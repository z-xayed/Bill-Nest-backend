import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { requireRole } from '../../common/middlewares/role.middleware';
import { validateRequest } from '../../common/middlewares/validate.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import {
  createPlanController,
  deletePlanController,
  getPlanByIdOrSlugController,
  getPlansController,
  restorePlanController,
  syncMissingPlansWithStripeController,
  syncPlanWithStripeController,
  updatePlanController,
} from './plan.controller';
import {
  createPlanValidationSchema,
  getPlansQueryValidationSchema,
  planIdOrSlugParamValidationSchema,
  planIdParamValidationSchema,
  updatePlanValidationSchema,
} from './plan.validation';

const router = Router();

router.get('/', validateRequest(getPlansQueryValidationSchema), asyncHandler(getPlansController));

router.post(
  '/',
  authMiddleware,
  requireRole('admin'),
  validateRequest(createPlanValidationSchema),
  asyncHandler(createPlanController),
);

router.post(
  '/sync-stripe',
  authMiddleware,
  requireRole('admin'),
  asyncHandler(syncMissingPlansWithStripeController),
);

router.post(
  '/:id/sync-stripe',
  authMiddleware,
  requireRole('admin'),
  validateRequest(planIdParamValidationSchema),
  asyncHandler(syncPlanWithStripeController),
);

router.patch(
  '/:id',
  authMiddleware,
  requireRole('admin'),
  validateRequest(updatePlanValidationSchema),
  asyncHandler(updatePlanController),
);

router.delete(
  '/:id',
  authMiddleware,
  requireRole('admin'),
  validateRequest(planIdParamValidationSchema),
  asyncHandler(deletePlanController),
);

router.patch(
  '/:id/restore',
  authMiddleware,
  requireRole('admin'),
  validateRequest(planIdParamValidationSchema),
  asyncHandler(restorePlanController),
);

router.get('/:idOrSlug', validateRequest(planIdOrSlugParamValidationSchema), asyncHandler(getPlanByIdOrSlugController));

export const planRoutes = router;
