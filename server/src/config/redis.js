import Redis from 'ioredis';
import env from './env.js';
import logger from '../utils/logger.js';

const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  ...(env.REDIS_PASSWORD && { password: env.REDIS_PASSWORD }),
  maxRetriesPerRequest: null, // Required for BullMQ
  retryStrategy: (times) => Math.min(times * 100, 3000),
  enableReadyCheck: false,
};

const redis = new Redis(redisConfig);

redis.on('connect', () => logger.info('Redis connected'));
redis.on('ready', () => logger.info('Redis ready'));
redis.on('error', (err) => logger.error(`Redis error: ${err.message}`));
redis.on('close', () => logger.warn('Redis connection closed'));

export { redisConfig };
export default redis;
