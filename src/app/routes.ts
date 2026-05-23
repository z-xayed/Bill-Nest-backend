import { Router } from 'express';
import { sendSuccess } from '../common/utils/apiResponse';
import { authRoutes } from '../modules/auth/auth.routes';
import { planRoutes } from '../modules/plans/plan.routes';
import { subscriptionRoutes } from '../modules/subscriptions/subscription.routes';

const router = Router();

router.get('/health', (_req, res) => {
  return sendSuccess(res, 200, 'Bill-Nest API is running', { status: 'ok' });
});

router.use('/auth', authRoutes);
router.use('/plans', planRoutes);
router.use('/subscriptions', subscriptionRoutes);

export const routes = router;
