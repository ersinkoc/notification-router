import Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  HOST: Joi.string().default('0.0.0.0'),
  
  DATABASE_TYPE: Joi.string().valid('sqlite', 'postgres').default('sqlite'),
  DATABASE_URL: Joi.string().required(),
  
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  
  JWT_SECRET: Joi.string().required(),
  API_KEY_SALT: Joi.string().required(),
  WEBHOOK_SECRET: Joi.string().required(),
  
  RATE_LIMIT_WINDOW_MS: Joi.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  
  SENDGRID_API_KEY: Joi.string().optional(),
  
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  TWILIO_FROM_NUMBER: Joi.string().optional(),
  
  SLACK_BOT_TOKEN: Joi.string().optional(),
  SLACK_SIGNING_SECRET: Joi.string().optional(),
  
  TELEGRAM_BOT_TOKEN: Joi.string().optional(),
  
  DISCORD_WEBHOOK_URL: Joi.string().optional(),
  
  ENABLE_METRICS: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().default(9090),
  
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'simple').default('json'),
  
  QUEUE_RETRY_ATTEMPTS: Joi.number().default(3),
  QUEUE_RETRY_DELAY: Joi.number().default(5000),
  QUEUE_CONCURRENT_WORKERS: Joi.number().default(5),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  server: {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    host: envVars.HOST,
    corsOrigins: envVars.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] 
      : ['http://localhost:3001', 'http://localhost:5173'],
  },
  
  database: {
    type: envVars.DATABASE_TYPE,
    url: envVars.DATABASE_URL,
  },
  
  redis: {
    url: envVars.REDIS_URL,
    password: envVars.REDIS_PASSWORD,
  },
  
  security: {
    jwtSecret: envVars.JWT_SECRET,
    apiKeySalt: envVars.API_KEY_SALT,
    webhookSecret: envVars.WEBHOOK_SECRET,
  },
  
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
  },
  
  channels: {
    email: {
      smtp: {
        host: envVars.SMTP_HOST,
        port: envVars.SMTP_PORT,
        secure: envVars.SMTP_SECURE,
        auth: {
          user: envVars.SMTP_USER,
          pass: envVars.SMTP_PASS,
        },
      },
      sendgrid: {
        apiKey: envVars.SENDGRID_API_KEY,
      },
    },
    sms: {
      twilio: {
        accountSid: envVars.TWILIO_ACCOUNT_SID,
        authToken: envVars.TWILIO_AUTH_TOKEN,
        fromNumber: envVars.TWILIO_FROM_NUMBER,
      },
    },
    slack: {
      botToken: envVars.SLACK_BOT_TOKEN,
      signingSecret: envVars.SLACK_SIGNING_SECRET,
    },
    telegram: {
      botToken: envVars.TELEGRAM_BOT_TOKEN,
    },
    discord: {
      webhookUrl: envVars.DISCORD_WEBHOOK_URL,
    },
  },
  
  monitoring: {
    enableMetrics: envVars.ENABLE_METRICS,
    metricsPort: envVars.METRICS_PORT,
  },
  
  logging: {
    level: envVars.LOG_LEVEL,
    format: envVars.LOG_FORMAT,
  },
  
  queue: {
    retryAttempts: envVars.QUEUE_RETRY_ATTEMPTS,
    retryDelay: envVars.QUEUE_RETRY_DELAY,
    concurrentWorkers: envVars.QUEUE_CONCURRENT_WORKERS,
  },
};