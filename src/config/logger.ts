import fs from 'fs';
import path from 'path';
import winston from 'winston';
import { env } from './env';

const isProduction = env.NODE_ENV === 'production';
const transports: winston.transport[] = [new winston.transports.Console()];

if (!isProduction) {
  const logsDir = path.resolve(process.cwd(), 'logs');
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    transports.push(
      new winston.transports.File({
        filename: path.resolve(logsDir, 'error.log'),
        level: 'error',
      }),
    );
    transports.push(
      new winston.transports.File({
        filename: path.resolve(logsDir, 'combined.log'),
      }),
    );
  } catch (error) {
    console.warn('[logger] Failed to initialize file transports. Falling back to console only.', error);
  }
}

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  defaultMeta: { service: 'bill-nest-api' },
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports,
});

export const morganStream = {
  write: (message: string): void => {
    logger.info(message.trim());
  },
};
