import fs from 'fs';
import path from 'path';
import winston from 'winston';
import { env } from './env';

const logsDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'bill-nest-api' },
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.resolve(logsDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.resolve(logsDir, 'combined.log'),
    }),
  ],
});

export const morganStream = {
  write: (message: string): void => {
    logger.info(message.trim());
  },
};
