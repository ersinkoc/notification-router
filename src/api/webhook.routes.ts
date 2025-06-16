import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiKey, verifyWebhookSignature } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { webhookController } from '../controllers/webhookController';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';

const router = Router();

// Validation middleware
const validateWebhook = [
  param('channel_id').isString().notEmpty(),
  body().custom((value, { req }) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new Error('Request body cannot be empty');
    }
    return true;
  }),
  (req: any, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation error', 400);
    }
    next();
  },
];

// POST /api/v1/webhooks/:channel_id
router.post(
  '/:channel_id',
  rateLimiter,
  verifyApiKey,
  validateWebhook,
  webhookController.receiveWebhook,
);

// POST /api/v1/webhooks/:channel_id/secure
router.post(
  '/:channel_id/secure',
  rateLimiter,
  verifyWebhookSignature(config.security.webhookSecret),
  validateWebhook,
  webhookController.receiveWebhook,
);

// GET /api/v1/webhooks/test
router.get('/test', verifyApiKey, (req, res) => {
  res.json({
    success: true,
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString(),
  });
});

export const webhookRouter = router;