import { Router } from 'express';
import { sendSuccess } from '../common/utils/apiResponse';
import { authRoutes } from '../modules/auth/auth.routes';
import { planRoutes } from '../modules/plans/plan.routes';
import { subscriptionRoutes } from '../modules/subscriptions/subscription.routes';

const router = Router();

router.get('/health', (_req, res) => {
  return sendSuccess(res, 200, 'Bill-Nest API is running', { status: 'ok' });
});

router.get('/docs', (_req, res) => {
  return sendSuccess(res, 200, 'Bill-Nest API documentation overview', {
    baseUrl: '/api/v1',
    Author: "Zayed Iqbal",
    postman: 'Postman collection is included in the GitHub repository.',
    postmanUrl: 'https://documenter.getpostman.com/view/55148439/2sBXwjwuCR',
    routes: {
      health: ['GET /health'],
      auth: [
        'POST /auth/register',
        'POST /auth/login',
        'POST /auth/refresh-token',
        'POST /auth/logout',
        'GET /auth/me',
        'POST /auth/verify-email',
        'POST /auth/resend-verification',
        'POST /auth/forgot-password',
        'POST /auth/reset-password',
        'PATCH /auth/change-password',
      ],
      plans: [
        'GET /plans',
        'GET /plans/:idOrSlug',
        'POST /plans',
        'PATCH /plans/:id',
        'DELETE /plans/:id',
        'PATCH /plans/:id/restore',
        'POST /plans/sync-stripe',
        'POST /plans/:id/sync-stripe',
      ],
      subscriptions: [
        'GET /subscriptions/subscribed-users',
        'POST /subscriptions/purchase',
        'GET /subscriptions/current',
        'POST /subscriptions/upgrade',
        'PATCH /subscriptions/cancel',
        'PATCH /subscriptions/resume',
      ],
      webhooks: ['POST /webhooks/stripe'],
    },
  });
});

router.use('/auth', authRoutes);
router.use('/plans', planRoutes);
router.use('/subscriptions', subscriptionRoutes);

export const routes = router;
