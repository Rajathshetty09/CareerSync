import morgan from 'morgan';
import logger from '../utils/logger.js';

// Pipe Morgan's output into Winston
const stream = {
  write: (message) => logger.http(message.trim()),
};

const requestLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  { stream },
);

export default requestLogger;
