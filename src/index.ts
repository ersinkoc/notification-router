import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { createServer } from 'http';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { setupRoutes } from './api/routes';
import { initializeDatabase } from './services/database';
import { initializeQueue } from './services/queue';
import { initializeMetrics } from './services/metrics';
import { config } from './config';

const app = express();
const server = createServer(app);

async function startServer() {
  try {
    // Initialize services
    await initializeDatabase();
    await initializeQueue();
    
    if (config.monitoring.enableMetrics) {
      initializeMetrics(app);
    }

    // Security middleware
    app.use(helmet());
    app.use(cors({
      origin: config.server.corsOrigins,
      credentials: true,
    }));

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(compression());

    // Request logging
    app.use(requestLogger);

    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.server.env,
      });
    });

    // API routes
    setupRoutes(app);

    // Error handling
    app.use(errorHandler);

    // Start server
    const port = config.server.port;
    const host = config.server.host;

    server.listen(port, host, () => {
      logger.info(`Notification Router running on http://${host}:${port}`);
      logger.info(`Environment: ${config.server.env}`);
      logger.info(`Database: ${config.database.type}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function shutdown() {
  logger.info('Shutting down gracefully...');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close database connections, queue, etc.
  process.exit(0);
}

startServer();