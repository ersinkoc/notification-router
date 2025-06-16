import { v4 as uuidv4 } from 'uuid';
import { WebhookPayload, NotificationMessage, RoutingRule } from '../types';
import { logger } from '../utils/logger';
import { addNotificationToQueue } from '../services/queue';
import { evaluateConditions } from './conditionEvaluator';
import { transformMessage } from './messageTransformer';
import { getRulesForSource } from '../services/rulesService';

class RoutingEngine {
  async processWebhook(payload: WebhookPayload): Promise<void> {
    try {
      logger.info(`Processing webhook ${payload.id} from source ${payload.source}`);

      // Get applicable routing rules
      const rules = await getRulesForSource(payload.source);
      
      if (rules.length === 0) {
        logger.warn(`No routing rules found for source ${payload.source}`);
        return;
      }

      // Sort rules by priority
      rules.sort((a, b) => b.priority - a.priority);

      // Process each matching rule
      for (const rule of rules) {
        if (!rule.enabled) {
          continue;
        }

        // Evaluate conditions
        const matches = await evaluateConditions(rule.conditions, payload);
        
        if (!matches) {
          logger.debug(`Rule ${rule.name} did not match for webhook ${payload.id}`);
          continue;
        }

        logger.info(`Rule ${rule.name} matched for webhook ${payload.id}`);

        // Transform message if needed
        const content = rule.transform 
          ? await transformMessage(payload.data, rule.transform)
          : {
              title: payload.data.title || 'Notification',
              body: payload.data.message || JSON.stringify(payload.data),
              data: payload.data,
            };

        // Create notification for each channel
        for (const channel of rule.channels) {
          const notification: NotificationMessage = {
            id: uuidv4(),
            webhookId: payload.id,
            priority: rule.conditions.priority || 'medium',
            channels: [channel],
            content,
            metadata: {
              ruleName: rule.name,
              ruleId: rule.id,
              source: payload.source,
            },
            status: {
              state: 'pending',
              attempts: 0,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Add to queue with priority
          const queuePriority = this.getPriorityValue(notification.priority);
          await addNotificationToQueue(notification, queuePriority);

          logger.info(`Created notification ${notification.id} for channel ${channel.type}`);
        }
      }
    } catch (error) {
      logger.error(`Error processing webhook ${payload.id}:`, error);
      throw error;
    }
  }

  private getPriorityValue(priority: 'high' | 'medium' | 'low'): number {
    const priorityMap = {
      high: 10,
      medium: 5,
      low: 1,
    };
    return priorityMap[priority];
  }
}

export const routingEngine = new RoutingEngine();