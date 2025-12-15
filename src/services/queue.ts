import Bull from 'bull';
import { config } from '../config';
import { logger } from '../utils/logger';
import { NotificationMessage, QueueJob } from '../types';
import { processNotification } from '../engine/processor';

let notificationQueue: Bull.Queue<NotificationMessage>;

export async function initializeQueue() {
  try {
    // BUG-009 FIX: Add proper error handling for Redis URL parsing
    let redisHost: string;
    let redisPort: number;

    try {
      const redisUrl = new URL(config.redis.url);
      redisHost = redisUrl.hostname;
      redisPort = redisUrl.port ? parseInt(redisUrl.port) : 6379;
    } catch (urlError) {
      logger.error('Invalid Redis URL format:', config.redis.url);
      throw new Error(`Invalid Redis URL: ${config.redis.url}. Expected format: redis://hostname:port`);
    }

    notificationQueue = new Bull('notifications', {
      redis: {
        host: redisHost,
        port: redisPort,
        password: config.redis.password || undefined,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: config.queue.retryAttempts,
        backoff: {
          type: 'exponential',
          delay: config.queue.retryDelay,
        },
      },
    });

    // Process notifications
    notificationQueue.process(config.queue.concurrentWorkers, async (job) => {
      logger.info(`Processing notification ${job.id}`);
      return await processNotification(job.data);
    });

    // Event handlers
    notificationQueue.on('completed', (job) => {
      logger.info(`Notification ${job.id} completed successfully`);
    });

    notificationQueue.on('failed', (job, err) => {
      logger.error(`Notification ${job?.id} failed:`, err);
    });

    notificationQueue.on('stalled', (job) => {
      logger.warn(`Notification ${job.id} stalled and will be retried`);
    });

    logger.info('Message queue initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize queue:', error);
    throw error;
  }
}

export async function addNotificationToQueue(
  notification: NotificationMessage,
  priority: number = 0,
) {
  if (!notificationQueue) {
    throw new Error('Queue not initialized');
  }

  const job = await notificationQueue.add(notification, {
    priority,
    delay: 0,
  });

  logger.info(`Added notification ${notification.id} to queue with job ID ${job.id}`);
  return job.id;
}

export async function getQueueStatus() {
  if (!notificationQueue) {
    throw new Error('Queue not initialized');
  }

  const [waiting, active, completed, failed] = await Promise.all([
    notificationQueue.getWaitingCount(),
    notificationQueue.getActiveCount(),
    notificationQueue.getCompletedCount(),
    notificationQueue.getFailedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
  };
}

export function getQueue() {
  if (!notificationQueue) {
    throw new Error('Queue not initialized');
  }
  return notificationQueue;
}