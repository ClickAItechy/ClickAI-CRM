#!/bin/bash

# Stop execution on error
set -e

echo "🚀 Starting deployment for ClickAI CRM..."

# 1. Pull latest changes (uncomment if using git on server)
# git pull origin main

# 2. Build and start containers
echo "📦 Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build

# 3. Collect static files for backend
echo "static files..."
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# 4. Run migrations
echo "🗄️ Running database migrations..."
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

echo "✅ Deployment completed successfully!"
echo "🌍 Check https://crm.clickaitech.ae"
