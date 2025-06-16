#!/bin/bash

# Quick start script for Notification Router

set -e

echo "🚀 Starting Notification Router Setup..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from example..."
    cp .env.example .env
    
    # Generate random secrets
    JWT_SECRET=$(openssl rand -hex 32)
    API_KEY_SALT=$(openssl rand -hex 16)
    WEBHOOK_SECRET=$(openssl rand -hex 32)
    
    # Update .env with generated secrets
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
        sed -i '' "s/API_KEY_SALT=.*/API_KEY_SALT=$API_KEY_SALT/" .env
        sed -i '' "s/WEBHOOK_SECRET=.*/WEBHOOK_SECRET=$WEBHOOK_SECRET/" .env
    else
        # Linux
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
        sed -i "s/API_KEY_SALT=.*/API_KEY_SALT=$API_KEY_SALT/" .env
        sed -i "s/WEBHOOK_SECRET=.*/WEBHOOK_SECRET=$WEBHOOK_SECRET/" .env
    fi
    
    echo "✅ Generated secure secrets in .env file"
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs data

# Start services
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services started successfully!"
    echo ""
    echo "📍 Access points:"
    echo "   - API: http://localhost:3000"
    echo "   - API Docs: http://localhost:3000/api-docs"
    echo "   - Metrics: http://localhost:9090/metrics"
    echo "   - Health: http://localhost:3000/health"
    echo ""
    echo "🔑 Default credentials:"
    echo "   - Admin login: admin@example.com / admin"
    echo ""
    echo "📚 Next steps:"
    echo "   1. Create an API key:"
    echo "      curl -X POST http://localhost:3000/api/v1/auth/login \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -d '{\"email\":\"admin@example.com\",\"password\":\"admin\"}'"
    echo ""
    echo "   2. Send a test webhook:"
    echo "      curl -X POST http://localhost:3000/api/v1/webhooks/test \\"
    echo "        -H 'X-API-Key: your-api-key' \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -d '{\"message\":\"Hello from Notification Router!\"}'"
    echo ""
    echo "   3. View logs:"
    echo "      docker-compose logs -f app"
else
    echo "❌ Failed to start services. Check logs with: docker-compose logs"
    exit 1
fi