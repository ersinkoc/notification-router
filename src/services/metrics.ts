import { Application } from 'express';
import promClient from 'prom-client';
import { logger } from '../utils/logger';
import { config } from '../config';

const register = new promClient.Registry();

// Default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
export const metrics = {
  webhooksReceived: new promClient.Counter({
    name: 'webhooks_received_total',
    help: 'Total number of webhooks received',
    labelNames: ['source', 'status'],
    registers: [register],
  }),

  notificationsProcessed: new promClient.Counter({
    name: 'notifications_processed_total',
    help: 'Total number of notifications processed',
    labelNames: ['channel', 'status'],
    registers: [register],
  }),

  notificationDuration: new promClient.Histogram({
    name: 'notification_processing_duration_seconds',
    help: 'Duration of notification processing',
    labelNames: ['channel'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
    registers: [register],
  }),

  queueSize: new promClient.Gauge({
    name: 'queue_size',
    help: 'Current size of the notification queue',
    labelNames: ['status'],
    registers: [register],
  }),

  channelErrors: new promClient.Counter({
    name: 'channel_errors_total',
    help: 'Total number of channel errors',
    labelNames: ['channel', 'error_type'],
    registers: [register],
  }),
};

export function initializeMetrics(app: Application) {
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      logger.error('Error generating metrics:', error);
      res.status(500).end();
    }
  });

  logger.info(`Metrics endpoint available at http://localhost:${config.server.port}/metrics`);
}

export function recordWebhook(source: string, status: 'success' | 'failure') {
  metrics.webhooksReceived.labels(source, status).inc();
}

export function recordNotification(channel: string, status: 'success' | 'failure') {
  metrics.notificationsProcessed.labels(channel, status).inc();
}

export function recordNotificationDuration(channel: string, duration: number) {
  metrics.notificationDuration.labels(channel).observe(duration);
}

export function updateQueueSize(waiting: number, active: number, failed: number) {
  metrics.queueSize.labels('waiting').set(waiting);
  metrics.queueSize.labels('active').set(active);
  metrics.queueSize.labels('failed').set(failed);
}

export function recordChannelError(channel: string, errorType: string) {
  metrics.channelErrors.labels(channel, errorType).inc();
}