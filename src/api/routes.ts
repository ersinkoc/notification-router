import { Application } from 'express';
import { webhookRouter } from './webhook.routes';
import { authRouter } from './auth.routes';
import { rulesRouter } from './rules.routes';
import { channelsRouter } from './channels.routes';
import { notificationsRouter } from './notifications.routes';
import { setupSwagger } from './swagger';

export function setupRoutes(app: Application) {
  // API documentation
  setupSwagger(app);

  // API routes
  app.use('/api/v1/webhooks', webhookRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/rules', rulesRouter);
  app.use('/api/v1/channels', channelsRouter);
  app.use('/api/v1/notifications', notificationsRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        message: 'Route not found',
        path: req.path,
      },
    });
  });
}