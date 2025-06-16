import { RoutingConditions, WebhookPayload } from '../types';
import { logger } from '../utils/logger';

export async function evaluateConditions(
  conditions: RoutingConditions,
  payload: WebhookPayload,
): Promise<boolean> {
  try {
    // Check source condition
    if (conditions.source) {
      const sources = Array.isArray(conditions.source) ? conditions.source : [conditions.source];
      if (!sources.includes(payload.source)) {
        return false;
      }
    }

    // Check priority condition
    if (conditions.priority && payload.data.priority !== conditions.priority) {
      return false;
    }

    // Check keywords
    if (conditions.keywords && conditions.keywords.length > 0) {
      const payloadString = JSON.stringify(payload.data).toLowerCase();
      const hasKeyword = conditions.keywords.some(keyword => 
        payloadString.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) {
        return false;
      }
    }

    // Check field conditions
    if (conditions.fields) {
      for (const [field, value] of Object.entries(conditions.fields)) {
        const fieldValue = getFieldValue(payload.data, field);
        if (!matchFieldValue(fieldValue, value)) {
          return false;
        }
      }
    }

    // Check time window
    if (conditions.timeWindow) {
      if (!isWithinTimeWindow(conditions.timeWindow)) {
        return false;
      }
    }

    // Evaluate custom JavaScript expression
    if (conditions.custom) {
      try {
        // Create a safe evaluation context
        const context = {
          payload: payload.data,
          source: payload.source,
          headers: payload.headers,
        };
        
        // Use Function constructor for safer evaluation
        const evaluator = new Function('context', `
          const { payload, source, headers } = context;
          return ${conditions.custom};
        `);
        
        const result = evaluator(context);
        if (!result) {
          return false;
        }
      } catch (error) {
        logger.error('Error evaluating custom condition:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('Error evaluating conditions:', error);
    return false;
  }
}

function getFieldValue(data: Record<string, any>, fieldPath: string): any {
  const parts = fieldPath.split('.');
  let value = data;
  
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return undefined;
    }
  }
  
  return value;
}

function matchFieldValue(actual: any, expected: any): boolean {
  // Handle different comparison types
  if (typeof expected === 'object' && expected !== null) {
    // Handle operators like { $gt: 5, $lt: 10 }
    if ('$eq' in expected) return actual === expected.$eq;
    if ('$ne' in expected) return actual !== expected.$ne;
    if ('$gt' in expected) return actual > expected.$gt;
    if ('$gte' in expected) return actual >= expected.$gte;
    if ('$lt' in expected) return actual < expected.$lt;
    if ('$lte' in expected) return actual <= expected.$lte;
    if ('$in' in expected) return expected.$in.includes(actual);
    if ('$regex' in expected) return new RegExp(expected.$regex).test(actual);
  }
  
  // Simple equality check
  return actual === expected;
}

function isWithinTimeWindow(timeWindow: any): boolean {
  const now = new Date();
  const timezone = timeWindow.timezone || 'UTC';
  
  // Convert to timezone-aware comparison
  // For simplicity, using UTC comparison here
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  const [startHour, startMinute] = timeWindow.start.split(':').map(Number);
  const [endHour, endMinute] = timeWindow.end.split(':').map(Number);
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;
  
  // Check day of week if specified
  if (timeWindow.days && !timeWindow.days.includes(now.getUTCDay())) {
    return false;
  }
  
  // Handle cases where end time is before start time (crosses midnight)
  if (endTime < startTime) {
    return currentTime >= startTime || currentTime <= endTime;
  }
  
  return currentTime >= startTime && currentTime <= endTime;
}