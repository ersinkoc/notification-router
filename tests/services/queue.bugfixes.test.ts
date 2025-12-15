import { initializeQueue } from '../../src/services/queue';
import { config } from '../../src/config';

// Mock Bull
jest.mock('bull');
jest.mock('../../src/config');
jest.mock('../../src/engine/processor');

describe('BUG-009: Redis URL Parsing Error Handling Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should parse valid Redis URL correctly', async () => {
    (config as any).redis = {
      url: 'redis://localhost:6379',
      password: '',
    };
    (config as any).queue = {
      retryAttempts: 3,
      retryDelay: 5000,
      concurrentWorkers: 5,
    };

    // Mock Bull constructor
    const Bull = require('bull');
    Bull.mockImplementation(() => ({
      process: jest.fn(),
      on: jest.fn(),
    }));

    await initializeQueue();

    // Verify Bull was called with correct parsed values
    expect(Bull).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({
        redis: expect.objectContaining({
          host: 'localhost',
          port: 6379,
        }),
      })
    );
  });

  test('should handle Redis URL with custom port', async () => {
    (config as any).redis = {
      url: 'redis://redis.example.com:6380',
      password: 'secret',
    };
    (config as any).queue = {
      retryAttempts: 3,
      retryDelay: 5000,
      concurrentWorkers: 5,
    };

    const Bull = require('bull');
    Bull.mockImplementation(() => ({
      process: jest.fn(),
      on: jest.fn(),
    }));

    await initializeQueue();

    expect(Bull).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({
        redis: expect.objectContaining({
          host: 'redis.example.com',
          port: 6380,
          password: 'secret',
        }),
      })
    );
  });

  test('should use default port when not specified', async () => {
    (config as any).redis = {
      url: 'redis://redis.example.com',
      password: '',
    };
    (config as any).queue = {
      retryAttempts: 3,
      retryDelay: 5000,
      concurrentWorkers: 5,
    };

    const Bull = require('bull');
    Bull.mockImplementation(() => ({
      process: jest.fn(),
      on: jest.fn(),
    }));

    await initializeQueue();

    expect(Bull).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({
        redis: expect.objectContaining({
          host: 'redis.example.com',
          port: 6379, // Default Redis port
        }),
      })
    );
  });

  test('should throw error on invalid Redis URL', async () => {
    (config as any).redis = {
      url: 'invalid-url-format',
      password: '',
    };
    (config as any).queue = {
      retryAttempts: 3,
      retryDelay: 5000,
      concurrentWorkers: 5,
    };

    await expect(initializeQueue()).rejects.toThrow('Invalid Redis URL');
  });

  test('should throw error with helpful message', async () => {
    (config as any).redis = {
      url: 'not-a-url',
      password: '',
    };
    (config as any).queue = {
      retryAttempts: 3,
      retryDelay: 5000,
      concurrentWorkers: 5,
    };

    await expect(initializeQueue()).rejects.toThrow(
      expect.stringContaining('Expected format: redis://hostname:port')
    );
  });
});
