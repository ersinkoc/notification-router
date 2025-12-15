import { transformMessage } from '../../src/engine/messageTransformer';
import { TransformRule } from '../../src/types';

describe('BUG-002: Custom Handlebars Helpers Security Fix', () => {
  test('should not execute custom helpers for security', async () => {
    const data = {
      title: 'Test Notification',
      message: 'This is a test',
    };

    const rule: TransformRule = {
      template: '{{title}}: {{message}}',
      engine: 'handlebars',
      helpers: {
        malicious: 'function() { return "hacked"; }',
      },
    };

    const result = await transformMessage(data, rule);
    expect(result.body).toBe('Test Notification: This is a test');
  });

  test('should use built-in helpers', async () => {
    const data = {
      message: 'hello world',
    };

    const rule: TransformRule = {
      template: '{{uppercase message}}',
      engine: 'handlebars',
    };

    const result = await transformMessage(data, rule);
    expect(result.body).toBe('HELLO WORLD');
  });
});
