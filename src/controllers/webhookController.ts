import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { recordWebhook } from '../services/metrics';
import { routingEngine } from '../engine/routingEngine';
import { WebhookPayload } from '../types';
import { AppError } from '../middleware/errorHandler';

export const webhookController = {
  async receiveWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const channelId = req.params.channel_id;
      const webhookId = uuidv4();
      const timestamp = new Date();

      // Create webhook payload
      const payload: WebhookPayload = {
        id: webhookId,
        timestamp,
        source: channelId,
        data: req.body,
        headers: req.headers as Record<string, string>,
        signature: req.headers['x-webhook-signature'] as string,
      };

      logger.info(`Received webhook ${webhookId} from channel ${channelId}`, {
        webhookId,
        channelId,
        bodySize: JSON.stringify(req.body).length,
      });

      // Process webhook asynchronously
      routingEngine.processWebhook(payload)
        .catch(error => {
          logger.error(`Failed to process webhook ${webhookId}:`, error);
          recordWebhook(channelId, 'failure');
        });

      // Record metrics
      recordWebhook(channelId, 'success');

      // Immediate response
      res.status(202).json({
        success: true,
        data: {
          webhookId,
          status: 'accepted',
          timestamp: timestamp.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
};