# Webhook Examples

## Basic Webhook

```bash
curl -X POST http://localhost:3000/api/v1/webhooks/monitoring \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test message",
    "priority": "medium"
  }'
```

## GitHub Webhook

```bash
curl -X POST http://localhost:3000/api/v1/webhooks/github \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "opened",
    "pull_request": {
      "title": "Add new feature",
      "html_url": "https://github.com/org/repo/pull/123",
      "user": {
        "login": "developer"
      }
    },
    "repository": {
      "name": "my-repo"
    }
  }'
```

## Monitoring Alert (Prometheus/AlertManager)

```bash
curl -X POST http://localhost:3000/api/v1/webhooks/alertmanager \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "4",
    "groupKey": "{}:{alertname=\"high_cpu\"}",
    "status": "firing",
    "alerts": [
      {
        "status": "firing",
        "labels": {
          "alertname": "high_cpu",
          "instance": "server1",
          "severity": "critical"
        },
        "annotations": {
          "description": "CPU usage is above 90%",
          "summary": "High CPU usage detected"
        }
      }
    ]
  }'
```

## Stripe Webhook

```bash
curl -X POST http://localhost:3000/api/v1/webhooks/stripe \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_1234567890",
        "amount": 2000,
        "currency": "usd",
        "status": "succeeded",
        "customer": "cus_1234567890"
      }
    }
  }'
```

## Custom Application Webhook

```bash
curl -X POST http://localhost:3000/api/v1/webhooks/myapp \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "user.signup",
    "timestamp": "2023-10-15T10:30:00Z",
    "data": {
      "user_id": "12345",
      "email": "newuser@example.com",
      "plan": "premium"
    },
    "priority": "high"
  }'
```

## Webhook with Signature Verification

```bash
# Generate signature
PAYLOAD='{"test": "data"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "your-webhook-secret" | cut -d' ' -f2)

# Send webhook
curl -X POST http://localhost:3000/api/v1/webhooks/secure-channel/secure \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
```