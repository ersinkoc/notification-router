import { Application } from 'express';
import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Notification Router API',
    version: '1.0.0',
    description: 'Open source notification router system for intelligent webhook routing',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Development server',
    },
    {
      url: 'https://api.example.com/v1',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Webhooks',
      description: 'Webhook reception endpoints',
    },
    {
      name: 'Rules',
      description: 'Routing rule management',
    },
    {
      name: 'Channels',
      description: 'Channel configuration',
    },
    {
      name: 'Notifications',
      description: 'Notification management',
    },
    {
      name: 'Auth',
      description: 'Authentication endpoints',
    },
  ],
  paths: {
    '/webhooks/{channel_id}': {
      post: {
        tags: ['Webhooks'],
        summary: 'Receive webhook',
        description: 'Receive a webhook payload and route it according to configured rules',
        parameters: [
          {
            name: 'channel_id',
            in: 'path',
            required: true,
            description: 'Channel identifier',
            schema: {
              type: 'string',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'Webhook payload (any JSON structure)',
              },
            },
          },
        },
        responses: {
          '202': {
            description: 'Webhook accepted for processing',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        webhookId: { type: 'string' },
                        status: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Bad request',
          },
          '401': {
            description: 'Unauthorized',
          },
          '429': {
            description: 'Too many requests',
          },
        },
        security: [
          {
            ApiKeyAuth: [],
          },
        ],
      },
    },
    '/rules': {
      get: {
        tags: ['Rules'],
        summary: 'List routing rules',
        description: 'Get all configured routing rules',
        responses: {
          '200': {
            description: 'List of routing rules',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/RoutingRule',
                  },
                },
              },
            },
          },
        },
        security: [
          {
            BearerAuth: [],
          },
        ],
      },
      post: {
        tags: ['Rules'],
        summary: 'Create routing rule',
        description: 'Create a new routing rule',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateRoutingRule',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Rule created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RoutingRule',
                },
              },
            },
          },
        },
        security: [
          {
            BearerAuth: [],
          },
        ],
      },
    },
  },
  components: {
    schemas: {
      RoutingRule: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          enabled: { type: 'boolean' },
          priority: { type: 'number' },
          conditions: {
            type: 'object',
            properties: {
              source: {
                oneOf: [
                  { type: 'string' },
                  { type: 'array', items: { type: 'string' } },
                ],
              },
              priority: {
                type: 'string',
                enum: ['high', 'medium', 'low'],
              },
              keywords: {
                type: 'array',
                items: { type: 'string' },
              },
              fields: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
          channels: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['email', 'sms', 'slack', 'telegram', 'discord', 'webhook'],
                },
                name: { type: 'string' },
                config: { type: 'object' },
                template: { type: 'string' },
                delay: { type: 'number' },
              },
            },
          },
        },
      },
      CreateRoutingRule: {
        type: 'object',
        required: ['name', 'conditions', 'channels'],
        properties: {
          name: { type: 'string' },
          enabled: { type: 'boolean', default: true },
          priority: { type: 'number', default: 0 },
          conditions: { type: 'object' },
          channels: { type: 'array' },
        },
      },
    },
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

export function setupSwagger(app: Application) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}