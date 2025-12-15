import { processNotification } from '../../src/engine/processor';
import { NotificationMessage } from '../../src/types';
import { channelManager } from '../../src/channels/channelManager';
import * as metrics from '../../src/services/metrics';

// Mock dependencies
jest.mock('../../src/channels/channelManager');
jest.mock('../../src/services/metrics');

describe('BUG-006: Duration Recording for All Channels Fix', () => {
  let recordNotificationDurationSpy: jest.SpyInstance;
  let recordNotificationSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    recordNotificationDurationSpy = jest.spyOn(metrics, 'recordNotificationDuration');
    recordNotificationSpy = jest.spyOn(metrics, 'recordNotification');

    // Mock channel manager to return success for all channels
    (channelManager.getAdapter as jest.Mock) = jest.fn().mockReturnValue({
      send: jest.fn().mockResolvedValue({
        success: true,
        timestamp: new Date(),
        messageId: 'test-message-id',
      }),
    });
  });

  test('should record duration for single channel', async () => {
    const notification: NotificationMessage = {
      id: 'test-1',
      webhookId: 'webhook-1',
      priority: 'medium',
      channels: [
        {
          type: 'email',
          name: 'test-email',
          config: { to: 'test@example.com', from: 'sender@example.com' },
        },
      ],
      content: {
        body: 'Test message',
        data: {},
      },
      metadata: {
        ruleName: 'test-rule',
        ruleId: '1',
        source: 'test',
      },
      status: {
        state: 'pending',
        attempts: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await processNotification(notification);

    // Should record duration once for the email channel
    expect(recordNotificationDurationSpy).toHaveBeenCalledTimes(1);
    expect(recordNotificationDurationSpy).toHaveBeenCalledWith('email', expect.any(Number));
  });

  test('should record duration for multiple channels individually', async () => {
    const notification: NotificationMessage = {
      id: 'test-2',
      webhookId: 'webhook-2',
      priority: 'high',
      channels: [
        {
          type: 'email',
          name: 'test-email',
          config: { to: 'test@example.com', from: 'sender@example.com' },
        },
        {
          type: 'slack',
          name: 'test-slack',
          config: { webhookUrl: 'https://hooks.slack.com/test' },
        },
        {
          type: 'sms',
          name: 'test-sms',
          config: { to: '+1234567890', from: '+0987654321' },
        },
      ],
      content: {
        body: 'Test message',
        data: {},
      },
      metadata: {
        ruleName: 'test-rule',
        ruleId: '1',
        source: 'test',
      },
      status: {
        state: 'pending',
        attempts: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await processNotification(notification);

    // Should record duration for each channel (3 times total)
    expect(recordNotificationDurationSpy).toHaveBeenCalledTimes(3);
    expect(recordNotificationDurationSpy).toHaveBeenCalledWith('email', expect.any(Number));
    expect(recordNotificationDurationSpy).toHaveBeenCalledWith('slack', expect.any(Number));
    expect(recordNotificationDurationSpy).toHaveBeenCalledWith('sms', expect.any(Number));
  });

  test('should record duration even for failed channels', async () => {
    // Mock one success and one failure
    let callCount = 0;
    (channelManager.getAdapter as jest.Mock) = jest.fn().mockReturnValue({
      send: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            success: true,
            timestamp: new Date(),
          });
        } else {
          return Promise.resolve({
            success: false,
            timestamp: new Date(),
            error: 'Channel failure',
          });
        }
      }),
    });

    const notification: NotificationMessage = {
      id: 'test-3',
      webhookId: 'webhook-3',
      priority: 'medium',
      channels: [
        {
          type: 'email',
          name: 'test-email',
          config: { to: 'test@example.com', from: 'sender@example.com' },
        },
        {
          type: 'slack',
          name: 'test-slack',
          config: { webhookUrl: 'https://hooks.slack.com/test' },
        },
      ],
      content: {
        body: 'Test message',
        data: {},
      },
      metadata: {
        ruleName: 'test-rule',
        ruleId: '1',
        source: 'test',
      },
      status: {
        state: 'pending',
        attempts: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await processNotification(notification);
    } catch (error) {
      // Expected to throw on failure
    }

    // Should still record duration for both channels despite second one failing
    expect(recordNotificationDurationSpy).toHaveBeenCalledTimes(2);
    expect(recordNotificationDurationSpy).toHaveBeenCalledWith('email', expect.any(Number));
    expect(recordNotificationDurationSpy).toHaveBeenCalledWith('slack', expect.any(Number));
  });

  test('should record different durations for each channel', async () => {
    // Mock delays in channel sending
    (channelManager.getAdapter as jest.Mock) = jest.fn().mockReturnValue({
      send: jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              success: true,
              timestamp: new Date(),
            });
          }, 100);
        });
      }),
    });

    const notification: NotificationMessage = {
      id: 'test-4',
      webhookId: 'webhook-4',
      priority: 'low',
      channels: [
        {
          type: 'email',
          name: 'test-email',
          config: { to: 'test@example.com', from: 'sender@example.com' },
        },
        {
          type: 'slack',
          name: 'test-slack',
          config: { webhookUrl: 'https://hooks.slack.com/test' },
        },
      ],
      content: {
        body: 'Test message',
        data: {},
      },
      metadata: {
        ruleName: 'test-rule',
        ruleId: '1',
        source: 'test',
      },
      status: {
        state: 'pending',
        attempts: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await processNotification(notification);

    // Verify durations are recorded and are reasonable (> 0.1s due to delay)
    const calls = recordNotificationDurationSpy.mock.calls;
    expect(calls.length).toBe(2);
    expect(calls[0][1]).toBeGreaterThan(0.1);
    expect(calls[1][1]).toBeGreaterThan(0.1);
  });
});
