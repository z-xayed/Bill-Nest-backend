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

// Stripe webhook route must be mounted before express.json() in a later step.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(apiRateLimiter);
app.use('/api/v1', routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
