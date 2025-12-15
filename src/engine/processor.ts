import { NotificationMessage, DeliveryResult } from '../types';
import { logger } from '../utils/logger';
import { channelManager } from '../channels/channelManager';
import { recordNotification, recordNotificationDuration, recordChannelError } from '../services/metrics';

export async function processNotification(notification: NotificationMessage): Promise<void> {
  try {
    logger.info(`Processing notification ${notification.id}`);

    // Update status to processing
    notification.status.state = 'processing';
    notification.status.lastAttempt = new Date();
    notification.status.attempts++;

    // BUG-006 FIX: Process each channel and record duration individually
    for (const channelConfig of notification.channels) {
      const channelStartTime = Date.now();

      try {
        // Apply delay if specified
        if (channelConfig.delay) {
          await new Promise(resolve => setTimeout(resolve, channelConfig.delay));
        }

        // Get channel adapter
        const adapter = channelManager.getAdapter(channelConfig.type);

        if (!adapter) {
          throw new Error(`No adapter found for channel type: ${channelConfig.type}`);
        }

        // Send notification
        const result = await adapter.send(notification.content, channelConfig.config);

        if (result.success) {
          notification.status.state = 'delivered';
          notification.status.deliveryInfo = result.details;

          logger.info(`Notification ${notification.id} delivered via ${channelConfig.type}`, {
            messageId: result.messageId,
            provider: result.provider,
          });

          recordNotification(channelConfig.type, 'success');

          // Record duration for this specific channel
          const channelDuration = (Date.now() - channelStartTime) / 1000;
          recordNotificationDuration(channelConfig.type, channelDuration);
        } else {
          throw new Error(result.error || 'Delivery failed');
        }

      } catch (error) {
        logger.error(`Failed to deliver notification ${notification.id} via ${channelConfig.type}:`, error);

        recordChannelError(channelConfig.type, error instanceof Error ? error.name : 'Unknown');

        // Record duration even for failed attempts
        const channelDuration = (Date.now() - channelStartTime) / 1000;
        recordNotificationDuration(channelConfig.type, channelDuration);

        // Check if we should retry
        if (shouldRetry(notification, channelConfig)) {
          notification.status.state = 'retry';
          notification.status.error = error instanceof Error ? error.message : 'Unknown error';
          throw error; // Let Bull handle the retry
        } else {
          notification.status.state = 'failed';
          notification.status.error = error instanceof Error ? error.message : 'Unknown error';
          recordNotification(channelConfig.type, 'failure');
        }
      }
    }

  } catch (error) {
    logger.error(`Error processing notification ${notification.id}:`, error);
    throw error;
  }
}

function shouldRetry(notification: NotificationMessage, channelConfig: any): boolean {
  const policy = channelConfig.retryPolicy || {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
    maxDelay: 30000,
  };
  
  return notification.status.attempts < policy.maxAttempts;
}