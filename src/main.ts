import app from './app/app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

void startServer();

