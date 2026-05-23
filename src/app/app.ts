import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from '../config/env';
import { morganStream } from '../config/logger';
import { errorMiddleware } from '../common/middlewares/error.middleware';
import { notFound } from '../common/middlewares/notFound.middleware';
import { apiRateLimiter } from '../common/middlewares/rateLimit.middleware';
import { stripeWebhookRouter } from '../modules/webhooks/webhooks.routes';
import { apiRoutes } from './routes';

const app = express();

app.use('/api/v1/webhooks/stripe', stripeWebhookRouter);

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  }),
);
app.use(compression());
app.use(apiRateLimiter);
app.use(morgan('combined', { stream: morganStream }));
app.use(express.json());

app.use('/api/v1', apiRoutes);

app.use(notFound);
app.use(errorMiddleware);

export default app;
