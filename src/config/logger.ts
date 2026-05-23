import fs from 'fs';
import path from 'path';
import winston from 'winston';
import { env } from './env';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp(),
  errors({ stack: true }),
  printf(({ level, message, timestamp: logTime, stack }) => {
    return `${logTime} [${level}] ${stack ?? message}`;
  }),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

const logsDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
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
