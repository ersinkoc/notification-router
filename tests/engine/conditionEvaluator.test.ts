import { evaluateConditions } from '../../src/engine/conditionEvaluator';
import { RoutingConditions, WebhookPayload } from '../../src/types';

describe('ConditionEvaluator', () => {
  const createPayload = (data: any): WebhookPayload => ({
    id: 'test-id',
    timestamp: new Date(),
    source: 'test-source',
    data,
    headers: {},
  });

  describe('Source conditions', () => {
    it('should match single source', async () => {
      const conditions: RoutingConditions = { source: 'test-source' };
      const payload = createPayload({});
      
      const result = await evaluateConditions(conditions, payload);
      expect(result).toBe(true);
    });

    it('should match source in array', async () => {
      const conditions: RoutingConditions = { source: ['other', 'test-source'] };
      const payload = createPayload({});
      
      const result = await evaluateConditions(conditions, payload);
      expect(result).toBe(true);
    });

    it('should not match different source', async () => {
      const conditions: RoutingConditions = { source: 'different-source' };
      const payload = createPayload({});
      
      const result = await evaluateConditions(conditions, payload);
      expect(result).toBe(false);
    });
  });

  describe('Priority conditions', () => {
    it('should match priority', async () => {
      const conditions: RoutingConditions = { priority: 'high' };
      const payload = createPayload({ priority: 'high' });
      
      const result = await evaluateConditions(conditions, payload);
      expect(result).toBe(true);
    });

    it('should not match different priority', async () => {
      const conditions: RoutingConditions = { priority: 'high' };
      const payload = createPayload({ priority: 'low' });
      
      const result = await evaluateConditions(conditions, payload);
      expect(result).toBe(false);
    });
  });

  describe('Keyword conditions', () => {
    it('should match keywords in payload', async () => {
      const conditions: RoutingConditions = { keywords: ['error', 'critical'] };
      const payload = createPayload({ 
        message: 'Critical error in production',
        severity: 'high' 
      });
      
      const result = await evaluateConditions(conditions, payload);
      expect(result).toBe(true);
    });

    it('should not match missing keywords', async () => {
      const conditions: RoutingConditions = { keywords: ['error', 'critical'] };
      const payload = createPayload({ 
        message: 'Everything is fine',
        status: 'ok' 
      });
      
      const result = await evaluateConditions(conditions, payload);
      expect(result).toBe(false);
    });
  });

  describe('Field conditions', () => {
    it('should match exact field value', async () => {
      const conditions: RoutingConditions = { 
        fields: { 
          status: 'active',
          'user.role': 'admin' 
        } 
      };
      const payload = createPayload({ 
        status: 'active',
        user: { role: 'admin' }
      });
      
      const result = await evaluateConditions(conditions, payload);
      expect(result).toBe(true);
    });

    it('should match with operators', async () => {
      const conditions: RoutingConditions = { 
        fields: { 
          count: { $gt: 5 },
          status: { $in: ['active', 'pending'] }
        } 
      };
      const payload = createPayload({ 
        count: 10,
        status: 'active'
      });
      
      const result = await evaluateConditions(conditions, payload);
      expect(result).toBe(true);
    });
  });

  describe('Custom conditions', () => {
    it('should evaluate custom JavaScript expression', async () => {
      const conditions: RoutingConditions = { 
        custom: 'payload.value > 100 && source === "test-source"' 
      };
      const payload = createPayload({ value: 150 });
      
      const result = await evaluateConditions(conditions, payload);
      expect(result).toBe(true);
    });

    it('should handle invalid custom expression', async () => {
      const conditions: RoutingConditions = { 
        custom: 'invalid javascript {' 
      };
      const payload = createPayload({});
      
      const result = await evaluateConditions(conditions, payload);
      expect(result).toBe(false);
    });
  });
});