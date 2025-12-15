import { Sequelize } from 'sequelize';
import { config } from '../config';
import { logger } from '../utils/logger';

let sequelize: Sequelize;

export async function initializeDatabase() {
  try {
    if (config.database.type === 'sqlite') {
      // BUG-012 FIX: Properly parse SQLite URL to extract file path
      // Supports both sqlite:///path/to/db.sqlite and sqlite://./relative/path
      let storagePath = config.database.url;

      if (storagePath.startsWith('sqlite:///')) {
        // Absolute path: sqlite:///absolute/path/db.sqlite -> /absolute/path/db.sqlite
        storagePath = storagePath.replace('sqlite://', '');
      } else if (storagePath.startsWith('sqlite://')) {
        // Relative path: sqlite://./relative/path -> ./relative/path
        storagePath = storagePath.replace('sqlite://', '');
      }

      sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: storagePath,
        logging: config.server.env === 'development' ? console.log : false,
      });
    } else {
      sequelize = new Sequelize(config.database.url, {
        dialect: 'postgres',
        logging: config.server.env === 'development' ? console.log : false,
        pool: {
          max: 10,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
      });
    }

    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Initialize models
    await initializeModels();
    
    // Sync database
    if (config.server.env !== 'production') {
      await sequelize.sync({ alter: true });
      logger.info('Database models synchronized');
    }

  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    throw error;
  }
}

async function initializeModels() {
  // Import and initialize all models
  const models = await Promise.all([
    import('../models/User'),
    import('../models/ApiKey'),
    import('../models/WebhookLog'),
    import('../models/Notification'),
    import('../models/RoutingRule'),
    import('../models/ChannelConfig'),
  ]);

  models.forEach(model => model.default(sequelize));
}

export function getDatabase() {
  if (!sequelize) {
    throw new Error('Database not initialized');
  }
  return sequelize;
}