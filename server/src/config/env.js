import Joi from 'joi';
import dotenv from 'dotenv';

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(5000),

  MONGO_URI: Joi.string().required(),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').default(''),
  CLOUDINARY_API_KEY: Joi.string().allow('').default(''),
  CLOUDINARY_API_SECRET: Joi.string().allow('').default(''),

  OPENAI_API_KEY: Joi.string().allow('').default(''),

  // Job provider APIs (all optional — providers are silently skipped when not set)
  ADZUNA_APP_ID:    Joi.string().allow('').default(''),
  ADZUNA_API_KEY:   Joi.string().allow('').default(''),
  JOOBLE_API_KEY:   Joi.string().allow('').default(''),
  FINDWORK_API_KEY: Joi.string().allow('').default(''),
  REED_API_KEY:     Joi.string().allow('').default(''),

  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),
  EMAIL_FROM: Joi.string().allow('').default('CareerSync <no-reply@careersync.io>'),

  CLIENT_URL: Joi.string().uri().default('http://localhost:5173'),

  // Automation: AES-256-GCM key for encrypting portal credentials at rest
  CREDENTIALS_ENCRYPTION_KEY: Joi.string().min(32).default('change-me-in-production-min-32-chars!!'),
}).unknown(true);

const { error, value: env } = schema.validate(process.env);

if (error) {
  throw new Error(`Environment validation failed: ${error.message}`);
}

export default env;
