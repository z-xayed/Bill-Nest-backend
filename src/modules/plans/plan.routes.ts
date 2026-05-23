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
router.get('/:idOrSlug', validateRequest(planIdOrSlugParamValidationSchema), asyncHandler(getPlanByIdOrSlugController));

router.post(
  '/',
  authMiddleware,
  requireRole('admin'),
  validateRequest(createPlanValidationSchema),
  asyncHandler(createPlanController),
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

export const planRoutes = router;
