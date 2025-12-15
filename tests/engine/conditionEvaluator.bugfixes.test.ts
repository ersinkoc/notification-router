import { evaluateConditions } from '../../src/engine/conditionEvaluator';
import { WebhookPayload } from '../../src/types';

describe('BUG-001: Custom JavaScript Expression Security Fix', () => {
  test('should reject custom JavaScript expressions for security', async () => {
    const payload: WebhookPayload = {
      id: 'test-1',
      source: 'github',
      timestamp: new Date(),
      data: { value: 10 },
      headers: {},
    };

    const conditions = {
      custom: 'true',
    };

    const result = await evaluateConditions(conditions, payload);
    expect(result).toBe(false);
  });
});

describe('BUG-008: Null/Undefined Field Value Handling Fix', () => {
  test('should handle null values in field conditions', async () => {
    const payload: WebhookPayload = {
      id: 'test-6',
      source: 'github',
      timestamp: new Date(),
      data: { value: null },
      headers: {},
    };

    const conditions = {
      fields: {
        value: { \$gt: 5 },
      },
    };

    const result = await evaluateConditions(conditions, payload);
    expect(result).toBe(false);
  });
});
