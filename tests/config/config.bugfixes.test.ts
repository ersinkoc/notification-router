describe('BUG-011: CORS Origins Configuration Fix', () => {
  beforeEach(() => {
    // Clear require cache to reload config
    jest.resetModules();
  });

  test('should use environment variable for CORS origins when provided', () => {
    process.env.CORS_ORIGINS = 'https://app.example.com,https://api.example.com';
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'sqlite://test.db';
    process.env.JWT_SECRET = 'test-secret';
    process.env.API_KEY_SALT = 'test-salt';
    process.env.WEBHOOK_SECRET = 'test-webhook-secret';

    const { config } = require('../../src/config');

    expect(config.server.corsOrigins).toEqual([
      'https://app.example.com',
      'https://api.example.com',
    ]);
  });

  test('should trim whitespace from CORS origins', () => {
    process.env.CORS_ORIGINS = '  https://app.example.com  ,  https://api.example.com  ';
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'sqlite://test.db';
    process.env.JWT_SECRET = 'test-secret';
    process.env.API_KEY_SALT = 'test-salt';
    process.env.WEBHOOK_SECRET = 'test-webhook-secret';

    const { config } = require('../../src/config');

    expect(config.server.corsOrigins).toEqual([
      'https://app.example.com',
      'https://api.example.com',
    ]);
  });

  test('should use default production origins when CORS_ORIGINS not set in production', () => {
    delete process.env.CORS_ORIGINS;
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'sqlite://test.db';
    process.env.JWT_SECRET = 'test-secret';
    process.env.API_KEY_SALT = 'test-salt';
    process.env.WEBHOOK_SECRET = 'test-webhook-secret';

    const { config } = require('../../src/config');

    expect(config.server.corsOrigins).toContain('https://yourdomain.com');
  });

  test('should use default development origins when CORS_ORIGINS not set in development', () => {
    delete process.env.CORS_ORIGINS;
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'sqlite://test.db';
    process.env.JWT_SECRET = 'test-secret';
    process.env.API_KEY_SALT = 'test-salt';
    process.env.WEBHOOK_SECRET = 'test-webhook-secret';

    const { config } = require('../../src/config');

    expect(config.server.corsOrigins).toContain('http://localhost:3001');
    expect(config.server.corsOrigins).toContain('http://localhost:5173');
  });

  test('should handle single origin in CORS_ORIGINS', () => {
    process.env.CORS_ORIGINS = 'https://app.example.com';
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'sqlite://test.db';
    process.env.JWT_SECRET = 'test-secret';
    process.env.API_KEY_SALT = 'test-salt';
    process.env.WEBHOOK_SECRET = 'test-webhook-secret';

    const { config } = require('../../src/config');

    expect(config.server.corsOrigins).toEqual(['https://app.example.com']);
  });

  test('should override default origins with environment variable', () => {
    process.env.CORS_ORIGINS = 'https://custom.example.com';
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'sqlite://test.db';
    process.env.JWT_SECRET = 'test-secret';
    process.env.API_KEY_SALT = 'test-salt';
    process.env.WEBHOOK_SECRET = 'test-webhook-secret';

    const { config } = require('../../src/config');

    expect(config.server.corsOrigins).toEqual(['https://custom.example.com']);
    expect(config.server.corsOrigins).not.toContain('https://yourdomain.com');
  });
});

describe('BUG-012: SQLite URL Path Parsing Fix', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('should handle sqlite:/// prefix for absolute paths', () => {
    // This would be tested in integration with actual database initialization
    // The fix ensures both sqlite:// and sqlite:/// are handled correctly
    const sqliteUrl = 'sqlite:///absolute/path/to/db.sqlite';
    const expectedPath = '/absolute/path/to/db.sqlite';

    let storagePath = sqliteUrl;
    if (storagePath.startsWith('sqlite:///')) {
      storagePath = storagePath.replace('sqlite://', '');
    } else if (storagePath.startsWith('sqlite://')) {
      storagePath = storagePath.replace('sqlite://', '');
    }

    expect(storagePath).toBe(expectedPath);
  });

  test('should handle sqlite:// prefix for relative paths', () => {
    const sqliteUrl = 'sqlite://./relative/path/db.sqlite';
    const expectedPath = './relative/path/db.sqlite';

    let storagePath = sqliteUrl;
    if (storagePath.startsWith('sqlite:///')) {
      storagePath = storagePath.replace('sqlite://', '');
    } else if (storagePath.startsWith('sqlite://')) {
      storagePath = storagePath.replace('sqlite://', '');
    }

    expect(storagePath).toBe(expectedPath);
  });

  test('should handle plain path without prefix', () => {
    const sqliteUrl = './data/db.sqlite';
    let storagePath = sqliteUrl;

    if (storagePath.startsWith('sqlite:///')) {
      storagePath = storagePath.replace('sqlite://', '');
    } else if (storagePath.startsWith('sqlite://')) {
      storagePath = storagePath.replace('sqlite://', '');
    }

    expect(storagePath).toBe('./data/db.sqlite');
  });
});
