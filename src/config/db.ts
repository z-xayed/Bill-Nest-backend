import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGO_URI);
    logger.info('MongoDB connection established', { mongoUri: env.MONGO_URI });
  } catch (error) {
    logger.error('Failed to connect MongoDB', error);
    process.exit(1);
  }
};

mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected');
});

mongoose.connection.on('error', (error) => {
  logger.error('Mongoose connection error', error);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected');
});
