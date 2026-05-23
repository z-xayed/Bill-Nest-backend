import http from 'http';
import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';

const handleUnhandledRejection = (reason: unknown): void => {
  logger.error('Unhandled Rejection', reason);
};

const handleUncaughtException = (error: Error): void => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
};

const startServer = async (): Promise<void> => {
  await connectDB();

  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info(`Bill-Nest API is running on port ${env.PORT}`);
  });

  const shutdown = (signal: string): void => {
    logger.warn(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

process.on('unhandledRejection', handleUnhandledRejection);
process.on('uncaughtException', handleUncaughtException);

void startServer();
