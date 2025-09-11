#!/bin/bash

# Bloom Energy Contract System - Local Docker Deployment Script
# Usage: ./scripts/deploy-local.sh [up|down|restart|logs]

set -e

COMMAND=${1:-up}

echo "🐳 Bloom Energy Contract System - Local Docker Deployment"
echo "📋 Command: $COMMAND"

case $COMMAND in
    "up")
        echo "🚀 Starting services with Docker Compose..."
        
        # Create .env.docker if it doesn't exist
        if [[ ! -f .env.docker ]]; then
            echo "📝 Creating .env.docker file..."
            cat > .env.docker << 'EOF'
# Docker Compose Environment Variables
POSTGRES_PASSWORD=bloom_secure_2025
REDIS_PASSWORD=redis_secure_2025
JWT_SECRET=bloom-energy-docker-jwt-secret-2025
ANTHROPIC_API_KEY=your-anthropic-api-key-here
CORS_ORIGIN=http://localhost:4002,http://localhost:3000,http://localhost:5173,http://localhost:4000,http://localhost:4001
EOF
            echo "⚠️  Please update .env.docker with your actual values before continuing!"
            echo "⚠️  Especially set your ANTHROPIC_API_KEY"
            exit 1
        fi
        
        # Generate Prisma client
        echo "🔨 Generating Prisma client..."
        npx prisma generate
        
        # Start services
        docker-compose --env-file .env.docker up -d
        
        echo "⏳ Waiting for services to be ready..."
        sleep 30
        
        # Run database migrations
        echo "🗄️  Running database migrations..."
        docker-compose --env-file .env.docker exec app npx prisma migrate deploy || {
            echo "⚠️  Migration failed. This might be normal for first-time setup."
            echo "🔄 Trying to push schema instead..."
            docker-compose --env-file .env.docker exec app npx prisma db push
        }
        
        # Seed database
        echo "🌱 Seeding database..."
        docker-compose --env-file .env.docker exec app npm run seed || echo "⚠️  Seeding failed or not configured"
        
        echo ""
        echo "🎉 Services started successfully!"
        echo "🌐 Application: http://localhost:4003"
        echo "🗄️  Database: localhost:5432"
        echo "🔴 Redis: localhost:6379"
        echo "🏥 Health Check: http://localhost:4003/api/health"
        ;;
        
    "down")
        echo "🛑 Stopping services..."
        docker-compose --env-file .env.docker down
        echo "✅ Services stopped successfully!"
        ;;
        
    "restart")
        echo "🔄 Restarting services..."
        docker-compose --env-file .env.docker restart
        echo "✅ Services restarted successfully!"
        ;;
        
    "logs")
        echo "📋 Showing logs..."
        docker-compose --env-file .env.docker logs -f
        ;;
        
    "build")
        echo "🔨 Building services..."
        docker-compose --env-file .env.docker build --no-cache
        echo "✅ Build completed!"
        ;;
        
    "clean")
        echo "🧹 Cleaning up Docker resources..."
        docker-compose --env-file .env.docker down -v --rmi all
        docker system prune -f
        echo "✅ Cleanup completed!"
        ;;
        
    "status")
        echo "📊 Service status:"
        docker-compose --env-file .env.docker ps
        ;;
        
    "shell")
        echo "🐚 Opening shell in app container..."
        docker-compose --env-file .env.docker exec app /bin/sh
        ;;
        
    "db-shell")
        echo "🗄️  Opening PostgreSQL shell..."
        docker-compose --env-file .env.docker exec postgres psql -U rapha -d bloom_contracts
        ;;
        
    *)
        echo "❌ Unknown command: $COMMAND"
        echo ""
        echo "Available commands:"
        echo "  up       - Start all services"
        echo "  down     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  logs     - Show logs"
        echo "  build    - Build services"
        echo "  clean    - Clean up all Docker resources"
        echo "  status   - Show service status"
        echo "  shell    - Open shell in app container"
        echo "  db-shell - Open PostgreSQL shell"
        exit 1
        ;;
esac