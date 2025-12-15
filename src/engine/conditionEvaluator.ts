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

    // BUG-001 FIX: Custom JavaScript expressions disabled for security
    // Custom expressions posed a critical security vulnerability allowing arbitrary code execution
    // via Function constructor. Use field conditions, keywords, or other built-in condition types.
    if (conditions.custom) {
      logger.warn('Custom JavaScript expressions are not supported for security reasons. Use field conditions, keywords, or other built-in condition types instead.');
      return false;
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
  // BUG-008 FIX: Handle null/undefined actual values properly
  if (typeof expected === 'object' && expected !== null) {
    // Handle operators like { $gt: 5, $lt: 10 }
    if ('$eq' in expected) return actual === expected.$eq;
    if ('$ne' in expected) return actual !== expected.$ne;

    // For comparison operators, return false if actual is null/undefined
    if (actual === null || actual === undefined) {
      return false;
    }

    if ('$gt' in expected) return actual > expected.$gt;
    if ('$gte' in expected) return actual >= expected.$gte;
    if ('$lt' in expected) return actual < expected.$lt;
    if ('$lte' in expected) return actual <= expected.$lte;
    if ('$in' in expected) return Array.isArray(expected.$in) && expected.$in.includes(actual);
    if ('$regex' in expected) {
      if (typeof actual !== 'string') return false;
      return new RegExp(expected.$regex).test(actual);
    }
  }

  // Simple equality check
  return actual === expected;
}

function isWithinTimeWindow(timeWindow: any): boolean {
  // BUG-005 FIX: Properly handle timezone parameter
  const now = new Date();
  const timezone = timeWindow.timezone || 'UTC';

  let currentHour: number;
  let currentMinute: number;
  let currentDay: number;

  try {
    // Use Intl.DateTimeFormat to get time in the specified timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'short'
    });

    const parts = formatter.formatToParts(now);
    const hourPart = parts.find(p => p.type === 'hour');
    const minutePart = parts.find(p => p.type === 'minute');

    currentHour = hourPart ? parseInt(hourPart.value) : now.getUTCHours();
    currentMinute = minutePart ? parseInt(minutePart.value) : now.getUTCMinutes();

    // Get day of week in timezone (0=Sunday, 6=Saturday)
    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short'
    });
    const dayName = dayFormatter.format(now);
    const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    currentDay = dayMap[dayName] ?? now.getUTCDay();
  } catch (error) {
    // Fallback to UTC if timezone is invalid
    logger.warn(`Invalid timezone ${timezone}, falling back to UTC`);
    currentHour = now.getUTCHours();
    currentMinute = now.getUTCMinutes();
    currentDay = now.getUTCDay();
  }

  const currentTime = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = timeWindow.start.split(':').map(Number);
  const [endHour, endMinute] = timeWindow.end.split(':').map(Number);
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  // Check day of week if specified
  if (timeWindow.days && !timeWindow.days.includes(currentDay)) {
    return false;
  }

  // Handle cases where end time is before start time (crosses midnight)
  if (endTime < startTime) {
    return currentTime >= startTime || currentTime <= endTime;
  }

  return currentTime >= startTime && currentTime <= endTime;
}