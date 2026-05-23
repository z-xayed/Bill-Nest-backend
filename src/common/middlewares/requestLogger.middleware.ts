import morgan from 'morgan';
import { morganStream } from '../../config/logger';

export const requestLoggerMiddleware = morgan(
  ':method :url :status :res[content-length] - :response-time ms reqId=:req[x-request-id]',
  { stream: morganStream },
);
