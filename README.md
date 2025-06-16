# Notification Router

Open source notification router system that receives webhooks and intelligently routes notifications to multiple channels (Email, SMS, Slack, Telegram, Discord, etc.) with advanced transformation and routing rules.

## Features

- **Multi-Channel Support**: Email, SMS, Slack, Telegram, Discord, Microsoft Teams, and custom webhooks
- **Smart Routing**: Conditional routing based on content, priority, time windows, and custom rules
- **Message Transformation**: Template engine with Handlebars support for dynamic content
- **High Performance**: Redis-backed queue with priority processing and concurrent workers
- **Reliability**: Retry mechanisms with exponential backoff and circuit breakers
- **Security**: API key authentication, webhook signatures, and JWT support
- **Monitoring**: Prometheus metrics, health checks, and comprehensive logging
- **Easy Deployment**: Docker and docker-compose support for quick setup

## Quick Start

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/ersinkoc/notification-router.git
cd notification-router
```

2. Copy the environment file:
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration.

4. Start the services:
```bash
docker-compose up -d
```

The application will be available at:
- API: http://localhost:3000
- API Documentation: http://localhost:3000/api-docs
- Metrics: http://localhost:9090/metrics

### Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development databases:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

3. Run the development server:
```bash
npm run dev
```

## Configuration

### Environment Variables

Key configuration options:

```env
# Server
PORT=3000
NODE_ENV=production

# Database (SQLite or PostgreSQL)
DATABASE_TYPE=sqlite
DATABASE_URL=sqlite://./data/notifications.db

# Redis
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-secret-key
API_KEY_SALT=your-salt
WEBHOOK_SECRET=your-webhook-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SENDGRID_API_KEY=your-sendgrid-key

# SMS
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+1234567890

# Slack
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_SIGNING_SECRET=your-signing-secret

# ... and more
```

## Usage

### 1. Receiving Webhooks

Send webhooks to the router:

```bash
curl -X POST http://localhost:3000/api/v1/webhooks/my-channel \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "priority": "high",
    "title": "Server Alert",
    "message": "CPU usage exceeded 90%",
    "server": "prod-web-01"
  }'
```

### 2. Creating Routing Rules

```bash
curl -X POST http://localhost:3000/api/v1/rules \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High Priority Alerts",
    "enabled": true,
    "priority": 10,
    "conditions": {
      "priority": "high",
      "keywords": ["error", "critical", "down"]
    },
    "channels": [
      {
        "type": "slack",
        "name": "alerts-channel",
        "config": {
          "channel": "#alerts",
          "method": "api"
        }
      },
      {
        "type": "sms",
        "name": "oncall-sms",
        "config": {
          "to": "+1234567890"
        },
        "delay": 300000
      }
    ]
  }'
```

### 3. Message Templates

Create dynamic templates using Handlebars:

```json
{
  "transform": {
    "template": "{\n  \"title\": \"🚨 {{severity}} Alert\",\n  \"body\": \"{{message}}\\n\\nServer: {{server}}\\nTime: {{formatDate timestamp 'iso'}}\"\n}",
    "engine": "handlebars"
  }
}
```

## Channel Configuration

### Email
```json
{
  "type": "email",
  "config": {
    "to": "alerts@example.com",
    "from": "noreply@example.com",
    "subject": "System Alert",
    "provider": "smtp"  // or "sendgrid"
  }
}
```

### Slack
```json
{
  "type": "slack",
  "config": {
    "channel": "#alerts",
    "method": "api",  // or "webhook"
    "webhookUrl": "https://hooks.slack.com/..."
  }
}
```

### SMS (Twilio)
```json
{
  "type": "sms",
  "config": {
    "to": "+1234567890",
    "provider": "twilio"
  }
}
```

### Custom Webhook
```json
{
  "type": "webhook",
  "config": {
    "url": "https://api.example.com/notify",
    "method": "POST",
    "headers": {
      "X-Custom-Header": "value"
    },
    "auth": {
      "type": "bearer",
      "token": "your-token"
    }
  }
}
```

## API Documentation

Full API documentation is available at http://localhost:3000/api-docs when the server is running.

### Key Endpoints

- `POST /api/v1/webhooks/:channel_id` - Receive webhooks
- `GET /api/v1/rules` - List routing rules
- `POST /api/v1/rules` - Create routing rule
- `PUT /api/v1/rules/:id` - Update routing rule
- `DELETE /api/v1/rules/:id` - Delete routing rule
- `GET /api/v1/channels/types` - List available channels
- `POST /api/v1/channels/test` - Test channel configuration
- `GET /api/v1/notifications/queue/status` - Get queue status

## Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Prometheus Metrics
Available at http://localhost:9090/metrics

Key metrics:
- `webhooks_received_total` - Total webhooks received
- `notifications_processed_total` - Total notifications processed
- `notification_processing_duration_seconds` - Processing duration
- `queue_size` - Current queue size by status
- `channel_errors_total` - Channel delivery errors

## Advanced Features

### Conditional Routing

```javascript
{
  "conditions": {
    "source": ["monitoring", "alertmanager"],
    "priority": "high",
    "keywords": ["database", "connection"],
    "fields": {
      "severity": { "$gte": 3 },
      "environment": "production"
    },
    "timeWindow": {
      "start": "09:00",
      "end": "17:00",
      "timezone": "America/New_York",
      "days": [1, 2, 3, 4, 5]  // Monday to Friday
    }
  }
}
```

### Retry Configuration

```javascript
{
  "retryPolicy": {
    "maxAttempts": 3,
    "backoffMultiplier": 2,
    "initialDelay": 5000,
    "maxDelay": 300000
  }
}
```

## Development

### Running Tests
```bash
npm test
npm run test:watch
```

### Linting
```bash
npm run lint
```

### Building
```bash
npm run build
```

## Deployment

### Kubernetes

Helm charts are available in the `/k8s` directory:

```bash
helm install notification-router ./k8s/helm
```

### AWS Lambda

For serverless deployment, see the `/serverless` directory.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- Issues: [GitHub Issues](https://github.com/ersinkoc/notification-router/issues)