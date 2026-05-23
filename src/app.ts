import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { routes } from './app/routes';
import { errorMiddleware } from './common/middlewares/error.middleware';
import { notFoundMiddleware } from './common/middlewares/notFound.middleware';
import { apiRateLimiter } from './common/middlewares/rateLimit.middleware';
import { requestIdMiddleware } from './common/middlewares/requestId.middleware';
import { requestLoggerMiddleware } from './common/middlewares/requestLogger.middleware';
import { env } from './config/env';
import { stripeWebhookRoutes } from './modules/webhooks/stripeWebhook.routes';

const app = express();

app.use(requestIdMiddleware);
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(compression());
app.use(cookieParser());
app.use(requestLoggerMiddleware);

app.use('/api/v1/webhooks/stripe', stripeWebhookRoutes);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(apiRateLimiter);

app.get('/', (_req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Welcome to Bill-Nest Backend API',
    data: {
      name: 'Bill-Nest Backend',
      postman: 'https://documenter.getpostman.com/view/55148439/2sBXwjwuCR',
      description:
        'Secure subscription and billing backend API built with Node.js, Express, TypeScript, MongoDB, Mongoose, JWT authentication, and Stripe.',
      status: 'running',
      version: '1.0.0',
      environment: env.NODE_ENV,
      baseUrl: '/api/v1',
      health: '/api/v1/health',
      docs: '/api/v1/docs',
      endpoints: {
        auth: '/api/v1/auth',
        plans: '/api/v1/plans',
        subscriptions: '/api/v1/subscriptions',
        webhook: '/api/v1/webhooks/stripe',
      },
    },
  });
});

app.use('/api/v1', routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
